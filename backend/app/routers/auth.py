"""Public authentication endpoints: register, login, logout, me."""

from datetime import UTC, datetime

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user
from app.database import get_db
from app.models import Session as SessionModel
from app.models import User
from app.schemas import LoginRequest, RegisterRequest
from app.security import (
    MIN_PASSWORD_LENGTH,
    create_session,
    find_session_by_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

LANDING_BY_ROLE = {
    "patient": "/search",
    "doctor": "/doctor-schedule",
    "admin": "/admin",
}

_GENERIC_LOGIN_DETAIL = "Incorrect email or password."


def _code(status: int, code: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code})


def _user_payload(user: User) -> dict[str, object]:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
    }


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):  # noqa: B008
    """Create a patient account and open its first session (AC-001)."""
    errors: list[dict[str, str]] = []

    if not body.full_name or not body.full_name.strip():
        errors.append({"field": "full_name", "message": "required"})

    email = (body.email or "").strip()
    if not email:
        errors.append({"field": "email", "message": "required"})
    else:
        try:
            email = validate_email(email, check_deliverability=False).normalized
        except EmailNotValidError:
            errors.append({"field": "email", "message": "invalid_email"})

    if not body.phone or not body.phone.strip():
        errors.append({"field": "phone", "message": "required"})

    if not body.password or len(body.password) < MIN_PASSWORD_LENGTH:
        errors.append({"field": "password", "message": "weak_password"})

    if errors:
        return JSONResponse(status_code=422, content={"detail": errors})

    existing = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if existing is not None:
        return _code(409, "email_in_use")

    user = User(
        email=email,
        full_name=body.full_name,
        phone=body.phone,
        role="patient",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent registration won the race: nothing partial is left behind.
        db.rollback()
        return _code(409, "email_in_use")
    db.refresh(user)

    token, _ = create_session(db, user)
    return {"token": token, "landing": LANDING_BY_ROLE[user.role], "user": _user_payload(user)}


@router.post("/login")
def login(body: LoginRequest, db: DBSession = Depends(get_db)):  # noqa: B008
    """Authenticate and open an additional session (AC-005, AC-006, AC-009)."""
    user = db.query(User).filter(func.lower(User.email) == body.email.lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail=_GENERIC_LOGIN_DETAIL)
    if not user.is_active:
        return _code(403, "account_inactive")

    token, _ = create_session(db, user)
    return {"token": token, "landing": LANDING_BY_ROLE[user.role], "user": _user_payload(user)}


@router.post("/logout", status_code=204)
def logout(
    authorization: str = Header(),
    user: User = Depends(current_user),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> Response:
    """Revoke only the caller's current token (AC-007)."""
    raw_token = authorization.removeprefix("Bearer ").strip()
    session: SessionModel | None = find_session_by_token(db, raw_token)
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
        session.revoked_reason = "logout"
        db.add(session)
        db.commit()
    return Response(status_code=204)


@router.get("/me")
def me(user: User = Depends(current_user)) -> dict[str, object]:  # noqa: B008
    """The signed-in user's own profile."""
    return _user_payload(user)


__all__ = ["router", "LANDING_BY_ROLE"]
