"""Doctor weekly availability pattern (US-013-1).

A doctor owns one row per weekday (0=Monday..6=Sunday) holding whether they
work that day, the working hours and the slot length, plus any number of
breaks inside those hours. Times are stored as local clinic ``HH:MM``; the
clinic timezone comes from ``ClinicSettings``.

The PUT replaces the whole pattern in one transaction. When the save is
rejected nothing is written and the previously saved pattern stays in force
(NFR-022). Appointments already booked outside the new hours are reported back
as a warning and are never deleted or cancelled (NFR-026).
"""

from datetime import UTC, datetime, timedelta
from datetime import date as date_cls
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import (
    Appointment,
    AvailabilityBreak,
    DoctorAvailabilityException,
    DoctorWeeklyAvailability,
    User,
)
from app.routers.settings import get_or_create_settings

router = APIRouter(prefix="/api/doctors/me", tags=["availability"])
public_router = APIRouter(prefix="/api/doctors", tags=["availability"])

_require_doctor = require_role("doctor")

DEFAULT_SLOT_MINUTES = 30
MAX_RANGE_DAYS = 62

WEEKDAYS = range(7)


class BreakIn(BaseModel):
    start_time: str
    end_time: str


class DayIn(BaseModel):
    weekday: int
    is_working: bool = False
    start_time: str | None = None
    end_time: str | None = None
    slot_minutes: int | None = None
    breaks: list[BreakIn] = []


class WeeklyAvailabilityIn(BaseModel):
    days: list[DayIn]


def _minutes(value: str) -> int | None:
    """Parse ``HH:MM`` to minutes past midnight; None when unparseable."""
    parts = value.split(":") if isinstance(value, str) else []
    if len(parts) < 2:
        return None
    try:
        hours, mins = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= hours <= 23 and 0 <= mins <= 59):
        return None
    return hours * 60 + mins


def _errors(payload: WeeklyAvailabilityIn) -> list[dict[str, str]]:
    """Every offending field, named as ``days[i].<field>`` (AC-050, AC-051)."""
    errors: list[dict[str, str]] = []
    for index, day in enumerate(payload.days):
        if day.weekday not in WEEKDAYS:
            errors.append(
                {"field": f"days[{index}].weekday", "msg": "Weekday must be between 0 and 6"}
            )
            continue
        if not day.is_working:
            continue

        start = _minutes(day.start_time or "")
        end = _minutes(day.end_time or "")
        if start is None:
            errors.append(
                {"field": f"days[{index}].start_time", "msg": "Start time is required (HH:MM)"}
            )
        if end is None:
            errors.append(
                {"field": f"days[{index}].end_time", "msg": "End time is required (HH:MM)"}
            )
        if start is not None and end is not None and end <= start:
            errors.append(
                {
                    "field": f"days[{index}].end_time",
                    "msg": "End time must be later than start time",
                }
            )
        if day.slot_minutes is None or day.slot_minutes <= 0:
            errors.append(
                {
                    "field": f"days[{index}].slot_minutes",
                    "msg": "Slot length must be greater than zero",
                }
            )

        spans: list[tuple[int, int]] = []
        for b_index, brk in enumerate(day.breaks):
            b_start = _minutes(brk.start_time)
            b_end = _minutes(brk.end_time)
            if b_start is None or b_end is None or b_end <= b_start:
                msg = "Break end time must be later than its start time"
                errors.append({"field": f"days[{index}].breaks", "msg": msg})
                errors.append({"field": f"days[{index}].breaks[{b_index}].end_time", "msg": msg})
                continue
            if start is not None and end is not None and (b_start < start or b_end > end):
                msg = "Break must fall inside the working hours"
                errors.append({"field": f"days[{index}].breaks", "msg": msg})
                errors.append({"field": f"days[{index}].breaks[{b_index}].start_time", "msg": msg})
                continue
            spans.append((b_start, b_end))

        spans.sort()
        for (_, prev_end), (next_start, _) in zip(spans, spans[1:], strict=False):
            if next_start < prev_end:
                errors.append(
                    {
                        "field": f"days[{index}].breaks",
                        "msg": "Break periods may not overlap",
                    }
                )
                break
    return errors


def _rows(db: DBSession, doctor_id: str) -> dict[int, DoctorWeeklyAvailability]:
    rows = db.scalars(
        select(DoctorWeeklyAvailability).where(DoctorWeeklyAvailability.doctor_id == doctor_id)
    ).all()
    return {r.weekday: r for r in rows}


def _zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):  # pragma: no cover -- settings validate it
        return ZoneInfo("UTC")


def _day_out(weekday: int, row: DoctorWeeklyAvailability | None) -> dict[str, object]:
    if row is None:
        return {
            "weekday": weekday,
            "is_working": False,
            "start_time": None,
            "end_time": None,
            "slot_minutes": None,
            "breaks": [],
        }
    return {
        "weekday": row.weekday,
        "is_working": row.is_working,
        "start_time": row.start_time,
        "end_time": row.end_time,
        "slot_minutes": row.slot_minutes,
        "breaks": [
            {"start_time": b.start_time, "end_time": b.end_time}
            for b in sorted(row.breaks, key=lambda b: b.start_time)
        ],
    }


def _pattern(db: DBSession, doctor_id: str) -> list[dict[str, object]]:
    rows = _rows(db, doctor_id)
    return [_day_out(weekday, rows.get(weekday)) for weekday in WEEKDAYS]


def _as_aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _affected(
    db: DBSession, doctor_id: str, days: list[DayIn], tz: ZoneInfo
) -> list[dict[str, object]]:
    """Future booked/confirmed appointments that the new pattern no longer covers.

    They are reported, never touched (NFR-026).
    """
    by_weekday = {d.weekday: d for d in days}
    now = datetime.now(UTC)
    rows = db.execute(
        select(Appointment, User.full_name)
        .join(User, User.id == Appointment.patient_id)
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_(("booked", "confirmed")),
        )
        .order_by(Appointment.slot_start.asc())
    ).all()

    affected: list[dict[str, object]] = []
    for appointment, patient_name in rows:
        start = _as_aware(appointment.slot_start)
        if start <= now:
            continue
        local = start.astimezone(tz)
        day = by_weekday.get(local.weekday())
        minute = local.hour * 60 + local.minute
        covered = False
        if day is not None and day.is_working:
            day_start = _minutes(day.start_time or "")
            day_end = _minutes(day.end_time or "")
            if day_start is not None and day_end is not None:
                covered = day_start <= minute < day_end
                for brk in day.breaks:
                    b_start = _minutes(brk.start_time)
                    b_end = _minutes(brk.end_time)
                    if b_start is not None and b_end is not None and b_start <= minute < b_end:
                        covered = False
        if not covered:
            affected.append(
                {
                    "id": appointment.id,
                    "patient_name": patient_name,
                    "slot_start": local.isoformat(),
                    "status": appointment.status,
                }
            )
    return affected


@router.get("/weekly-availability")
def read_weekly_availability(
    doctor: User = Depends(_require_doctor),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """All seven weekdays plus the clinic timezone (AC-049)."""
    settings = get_or_create_settings(db)
    return {"timezone": settings.timezone, "days": _pattern(db, doctor.id)}


@router.put("/weekly-availability")
def replace_weekly_availability(
    payload: WeeklyAvailabilityIn,
    doctor: User = Depends(_require_doctor),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
):
    """Replace the whole pattern in one transaction (AC-049, AC-050, AC-052)."""
    settings = get_or_create_settings(db)

    errors = _errors(payload)
    if errors:
        # Nothing is written and the previous saved pattern stays in force.
        return JSONResponse(status_code=422, content={"detail": errors})

    affected = _affected(db, doctor.id, payload.days, _zone(settings.timezone))

    existing = _rows(db, doctor.id)
    for row in existing.values():
        db.delete(row)
    db.flush()
    for day in payload.days:
        row = DoctorWeeklyAvailability(
            doctor_id=doctor.id,
            weekday=day.weekday,
            is_working=day.is_working,
            start_time=day.start_time if day.is_working else None,
            end_time=day.end_time if day.is_working else None,
            slot_minutes=day.slot_minutes if day.is_working else None,
        )
        if day.is_working:
            row.breaks = [
                AvailabilityBreak(start_time=b.start_time, end_time=b.end_time) for b in day.breaks
            ]
        db.add(row)
    db.commit()

    return {
        "timezone": settings.timezone,
        "days": _pattern(db, doctor.id),
        "affected_appointments": affected,
        "affected_count": len(affected),
    }


# -- one-off exceptions (US-013-2) --------------------------------------------


class ExceptionIn(BaseModel):
    date: date_cls
    kind: str
    start_time: str | None = None
    end_time: str | None = None
    reason: str | None = None
    confirm: bool = False


def _exception_out(row: DoctorAvailabilityException) -> dict[str, object]:
    return {
        "id": row.id,
        "date": row.date.isoformat(),
        "kind": row.kind,
        "start_time": row.start_time,
        "end_time": row.end_time,
        "reason": row.reason,
    }


def _exception_errors(payload: ExceptionIn, today: date_cls) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if payload.kind not in ("unavailable", "extra_hours"):
        errors.append({"field": "kind", "msg": "Kind must be 'unavailable' or 'extra_hours'"})
    if payload.date < today:
        errors.append(
            {"field": "date", "msg": "Exceptions can only be set for today or future dates"}
        )

    has_times = payload.start_time is not None or payload.end_time is not None
    if payload.kind == "extra_hours" and not has_times:
        errors.append(
            {"field": "start_time", "msg": "Extra hours require a start time and an end time"}
        )
    elif has_times:
        start = _minutes(payload.start_time or "")
        end = _minutes(payload.end_time or "")
        if start is None:
            errors.append({"field": "start_time", "msg": "Start time is required (HH:MM)"})
        if end is None:
            errors.append({"field": "end_time", "msg": "End time is required (HH:MM)"})
        if start is not None and end is not None and end <= start:
            errors.append({"field": "end_time", "msg": "End time must be later than start time"})
    return errors


def _clinic_today(tz: ZoneInfo) -> date_cls:
    return datetime.now(tz).date()


def _covered_appointments(
    db: DBSession,
    doctor_id: str,
    day: date_cls,
    start_minute: int | None,
    end_minute: int | None,
    tz: ZoneInfo,
) -> list[tuple[Appointment, str]]:
    """Live appointments of this doctor that fall inside the excepted period.

    A full-day leave is signalled by both ``start_minute`` and ``end_minute``
    being ``None`` (no times were given), and then every appointment on the day
    is covered. When times are given, validation guarantees both are present and
    parseable, so a half-open window ``[start, end)`` is always used and the
    whole-day fallback cannot over-cancel from a partial/unparsed time.
    """
    whole_day = start_minute is None and end_minute is None
    rows = db.execute(
        select(Appointment, User.full_name)
        .join(User, User.id == Appointment.patient_id)
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_(("booked", "confirmed")),
        )
        .order_by(Appointment.slot_start.asc())
    ).all()
    covered: list[tuple[Appointment, str]] = []
    for appointment, patient_name in rows:
        local = _as_aware(appointment.slot_start).astimezone(tz)
        if local.date() != day:
            continue
        minute = local.hour * 60 + local.minute
        if not whole_day and not (start_minute <= minute < end_minute):
            continue
        covered.append((appointment, patient_name))
    return covered


@router.get("/exceptions")
def list_exceptions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    doctor: User = Depends(_require_doctor),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """This doctor's own exceptions, newest date first (AC-053)."""
    query = db.query(DoctorAvailabilityException).filter(
        DoctorAvailabilityException.doctor_id == doctor.id
    )
    total = query.count()
    rows = query.order_by(DoctorAvailabilityException.date.asc()).offset(offset).limit(limit).all()
    return {"items": [_exception_out(r) for r in rows], "total": total}


@router.post("/exceptions", status_code=201)
def create_exception(
    payload: ExceptionIn,
    doctor: User = Depends(_require_doctor),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
):
    """Add one-off leave or extra hours, confirming any cancellation first
    (AC-054, AC-055, AC-056)."""
    settings = get_or_create_settings(db)
    tz = _zone(settings.timezone)

    errors = _exception_errors(payload, _clinic_today(tz))
    if errors:
        # Nothing is written when any field is invalid (NFR-022).
        return JSONResponse(status_code=422, content={"detail": errors})

    cancelled: list[dict[str, object]] = []
    if payload.kind == "unavailable":
        start_minute = _minutes(payload.start_time) if payload.start_time else None
        end_minute = _minutes(payload.end_time) if payload.end_time else None
        covered = _covered_appointments(db, doctor.id, payload.date, start_minute, end_minute, tz)
        if covered and not payload.confirm:
            # Nothing is written until the doctor confirms (AC-054).
            return JSONResponse(
                status_code=409,
                content={
                    "code": "confirmation_required",
                    "affected_appointments": [
                        {
                            "id": a.id,
                            "patient_name": name,
                            "slot_start": _as_aware(a.slot_start).astimezone(tz).isoformat(),
                            "status": a.status,
                        }
                        for a, name in covered
                    ],
                },
            )
        reason = payload.reason or "Doctor unavailable"
        for appointment, name in covered:
            # Cancelled, never deleted: the row stays readable to both parties
            # with its reason (NFR-026).
            appointment.status = "cancelled"
            appointment.cancellation_reason = reason
            appointment.cancelled_by = doctor.id
            db.add(appointment)
            cancelled.append(
                {
                    "id": appointment.id,
                    "patient_name": name,
                    "slot_start": _as_aware(appointment.slot_start).astimezone(tz).isoformat(),
                    "status": "cancelled",
                }
            )

    row = DoctorAvailabilityException(
        doctor_id=doctor.id,
        date=payload.date,
        kind=payload.kind,
        start_time=payload.start_time,
        end_time=payload.end_time,
        reason=payload.reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    out = _exception_out(row)
    out["cancelled_appointments"] = cancelled
    return out


@router.delete("/exceptions/{id}", status_code=204)
def delete_exception(
    id: str,  # noqa: A002 -- matches the {id} path in the API contract
    doctor: User = Depends(_require_doctor),  # noqa: B008
    db: DBSession = Depends(get_db),  # noqa: B008
) -> Response:
    """Remove one of this doctor's exceptions; another doctor's or an unknown
    id is 403 with an empty body."""
    row = db.get(DoctorAvailabilityException, id)
    if row is None or row.doctor_id != doctor.id:
        raise EmptyBodyHTTPError(403)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


# -- generated slots ----------------------------------------------------------


def _subtract(
    windows: list[tuple[int, int]], blocked: list[tuple[int, int]]
) -> list[tuple[int, int]]:
    """Remove every blocked span from the given windows."""
    out = windows
    for b_start, b_end in blocked:
        nxt: list[tuple[int, int]] = []
        for w_start, w_end in out:
            if b_end <= w_start or b_start >= w_end:
                nxt.append((w_start, w_end))
                continue
            if w_start < b_start:
                nxt.append((w_start, b_start))
            if b_end < w_end:
                nxt.append((b_end, w_end))
        out = nxt
    return out


def _default_slot_minutes(rows: dict[int, DoctorWeeklyAvailability]) -> int:
    for weekday in WEEKDAYS:
        row = rows.get(weekday)
        if row is not None and row.is_working and row.slot_minutes:
            return row.slot_minutes
    return DEFAULT_SLOT_MINUTES


@public_router.get("/{doctor_id}/availability")
def read_availability(
    doctor_id: str,
    date_from: date_cls,
    date_to: date_cls,
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
) -> dict[str, object]:
    """Bookable slots from the weekly pattern plus exceptions (AC-053, AC-055)."""
    settings = get_or_create_settings(db)
    tz = _zone(settings.timezone)
    empty: dict[str, object] = {"timezone": settings.timezone, "items": [], "total": 0}

    doctor = db.get(User, doctor_id)
    if doctor is None or doctor.role != "doctor" or not doctor.is_active:
        return empty
    if not doctor.profile_active:
        return empty
    if date_to < date_from:
        return empty

    weekly = _rows(db, doctor_id)
    slot_fallback = _default_slot_minutes(weekly)
    exceptions = db.scalars(
        select(DoctorAvailabilityException).where(
            DoctorAvailabilityException.doctor_id == doctor_id,
            DoctorAvailabilityException.date >= date_from,
            DoctorAvailabilityException.date <= date_to,
        )
    ).all()
    by_date: dict[date_cls, list[DoctorAvailabilityException]] = {}
    for exc in exceptions:
        by_date.setdefault(exc.date, []).append(exc)

    booked = {
        _as_aware(start).astimezone(tz)
        for start in db.scalars(
            select(Appointment.slot_start).where(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_(("booked", "confirmed")),
            )
        ).all()
    }

    now = datetime.now(tz)
    items: list[dict[str, object]] = []
    day = date_from
    last = min(date_to, date_from + timedelta(days=MAX_RANGE_DAYS))
    while day <= last:
        day_exceptions = by_date.get(day, [])
        windows: list[tuple[int, int]] = []
        slot_minutes = slot_fallback

        row = weekly.get(day.weekday())
        if row is not None and row.is_working:
            start = _minutes(row.start_time or "")
            end = _minutes(row.end_time or "")
            if start is not None and end is not None and end > start:
                slot_minutes = row.slot_minutes or slot_fallback
                breaks = [(_minutes(b.start_time), _minutes(b.end_time)) for b in row.breaks]
                windows = _subtract(
                    [(start, end)],
                    [(s, e) for s, e in breaks if s is not None and e is not None],
                )

        for exc in day_exceptions:
            if exc.kind != "extra_hours":
                continue
            start = _minutes(exc.start_time or "")
            end = _minutes(exc.end_time or "")
            if start is not None and end is not None and end > start:
                windows.append((start, end))

        blocked: list[tuple[int, int]] = []
        for exc in day_exceptions:
            if exc.kind != "unavailable":
                continue
            start = _minutes(exc.start_time or "") if exc.start_time else 0
            end = _minutes(exc.end_time or "") if exc.end_time else 24 * 60
            if start is None or end is None:
                start, end = 0, 24 * 60
            blocked.append((start, end))
        windows = _subtract(windows, blocked)

        for w_start, w_end in sorted(windows):
            minute = w_start
            while minute + slot_minutes <= w_end:
                slot_start = datetime(
                    day.year, day.month, day.day, minute // 60, minute % 60, tzinfo=tz
                )
                minute += slot_minutes
                if slot_start <= now:
                    continue
                slot_end = slot_start + timedelta(minutes=slot_minutes)
                items.append(
                    {
                        "slot_start": slot_start.isoformat(),
                        "slot_end": slot_end.isoformat(),
                        "available": slot_start not in booked,
                    }
                )
        day += timedelta(days=1)

    items.sort(key=lambda s: s["slot_start"])
    return {"timezone": settings.timezone, "items": items, "total": len(items)}


__all__ = ["router", "public_router"]
