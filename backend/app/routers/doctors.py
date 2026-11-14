"""Doctor directory (US-011-1) and the admin doctor-profile surface.

Giving a doctor its specializations is what lets term-driven search resolve a
term to the doctors of its specializations (AC-039). The link is stored in the
``doctor_specializations`` association table. The directory endpoints expose
the same doctor card the search results carry.

The consultation fee is informational text only: nothing here accepts a
payment, upload or telemedicine action (NFR-013).
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Specialization, User, doctor_specializations

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
        "consultation_fee": float(fee) if fee is not None else None,
        "is_active": doctor.is_active,
    }


class DoctorProfileUpdate(BaseModel):
    """``specialization_ids`` drives search; qualifications and the informational
    consultation fee are stored on the doctor's profile. Any other field in the
    contract body is accepted and ignored."""

    specialization_ids: list[str] = Field(default_factory=list)
    qualifications: str | None = None
    consultation_fee: Decimal | None = None


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

    fields = payload.model_dump(exclude_unset=True)
    if "qualifications" in fields:
        doctor.qualifications = fields["qualifications"]
    if "consultation_fee" in fields:
        doctor.consultation_fee = fields["consultation_fee"]
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    fee = doctor.consultation_fee
    return {
        "id": doctor_id,
        "specialization_ids": linked,
        "qualifications": doctor.qualifications,
        "consultation_fee": float(fee) if fee is not None else None,
    }


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
    query = db.query(User).filter(User.role == "doctor", User.is_active.is_(True))
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
    if doctor is None or doctor.role != "doctor" or not doctor.is_active:
        return JSONResponse(status_code=404, content={"code": "doctor_unavailable"})
    specs = doctor_specialization_names(db, [doctor.id])
    return doctor_card(doctor, specs.get(doctor.id, []))


__all__ = ["router", "public_router"]
