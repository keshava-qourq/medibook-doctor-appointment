"""Unit tests for one-off availability exceptions and generated slots (US-013-2)."""

import secrets
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import Appointment, DoctorAvailabilityException, User
from app.routers.settings import SINGLETON_ID, get_or_create_settings
from app.security import create_session, hash_password

CLINIC_TZ = "Europe/Lisbon"
EXCEPTIONS = "/api/doctors/me/exceptions"


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


def _tz() -> ZoneInfo:
    return ZoneInfo(CLINIC_TZ)


def _today() -> date:
    return datetime.now(_tz()).date()


def _next_weekday(weekday: int) -> date:
    candidate = _today() + timedelta(days=7)
    while candidate.weekday() != weekday:
        candidate += timedelta(days=1)
    return candidate


def _slot_at(day: date, hhmm: str) -> datetime:
    hour, minute = (int(p) for p in hhmm.split(":"))
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=_tz())


def _make_user(db: DBSession, role: str, active: bool = True) -> User:
    user = User(
        email=_email(role),
        full_name=f"{role.title()} {secrets.token_hex(3)}",
        role=role,
        is_active=active,
        password_hash=hash_password(_password()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(db: DBSession, user: User) -> dict[str, str]:
    raw_token, _ = create_session(db, user)
    return {"Authorization": f"Bearer {raw_token}"}


@pytest.fixture
def clinic(db_session: DBSession) -> None:
    row = get_or_create_settings(db_session)
    assert row.id == SINGLETON_ID
    row.timezone = CLINIC_TZ
    row.timezone_confirmed = True
    db_session.add(row)
    db_session.commit()


def _week(slot_minutes: int = 30, breaks: list[dict[str, str]] | None = None) -> list[dict]:
    days = []
    for weekday in range(7):
        if weekday <= 4:
            days.append(
                {
                    "weekday": weekday,
                    "is_working": True,
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "slot_minutes": slot_minutes,
                    "breaks": breaks if breaks is not None else [],
                }
            )
        else:
            days.append({"weekday": weekday, "is_working": False, "breaks": []})
    return days


def _put_week(client: TestClient, headers: dict, days: list[dict]) -> None:
    resp = client.put("/api/doctors/me/weekly-availability", headers=headers, json={"days": days})
    assert resp.status_code == 200, resp.text


def _availability(client: TestClient, headers: dict, doctor_id: str, day: date):
    return client.get(
        f"/api/doctors/{doctor_id}/availability",
        headers=headers,
        params={"date_from": day.isoformat(), "date_to": day.isoformat()},
    )


def _local(iso: str) -> datetime:
    return datetime.fromisoformat(iso).astimezone(_tz())


# -- the table ----------------------------------------------------------------


def test_ac_table_doctor_availability_exceptions_exists(db_session: DBSession, clinic):
    """The exceptions table is part of the metadata create_all builds on startup."""
    doctor = _make_user(db_session, "doctor")
    row = DoctorAvailabilityException(
        doctor_id=doctor.id,
        date=_today(),
        kind="unavailable",
        start_time="09:00",
        end_time="12:00",
        reason="Leave",
    )
    db_session.add(row)
    db_session.commit()
    assert db_session.get(DoctorAvailabilityException, row.id) is not None


# -- list / delete -------------------------------------------------------------


def test_ac_list_and_delete_exceptions_are_per_doctor(
    client: TestClient, db_session: DBSession, clinic
):
    first = _make_user(db_session, "doctor")
    second = _make_user(db_session, "doctor")
    headers = _auth(db_session, first)

    created = client.post(
        EXCEPTIONS,
        headers=headers,
        json={"date": _next_weekday(1).isoformat(), "kind": "unavailable", "reason": "Leave"},
    )
    assert created.status_code == 201, created.text
    exception_id = created.json()["id"]

    listed = client.get(EXCEPTIONS, headers=headers).json()
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == exception_id

    other = _auth(db_session, second)
    assert client.get(EXCEPTIONS, headers=other).json() == {"items": [], "total": 0}

    foreign = client.delete(f"{EXCEPTIONS}/{exception_id}", headers=other)
    assert foreign.status_code == 403
    assert foreign.content == b""

    unknown = client.delete(f"{EXCEPTIONS}/{secrets.token_hex(16)}", headers=headers)
    assert unknown.status_code == 403
    assert unknown.content == b""

    own = client.delete(f"{EXCEPTIONS}/{exception_id}", headers=headers)
    assert own.status_code == 204
    assert client.get(EXCEPTIONS, headers=headers).json()["total"] == 0


def test_ac_exceptions_are_doctor_only(client: TestClient, db_session: DBSession, clinic):
    patient = _make_user(db_session, "patient")
    resp = client.get(EXCEPTIONS, headers=_auth(db_session, patient))
    assert resp.status_code == 403
    assert resp.content == b""


# -- AC-053 --------------------------------------------------------------------


def test_ac053_unavailable_exception_removes_every_slot_in_its_period(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    doctor_headers = _auth(db_session, doctor)
    patient_headers = _auth(db_session, patient)
    _put_week(client, doctor_headers, _week())

    whole_day = _next_weekday(1)
    part_day = _next_weekday(3)

    before = _availability(client, patient_headers, doctor.id, whole_day)
    assert before.status_code == 200
    assert any(s["available"] for s in before.json()["items"])

    assert (
        client.post(
            EXCEPTIONS,
            headers=doctor_headers,
            json={"date": whole_day.isoformat(), "kind": "unavailable"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            EXCEPTIONS,
            headers=doctor_headers,
            json={
                "date": part_day.isoformat(),
                "kind": "unavailable",
                "start_time": "09:00",
                "end_time": "12:00",
            },
        ).status_code
        == 201
    )

    after_whole = _availability(client, patient_headers, doctor.id, whole_day).json()
    assert [s for s in after_whole["items"] if s["available"]] == []

    after_part = _availability(client, patient_headers, doctor.id, part_day).json()
    starts = [_local(s["slot_start"]) for s in after_part["items"] if s["available"]]
    assert starts, "the rest of the day stays bookable"
    assert all(s.hour >= 12 for s in starts)


# -- AC-054 --------------------------------------------------------------------


def test_ac054_unavailable_over_a_booking_needs_confirmation_then_cancels(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    doctor_headers = _auth(db_session, doctor)
    patient_headers = _auth(db_session, patient)
    _put_week(client, doctor_headers, _week())

    target = _next_weekday(0)
    slot_start = _slot_at(target, "10:00")
    booked = client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"doctor_id": doctor.id, "slot_start": slot_start.isoformat()},
    )
    assert booked.status_code == 201, booked.text
    appointment_id = booked.json()["id"]

    reason = "Hospital duty"
    unconfirmed = client.post(
        EXCEPTIONS,
        headers=doctor_headers,
        json={"date": target.isoformat(), "kind": "unavailable", "reason": reason},
    )
    assert unconfirmed.status_code == 409
    body = unconfirmed.json()
    assert body["code"] == "confirmation_required"
    assert [a["id"] for a in body["affected_appointments"]] == [appointment_id]
    assert body["affected_appointments"][0]["patient_name"] == patient.full_name

    # Nothing written.
    assert client.get(EXCEPTIONS, headers=doctor_headers).json()["total"] == 0
    still = client.get(f"/api/appointments/{appointment_id}", headers=patient_headers)
    assert still.json()["status"] == "booked"

    confirmed = client.post(
        EXCEPTIONS,
        headers=doctor_headers,
        json={
            "date": target.isoformat(),
            "kind": "unavailable",
            "reason": reason,
            "confirm": True,
        },
    )
    assert confirmed.status_code == 201, confirmed.text
    assert [a["id"] for a in confirmed.json()["cancelled_appointments"]] == [appointment_id]
    assert client.get(EXCEPTIONS, headers=doctor_headers).json()["total"] == 1

    # NFR-026: cancelled, never deleted, with its reason, still readable.
    after = client.get(f"/api/appointments/{appointment_id}", headers=patient_headers)
    assert after.status_code == 200
    assert after.json()["status"] == "cancelled"
    row = db_session.get(Appointment, appointment_id)
    assert row.cancellation_reason == reason


def test_ac054_default_cancellation_reason_when_none_is_given(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    doctor_headers = _auth(db_session, doctor)
    _put_week(client, doctor_headers, _week())

    target = _next_weekday(0)
    booked = client.post(
        "/api/appointments",
        headers=_auth(db_session, patient),
        json={"doctor_id": doctor.id, "slot_start": _slot_at(target, "11:00").isoformat()},
    )
    assert booked.status_code == 201

    created = client.post(
        EXCEPTIONS,
        headers=doctor_headers,
        json={"date": target.isoformat(), "kind": "unavailable", "confirm": True},
    )
    assert created.status_code == 201, created.text
    row = db_session.get(Appointment, booked.json()["id"])
    assert row.status == "cancelled"
    assert row.cancellation_reason == "Doctor unavailable"


# -- AC-055 --------------------------------------------------------------------


def test_ac055_extra_hours_outside_the_pattern_produce_bookable_slots(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    doctor_headers = _auth(db_session, doctor)
    patient_headers = _auth(db_session, patient)
    _put_week(client, doctor_headers, _week(slot_minutes=30))

    saturday = _next_weekday(5)
    empty = _availability(client, patient_headers, doctor.id, saturday).json()
    assert [s for s in empty["items"] if s["available"]] == []

    created = client.post(
        EXCEPTIONS,
        headers=doctor_headers,
        json={
            "date": saturday.isoformat(),
            "kind": "extra_hours",
            "start_time": "10:00",
            "end_time": "12:00",
            "reason": "Catch-up clinic",
        },
    )
    assert created.status_code == 201, created.text

    offered = _availability(client, patient_headers, doctor.id, saturday).json()
    starts = sorted(_local(s["slot_start"]) for s in offered["items"] if s["available"])
    assert [s.strftime("%H:%M") for s in starts] == ["10:00", "10:30", "11:00", "11:30"]

    booked = client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"doctor_id": doctor.id, "slot_start": starts[0].isoformat()},
    )
    assert booked.status_code == 201, booked.text


# -- AC-056 --------------------------------------------------------------------


def test_ac056_a_past_date_is_422_on_date_and_writes_nothing(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    headers = _auth(db_session, doctor)

    rejected = client.post(
        EXCEPTIONS,
        headers=headers,
        json={"date": (_today() - timedelta(days=1)).isoformat(), "kind": "unavailable"},
    )
    assert rejected.status_code == 422
    detail = rejected.json()["detail"]
    assert {e["field"] for e in detail} == {"date"}
    assert detail[0]["msg"] == "Exceptions can only be set for today or future dates"
    assert client.get(EXCEPTIONS, headers=headers).json()["total"] == 0

    today = client.post(
        EXCEPTIONS, headers=headers, json={"date": _today().isoformat(), "kind": "unavailable"}
    )
    assert today.status_code == 201


def test_ac056_the_past_date_check_follows_the_clinic_timezone(
    client: TestClient, db_session: DBSession, clinic
):
    """Kiritimati is a day ahead of UTC: its own 'today' must be accepted."""
    settings = get_or_create_settings(db_session)
    settings.timezone = "Pacific/Kiritimati"
    db_session.add(settings)
    db_session.commit()

    doctor = _make_user(db_session, "doctor")
    headers = _auth(db_session, doctor)
    local_today = datetime.now(ZoneInfo("Pacific/Kiritimati")).date()

    rejected = client.post(
        EXCEPTIONS,
        headers=headers,
        json={"date": (local_today - timedelta(days=1)).isoformat(), "kind": "unavailable"},
    )
    assert rejected.status_code == 422
    assert {e["field"] for e in rejected.json()["detail"]} == {"date"}

    accepted = client.post(
        EXCEPTIONS,
        headers=headers,
        json={"date": local_today.isoformat(), "kind": "unavailable"},
    )
    assert accepted.status_code == 201, accepted.text


def test_ac056_an_invalid_kind_or_time_range_is_422_and_writes_nothing(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    headers = _auth(db_session, doctor)

    bad_kind = client.post(
        EXCEPTIONS, headers=headers, json={"date": _today().isoformat(), "kind": "holiday"}
    )
    assert bad_kind.status_code == 422
    assert "kind" in {e["field"] for e in bad_kind.json()["detail"]}

    bad_range = client.post(
        EXCEPTIONS,
        headers=headers,
        json={
            "date": _today().isoformat(),
            "kind": "extra_hours",
            "start_time": "12:00",
            "end_time": "10:00",
        },
    )
    assert bad_range.status_code == 422
    assert "end_time" in {e["field"] for e in bad_range.json()["detail"]}

    assert client.get(EXCEPTIONS, headers=headers).json()["total"] == 0


# -- generated slots -----------------------------------------------------------


def test_ac_availability_excludes_breaks_and_marks_booked_slots_unavailable(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    doctor_headers = _auth(db_session, doctor)
    patient_headers = _auth(db_session, patient)
    _put_week(client, doctor_headers, _week(breaks=[{"start_time": "13:00", "end_time": "14:00"}]))

    day = _next_weekday(2)
    booked_start = _slot_at(day, "09:30")
    assert (
        client.post(
            "/api/appointments",
            headers=patient_headers,
            json={"doctor_id": doctor.id, "slot_start": booked_start.isoformat()},
        ).status_code
        == 201
    )

    body = _availability(client, patient_headers, doctor.id, day).json()
    by_start = {_local(s["slot_start"]): s for s in body["items"]}
    assert body["total"] == len(body["items"])
    assert _slot_at(day, "13:00") not in by_start, "break periods are excluded"
    assert _slot_at(day, "13:30") not in by_start
    assert by_start[_slot_at(day, "12:30")]["available"] is True
    assert by_start[booked_start]["available"] is False


def test_ac_availability_excludes_elapsed_slots_and_an_inactive_doctor(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    doctor_headers = _auth(db_session, doctor)
    patient_headers = _auth(db_session, patient)
    # A window covering the whole of today in the clinic timezone.
    days = [
        {
            "weekday": weekday,
            "is_working": True,
            "start_time": "00:00",
            "end_time": "23:30",
            "slot_minutes": 30,
            "breaks": [],
        }
        for weekday in range(7)
    ]
    _put_week(client, doctor_headers, days)

    today = _today()
    body = _availability(client, patient_headers, doctor.id, today).json()
    now = datetime.now(_tz())
    assert all(_local(s["slot_start"]) > now for s in body["items"])

    doctor.profile_active = False
    db_session.add(doctor)
    db_session.commit()
    hidden = _availability(client, patient_headers, doctor.id, today).json()
    assert hidden["items"] == [] and hidden["total"] == 0
