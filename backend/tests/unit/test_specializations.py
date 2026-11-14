"""Unit tests for medical specializations admin CRUD and public listing (US-006-1)."""

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
from app.models import Specialization, User
from app.routers import specializations
from app.security import create_session, hash_password


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


def _make_user(db: DBSession, role: str = "admin") -> User:
    user = User(
        email=f"{role}-{secrets.token_hex(6)}@example.com",
        full_name=f"{role.title()} User",
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
    async def _handler(request, exc):
        return Response(status_code=exc.status_code)

    app.include_router(specializations.public_router)
    app.include_router(specializations.admin_router)
    yield TestClient(app)


# -- AC-022 -------------------------------------------------------------------


def test_ac022_create_saves_and_appears_in_listing(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    name = _name("cardiology")

    created = app_client.post(
        "/api/admin/specializations",
        headers=_auth(db_session, admin),
        json={"name": name, "description": "heart care"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == name
    assert body["description"] == "heart care"
    assert body["is_active"] is True
    assert len(body["id"]) == 36

    listed = app_client.get("/api/specializations", headers=_auth(db_session, admin))
    assert listed.status_code == 200
    assert any(item["id"] == body["id"] for item in listed.json()["items"])


def test_ac022_create_without_description_saves(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    created = app_client.post(
        "/api/admin/specializations",
        headers=_auth(db_session, admin),
        json={"name": _name("neuro")},
    )
    assert created.status_code == 201
    assert created.json()["description"] is None


# -- AC-023 -------------------------------------------------------------------


def test_ac023_case_insensitive_duplicate_is_409_and_writes_nothing(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    name = _name("Dermatology")

    first = app_client.post("/api/admin/specializations", headers=headers, json={"name": name})
    assert first.status_code == 201

    before = db_session.query(Specialization).count()
    dup = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": name.upper()}
    )
    assert dup.status_code == 409
    assert dup.json() == {"code": "duplicate_name"}
    assert db_session.query(Specialization).count() == before


# -- AC-024 -------------------------------------------------------------------


def test_ac024_delete_unreferenced_is_204(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    created = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": _name("ent")}
    )
    spec_id = created.json()["id"]

    resp = app_client.delete(f"/api/admin/specializations/{spec_id}", headers=headers)
    assert resp.status_code == 204
    assert db_session.get(Specialization, spec_id) is None


def test_ac024_delete_referenced_is_409_with_counts_and_deactivation_allowed(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    created = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": _name("oncology")}
    )
    spec_id = created.json()["id"]

    # The term_specializations table is owned by the catalogue model: reference the
    # specialization through the real catalog-terms endpoint so mappings count 1.
    mapped = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": _name("flu"), "entry_type": "disease", "specialization_ids": [spec_id]},
    )
    assert mapped.status_code == 201
    # The doctor-specialization table lands in a later sprint; stand in with the same
    # schema so the reference-counting guard has a doctor reference to count too.
    db_session.execute(
        text(
            "CREATE TABLE doctor_specializations "
            "(doctor_id varchar(36), specialization_id varchar(36))"
        )
    )
    db_session.execute(
        text("INSERT INTO doctor_specializations VALUES ('doc-1', :sid)"), {"sid": spec_id}
    )
    db_session.commit()

    refused = app_client.delete(f"/api/admin/specializations/{spec_id}", headers=headers)
    assert refused.status_code == 409
    body = refused.json()
    assert body["code"] == "in_use"
    assert body["doctors"] == 1
    assert body["mappings"] == 1
    assert body["doctor_count"] == 1
    assert body["mapping_count"] == 1
    assert body["suggestion"] == "deactivate"
    assert db_session.get(Specialization, spec_id) is not None

    deactivated = app_client.patch(
        f"/api/admin/specializations/{spec_id}", headers=headers, json={"is_active": False}
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False


def test_ac024_delete_missing_is_404_empty_body(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    resp = app_client.delete(
        "/api/admin/specializations/00000000-0000-4000-8000-000000000000",
        headers=_auth(db_session, admin),
    )
    assert resp.status_code == 404
    assert resp.content == b""


# -- AC-025 -------------------------------------------------------------------


def test_ac025_deactivated_excluded_from_active_listing(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    created = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": _name("radiology")}
    )
    spec_id = created.json()["id"]
    app_client.patch(
        f"/api/admin/specializations/{spec_id}", headers=headers, json={"is_active": False}
    )

    active = app_client.get("/api/specializations?active=true", headers=headers)
    assert all(item["id"] != spec_id for item in active.json()["items"])

    # The row remains stored and viewable (NFR-026): it still appears unfiltered.
    allrows = app_client.get("/api/specializations", headers=headers)
    assert any(item["id"] == spec_id for item in allrows.json()["items"])


# -- list rules ---------------------------------------------------------------


def test_list_returns_items_total_and_paginates(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    for _ in range(3):
        app_client.post("/api/admin/specializations", headers=headers, json={"name": _name("spec")})

    body = app_client.get("/api/specializations", headers=headers).json()
    assert body["total"] == 3
    assert len(body["items"]) == 3

    paged = app_client.get("/api/specializations?limit=2&offset=1", headers=headers).json()
    assert paged["total"] == 3
    assert len(paged["items"]) == 2

    assert app_client.get("/api/specializations?limit=101", headers=headers).status_code == 422


def test_name_stored_as_given(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    name = f"MixedCase-{secrets.token_hex(4)}"
    created = app_client.post(
        "/api/admin/specializations",
        headers=_auth(db_session, admin),
        json={"name": name},
    )
    assert created.json()["name"] == name


# -- catalogue terms (AC-024/AC-025 reference source) --------------------------


def test_ac024_catalog_term_maps_specialization_and_is_listed(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": _name("cardio")}
    ).json()

    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": _name("flu"), "entry_type": "disease", "specialization_ids": [spec["id"]]},
    )
    assert created.status_code == 201
    term = created.json()
    assert term["specializations"][0]["id"] == spec["id"]

    listed = app_client.get("/api/admin/catalog-terms", headers=headers).json()
    assert listed["total"] == 1
    match = [t for t in listed["items"] if t["id"] == term["id"]]
    assert match and match[0]["specializations"][0]["id"] == spec["id"]


def test_ac025_mapping_survives_specialization_deactivation(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": _name("onco")}
    ).json()
    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": _name("tumour"), "entry_type": "disease", "specialization_ids": [spec["id"]]},
    ).json()

    app_client.patch(
        f"/api/admin/specializations/{spec['id']}", headers=headers, json={"is_active": False}
    )

    terms = app_client.get("/api/admin/catalog-terms", headers=headers).json()
    term = [t for t in terms["items"] if t["id"] == created["id"]][0]
    assert any(s["id"] == spec["id"] for s in term["specializations"])


def test_catalog_terms_require_admin_role(db_session: DBSession, app_client: TestClient):
    caller = _make_user(db_session, role="doctor")
    resp = app_client.post(
        "/api/admin/catalog-terms",
        headers=_auth(db_session, caller),
        json={"term": _name("x"), "entry_type": "disease", "specialization_ids": []},
    )
    assert resp.status_code == 403
    assert resp.content == b""


# -- authz --------------------------------------------------------------------


def test_create_requires_admin_role(db_session: DBSession, app_client: TestClient):
    caller = _make_user(db_session, role="doctor")
    resp = app_client.post(
        "/api/admin/specializations",
        headers=_auth(db_session, caller),
        json={"name": _name("nope")},
    )
    assert resp.status_code == 403
    assert resp.content == b""


def test_listing_requires_authentication(app_client: TestClient):
    assert app_client.get("/api/specializations").status_code == 401


def test_patch_missing_is_404_empty_body(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    resp = app_client.patch(
        "/api/admin/specializations/not-a-real-id",
        headers=_auth(db_session, admin),
        json={"is_active": False},
    )
    assert resp.status_code == 404
    assert resp.content == b""


def test_patch_rename_to_existing_is_409(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    a = app_client.post(
        "/api/admin/specializations", headers=headers, json={"name": _name("alpha")}
    ).json()
    b_name = _name("beta")
    app_client.post("/api/admin/specializations", headers=headers, json={"name": b_name})

    resp = app_client.patch(
        f"/api/admin/specializations/{a['id']}", headers=headers, json={"name": b_name.upper()}
    )
    assert resp.status_code == 409
    assert resp.json() == {"code": "duplicate_name"}
