"""Admin-only doctor profile surface (US-010-2 support).

The only behaviour this ticket needs is giving a doctor its specializations so
term-driven search can resolve a term to the doctors of its specializations
(AC-039). The doctor<->specialization association lives in a minimal read model
table, ``doctor_specializations``, created on first use so this router never
alters another component's SQLAlchemy models (the table is owned by a later
sprint and read elsewhere through plain SQL).
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session as DBSession

from app.auth import require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Specialization, User

router = APIRouter(
    prefix="/api/admin",
    tags=["doctors"],
    dependencies=[Depends(require_role("admin"))],
)


class DoctorProfileUpdate(BaseModel):
    """Only ``specialization_ids`` drives search; the other profile fields are
    accepted (and ignored) so the contract body is honoured without a wider
    profile model this ticket does not need."""

    specialization_ids: list[str] = Field(default_factory=list)
    display_name: str | None = None
    qualifications: str | None = None
    biography: str | None = None
    room_location: str | None = None
    consultation_fee: float | None = None
    is_active: bool | None = None


def _ensure_table(db: DBSession) -> None:
    """Create the association read model if it does not exist yet, so linking a
    doctor works whether or not the owning sprint's migration has landed."""
    bind = db.get_bind()
    if not inspect(bind).has_table("doctor_specializations"):
        db.execute(
            text(
                "CREATE TABLE IF NOT EXISTS doctor_specializations "
                "(doctor_id VARCHAR(36) NOT NULL, specialization_id VARCHAR(36) NOT NULL)"
            )
        )


@router.put("/doctors/{doctor_id}")
def update_doctor(
    doctor_id: str,
    payload: DoctorProfileUpdate,
    db: DBSession = Depends(get_db),  # noqa: B008
):
    doctor = db.get(User, doctor_id)
    if doctor is None or doctor.role != "doctor":
        raise EmptyBodyHTTPError(404)

    valid_ids = {
        row.id
        for row in db.query(Specialization).filter(
            Specialization.id.in_(payload.specialization_ids)
        )
    }
    _ensure_table(db)
    db.execute(
        text("DELETE FROM doctor_specializations WHERE doctor_id = :d"),
        {"d": doctor_id},
    )
    for spec_id in payload.specialization_ids:
        if spec_id in valid_ids:
            db.execute(
                text(
                    "INSERT INTO doctor_specializations (doctor_id, specialization_id) "
                    "VALUES (:d, :s)"
                ),
                {"d": doctor_id, "s": spec_id},
            )
    db.commit()

    linked = sorted(sid for sid in payload.specialization_ids if sid in valid_ids)
    return JSONResponse(
        status_code=200,
        content={"id": doctor_id, "specialization_ids": linked},
    )


__all__ = ["router"]
