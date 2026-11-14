"""Doctor directory (US-011-1) and the admin doctor-profile surface.

Giving a doctor its specializations is what lets term-driven search resolve a
term to the doctors of its specializations (AC-039). The link is stored in the
``doctor_specializations`` association table. The directory endpoints expose
the same doctor card the search results carry.

The consultation fee is informational text only: nothing here accepts a
payment, upload or telemedicine action (NFR-013).
"""

from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Appointment, Specialization, User, doctor_specializations

router = APIRouter(
    prefix="/api/admin",
    tags=["doctors"],
    dependencies=[Depends(require_role("admin"))],
)

public_router = APIRouter(prefix="/api", tags=["doctors"])


def doctor_specialization_names(db: DBSession, doctor_ids: list[str]) -> dict[str, list[dict]]:
    """Active specializations, as ``{id, name}``, for each of the given doctors."""
    if not doctor_ids:
        return {}
    stmt = (
        select(
            doctor_specializations.c.doctor_id,
            Specialization.id,
            Specialization.name,
        )
        .join(Specialization, Specialization.id == doctor_specializations.c.specialization_id)
        .where(
            doctor_specializations.c.doctor_id.in_(doctor_ids),
            Specialization.is_active.is_(True),
        )
        .order_by(Specialization.name.asc())
    )
    out: dict[str, list[dict]] = {}
    for doctor_id, spec_id, name in db.execute(stmt):
        out.setdefault(doctor_id, []).append({"id": spec_id, "name": name})
    return out


def doctor_card(doctor: User, specializations: list[dict]) -> dict[str, object]:
    """The DoctorCard shape every doctor-returning endpoint shares."""
    fee = doctor.consultation_fee
    return {
        "id": doctor.id,
        "full_name": doctor.full_name,
        "specializations": specializations,
        "specialization_ids": [s["id"] for s in specializations],
        "qualifications": doctor.qualifications,
        "bio": doctor.bio,
        "location": doctor.location,
        "consultation_fee": float(fee) if fee is not None else None,
        "is_active": doctor.is_active and doctor.profile_active,
    }


def doctor_is_visible(doctor: User) -> bool:
    """A doctor appears in the directory, search and booking only while both the
    account and the directory profile are active."""
    return doctor.is_active and doctor.profile_active


def _future_appointment_count(db: DBSession, doctor_id: str) -> int:
    """Live (booked/confirmed) appointments of this doctor whose slot is still in
    the future. "Now" is the same instant in any timezone, so the clinic
    timezone's wall clock and UTC agree on which slots are still ahead."""
    now = datetime.now(UTC)
    rows = db.scalars(
        select(Appointment.slot_start).where(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_(("booked", "confirmed")),
        )
    ).all()
    return sum(
        1
        for start in rows
        if (start if start.tzinfo is not None else start.replace(tzinfo=UTC)) > now
    )


class DoctorProfileUpdate(BaseModel):
    """``specialization_ids`` drives search; the remaining fields are the
    doctor's informational profile. The consultation fee is text settled at the
    clinic -- no payment is ever taken here (NFR-013)."""

    full_name: str | None = None
    # Required by AC-027, but validated in the handler (after the 404 check) so a
    # missing doctor is still reported as 404 with an empty body.
    specialization_ids: list[str] | None = None
    qualifications: str | None = None
    bio: str | None = None
    location: str | None = None
    consultation_fee: Decimal | None = None
    is_active: bool | None = None


@router.put("/doctors/{doctor_id}")
def update_doctor(
    doctor_id: str,
    payload: DoctorProfileUpdate,
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    doctor = db.get(User, doctor_id)
    if doctor is None or doctor.role != "doctor":
        raise EmptyBodyHTTPError(404)

    if not payload.specialization_ids:
        # Nothing is written when the required list is empty or missing (AC-027).
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {
                        "field": "specialization_ids",
                        "msg": "At least one specialization is required",
                        "message": "At least one specialization is required",
                    }
                ]
            },
        )

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

    fields = payload.model_dump(exclude_unset=True)
    if fields.get("full_name"):
        doctor.full_name = fields["full_name"]
    for field in ("qualifications", "bio", "location", "consultation_fee"):
        if field in fields:
            setattr(doctor, field, fields[field])

    # ``is_active`` here is the doctor's directory visibility: hiding them must not
    # end their session or their access to appointments already booked (NFR-026),
    # so the account flag is left to /api/admin/users.
    was_active = doctor_is_visible(doctor)
    deactivating = fields.get("is_active") is False and was_active
    if "is_active" in fields and fields["is_active"] is not None:
        doctor.profile_active = fields["is_active"]

    affected = _future_appointment_count(db, doctor_id) if deactivating else 0

    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    specs = doctor_specialization_names(db, [doctor.id])
    card = doctor_card(doctor, specs.get(doctor.id, []))
    card["specialization_ids"] = linked
    card["affected_future_appointments"] = affected
    return card


@public_router.get("/doctors")
def list_doctors(
    specialization_id: str | None = Query(default=None),
    name: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """Active doctors only, filterable by specialization and a case-insensitive
    substring of the name (AC-046)."""
    query = db.query(User).filter(
        User.role == "doctor", User.is_active.is_(True), User.profile_active.is_(True)
    )
    if specialization_id:
        query = query.filter(
            User.id.in_(
                select(doctor_specializations.c.doctor_id).where(
                    doctor_specializations.c.specialization_id == specialization_id
                )
            )
        )
    if name and name.strip():
        query = query.filter(func.lower(User.full_name).like(f"%{name.strip().lower()}%"))

    total = query.count()
    rows = query.order_by(User.full_name.asc(), User.id.asc()).offset(offset).limit(limit).all()
    specs = doctor_specialization_names(db, [d.id for d in rows])
    return {
        "items": [doctor_card(d, specs.get(d.id, [])) for d in rows],
        "total": total,
    }


@public_router.get("/doctors/{doctor_id}")
def read_doctor(
    doctor_id: str,
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
):
    """The full card for an active doctor; an unknown, non-doctor or deactivated
    id is 404 ``doctor_unavailable`` so the cases are indistinguishable
    (AC-047/AC-048)."""
    doctor = db.get(User, doctor_id)
    if doctor is None or doctor.role != "doctor" or not doctor_is_visible(doctor):
        return JSONResponse(status_code=404, content={"code": "doctor_unavailable"})
    specs = doctor_specialization_names(db, [doctor.id])
    return doctor_card(doctor, specs.get(doctor.id, []))


__all__ = ["router", "public_router"]
