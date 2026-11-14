"""Clinic-wide settings: the timezone and booking cutoff that every role's
times and cutoff checks resolve against (US-008-1).

A single ``ClinicSettings`` row holds the configuration. It is seeded idempotently
on startup and read here. Until an administrator saves, it reports the documented
default: ``timezone='UTC'`` with ``timezone_confirmed=false`` so the UI can flag
it unconfirmed (AC-033). GET is readable by any authenticated role; the PUT is
admin-only.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user, require_role
from app.database import get_db
from app.models import ClinicSettings, User
from app.schemas import ClinicSettingsOut, ClinicSettingsUpdate

SINGLETON_ID = "00000000-0000-4000-8000-000000000001"

public_router = APIRouter(prefix="/api", tags=["settings"])
admin_router = APIRouter(
    prefix="/api/admin",
    tags=["settings"],
    dependencies=[Depends(require_role("admin"))],
)


def get_or_create_settings(db: DBSession) -> ClinicSettings:
    """Return the singleton settings row, creating the documented default
    (UTC, unconfirmed) when none exists yet."""
    row = db.get(ClinicSettings, SINGLETON_ID)
    if row is None:
        row = ClinicSettings(
            id=SINGLETON_ID,
            timezone="UTC",
            booking_cutoff_hours=24,
            timezone_confirmed=False,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _to_out(row: ClinicSettings) -> ClinicSettingsOut:
    return ClinicSettingsOut(
        timezone=row.timezone,
        booking_cutoff_hours=row.booking_cutoff_hours,
        timezone_confirmed=row.timezone_confirmed,
    )


@public_router.get("/settings", response_model=ClinicSettingsOut)
def read_settings(
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
):
    return _to_out(get_or_create_settings(db))


@admin_router.put("/settings", response_model=ClinicSettingsOut)
def update_settings(
    payload: ClinicSettingsUpdate,
    db: DBSession = Depends(get_db),  # noqa: B008
):
    row = get_or_create_settings(db)
    row.timezone = payload.timezone
    row.booking_cutoff_hours = payload.booking_cutoff_hours
    row.timezone_confirmed = True
    row.updated_at = datetime.now(UTC)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


__all__ = ["public_router", "admin_router", "get_or_create_settings", "SINGLETON_ID"]
