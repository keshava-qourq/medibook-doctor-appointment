"""Admin-only user management: create doctor/administrator accounts, list,
deactivate and reissue passwords (US-001-3).
"""

from datetime import UTC, datetime

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.auth import require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Session as SessionModel
from app.models import User
from app.schemas import (
    AdminPasswordReset,
    AdminUserCreate,
    AdminUserCreateOut,
    AdminUserListOut,
    AdminUserOut,
    AdminUserUpdate,
)
from app.security import MIN_PASSWORD_LENGTH, hash_password

router = APIRouter(dependencies=[Depends(require_role("admin"))])

ALLOWED_ROLES = ("doctor", "admin")


def _validation_error(field: str, msg: str) -> JSONResponse:
    """A 422 in the same shape as ``validation_error_handler`` in main.py, so every
    endpoint reports invalid input as ``{"detail": [{"field", "msg"}]}``."""
    return JSONResponse(status_code=422, content={"detail": [{"field": field, "msg": msg}]})


def _revoke_all_sessions(db: DBSession, user_id: str, reason: str) -> None:
    now = datetime.now(UTC)
    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.user_id == user_id, SessionModel.revoked_at.is_(None))
        .all()
    )
    for session in sessions:
        session.revoked_at = now
        session.revoked_reason = reason
        db.add(session)
    db.commit()


def _to_out(user: User) -> AdminUserOut:
    return AdminUserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )


@router.post("/users", status_code=201, response_model=AdminUserCreateOut)
def create_user(payload: AdminUserCreate, db: DBSession = Depends(get_db)):  # noqa: B008
    errors: list[dict[str, str]] = []

    if not payload.full_name or not payload.full_name.strip():
        errors.append({"field": "full_name", "msg": "required"})

    email = payload.email
    try:
        validated = validate_email(payload.email, check_deliverability=False, test_environment=True)
        email = validated.normalized
    except EmailNotValidError:
        errors.append({"field": "email", "msg": "invalid_email"})

    if payload.role not in ALLOWED_ROLES:
        errors.append({"field": "role", "msg": "invalid_role"})

    if len(payload.password) < MIN_PASSWORD_LENGTH:
        errors.append({"field": "password", "msg": "weak_password"})

    if errors:
        return JSONResponse(status_code=422, content={"detail": errors})

    # Compare case-insensitively via func.lower on both sides so the lookup is
    # correct on every dialect: on Postgres the email column is CITEXT (already
    # case-insensitive), on the SQLite test database it is plain text, and
    # func.lower(...) == email.lower() matches in both cases rather than relying
    # on the storage type to fold case. The unique constraint on the column is
    # the backstop, enforced by the IntegrityError handler below.
    existing = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if existing is not None:
        return JSONResponse(status_code=409, content={"code": "email_in_use"})

    user = User(
        full_name=payload.full_name,
        email=email,
        role=payload.role,
        is_active=True,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent create won the race on the unique email: nothing partial remains.
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "email_in_use"})
    db.refresh(user)

    return AdminUserCreateOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        initial_password=payload.password,
    )


@router.get("/users", response_model=AdminUserListOut)
def list_users(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DBSession = Depends(get_db),  # noqa: B008
):
    query = db.query(User)
    total = query.count()
    rows = query.order_by(User.created_at.asc()).offset(offset).limit(limit).all()
    return AdminUserListOut(items=[_to_out(u) for u in rows], total=total)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def update_user(user_id: str, payload: AdminUserUpdate, db: DBSession = Depends(get_db)):  # noqa: B008
    user = db.get(User, user_id)
    if user is None:
        raise EmptyBodyHTTPError(404)

    if payload.full_name is not None:
        if not payload.full_name.strip():
            return _validation_error("full_name", "required")
        user.full_name = payload.full_name

    deactivating = False
    if payload.is_active is not None:
        if payload.is_active is False:
            deactivating = True
        user.is_active = payload.is_active

    db.add(user)
    db.commit()
    db.refresh(user)

    if deactivating:
        _revoke_all_sessions(db, user.id, "deactivated")

    return _to_out(user)


@router.post("/users/{user_id}/password", status_code=204)
def reset_password(
    user_id: str,
    payload: AdminPasswordReset,
    db: DBSession = Depends(get_db),  # noqa: B008
):
    user = db.get(User, user_id)
    if user is None:
        raise EmptyBodyHTTPError(404)

    if len(payload.password) < MIN_PASSWORD_LENGTH:
        return JSONResponse(status_code=422, content={"password": "weak_password"})

    user.password_hash = hash_password(payload.password)
    db.add(user)
    db.commit()

    _revoke_all_sessions(db, user.id, "password_reset")

    return Response(status_code=204)


__all__ = ["router"]
