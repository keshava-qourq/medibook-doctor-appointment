"""Term-driven doctor search (US-010-2).

A patient types a disease, symptom or specialization term; it is resolved
through the catalogue mapping table to active specializations, and the active
doctors of those specializations are returned. Resolution is a plain
deterministic table lookup -- no AI/ML (NFR-012): a term absent from the
catalogue, soft-deleted, or mapping only to deactivated specializations
resolves to nothing rather than a guessed match.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user
from app.database import get_db
from app.models import CatalogTerm, User, doctor_specializations
from app.routers.doctors import doctor_card

router = APIRouter(prefix="/api", tags=["search"])


def _doctor_spec_map(db: DBSession, spec_ids: list[str]) -> dict[str, set[str]]:
    """Map each doctor id to the subset of ``spec_ids`` it is associated with."""
    stmt = select(
        doctor_specializations.c.doctor_id, doctor_specializations.c.specialization_id
    ).where(doctor_specializations.c.specialization_id.in_(spec_ids))
    out: dict[str, set[str]] = {}
    for doctor_id, specialization_id in db.execute(stmt):
        out.setdefault(doctor_id, set()).add(specialization_id)
    return out


def _page(
    doctors: list[dict[str, object]],
    specializations: list[dict[str, object]],
    resolution: str,
    limit: int,
    offset: int,
) -> dict[str, object]:
    """The search response shape: a page of doctor cards plus how the term resolved."""
    page = doctors[offset : offset + limit]
    return {
        "items": page,
        "total": len(doctors),
        "resolution": resolution,
        "specializations": specializations,
        "doctors": page,
    }


@router.get("/search/doctors")
def search_doctors(
    term: str = Query(default=""),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    needle = term.strip()

    # Deterministic table lookup: exact (case-insensitive) match on a non-deleted
    # catalogue term. A soft-deleted term stops resolving (NFR-012, AC-040).
    row = (
        db.query(CatalogTerm)
        .filter(
            func.lower(CatalogTerm.term) == needle.lower(),
            CatalogTerm.is_deleted.is_(False),
        )
        .first()
        if needle
        else None
    )
    if row is None:
        return _page([], [], "no_match", limit, offset)

    # Only active specializations resolve; deactivated ones are excluded (AC-025).
    active_specs = [s for s in row.specializations if s.is_active]
    specializations = [{"id": s.id, "name": s.name} for s in active_specs]
    if not active_specs:
        return _page([], specializations, "no_specialist_available", limit, offset)

    spec_ids = [s.id for s in active_specs]
    doctor_specs = _doctor_spec_map(db, spec_ids)
    spec_names = {s.id: s.name for s in active_specs}
    rows = (
        db.query(User)
        .filter(
            User.id.in_(list(doctor_specs)),
            User.role == "doctor",
            User.is_active.is_(True),
        )
        .order_by(User.full_name.asc(), User.id.asc())
        .all()
    )
    doctors = [
        doctor_card(
            d,
            [{"id": sid, "name": spec_names[sid]} for sid in sorted(doctor_specs[d.id])],
        )
        for d in rows
    ]
    resolution = "matched" if doctors else "no_specialist_available"
    return _page(doctors, specializations, resolution, limit, offset)


__all__ = ["router"]
