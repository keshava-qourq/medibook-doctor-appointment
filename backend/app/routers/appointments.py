"""Appointments: a minimal booking surface plus the ownership-guarded reads.

A booking belongs to its patient and its doctor; anyone else -- or an id that
resolves to nothing -- is refused 403 with an empty body, so the two cases
cannot be told apart (AC-015, AC-016).

Deactivating a doctor never deletes, cancels or hides their appointments: the
rows stay and remain readable by their patient and by the doctor (NFR-026).
Nothing here accepts or returns a payment, checkout, invoice or refund field
(NFR-013).
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.auth import authorize_ownership, current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Appointment, User

router = APIRouter(prefix="/api", tags=["clinical"])

SLOT_MINUTES = 30


class AppointmentCreate(BaseModel):
    doctor_id: str
    slot_start: datetime


def _as_aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes even for timezone-aware columns."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _out(row: Appointment) -> dict[str, object]:
    return {
        "id": row.id,
        "doctor_id": row.doctor_id,
        "patient_id": row.patient_id,
        "slot_start": _as_aware(row.slot_start).isoformat(),
        "slot_end": _as_aware(row.slot_end).isoformat(),
        "status": row.status,
    }


@router.post("/appointments", status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    patient: User = Depends(require_role("patient")),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
):
    """Book a slot. The patient comes from the verified token, never the body."""
    doctor = db.get(User, payload.doctor_id)
    bookable = doctor is not None and doctor.is_active and doctor.profile_active
    if not bookable or doctor.role != "doctor":
        raise EmptyBodyHTTPError(403)

    slot_start = _as_aware(payload.slot_start)
    taken = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.slot_start == slot_start,
            Appointment.status != "cancelled",
        )
        .first()
    )
    if taken is not None:
        return JSONResponse(status_code=409, content={"code": "slot_taken"})

    row = Appointment(
        doctor_id=doctor.id,
        patient_id=patient.id,
        slot_start=slot_start,
        slot_end=slot_start + timedelta(minutes=SLOT_MINUTES),
        status="booked",
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "slot_taken"})
    db.refresh(row)
    return _out(row)


@router.get("/appointments/{id}", status_code=200)
def read_appointment(
    id: str,  # noqa: A002 -- matches the {id} path in the API contract
    user: User = Depends(current_user),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """Read one appointment the caller is party to; 403 empty body otherwise.

    A deactivated doctor's appointments stay readable to both parties (NFR-026).
    """
    row = db.get(Appointment, id)
    owner_id = None
    if row is not None and user.id in (row.patient_id, row.doctor_id):
        owner_id = user.id
    authorize_ownership(owner_id, user)
    return _out(row)


@router.get("/consultations/{id}", status_code=200)
def read_consultation(id: str, user: User = Depends(current_user)) -> dict[str, object]:  # noqa: A002, B008
    """Read one consultation the caller owns; 403 empty body otherwise."""
    owner_id = None  # No consultation storage yet: nothing resolves to an owner.
    authorize_ownership(owner_id, user)
    return {}  # pragma: no cover -- unreachable until consultations are stored.


__all__ = ["router"]
