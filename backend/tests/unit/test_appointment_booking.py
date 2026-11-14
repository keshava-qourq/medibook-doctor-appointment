"""Unit tests for appointment booking confirmation and refusals (US-017-T3)."""

import secrets
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import Appointment, User
from app.routers.settings import get_or_create_settings
from app.security import create_session, hash_password

CLINIC_TZ = "Europe/Lisbon"
APPOINTMENTS = "/api/appointments"


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


def _tz() -> ZoneInfo:
    return ZoneInfo(CLINIC_TZ)


def _make_user(
    db: DBSession,
    role: str,
    *,
    active: bool = True,
    location: str | None = None,
    fee: Decimal | None = None,
) -> User:
    user = User(
        email=_email(role),
        full_name=f"{role.title()} {secrets.token_hex(3)}",
        role=role,
        is_active=active,
        location=location,
        consultation_fee=fee,
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
    row.timezone = CLINIC_TZ
    row.booking_cutoff_hours = 1
    row.timezone_confirmed = True
    db_session.add(row)
    db_session.commit()


def _future_slot(hhmm: str = "10:00") -> str:
    day = datetime.now(_tz()).date() + timedelta(days=7)
    hour, minute = (int(p) for p in hhmm.split(":"))
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=_tz()).isoformat()


def test_ac065_booking_returns_full_confirmation_and_lists(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor", location="Clinic Room 3", fee=Decimal("50.00"))
    patient = _make_user(db_session, "patient")
    headers = _auth(db_session, patient)
    slot_start = _future_slot("10:00")

    resp = client.post(
        APPOINTMENTS,
        headers=headers,
        json={"doctor_id": doctor.id, "slot_start": slot_start, "reason": "Persistent cough"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["doctor_name"] == doctor.full_name
    assert body["status"] == "booked"
    assert body["timezone"] == CLINIC_TZ
    assert (
        datetime.fromisoformat(body["slot_start"]).utcoffset()
        == datetime.fromisoformat(slot_start).utcoffset()
    )
    assert datetime.fromisoformat(body["slot_end"]) > datetime.fromisoformat(body["slot_start"])
    assert body["location"] == "Clinic Room 3"
    assert "clinic" in body["fee_text"].lower()
    assert "50.00" in body["fee_text"]
    assert body["reason"] == "Persistent cough"
    assert "in person" in body["in_person_note"].lower()

    listed = client.get(APPOINTMENTS, headers=headers)
    assert listed.status_code == 200
    assert any(i["id"] == body["id"] for i in listed.json()["items"])


def test_ac065_reason_is_optional(client: TestClient, db_session: DBSession, clinic):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    resp = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, patient),
        json={"doctor_id": doctor.id, "slot_start": _future_slot("11:00")},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["reason"] is None


def test_ac066_second_booking_same_doctor_slot_is_slot_taken(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    first = _make_user(db_session, "patient")
    second = _make_user(db_session, "patient")
    slot_start = _future_slot("12:00")

    one = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, first),
        json={"doctor_id": doctor.id, "slot_start": slot_start},
    )
    assert one.status_code == 201, one.text

    two = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, second),
        json={"doctor_id": doctor.id, "slot_start": slot_start},
    )
    assert two.status_code == 409
    assert two.json() == {"code": "slot_taken"}

    rows = (
        db_session.query(Appointment)
        .filter(Appointment.doctor_id == doctor.id, Appointment.status != "cancelled")
        .all()
    )
    assert len(rows) == 1


def test_ac067_failed_booking_leaves_slot_open_to_another_patient(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    first = _make_user(db_session, "patient")
    second = _make_user(db_session, "patient")
    slot_start = _future_slot("13:00")

    assert (
        client.post(
            APPOINTMENTS,
            headers=_auth(db_session, first),
            json={"doctor_id": doctor.id, "slot_start": slot_start},
        ).status_code
        == 201
    )
    # Second patient refused; no partial row written.
    assert (
        client.post(
            APPOINTMENTS,
            headers=_auth(db_session, second),
            json={"doctor_id": doctor.id, "slot_start": slot_start},
        ).status_code
        == 409
    )
    held = (
        db_session.query(Appointment)
        .filter(Appointment.doctor_id == doctor.id, Appointment.status != "cancelled")
        .all()
    )
    assert len(held) == 1
    assert held[0].patient_id == first.id


def test_ac068_same_patient_same_slot_is_duplicate_appointment(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    headers = _auth(db_session, patient)
    slot_start = _future_slot("14:00")

    first = client.post(
        APPOINTMENTS, headers=headers, json={"doctor_id": doctor.id, "slot_start": slot_start}
    )
    assert first.status_code == 201, first.text
    existing_id = first.json()["id"]

    repeat = client.post(
        APPOINTMENTS, headers=headers, json={"doctor_id": doctor.id, "slot_start": slot_start}
    )
    assert repeat.status_code == 409
    assert repeat.json() == {
        "code": "duplicate_appointment",
        "existing_appointment_id": existing_id,
    }
    rows = (
        db_session.query(Appointment)
        .filter(Appointment.doctor_id == doctor.id, Appointment.status != "cancelled")
        .all()
    )
    assert len(rows) == 1


def test_ac069_confirmation_is_in_person_only(client: TestClient, db_session: DBSession, clinic):
    doctor = _make_user(db_session, "doctor", fee=Decimal("30.00"))
    patient = _make_user(db_session, "patient")
    resp = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, patient),
        json={"doctor_id": doctor.id, "slot_start": _future_slot("15:00")},
    )
    assert resp.status_code == 201, resp.text
    note = resp.json()["in_person_note"].lower()
    assert "in person" in note
    assert "no remote" in note  # states there is no remote (online/video) option


def test_nfr013_no_payment_field_in_request_or_response(
    client: TestClient, db_session: DBSession, clinic
):
    doctor = _make_user(db_session, "doctor", fee=Decimal("40.00"))
    patient = _make_user(db_session, "patient")
    resp = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, patient),
        json={"doctor_id": doctor.id, "slot_start": _future_slot("16:00")},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    forbidden = ("payment", "checkout", "invoice", "refund", "amount_due", "card")
    assert not any(k in body for k in forbidden)
    assert "clinic" in body["fee_text"].lower()


def test_cutoff_passed_within_booking_cutoff_hours(
    client: TestClient, db_session: DBSession, clinic
):
    row = get_or_create_settings(db_session)
    row.booking_cutoff_hours = 24
    db_session.add(row)
    db_session.commit()

    doctor = _make_user(db_session, "doctor")
    patient = _make_user(db_session, "patient")
    soon = (datetime.now(_tz()) + timedelta(hours=2)).replace(microsecond=0).isoformat()

    resp = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, patient),
        json={"doctor_id": doctor.id, "slot_start": soon},
    )
    assert resp.status_code == 403
    assert resp.json() == {"code": "cutoff_passed"}
    assert db_session.query(Appointment).count() == 0


def test_wrong_role_is_403_empty_body(client: TestClient, db_session: DBSession, clinic):
    doctor = _make_user(db_session, "doctor")
    other_doctor = _make_user(db_session, "doctor")
    resp = client.post(
        APPOINTMENTS,
        headers=_auth(db_session, other_doctor),
        json={"doctor_id": doctor.id, "slot_start": _future_slot("09:00")},
    )
    assert resp.status_code == 403
    assert resp.content == b""


def test_missing_token_is_401_detail(client: TestClient, db_session: DBSession, clinic):
    doctor = _make_user(db_session, "doctor")
    resp = client.post(
        APPOINTMENTS,
        json={"doctor_id": doctor.id, "slot_start": _future_slot("09:00")},
    )
    assert resp.status_code == 401
    assert "detail" in resp.json()
