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

# The effective idle timeout, resolved once from the environment on first use so
# every request reads the same validated value rather than re-reading os.getenv.
_CACHED_IDLE_MINUTES: int | None = None


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


def _parse_idle_minutes(raw: str) -> int:
    """Parse a SESSION_IDLE_MINUTES value, raising a clear error if it is not a
    positive integer."""
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"SESSION_IDLE_MINUTES must be a positive integer, got {raw!r}") from exc
    if value <= 0:
        raise ValueError(f"SESSION_IDLE_MINUTES must be a positive integer, got {raw!r}")
    return value


def validate_session_idle_minutes() -> int:
    """Validate SESSION_IDLE_MINUTES at startup so a misconfigured value fails
    loudly where the operator can read it, rather than turning every
    authenticated request into a 500 on the hot path. Returns the effective
    idle timeout in minutes.
    """
    raw = os.getenv("SESSION_IDLE_MINUTES")
    if raw is None:
        return DEFAULT_SESSION_IDLE_MINUTES
    return _parse_idle_minutes(raw)


def session_idle_minutes() -> int:
    """How long a session may sit idle before it expires.

    Read once at process start from the ``SESSION_IDLE_MINUTES`` environment
    variable (default 30) and cached, so the value a request sees is exactly the
    one ``validate_session_idle_minutes`` checked at startup. Caching closes the
    split-source trap of re-reading ``os.getenv`` on every request: an operator
    changing the env value mid-run cannot silently take effect unvalidated; the
    change applies only on the next restart, which re-runs startup validation.

    The architecture ultimately specifies this as an administrator-configurable
    ``clinic_settings`` column; until that table exists it is sourced from the
    environment, which keeps the default (30) and deployment overrides working.
    """
    global _CACHED_IDLE_MINUTES
    if _CACHED_IDLE_MINUTES is None:
        raw = os.getenv("SESSION_IDLE_MINUTES")
        if raw is None:
            _CACHED_IDLE_MINUTES = DEFAULT_SESSION_IDLE_MINUTES
        else:
            try:
                _CACHED_IDLE_MINUTES = _parse_idle_minutes(raw)
            except ValueError:
                _CACHED_IDLE_MINUTES = DEFAULT_SESSION_IDLE_MINUTES
    return _CACHED_IDLE_MINUTES


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
    "validate_session_idle_minutes",
    "create_session",
    "find_session_by_token",
]
