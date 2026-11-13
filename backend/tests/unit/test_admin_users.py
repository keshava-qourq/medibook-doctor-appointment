"""Unit tests for admin-only user management (US-001-3)."""

import secrets
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Session as SessionModel
from app.models import User
from app.routers import admin_users
from app.security import create_session, hash_password, verify_password


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


@pytest.fixture
def app_client(db_session: DBSession) -> Iterator[TestClient]:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _handler(request, exc):
        return Response(status_code=exc.status_code)

    app.include_router(admin_users.router, prefix="/api/admin")
    yield TestClient(app)


def _make_user(db: DBSession, role: str = "admin", active: bool = True) -> User:
    user = User(
        email=_email(role),
        full_name=f"{role.title()} User",
        role=role,
        is_active=active,
        password_hash=hash_password(_password()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(db: DBSession, user: User) -> dict[str, str]:
    raw_token, _ = create_session(db, user)
    return {"Authorization": f"Bearer {raw_token}"}


# -- AC-010 -------------------------------------------------------------------


@pytest.mark.parametrize("role", ["doctor", "admin"])
def test_ac010_creates_active_account_hashed_password_and_echoes_initial_password(
    db_session: DBSession, app_client: TestClient, role: str
):
    admin = _make_user(db_session)
    password = _password()
    email = _email("new")

    resp = app_client.post(
        "/api/admin/users",
        headers=_auth(db_session, admin),
        json={"full_name": "New Staff", "email": email, "role": role, "password": password},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["is_active"] is True
    assert body["role"] == role
    assert body["email"] == email
    assert body["initial_password"] == password
    assert len(body["id"]) == 36

    created = db_session.get(User, body["id"])
    assert created.password_hash != password
    assert verify_password(password, created.password_hash)


# -- AC-011 -------------------------------------------------------------------


def test_ac011_new_password_replaces_old_and_revokes_every_session(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    target = _make_user(db_session, role="doctor")
    old_hash = target.password_hash
    create_session(db_session, target)
    create_session(db_session, target)

    new_password = _password()
    resp = app_client.post(
        f"/api/admin/users/{target.id}/password",
        headers=_auth(db_session, admin),
        json={"password": new_password},
    )

    assert resp.status_code == 204
    db_session.refresh(target)
    assert verify_password(new_password, target.password_hash)
    assert target.password_hash != old_hash
    sessions = db_session.query(SessionModel).filter(SessionModel.user_id == target.id).all()
    assert sessions
    assert all(s.revoked_at is not None for s in sessions)


def test_ac011_password_reset_missing_user_is_404_empty_body_and_weak_is_422(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)

    missing = app_client.post(
        "/api/admin/users/00000000-0000-4000-8000-000000000000/password",
        headers=headers,
        json={"password": _password()},
    )
    assert missing.status_code == 404
    assert missing.content == b""

    target = _make_user(db_session, role="doctor")
    weak = app_client.post(
        f"/api/admin/users/{target.id}/password",
        headers=headers,
        json={"password": "short"},
    )
    assert weak.status_code == 422
    assert weak.json()["password"] == "weak_password"


# -- AC-012 -------------------------------------------------------------------


def test_ac012_duplicate_email_case_insensitive_is_409_and_creates_nothing(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    email = _email("dup")

    first = app_client.post(
        "/api/admin/users",
        headers=headers,
        json={
            "full_name": "First",
            "email": email,
            "role": "doctor",
            "password": _password(),
        },
    )
    assert first.status_code == 201

    before = db_session.query(User).count()
    second = app_client.post(
        "/api/admin/users",
        headers=headers,
        json={
            "full_name": "Second",
            "email": email.upper(),
            "role": "doctor",
            "password": _password(),
        },
    )

    assert second.status_code == 409
    assert second.json() == {"code": "email_in_use"}
    assert db_session.query(User).count() == before


# -- AC-013 -------------------------------------------------------------------


def test_ac013_non_admin_caller_gets_403_empty_body_and_creates_nothing(
    db_session: DBSession, app_client: TestClient
):
    for role in ("patient", "doctor"):
        caller = _make_user(db_session, role=role)
        before = db_session.query(User).count()
        resp = app_client.post(
            "/api/admin/users",
            headers=_auth(db_session, caller),
            json={
                "full_name": "Nope",
                "email": _email("nope"),
                "role": "doctor",
                "password": _password(),
            },
        )
        assert resp.status_code == 403
        assert resp.content == b""
        assert db_session.query(User).count() == before


def test_ac013_unauthenticated_caller_gets_401(db_session: DBSession, app_client: TestClient):
    resp = app_client.post(
        "/api/admin/users",
        json={
            "full_name": "Nope",
            "email": _email("nope"),
            "role": "doctor",
            "password": _password(),
        },
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]


# -- PATCH deactivation --------------------------------------------------------


def test_ac_patch_deactivation_revokes_all_sessions_and_returns_user(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    target = _make_user(db_session, role="doctor")
    create_session(db_session, target)

    resp = app_client.patch(
        f"/api/admin/users/{target.id}",
        headers=_auth(db_session, admin),
        json={"is_active": False},
    )

    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    assert "password" not in resp.json()
    sessions = db_session.query(SessionModel).filter(SessionModel.user_id == target.id).all()
    assert sessions and all(s.revoked_at is not None for s in sessions)


def test_ac_patch_missing_user_returns_404_empty_body(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    resp = app_client.patch(
        "/api/admin/users/not-a-real-id",
        headers=_auth(db_session, admin),
        json={"is_active": False},
    )
    assert resp.status_code == 404
    assert resp.content == b""


# -- GET list ------------------------------------------------------------------


def test_ac_list_users_paginates_and_never_returns_passwords(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    for _ in range(3):
        _make_user(db_session, role="doctor")

    default = app_client.get("/api/admin/users", headers=headers)
    assert default.status_code == 200
    body = default.json()
    assert body["total"] == 4
    assert len(body["items"]) == 4
    assert all("password" not in item and "password_hash" not in item for item in body["items"])

    paged = app_client.get("/api/admin/users?limit=2&offset=1", headers=headers)
    assert paged.json()["total"] == 4
    assert len(paged.json()["items"]) == 2

    assert app_client.get("/api/admin/users?limit=101", headers=headers).status_code == 422


def test_ac_list_users_rejects_non_admin_with_403_empty_body(
    db_session: DBSession, app_client: TestClient
):
    caller = _make_user(db_session, role="doctor")
    resp = app_client.get("/api/admin/users", headers=_auth(db_session, caller))
    assert resp.status_code == 403
    assert resp.content == b""
