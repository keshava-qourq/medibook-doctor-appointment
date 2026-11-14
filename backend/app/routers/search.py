"""Term-driven doctor search (US-010-2).

A patient types a disease, symptom or specialization term; it is resolved
through the catalogue mapping table to active specializations, and the active
doctors of those specializations are returned. Resolution is a plain
deterministic table lookup -- no AI/ML (NFR-012): a term absent from the
catalogue, soft-deleted, or mapping only to deactivated specializations
resolves to nothing rather than a guessed match.

The doctor<->specialization association table (``doctor_specializations``) is
owned by a later sprint; it is read here through plain SQL, treating an absent
table as zero doctors, so this router never alters another component's model.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user
from app.database import get_db
from app.models import CatalogTerm, User

router = APIRouter(prefix="/api", tags=["search"])


def _doctor_spec_map(db: DBSession, spec_ids: list[str]) -> dict[str, set[str]]:
    """Map each doctor id to the subset of ``spec_ids`` it is associated with.

    Reads the ``doctor_specializations`` table directly; an absent table (its
    owning sprint has not landed) means no associations, so an empty map.
    """
    if not spec_ids:
        return {}
    bind = db.get_bind()
    if not inspect(bind).has_table("doctor_specializations"):
        return {}
    placeholders = ", ".join(f":s{i}" for i in range(len(spec_ids)))
    params = {f"s{i}": sid for i, sid in enumerate(spec_ids)}
    stmt = text(
        "SELECT doctor_id, specialization_id FROM doctor_specializations "  # noqa: S608 -- placeholders only
        f"WHERE specialization_id IN ({placeholders})"
    )
    out: dict[str, set[str]] = {}
    for doctor_id, specialization_id in db.execute(stmt, params):
        out.setdefault(doctor_id, set()).add(specialization_id)
    return out


@router.get("/search/doctors")
def search_doctors(
    term: str = Query(default=""),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    needle = term.strip()
    empty = {
        "items": [],
        "total": 0,
        "resolution": "no_match",
        "specializations": [],
        "doctors": [],
    }
    if not needle:
        return empty

    # Deterministic table lookup: exact (case-insensitive) match on a non-deleted
    # catalogue term. A soft-deleted term stops resolving (NFR-012, AC-040).
    row = (
        db.query(CatalogTerm)
        .filter(
            func.lower(CatalogTerm.term) == needle.lower(),
            CatalogTerm.is_deleted.is_(False),
        )
        .first()
    )
    if row is None:
        return empty

    # Only active specializations resolve; deactivated ones are excluded (AC-025).
    active_specs = [s for s in row.specializations if s.is_active]
    spec_ids = [s.id for s in active_specs]
    specializations = [{"id": s.id, "name": s.name} for s in active_specs]

    if not spec_ids:
        return {
            "items": [],
            "total": 0,
            "resolution": "no_specialist_available",
            "specializations": specializations,
            "doctors": [],
        }

    doctor_specs = _doctor_spec_map(db, spec_ids)
    doctor_ids = list(doctor_specs)

    doctors: list[dict[str, object]] = []
    if doctor_ids:
        active_spec_set = set(spec_ids)
        rows = (
            db.query(User)
            .filter(
                User.id.in_(doctor_ids),
                User.role == "doctor",
                User.is_active.is_(True),
            )
            .order_by(User.full_name.asc(), User.id.asc())
            .all()
        )
        for d in rows:
            doctors.append(
                {
                    "id": d.id,
                    "full_name": d.full_name,
                    "specialization_ids": sorted(doctor_specs[d.id] & active_spec_set),
                }
            )

    total = len(doctors)
    page = doctors[offset : offset + limit]
    resolution = "matched" if total else "no_specialist_available"
    return {
        "items": page,
        "total": total,
        "resolution": resolution,
        "specializations": specializations,
        "doctors": page,
    }


__all__ = ["router"]
