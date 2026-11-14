"""Deterministic unit tests for session idle timeout (AC-008).

The idle-expiry path lives in ``app.auth.current_user`` (SESSION_IDLE_MINUTES /
``expires_at``) and is testable without wall-clock waiting: set ``expires_at``
in the past, or place the window near its end, then drive ``current_user``.
"""

from datetime import UTC, datetime, timedelta

from fastapi import Depends, FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import User
from app.security import create_session, hash_password


def _make_user(db: DBSession, email: str) -> User:
    user = User(
        email=email,
        full_name="Idle User",
        role="patient",
        is_active=True,
        password_hash=hash_password("correcthorse"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _as_aware(value: datetime) -> datetime:
    """SQLite returns naive datetimes even for timezone-aware columns."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _tiny_app(db_session: DBSession) -> TestClient:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _handler(request, exc):
        return Response(status_code=exc.status_code)

    @app.get("/whoami")
    def whoami(user: User = Depends(current_user)):  # noqa: B008
        return {"id": user.id}

    return TestClient(app)


def test_ac008_request_after_idle_timeout_rejected_401_requires_relogin(db_session: DBSession):
    """A request made after session_idle_minutes of inactivity is rejected 401
    (the session has already lapsed past expires_at) and so forces re-login."""
    user = _make_user(db_session, "idle-expired@example.com")
    raw_token, session = create_session(db_session, user)
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db_session.add(session)
    db_session.commit()

    client = _tiny_app(db_session)
    resp = client.get("/whoami", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"]
    assert "www-authenticate" not in {k.lower() for k in resp.headers}


def test_ac008_last_seen_and_expires_slide_forward_on_each_authenticated_call(
    db_session: DBSession, monkeypatch
):
    """last_seen_at/expires_at slide forward on each authenticated call, pushing
    the idle window past the original (near) expiry rather than letting it lapse."""
    monkeypatch.setenv("SESSION_IDLE_MINUTES", "30")
    user = _make_user(db_session, "idle-slide@example.com")
    raw_token, session = create_session(db_session, user)
    near_expiry = datetime.now(UTC) + timedelta(seconds=5)
    session.last_seen_at = datetime.now(UTC) - timedelta(minutes=29)
    session.expires_at = near_expiry
    db_session.add(session)
    db_session.commit()
    prior_last_seen = session.last_seen_at

    client = _tiny_app(db_session)
    resp = client.get("/whoami", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 200

    db_session.refresh(session)
    assert _as_aware(session.last_seen_at) > _as_aware(prior_last_seen)
    assert _as_aware(session.expires_at) > _as_aware(near_expiry)
