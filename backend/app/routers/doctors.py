"""Admin-only doctor profile surface (US-010-2 support).

Giving a doctor its specializations is what lets term-driven search resolve a
term to the doctors of its specializations (AC-039). The link is stored in the
``doctor_specializations`` association table.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session as DBSession

from app.auth import require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Specialization, User, doctor_specializations

router = APIRouter(
    prefix="/api/admin",
    tags=["doctors"],
    dependencies=[Depends(require_role("admin"))],
)


class DoctorProfileUpdate(BaseModel):
    """Only ``specialization_ids`` drives search; any other field in the
    contract body is accepted and ignored."""

    specialization_ids: list[str] = Field(default_factory=list)


@router.put("/doctors/{doctor_id}")
def update_doctor(
    doctor_id: str,
    payload: DoctorProfileUpdate,
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    doctor = db.get(User, doctor_id)
    if doctor is None or doctor.role != "doctor":
        raise EmptyBodyHTTPError(404)

    valid_ids = set(
        db.scalars(
            select(Specialization.id).where(Specialization.id.in_(payload.specialization_ids))
        )
    )
    linked = sorted(set(payload.specialization_ids) & valid_ids)
    db.execute(
        delete(doctor_specializations).where(doctor_specializations.c.doctor_id == doctor_id)
    )
    if linked:
        db.execute(
            insert(doctor_specializations),
            [{"doctor_id": doctor_id, "specialization_id": sid} for sid in linked],
        )
    db.commit()
    return {"id": doctor_id, "specialization_ids": linked}


__all__ = ["router"]
