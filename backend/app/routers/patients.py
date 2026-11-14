"""Patient self-service: read and update own profile, change own password (US-005-1).

Only a patient role may call these; a wrong role is refused 403 with an empty
body. Identity always comes from the verified bearer token, never the body, and
email is never mutated here.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DBSession

from app.auth import require_role
from app.database import get_db
from app.models import User
from app.schemas import PatientPasswordChange, PatientProfileOut, PatientProfileUpdate
from app.security import hash_password, verify_password

router = APIRouter(prefix="/api/patients", tags=["patients"])

_require_patient = require_role("patient")


def _to_out(user: User) -> PatientProfileOut:
    return PatientProfileOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
    )


@router.get("/me", response_model=PatientProfileOut)
def read_me(user: User = Depends(_require_patient)):  # noqa: B008
    return _to_out(user)


@router.patch("/me", response_model=PatientProfileOut)
def update_me(
    payload: PatientProfileUpdate,
    user: User = Depends(_require_patient),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
):
    fields = payload.model_dump(exclude_unset=True)
    for field, value in fields.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_out(user)


@router.post("/me/password")
def change_password(
    payload: PatientPasswordChange,
    user: User = Depends(_require_patient),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
):
    if not verify_password(payload.current_password, user.password_hash):
        return JSONResponse(
            status_code=422,
            content={"detail": [{"field": "current_password", "msg": "incorrect"}]},
        )
    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    return {"status": "ok"}


__all__ = ["router"]
