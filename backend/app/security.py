"""Password hashing and opaque session-token issuance.

No plain-text or reversible password exists anywhere (NFR-001): `hash_password`
is the only way to turn a password into something stored, and it is one-way.
Session tokens are opaque and random; only a hash of them is ever persisted,
so the raw value returned by `create_session` cannot be recovered again.
"""

import hashlib
import os
import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from sqlalchemy.orm import Session as DBSession

from app.models import Session as SessionModel
from app.models import User

MIN_PASSWORD_LENGTH = 8
DEFAULT_SESSION_IDLE_MINUTES = 30


class WeakPasswordError(ValueError):
    """A password shorter than `MIN_PASSWORD_LENGTH` characters."""

    code = "weak_password"


def hash_password(password: str) -> str:
    """Bcrypt-hash `password` with a fresh per-user salt.

    Raises `WeakPasswordError` for anything under 8 characters; nothing is
    hashed or stored in that case.
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        raise WeakPasswordError("Password must be at least 8 characters.")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """True when `password` matches the bcrypt hash; never raises on bad input."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def session_idle_minutes() -> int:
    """How long a session may sit idle before it expires, from `SESSION_IDLE_MINUTES`."""
    return int(os.getenv("SESSION_IDLE_MINUTES", str(DEFAULT_SESSION_IDLE_MINUTES)))


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_session(db: DBSession, user: User) -> tuple[str, SessionModel]:
    """Issue a new opaque bearer token for `user`.

    Returns `(raw_token, session)`. The raw token is shown to the caller this
    one time; only `_hash_token(raw_token)` is persisted. A new sign-in opens
    an additional session and never revokes the user's other sessions.
    """
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    session = SessionModel(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        last_seen_at=now,
        expires_at=now + timedelta(minutes=session_idle_minutes()),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token, session


def find_session_by_token(db: DBSession, raw_token: str) -> SessionModel | None:
    """Look a session up by its raw token, without ever storing that value."""
    token_hash = _hash_token(raw_token)
    return db.query(SessionModel).filter(SessionModel.token_hash == token_hash).first()


__all__ = [
    "WeakPasswordError",
    "hash_password",
    "verify_password",
    "session_idle_minutes",
    "create_session",
    "find_session_by_token",
]
