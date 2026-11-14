"""Unit tests for the admin doctor-profile link surface (US-010-2 support).

``PUT /api/admin/doctors/{doctor_id}`` gives a doctor its specializations so
term-driven search can resolve a term to the active doctors of its
specializations (AC-039). The link is stored in the minimal
``doctor_specializations`` read model that search reads.
"""

import secrets
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import User
from app.routers import doctors, search, specializations
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
    app.include_router(doctors.router)
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


def test_ac039_linking_doctor_lets_search_resolve_to_it(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("cardio"))
    doctor = _make_user(db_session, role="doctor")

    linked = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "display_name": "Dr X", "is_active": True},
    )
    assert linked.status_code == 200, linked.text
    assert linked.json()["specialization_ids"] == [spec_id]

    term = _name("chestpain")
    _term(app_client, headers, term, [spec_id])
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    assert doctor.id in {d["id"] for d in body["items"]}


def test_relinking_doctor_replaces_prior_specializations(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_a = _spec(app_client, headers, _name("a"))
    spec_b = _spec(app_client, headers, _name("b"))
    doctor = _make_user(db_session, role="doctor")

    app_client.put(
        f"/api/admin/doctors/{doctor.id}", headers=headers, json={"specialization_ids": [spec_a]}
    )
    second = app_client.put(
        f"/api/admin/doctors/{doctor.id}", headers=headers, json={"specialization_ids": [spec_b]}
    )
    assert second.json()["specialization_ids"] == [spec_b]

    term = _name("x")
    _term(app_client, headers, term, [spec_a])
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get(
        "/api/search/doctors", headers=patient_headers, params={"term": term}
    ).json()
    assert doctor.id not in {d["id"] for d in body["items"]}


def test_update_missing_doctor_is_404_empty_body(db_session: DBSession, app_client: TestClient):
    headers = _auth(db_session, _make_user(db_session))
    resp = app_client.put(
        f"/api/admin/doctors/{secrets.token_hex(8)}",
        headers=headers,
        json={"specialization_ids": []},
    )
    assert resp.status_code == 404
    assert resp.content == b""


def test_update_requires_admin_role(db_session: DBSession, app_client: TestClient):
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    doctor = _make_user(db_session, role="doctor")
    resp = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=patient_headers,
        json={"specialization_ids": []},
    )
    assert resp.status_code == 403
    assert resp.content == b""
