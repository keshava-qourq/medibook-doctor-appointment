"""Authorization dependencies shared by every endpoint: who you are, what role
you must hold, and whether you own the record you are asking for.
"""

from datetime import UTC, datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import User
from app.security import find_session_by_token, session_idle_minutes

_UNAUTHORIZED_DETAIL = "Not authenticated."


def _unauthorized() -> HTTPException:
    # No `headers=` here: a missing/malformed/expired/revoked token returns
    # 401 with a JSON body and no WWW-Authenticate challenge.
    return HTTPException(status_code=401, detail=_UNAUTHORIZED_DETAIL)


def _as_aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes even for timezone-aware columns."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def current_user(
    authorization: str | None = Header(default=None),
    db: DBSession = Depends(get_db),  # noqa: B008
) -> User:
    """Resolve the bearer token in `Authorization` to its active user.

    Also slides the session's idle window forward on every call, and rejects
    a token whose session is missing, revoked, expired, or whose user has
    been deactivated.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized()
    raw_token = authorization.removeprefix("Bearer ").strip()
    if not raw_token:
        raise _unauthorized()

    session = find_session_by_token(db, raw_token)
    if session is None or session.revoked_at is not None:
        raise _unauthorized()

    now = datetime.now(UTC)
    if now > _as_aware(session.expires_at):
        raise _unauthorized()

    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise _unauthorized()

    session.last_seen_at = now
    session.expires_at = now + timedelta(minutes=session_idle_minutes())
    db.add(session)
    db.commit()

    return user


def require_role(*roles: str):
    """Dependency factory: 403 with an empty body unless the user holds one of `roles`."""

    def _dependency(user: User = Depends(current_user)) -> User:  # noqa: B008
        if user.role not in roles:
            raise EmptyBodyHTTPError(403)
        return user

    return _dependency


def authorize_ownership(owner_id: str | None, user: User) -> None:
    """Guard a clinical resource: 403 empty body if it belongs to someone else.

    Pass `owner_id=None` when the id did not resolve to anything at all, so
    "not yours" and "does not exist" are indistinguishable from the outside.
    """
    if owner_id is None or owner_id != user.id:
        raise EmptyBodyHTTPError(403)


__all__ = ["current_user", "require_role", "authorize_ownership"]
