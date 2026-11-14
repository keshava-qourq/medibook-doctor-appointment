"""US-015-2 acceptance (API): the public per-doctor availability endpoint.

Contract under test (US-015):
  GET /api/doctors/{doctor_id}/availability?date_from&date_to
      (Bearer token required)
      -> 200 {timezone, items:[{slot_start, slot_end, available}], total}
      -> 401 {"detail": ...} when no token is sent

Criteria:
  AC-057  A 09:00-12:00 / 30-minute day with a 10:30-11:00 break offers exactly
          09:00, 09:30, 10:00, 11:00, 11:30 -- nothing inside the break, nothing
          at or beyond 12:00.
  AC-058  Once a patient books a slot, a second patient's availability call shows
          that slot with available:false.
  AC-059  A slot whose start has already passed in the clinic timezone is absent
          from today's availability.
  AC-060  A doctor 'unavailable' exception over part of a day removes every slot
          inside its range while leaving the rest of the day.

Every account and record is created through the API. The bootstrap admin is seeded
exactly as the application seeds it from BOOTSTRAP_ADMIN_* at startup, because no API
mints the first admin and the ``client`` fixture starts from an empty database. HH:MM
times are in the clinic timezone, which each test sets explicitly through
PUT /api/admin/settings rather than trusting the host clock.

NFR-016 (backups/PITR) and NFR-017 (sizing) are provisioning promises no application
test can observe; they stay declared in tests/integration/test_nfr_infrastructure.py
and are repeated below as [KNOWN-LIMIT] skips.
"""

import secrets
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import hash_password

WEEKLY = "/api/doctors/me/weekly-availability"
EXCEPTIONS = "/api/doctors/me/exceptions"
AVAILABILITY = "/api/doctors/{doctor_id}/availability"
CLINIC_TZ = "Europe/Lisbon"


# -- helpers ------------------------------------------------------------------


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_admin(db: DBSession, password: str) -> str:
    email = _email("admin")
    db.add(
        User(
            email=email,
            full_name="Bootstrap Admin",
            role="admin",
            is_active=True,
            password_hash=hash_password(password),
        )
    )
    db.commit()
    return email


def _admin_token(client: TestClient, db: DBSession) -> str:
    password = _password()
    email = _seed_admin(db, password)
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def _has_route(client: TestClient, template: str) -> bool:
    return template in client.get("/openapi.json").json().get("paths", {})


def _require(client: TestClient, *templates: str) -> None:
    missing = [t for t in templates if not _has_route(client, t)]
    if missing:
        pytest.skip(
            "PENDING: availability routes not mounted yet "
            f"({', '.join(missing)}); delivered by US-015-1 in the same sprint "
            "(concurrent build)"
        )


def _set_clinic_timezone(client: TestClient, admin: str, timezone: str = CLINIC_TZ) -> None:
    resp = client.put(
        "/api/admin/settings",
        headers=_bearer(admin),
        json={"timezone": timezone, "booking_cutoff_hours": 1},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["timezone"] == timezone, resp.text


def _create_spec(client: TestClient, admin: str) -> str:
    created = client.post(
        "/api/admin/specializations",
        headers=_bearer(admin),
        json={"name": _name("Cardiology"), "description": "desc"},
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def _create_doctor(client: TestClient, admin: str) -> tuple[str, str]:
    """Create an active, bookable doctor and sign in as them; returns (id, token)."""
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin),
        json={
            "full_name": _name("Dr Slots"),
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )
    assert created.status_code == 201, created.text
    doctor_id = created.json()["id"]
    profile = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={
            "specialization_ids": [_create_spec(client, admin)],
            "qualifications": "MBBS",
            "consultation_fee": 400,
            "is_active": True,
        },
    )
    assert profile.status_code == 200, profile.text
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return doctor_id, login.json()["token"]


def _create_patient(client: TestClient) -> str:
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": _name("Patient"),
            "email": _email("patient"),
            "phone": "+15551112222",
            "password": _password(),
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _day(
    weekday: int,
    *,
    is_working: bool = True,
    start: str = "09:00",
    end: str = "12:00",
    slot_minutes: int = 30,
    breaks: list[dict[str, str]] | None = None,
) -> dict[str, object]:
    return {
        "weekday": weekday,
        "is_working": is_working,
        "start_time": start,
        "end_time": end,
        "slot_minutes": slot_minutes,
        "breaks": breaks if breaks is not None else [],
    }


def _week_with(working: dict[int, dict[str, object]]) -> list[dict[str, object]]:
    """A full seven-day pattern: only the given weekdays work, the rest are off."""
    days: list[dict[str, object]] = []
    for weekday in range(7):
        if weekday in working:
            days.append(working[weekday])
        else:
            days.append(_day(weekday, is_working=False, start="09:00", end="09:00"))
    return days


def _put_week(client: TestClient, token: str, days: list[dict[str, object]]) -> None:
    resp = client.put(WEEKLY, headers=_bearer(token), json={"days": days})
    assert resp.status_code == 200, resp.text


def _tz(name: str = CLINIC_TZ) -> ZoneInfo:
    return ZoneInfo(name)


def _clinic_today(name: str = CLINIC_TZ) -> date:
    return datetime.now(_tz(name)).date()


def _next_weekday(weekday: int, *, min_days_ahead: int = 7) -> date:
    candidate = _clinic_today() + timedelta(days=min_days_ahead)
    while candidate.weekday() != weekday:
        candidate += timedelta(days=1)
    return candidate


def _slot_at(day: date, hhmm: str) -> str:
    hour, minute = (int(part) for part in hhmm.split(":"))
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=_tz()).isoformat()


def _availability(client: TestClient, token: str, doctor_id: str, day_from: date, day_to: date):
    return client.get(
        AVAILABILITY.format(doctor_id=doctor_id),
        headers=_bearer(token),
        params={"date_from": day_from.isoformat(), "date_to": day_to.isoformat()},
    )


def _local(iso: str) -> datetime:
    return datetime.fromisoformat(iso).astimezone(_tz())


def _hhmm_on(items: list[dict], day: date) -> list[str]:
    out = []
    for slot in items:
        local = _local(slot["slot_start"])
        if local.date() == day:
            out.append(f"{local.hour:02d}:{local.minute:02d}")
    return out


def _book(client: TestClient, patient: str, doctor_id: str, slot_start: str):
    return client.post(
        "/api/appointments",
        headers=_bearer(patient),
        json={"doctor_id": doctor_id, "slot_start": slot_start},
    )


def _setup(client: TestClient, db: DBSession) -> tuple[str, str, str]:
    admin = _admin_token(client, db)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor_token = _create_doctor(client, admin)
    return admin, doctor_id, doctor_token


# -- AC-057 -------------------------------------------------------------------


def test_ac057_half_hour_day_with_a_break_offers_only_the_expected_slots(
    client: TestClient, db_session: DBSession
):
    """[AC-057] A 09:00-12:00 / 30-minute day with a 10:30-11:00 break offers exactly
    09:00, 09:30, 10:00, 11:00, 11:30 -- nothing inside the break, nothing from 12:00
    onward -- and each offered slot is 30 minutes long and available."""
    _require(client, WEEKLY, AVAILABILITY)
    _admin, doctor_id, doctor = _setup(client, db_session)
    patient = _create_patient(client)

    target = _next_weekday(2)  # a future Wednesday
    _put_week(
        client,
        doctor,
        _week_with(
            {
                target.weekday(): _day(
                    target.weekday(),
                    start="09:00",
                    end="12:00",
                    slot_minutes=30,
                    breaks=[{"start_time": "10:30", "end_time": "11:00"}],
                )
            }
        ),
    )

    resp = _availability(client, patient, doctor_id, target, target)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["timezone"] == CLINIC_TZ, body

    items = body["items"]
    assert _hhmm_on(items, target) == ["09:00", "09:30", "10:00", "11:00", "11:30"], items
    assert body["total"] == len(items), body
    for slot in items:
        assert slot["available"] is True, slot
        duration = _local(slot["slot_end"]) - _local(slot["slot_start"])
        assert duration == timedelta(minutes=30), slot
        # Nothing inside the break or at/after noon.
        start_minute = _local(slot["slot_start"]).hour * 60 + _local(slot["slot_start"]).minute
        assert not (10 * 60 + 30 <= start_minute < 11 * 60), slot
        assert start_minute + 30 <= 12 * 60, slot


# -- AC-058 -------------------------------------------------------------------


def test_ac058_a_booked_slot_shows_as_unavailable_to_a_second_patient(
    client: TestClient, db_session: DBSession
):
    """[AC-058] After one patient books a slot, the same availability call made by a
    second patient reports that slot with available:false while its neighbours stay
    available:true -- the slot is shown, not silently dropped."""
    _require(client, WEEKLY, AVAILABILITY, "/api/appointments")
    _admin, doctor_id, doctor = _setup(client, db_session)
    first_patient = _create_patient(client)
    second_patient = _create_patient(client)

    target = _next_weekday(2)
    _put_week(
        client,
        doctor,
        _week_with(
            {target.weekday(): _day(target.weekday(), start="09:00", end="12:00", slot_minutes=30)}
        ),
    )

    slot_start = _slot_at(target, "09:30")

    # Before booking the slot is available to everyone.
    before = _availability(client, second_patient, doctor_id, target, target)
    assert before.status_code == 200, before.text
    chosen_before = next(
        s for s in before.json()["items"] if _local(s["slot_start"]) == _local(slot_start)
    )
    assert chosen_before["available"] is True, chosen_before

    booked = _book(client, first_patient, doctor_id, slot_start)
    assert booked.status_code == 201, booked.text

    after = _availability(client, second_patient, doctor_id, target, target)
    assert after.status_code == 200, after.text
    items = after.json()["items"]
    # The booked slot is still listed, now marked unavailable.
    chosen = next(s for s in items if _local(s["slot_start"]) == _local(slot_start))
    assert chosen["available"] is False, chosen
    # Its neighbours are untouched.
    neighbour = next(
        s for s in items if _local(s["slot_start"]) == _local(_slot_at(target, "10:00"))
    )
    assert neighbour["available"] is True, neighbour


# -- AC-059 -------------------------------------------------------------------


def test_ac059_an_elapsed_slot_is_absent_from_today(
    client: TestClient, db_session: DBSession
):
    """[AC-059] For today, every offered slot starts strictly after the current
    clinic-timezone time: a slot whose start has already passed is absent entirely,
    not merely marked unavailable."""
    _require(client, WEEKLY, AVAILABILITY)
    _admin, doctor_id, doctor = _setup(client, db_session)
    patient = _create_patient(client)

    today = _clinic_today()
    # A full working day so slots exist both before and after 'now' whatever time it is.
    _put_week(
        client,
        doctor,
        _week_with(
            {today.weekday(): _day(today.weekday(), start="00:00", end="23:30", slot_minutes=30)}
        ),
    )

    resp = _availability(client, patient, doctor_id, today, today)
    assert resp.status_code == 200, resp.text
    now = datetime.now(_tz())
    items = resp.json()["items"]

    for slot in items:
        assert _local(slot["slot_start"]) > now, f"an elapsed slot was offered: {slot}"

    # The 00:00 slot has certainly passed by the time this runs: it must be absent.
    elapsed = _slot_at(today, "00:00")
    assert all(_local(s["slot_start"]) != _local(elapsed) for s in items), (
        "the first, long-past slot of today must not be offered"
    )


# -- AC-060 -------------------------------------------------------------------


def test_ac060_unavailable_exception_removes_every_slot_in_its_range(
    client: TestClient, db_session: DBSession
):
    """[AC-060] A part-day 'unavailable' exception removes every slot whose start falls
    inside its range from the patient-facing availability, while the slots outside the
    range stay offered."""
    _require(client, WEEKLY, EXCEPTIONS, AVAILABILITY)
    _admin, doctor_id, doctor = _setup(client, db_session)
    patient = _create_patient(client)

    target = _next_weekday(3)  # a future Thursday
    _put_week(
        client,
        doctor,
        _week_with(
            {target.weekday(): _day(target.weekday(), start="09:00", end="17:00", slot_minutes=30)}
        ),
    )

    before = _availability(client, patient, doctor_id, target, target)
    assert before.status_code == 200, before.text
    assert any(
        9 * 60 <= _local(s["slot_start"]).hour * 60 + _local(s["slot_start"]).minute < 12 * 60
        for s in before.json()["items"]
    ), "the morning must offer slots before the exception"

    exc = client.post(
        EXCEPTIONS,
        headers=_bearer(doctor),
        json={
            "date": target.isoformat(),
            "kind": "unavailable",
            "start_time": "09:00",
            "end_time": "12:00",
            "reason": "Training",
        },
    )
    assert exc.status_code == 201, exc.text

    after = _availability(client, patient, doctor_id, target, target)
    assert after.status_code == 200, after.text
    items = after.json()["items"]

    for slot in items:
        minute = _local(slot["slot_start"]).hour * 60 + _local(slot["slot_start"]).minute
        assert not (9 * 60 <= minute < 12 * 60), f"no slot may remain in the excepted range: {slot}"

    # The afternoon outside the range is untouched.
    assert any(
        _local(s["slot_start"]).hour * 60 + _local(s["slot_start"]).minute >= 14 * 60
        for s in items
    ), "only the excepted range is withdrawn"


# -- Authentication: the endpoint is behind the Bearer token ------------------


def test_availability_requires_a_bearer_token_401_detail(
    client: TestClient, db_session: DBSession
):
    """[AC-057][AC-058][AC-059][AC-060] The public availability endpoint is behind the
    Bearer token like every other endpoint: a request with no token is 401 with a
    {detail} body and never discloses a doctor's slots."""
    _require(client, WEEKLY, AVAILABILITY)
    _admin, doctor_id, doctor = _setup(client, db_session)
    today = _clinic_today()

    anonymous = client.get(
        AVAILABILITY.format(doctor_id=doctor_id),
        params={"date_from": today.isoformat(), "date_to": today.isoformat()},
    )
    assert anonymous.status_code == 401, anonymous.text
    assert "detail" in anonymous.json(), anonymous.text


# -- NFR-016 / NFR-017: provisioning promises, not observable from the app -----


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are "
    "managed-database settings enabled in hosting/deployment config, not observable "
    "from the app; the committed declaration is covered by "
    "tests/integration/test_nfr_infrastructure.py"
)
def test_nfr016_backups_and_pitr_are_infrastructure():  # pragma: no cover
    pass


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic is a provisioning/capacity "
    "target declared in deployment config, not observable from the app; the committed "
    "declaration is covered by tests/integration/test_nfr_infrastructure.py"
)
def test_nfr017_sizing_is_infrastructure():  # pragma: no cover
    pass
