"""Clinical read-by-id endpoints guarded by ownership.

These mount the patient- and doctor-facing "read one record" surface so the
ownership contract (AC-015, AC-016) is enforceable: a request for a record that
belongs to someone else -- or an id that resolves to nothing -- is refused with
403 and an empty body, so the two cases cannot be told apart.

No appointment or consultation table exists yet (those land in later sprints),
so every id resolves to no owner today and the guard refuses it. When the
storage arrives, replace `None` below with the looked-up record's owner id.
"""

from fastapi import APIRouter, Depends

from app.auth import authorize_ownership, current_user
from app.models import User

router = APIRouter(prefix="/api", tags=["clinical"])


@router.get("/appointments/{id}", status_code=200)
def read_appointment(id: str, user: User = Depends(current_user)) -> dict[str, object]:  # noqa: A002, B008
    """Read one appointment the caller owns; 403 empty body otherwise."""
    owner_id = None  # No appointment storage yet: nothing resolves to an owner.
    authorize_ownership(owner_id, user)
    return {}  # pragma: no cover -- unreachable until appointments are stored.


@router.get("/consultations/{id}", status_code=200)
def read_consultation(id: str, user: User = Depends(current_user)) -> dict[str, object]:  # noqa: A002, B008
    """Read one consultation the caller owns; 403 empty body otherwise."""
    owner_id = None  # No consultation storage yet: nothing resolves to an owner.
    authorize_ownership(owner_id, user)
    return {}  # pragma: no cover -- unreachable until consultations are stored.


__all__ = ["router"]
