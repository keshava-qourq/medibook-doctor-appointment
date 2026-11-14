"""Unit tests for the starter disease/symptom catalogue seeder (US-009-1)."""

import secrets
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import CatalogTerm, Specialization, User
from app.routers import doctors, search, specializations
from app.security import create_session, hash_password
from app.seed import seed_catalog
from app.seed_data.catalog import SEED_SPECIALIZATIONS, SEED_TERMS


def _make_user(db: DBSession, role: str = "admin") -> User:
    user = User(
        email=f"{role}-{secrets.token_hex(6)}@example.com",
        full_name=f"{role.title()} {secrets.token_hex(3)}",
        role=role,
        is_active=True,
        password_hash=hash_password(secrets.token_urlsafe(12)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(db: DBSession, user: User) -> dict[str, str]:
    raw_token, _ = create_session(db, user)
    return {"Authorization": f"Bearer {raw_token}"}


@pytest.fixture
def app_client(db_session: DBSession) -> Iterator[TestClient]:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _empty(request, exc):
        return Response(status_code=exc.status_code)

    app.include_router(specializations.public_router)
    app.include_router(specializations.admin_router)
    app.include_router(doctors.router)
    app.include_router(search.router)
    yield TestClient(app)


def _all_terms(client: TestClient, headers: dict) -> list[dict]:
    items: list[dict] = []
    offset = 0
    while True:
        body = client.get(
            "/api/admin/catalog-terms", headers=headers, params={"limit": 100, "offset": offset}
        ).json()
        items.extend(body["items"])
        offset += 100
        if offset >= body["total"]:
            return items


# -- AC-034 -------------------------------------------------------------------


def test_ac034_clean_database_seeding_creates_every_documented_term_and_specialization(
    db_session: DBSession, app_client: TestClient
):
    seed_catalog(db_session)
    headers = _auth(db_session, _make_user(db_session))

    spec_names = {s.name.lower() for s in db_session.query(Specialization).all()}
    assert {name.lower() for name, _ in SEED_SPECIALIZATIONS} <= spec_names

    stored = {t.term.lower() for t in db_session.query(CatalogTerm).all()}
    assert {term.lower() for term, _, _ in SEED_TERMS} <= stored

    for term, _kind, _specs in SEED_TERMS:
        suggest = app_client.get("/api/catalog/suggest", headers=headers, params={"q": term}).json()
        assert term in [i["term"] for i in suggest["items"]], term


def test_ac034_every_seeded_term_resolves_to_at_least_one_specialization_in_search(
    db_session: DBSession, app_client: TestClient
):
    seed_catalog(db_session)
    headers = _auth(db_session, _make_user(db_session, role="patient"))

    for term, _kind, spec_names in SEED_TERMS:
        body = app_client.get("/api/search/doctors", headers=headers, params={"term": term}).json()
        resolved = {s["name"] for s in body["specializations"]}
        assert resolved == set(spec_names), term


# -- AC-035 -------------------------------------------------------------------


def test_ac035_seeded_entries_expose_term_type_and_specializations_and_accept_put_and_delete(
    db_session: DBSession, app_client: TestClient
):
    seed_catalog(db_session)
    headers = _auth(db_session, _make_user(db_session))

    items = _all_terms(app_client, headers)
    by_term = {i["term"]: i for i in items}
    for term, kind, spec_names in SEED_TERMS:
        entry = by_term[term]
        assert entry["entry_type"] == kind
        assert {s["name"] for s in entry["specializations"]} == set(spec_names)

    target = by_term[SEED_TERMS[0][0]]
    renamed = app_client.put(
        f"/api/admin/catalog-terms/{target['id']}",
        headers=headers,
        json={"term": "Admin Renamed Term"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["term"] == "Admin Renamed Term"

    other = by_term[SEED_TERMS[1][0]]
    assert (
        app_client.delete(f"/api/admin/catalog-terms/{other['id']}", headers=headers).status_code
        == 204
    )


# -- AC-036 / NFR-024 ---------------------------------------------------------


def test_ac036_nfr024_reseeding_leaves_an_administrator_edit_intact(
    db_session: DBSession, app_client: TestClient
):
    seed_catalog(db_session)
    headers = _auth(db_session, _make_user(db_session))
    original_term = SEED_TERMS[0][0]
    row = (
        db_session.query(CatalogTerm)
        .filter(func.lower(CatalogTerm.term) == original_term.lower())
        .one()
    )
    edited = app_client.put(
        f"/api/admin/catalog-terms/{row.id}",
        headers=headers,
        json={"term": "Edited By Admin", "kind": "symptom"},
    )
    assert edited.status_code == 200

    seed_catalog(db_session)

    db_session.expire_all()
    still = db_session.get(CatalogTerm, row.id)
    assert still.term == "Edited By Admin"
    assert still.entry_type == "symptom"
    # The original text is not resurrected as a second row.
    assert (
        db_session.query(CatalogTerm)
        .filter(func.lower(CatalogTerm.term) == original_term.lower())
        .count()
        == 0
    )


def test_ac036_nfr024_reseeding_does_not_recreate_a_deleted_seeded_term(
    db_session: DBSession, app_client: TestClient
):
    seed_catalog(db_session)
    headers = _auth(db_session, _make_user(db_session))
    term = SEED_TERMS[2][0]
    row = db_session.query(CatalogTerm).filter(func.lower(CatalogTerm.term) == term.lower()).one()
    assert (
        app_client.delete(f"/api/admin/catalog-terms/{row.id}", headers=headers).status_code == 204
    )

    seed_catalog(db_session)

    db_session.expire_all()
    rows = db_session.query(CatalogTerm).filter(func.lower(CatalogTerm.term) == term.lower()).all()
    assert len(rows) == 1
    assert rows[0].is_deleted is True


def test_ac036_running_the_seeder_twice_produces_no_duplicates(db_session: DBSession):
    seed_catalog(db_session)
    terms_after_first = db_session.query(CatalogTerm).count()
    specs_after_first = db_session.query(Specialization).count()

    seed_catalog(db_session)

    assert db_session.query(CatalogTerm).count() == terms_after_first
    assert db_session.query(Specialization).count() == specs_after_first
    assert terms_after_first == len(SEED_TERMS)


def test_ac036_nfr024_seeding_never_takes_over_an_administrator_created_term(
    db_session: DBSession, app_client: TestClient
):
    """[AC-036/NFR-024] An administrator may already have created a term whose text
    clashes with a seed entry; seeding must neither duplicate it nor claim it."""
    headers = _auth(db_session, _make_user(db_session))
    term, _kind, spec_names = SEED_TERMS[0]
    spec = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": spec_names[0]}
    ).json()
    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "symptom", "specialization_ids": [spec["id"]]},
    )
    assert created.status_code == 201

    seed_catalog(db_session)

    db_session.expire_all()
    rows = db_session.query(CatalogTerm).filter(func.lower(CatalogTerm.term) == term.lower()).all()
    assert len(rows) == 1
    assert rows[0].id == created.json()["id"]
    assert rows[0].is_seeded is False
    assert rows[0].seed_key is None
    assert rows[0].entry_type == "symptom"


def test_seeding_matches_an_existing_specialization_case_insensitively(db_session: DBSession):
    name, _ = SEED_SPECIALIZATIONS[0]
    pre_existing = Specialization(name=name.upper(), description="pre-existing", is_active=True)
    db_session.add(pre_existing)
    db_session.commit()

    seed_catalog(db_session)

    matches = (
        db_session.query(Specialization)
        .filter(func.lower(Specialization.name) == name.lower())
        .all()
    )
    assert len(matches) == 1
    # Stored as given by the administrator; seeding never overwrites it.
    assert matches[0].name == name.upper()
    assert matches[0].description == "pre-existing"
