"""Unit tests for term-driven doctor search (US-010-2).

Resolution is a deterministic catalogue+mapping table lookup only (NFR-012):
a term resolves to its active specializations and the active doctors of those
specializations; soft-deleted terms and deactivated specializations stop
resolving. The doctor<->specialization table is stood up here with the same
shape a later sprint delivers, so the lookup has associations to read.
"""

import secrets
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import User
from app.routers import search, specializations
from app.security import create_session, hash_password


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


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
    app.include_router(search.router)
    yield TestClient(app)


def _spec(client: TestClient, headers: dict, name: str) -> str:
    resp = client.post("/api/admin/specializations", headers=headers, json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _term(client: TestClient, headers: dict, term: str, spec_ids: list[str]) -> str:
    resp = client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "disease", "specialization_ids": spec_ids},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _link_doctor(db: DBSession, doctor_id: str, spec_id: str) -> None:
    """Associate a doctor with a specialization in the (later-sprint) table,
    creating it on first use so the lookup has something to read."""
    db.execute(
        text(
            "CREATE TABLE IF NOT EXISTS doctor_specializations "
            "(doctor_id varchar(36), specialization_id varchar(36))"
        )
    )
    db.execute(
        text("INSERT INTO doctor_specializations VALUES (:d, :s)"),
        {"d": doctor_id, "s": spec_id},
    )
    db.commit()


# -- AC-039 -------------------------------------------------------------------


def test_ac039_term_mapped_to_two_specializations_returns_doctors_from_both(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_a = _spec(app_client, headers, _name("cardio"))
    spec_b = _spec(app_client, headers, _name("pulmo"))
    doctor_a = _make_user(db_session, role="doctor")
    doctor_b = _make_user(db_session, role="doctor")
    _link_doctor(db_session, doctor_a.id, spec_a)
    _link_doctor(db_session, doctor_b.id, spec_b)

    term = _name("chestpain")
    _term(app_client, headers, term, [spec_a, spec_b])

    patient = _make_user(db_session, role="patient")
    resolved = app_client.get(
        "/api/search/doctors", headers=_auth(db_session, patient), params={"term": term}
    )
    assert resolved.status_code == 200
    body = resolved.json()
    returned = {d["id"] for d in body["items"]}
    assert doctor_a.id in returned
    assert doctor_b.id in returned
    assert body["total"] == 2
    specs = {s["id"] for s in body["specializations"]}
    assert {spec_a, spec_b} <= specs


# -- AC-040 (part): deleted term stops resolving ------------------------------


def test_ac040_deleted_term_no_longer_resolves(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(app_client, headers, _name("derm"))
    doctor = _make_user(db_session, role="doctor")
    _link_doctor(db_session, doctor.id, spec_id)
    term = _name("eczema")
    term_id = _term(app_client, headers, term, [spec_id])

    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    before = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    assert before["resolution"] == "matched"

    assert (
        app_client.delete(f"/api/admin/catalog-terms/{term_id}", headers=headers).status_code == 204
    )

    after = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    assert after["resolution"] == "no_match"
    assert after["items"] == []
    assert after["total"] == 0


# -- deactivated specializations excluded (ties US-006 AC-025) -----------------


def test_deactivated_specialization_is_excluded_from_results(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    active_spec = _spec(app_client, headers, _name("active"))
    dead_spec = _spec(app_client, headers, _name("dead"))
    doctor_active = _make_user(db_session, role="doctor")
    doctor_dead = _make_user(db_session, role="doctor")
    _link_doctor(db_session, doctor_active.id, active_spec)
    _link_doctor(db_session, doctor_dead.id, dead_spec)

    term = _name("fever")
    # Both specializations active at create-time so both are linked.
    _term(app_client, headers, term, [active_spec, dead_spec])
    app_client.patch(
        f"/api/admin/specializations/{dead_spec}", headers=headers, json={"is_active": False}
    )

    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    returned = {d["id"] for d in body["items"]}
    assert doctor_active.id in returned
    assert doctor_dead.id not in returned
    specs = {s["id"] for s in body["specializations"]}
    assert dead_spec not in specs


def test_inactive_doctor_is_excluded_from_results(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(app_client, headers, _name("gp"))
    active = _make_user(db_session, role="doctor")
    inactive = _make_user(db_session, role="doctor")
    inactive.is_active = False
    db_session.commit()
    _link_doctor(db_session, active.id, spec_id)
    _link_doctor(db_session, inactive.id, spec_id)

    term = _name("cough")
    _term(app_client, headers, term, [spec_id])

    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    returned = {d["id"] for d in body["items"]}
    assert active.id in returned
    assert inactive.id not in returned


# -- NFR-012: unknown term resolves to nothing, never invented ----------------


def test_nfr012_unknown_term_resolves_to_no_match(db_session: DBSession, app_client: TestClient):
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get(
        "/api/search/doctors",
        headers=patient_headers,
        params={"term": f"nonsense-{secrets.token_hex(6)}"},
    ).json()
    assert body["resolution"] == "no_match"
    assert body["items"] == []
    assert body["total"] == 0
    assert body["specializations"] == []


# -- pagination {items,total} -------------------------------------------------


def test_results_paginated_items_total(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(app_client, headers, _name("ortho"))
    for _ in range(3):
        doc = _make_user(db_session, role="doctor")
        _link_doctor(db_session, doc.id, spec_id)
    term = _name("backpain")
    _term(app_client, headers, term, [spec_id])

    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    full = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    assert full["total"] == 3
    assert len(full["items"]) == 3

    paged = app_client.get(
        "/api/search/doctors",
        headers=patient_headers,
        params={"term": term, "limit": 2, "offset": 1},
    ).json()
    assert paged["total"] == 3
    assert len(paged["items"]) == 2


def test_search_requires_authentication(app_client: TestClient):
    assert app_client.get("/api/search/doctors", params={"term": "flu"}).status_code == 401
