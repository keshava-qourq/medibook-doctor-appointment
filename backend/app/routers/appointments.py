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
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.auth import authorize_ownership, current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Appointment, User
from app.routers.settings import get_or_create_settings

router = APIRouter(prefix="/api", tags=["clinical"])

SLOT_MINUTES = 30


IN_PERSON_NOTE = (
    "This appointment is in person at the clinic. There is no remote consultation option."
)


class AppointmentCreate(BaseModel):
    doctor_id: str
    slot_start: datetime
    reason: str | None = None


def _as_aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes even for timezone-aware columns."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _fee_text(doctor: User) -> str:
    """Informational fee text, payable at the clinic -- never a payment surface
    (NFR-013)."""
    fee = doctor.consultation_fee
    if fee is None:
        return "Consultation fee payable at the clinic."
    return f"Consultation fee of {fee} is payable at the clinic."


def _confirmation(
    row: Appointment, doctor: User, tz: ZoneInfo, timezone_name: str
) -> dict[str, object]:
    """The full booking confirmation payload (AC-065, AC-069, NFR-013)."""
    return {
        "id": row.id,
        "doctor_id": row.doctor_id,
        "patient_id": row.patient_id,
        "doctor_name": doctor.full_name,
        "slot_start": _as_aware(row.slot_start).astimezone(tz).isoformat(),
        "slot_end": _as_aware(row.slot_end).astimezone(tz).isoformat(),
        "status": row.status,
        "timezone": timezone_name,
        "location": doctor.location,
        "fee_text": _fee_text(doctor),
        "reason": row.reason,
        "in_person_note": IN_PERSON_NOTE,
    }


def _zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):  # pragma: no cover -- settings validate it
        return ZoneInfo("UTC")


def _out(row: Appointment, tz: ZoneInfo, timezone_name: str) -> dict[str, object]:
    return {
        "id": row.id,
        "doctor_id": row.doctor_id,
        "patient_id": row.patient_id,
        "slot_start": _as_aware(row.slot_start).astimezone(tz).isoformat(),
        "slot_end": _as_aware(row.slot_end).astimezone(tz).isoformat(),
        "status": row.status,
        "cancellation_reason": row.cancellation_reason,
        "reason": row.reason,
        "timezone": timezone_name,
    }


@router.get("/appointments")
def list_appointments(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """Every appointment the caller is party to, cancelled ones included: a
    cancelled appointment stays visible to its patient with its reason (NFR-026).

    Upcoming items come first, ascending by slot start; past items follow,
    most recent first.
    """
    settings = get_or_create_settings(db)
    tz = _zone(settings.timezone)
    party = (Appointment.patient_id == user.id) | (Appointment.doctor_id == user.id)
    now = datetime.now(UTC)

    # Pagination is pushed into the query: upcoming items (slot_start > now) come
    # first ascending, then past items descending, and only one page is loaded.
    upcoming_q = (
        db.query(Appointment)
        .filter(party, Appointment.slot_start > now)
        .order_by(Appointment.slot_start.asc())
    )
    past_q = (
        db.query(Appointment)
        .filter(party, Appointment.slot_start <= now)
        .order_by(Appointment.slot_start.desc())
    )
    upcoming_total = upcoming_q.count()
    past_total = past_q.count()

    rows: list[Appointment] = []
    if offset < upcoming_total:
        rows = upcoming_q.offset(offset).limit(limit).all()
        remaining = limit - len(rows)
        if remaining > 0:
            rows += past_q.limit(remaining).all()
    else:
        rows = past_q.offset(offset - upcoming_total).limit(limit).all()

    return {
        "items": [_out(r, tz, settings.timezone) for r in rows],
        "total": upcoming_total + past_total,
    }


@router.post("/appointments", status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    patient: User = Depends(require_role("patient")),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
):
    """Book a slot. The patient comes from the verified token, never the body."""
    settings = get_or_create_settings(db)
    tz = _zone(settings.timezone)
    doctor = db.get(User, payload.doctor_id)
    if doctor is None:
        raise EmptyBodyHTTPError(403)
    bookable = doctor.is_active and doctor.profile_active and doctor.role == "doctor"
    if not bookable:
        raise EmptyBodyHTTPError(403)

    slot_start = _as_aware(payload.slot_start)

    # A slot within the booking cutoff is refused 403 cutoff_passed.
    cutoff = timedelta(hours=settings.booking_cutoff_hours)
    if slot_start - datetime.now(UTC) < cutoff:
        return JSONResponse(status_code=403, content={"code": "cutoff_passed"})

    # The same patient already holds a booked appointment with this doctor at this
    # slot: refuse, pointing at the existing appointment (AC-068).
    own = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.patient_id == patient.id,
            Appointment.slot_start == slot_start,
            Appointment.status != "cancelled",
        )
        .first()
    )
    if own is not None:
        return JSONResponse(
            status_code=409,
            content={"code": "duplicate_appointment", "existing_appointment_id": own.id},
        )

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
        reason=payload.reason,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        # The uniqueness constraint lost the race inside the transaction: nothing
        # partial is written and the slot stays as it was (AC-066, AC-067, NFR-014).
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "slot_taken"})
    db.refresh(row)
    return _confirmation(row, doctor, tz, settings.timezone)


@router.get("/appointments/{id}", status_code=200)
def read_appointment(
    id: str,  # noqa: A002 -- matches the {id} path in the API contract
    user: User = Depends(current_user),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """Read one appointment the caller is party to; 403 empty body otherwise.

    A deactivated doctor's appointments stay readable to both parties (NFR-026).
    """
    settings = get_or_create_settings(db)
    tz = _zone(settings.timezone)
    row = db.get(Appointment, id)
    owner_id = None
    if row is not None and user.id in (row.patient_id, row.doctor_id):
        owner_id = user.id
    authorize_ownership(owner_id, user)
    return _out(row, tz, settings.timezone)


@router.get("/consultations/{id}", status_code=200)
def read_consultation(id: str, user: User = Depends(current_user)) -> dict[str, object]:  # noqa: A002, B008
    """Read one consultation the caller owns; 403 empty body otherwise."""
    owner_id = None  # No consultation storage yet: nothing resolves to an owner.
    authorize_ownership(owner_id, user)
    return {}  # pragma: no cover -- unreachable until consultations are stored.


__all__ = ["router"]
