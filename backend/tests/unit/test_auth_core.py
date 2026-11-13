"""Unit tests for the auth data model and shared authorization core (US-001-1)."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.auth import authorize_ownership, current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Session as SessionModel
from app.models import User
from app.security import (
    WeakPasswordError,
    create_session,
    find_session_by_token,
    hash_password,
    verify_password,
)
from app.seed import seed_startup_users


def _make_user(
    db: DBSession,
    email: str = "pat@example.com",
    role: str = "patient",
    active: bool = True,
) -> User:
    user = User(
        email=email,
        full_name="Pat Patient",
        role=role,
        is_active=active,
        password_hash=hash_password("correcthorse"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _tiny_app(db_session: DBSession) -> TestClient:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _handler(request, exc):
        from fastapi.responses import Response

        return Response(status_code=exc.status_code)

    @app.get("/whoami")
    def whoami(user: User = Depends(current_user)):  # noqa: B008
        return {"id": user.id}

    _require_admin = require_role("admin")

    @app.get("/admin-only")
    def admin_only(user: User = Depends(_require_admin)):  # noqa: B008
        return {"ok": True}

    @app.get("/owned/{owner_id}")
    def owned(owner_id: str | None, user: User = Depends(current_user)):  # noqa: B008
        authorize_ownership(owner_id, user)
        return {"ok": True}

    @app.get("/owned-missing")
    def owned_missing(user: User = Depends(current_user)):  # noqa: B008
        authorize_ownership(None, user)
        return {"ok": True}

    return TestClient(app)


# -- hashing round-trip -------------------------------------------------------


def test_ac_hashing_round_trip_verifies_correct_and_rejects_wrong():
    hashed = hash_password("correcthorse")
    assert hashed != "correcthorse"
    assert verify_password("correcthorse", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_ac_weak_password_rejected_under_eight_chars():
    with pytest.raises(WeakPasswordError) as exc_info:
        hash_password("short1")
    assert exc_info.value.code == "weak_password"


# -- token-hash-only storage ---------------------------------------------------


def test_ac_session_stores_only_token_hash_not_raw_token(db_session: DBSession):
    user = _make_user(db_session, email="hashonly@example.com")
    raw_token, session = create_session(db_session, user)

    assert session.token_hash != raw_token
    stored = db_session.get(SessionModel, session.id)
    assert stored.token_hash != raw_token
    assert raw_token not in stored.token_hash

    found = find_session_by_token(db_session, raw_token)
    assert found is not None
    assert found.id == session.id


# -- idle slide + expiry rejection, deactivated user --------------------------


def test_ac_idle_window_slides_forward_on_each_authenticated_call(db_session: DBSession):
    user = _make_user(db_session, email="slide@example.com")
    raw_token, session = create_session(db_session, user)
    db_session.refresh(session)
    original_expiry = session.expires_at

    client = _tiny_app(db_session)
    resp = client.get("/whoami", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 200

    db_session.refresh(session)
    assert session.expires_at >= original_expiry


def test_ac_expired_session_rejected_401_no_www_authenticate(db_session: DBSession):
    user = _make_user(db_session, email="expired@example.com")
    raw_token, session = create_session(db_session, user)
    session.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.add(session)
    db_session.commit()

    client = _tiny_app(db_session)
    resp = client.get("/whoami", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 401
    assert "www-authenticate" not in {k.lower() for k in resp.headers}
    assert resp.json()["detail"]


def test_ac_revoked_session_rejected_401(db_session: DBSession):
    user = _make_user(db_session, email="revoked@example.com")
    raw_token, session = create_session(db_session, user)
    session.revoked_at = datetime.now(UTC)
    session.revoked_reason = "logout"
    db_session.add(session)
    db_session.commit()

    client = _tiny_app(db_session)
    resp = client.get("/whoami", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 401


def test_ac_malformed_or_missing_token_rejected_401(db_session: DBSession):
    client = _tiny_app(db_session)
    assert client.get("/whoami").status_code == 401
    assert client.get("/whoami", headers={"Authorization": "garbage"}).status_code == 401
    assert client.get("/whoami", headers={"Authorization": "Bearer "}).status_code == 401


def test_ac_deactivated_user_rejected_401(db_session: DBSession):
    user = _make_user(db_session, email="deactivated@example.com", active=False)
    raw_token, _ = create_session(db_session, user)

    client = _tiny_app(db_session)
    resp = client.get("/whoami", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 401


# -- role and ownership guards -------------------------------------------------


def test_ac_require_role_rejects_mismatch_with_empty_body(db_session: DBSession):
    user = _make_user(db_session, email="patientrole@example.com", role="patient")
    raw_token, _ = create_session(db_session, user)

    client = _tiny_app(db_session)
    resp = client.get("/admin-only", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 403
    assert resp.content == b""


def test_ac_require_role_allows_matching_role(db_session: DBSession):
    user = _make_user(db_session, email="adminrole@example.com", role="admin")
    raw_token, _ = create_session(db_session, user)

    client = _tiny_app(db_session)
    resp = client.get("/admin-only", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 200


def test_ac_ownership_guard_rejects_other_owner_with_empty_body(db_session: DBSession):
    user = _make_user(db_session, email="owner1@example.com")
    raw_token, _ = create_session(db_session, user)

    client = _tiny_app(db_session)
    resp = client.get("/owned/someone-elses-id", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 403
    assert resp.content == b""


def test_ac_ownership_guard_rejects_nonexistent_resource_same_as_other_owner(
    db_session: DBSession,
):
    user = _make_user(db_session, email="owner2@example.com")
    raw_token, _ = create_session(db_session, user)

    client = _tiny_app(db_session)
    resp = client.get("/owned-missing", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 403
    assert resp.content == b""


def test_ac_ownership_guard_allows_owner(db_session: DBSession):
    user = _make_user(db_session, email="owner3@example.com")
    raw_token, _ = create_session(db_session, user)

    client = _tiny_app(db_session)
    resp = client.get(f"/owned/{user.id}", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 200


# -- startup seeding -----------------------------------------------------------


def test_ac_seed_startup_users_creates_admin_and_patient_when_configured(
    db_session: DBSession, monkeypatch
):
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin-seed@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "adminpass1")
    monkeypatch.setenv("SMOKE_TEST_EMAIL", "smoke-seed@example.com")
    monkeypatch.setenv("SMOKE_TEST_PASSWORD", "smokepass1")

    seed_startup_users(db_session)

    admin = db_session.query(User).filter(User.email == "admin-seed@example.com").first()
    patient = db_session.query(User).filter(User.email == "smoke-seed@example.com").first()
    assert admin is not None and admin.role == "admin"
    assert patient is not None and patient.role == "patient"


def test_ac_seed_startup_users_idempotent_and_seeds_nothing_when_unset(
    db_session: DBSession, monkeypatch
):
    monkeypatch.delenv("BOOTSTRAP_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("BOOTSTRAP_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("SMOKE_TEST_EMAIL", raising=False)
    monkeypatch.delenv("SMOKE_TEST_PASSWORD", raising=False)

    seed_startup_users(db_session)
    assert db_session.query(User).count() == 0

    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "idem@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "adminpass1")
    seed_startup_users(db_session)
    seed_startup_users(db_session)
    assert db_session.query(User).filter(User.email == "idem@example.com").count() == 1
