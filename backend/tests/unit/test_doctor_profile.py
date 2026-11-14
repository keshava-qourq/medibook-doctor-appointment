"""Unit tests for the admin doctor-profile surface and minimal booking (US-007-1).

Covers AC-026 (full profile fields), AC-027 (specialization required),
AC-028 (inactive doctors are invisible and unbookable), AC-029/NFR-026
(affected future appointment count, history preserved) and NFR-013 (no
payment surface anywhere).
"""

import secrets
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Appointment, User
from app.routers import appointments, doctors, search, specializations
from app.security import create_session, hash_password

_PAYMENT_WORDS = ("payment", "checkout", "invoice", "refund", "pay_", "card_number")


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


def _make_user(db: DBSession, role: str = "admin") -> User:
    user = User(
        email=f"{role}-{secrets.token_hex(6)}@example.com",
        full_name=f"{role.title()} {secrets.token_hex(3)}",
        role=role,
        is_active=True,
        password_hash=hash_password(secrets.token_urlsafe(12)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(db: DBSession, user: User) -> dict[str, str]:
    raw_token, _ = create_session(db, user)
    return {"Authorization": f"Bearer {raw_token}"}


@pytest.fixture
def app_client(db_session: DBSession) -> Iterator[TestClient]:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _empty(request, exc):
        return Response(status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _invalid(request, exc):
        detail = [
            {"field": str(err["loc"][-1]), "msg": err.get("msg", "invalid")} for err in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": detail})

    app.include_router(specializations.public_router)
    app.include_router(specializations.admin_router)
    app.include_router(doctors.router)
    app.include_router(doctors.public_router)
    app.include_router(search.router)
    app.include_router(appointments.router)
    yield TestClient(app)


def _spec(client: TestClient, headers: dict, name: str) -> str:
    resp = client.post("/api/admin/specializations", headers=headers, json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _term(client: TestClient, headers: dict, term: str, spec_ids: list[str]) -> None:
    resp = client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "disease", "specialization_ids": spec_ids},
    )
    assert resp.status_code == 201, resp.text


def _future(hours: int = 48) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


# -- AC-026 --------------------------------------------------------------------


def test_ac026_put_persists_every_profile_field_and_reads_back_on_the_cards(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("cardio"))
    doctor = _make_user(db_session, role="doctor")

    saved = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={
            "full_name": "Dr Ada Byron",
            "specialization_ids": [spec_id],
            "qualifications": "MBBS, MD",
            "bio": "Twenty years in cardiology.",
            "location": "Room 4, East Wing",
            "consultation_fee": 65,
        },
    )
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["full_name"] == "Dr Ada Byron"
    assert body["specialization_ids"] == [spec_id]
    assert body["specializations"][0]["id"] == spec_id
    assert body["qualifications"] == "MBBS, MD"
    assert body["bio"] == "Twenty years in cardiology."
    assert body["location"] == "Room 4, East Wing"
    assert body["consultation_fee"] == 65
    assert body["is_active"] is True
    assert body["affected_future_appointments"] == 0

    card = app_client.get(f"/api/doctors/{doctor.id}", headers=headers).json()
    assert card["bio"] == "Twenty years in cardiology."
    assert card["location"] == "Room 4, East Wing"
    assert "affected_future_appointments" not in card

    listed = app_client.get("/api/doctors", headers=headers).json()
    item = next(i for i in listed["items"] if i["id"] == doctor.id)
    assert item["bio"] == "Twenty years in cardiology."
    assert item["location"] == "Room 4, East Wing"


# -- AC-027 --------------------------------------------------------------------


@pytest.mark.parametrize("body", [{"specialization_ids": []}, {"bio": "no specs"}])
def test_ac027_empty_or_missing_specialization_ids_is_422_and_writes_nothing(
    db_session: DBSession, app_client: TestClient, body: dict
):
    headers = _auth(db_session, _make_user(db_session))
    doctor = _make_user(db_session, role="doctor")
    original_name = doctor.full_name

    resp = app_client.put(f"/api/admin/doctors/{doctor.id}", headers=headers, json=body)

    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail[0]["field"] == "specialization_ids"
    assert detail[0]["msg"] == "At least one specialization is required"
    db_session.refresh(doctor)
    assert doctor.full_name == original_name
    assert doctor.bio is None


# -- AC-028 --------------------------------------------------------------------


def test_ac028_inactive_doctor_is_absent_from_discovery_and_unbookable(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("neuro"))
    term = _name("migraine")
    _term(app_client, headers, term, [spec_id])
    doctor = _make_user(db_session, role="doctor")
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id]},
    )
    patient = _auth(db_session, _make_user(db_session, role="patient"))

    listed = app_client.get("/api/doctors", headers=patient).json()
    assert doctor.id in {i["id"] for i in listed["items"]}

    deactivated = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    listed = app_client.get("/api/doctors", headers=patient).json()
    assert doctor.id not in {i["id"] for i in listed["items"]}

    found = app_client.get("/api/search/doctors", headers=patient, params={"term": term}).json()
    assert doctor.id not in {i["id"] for i in found["items"]}

    one = app_client.get(f"/api/doctors/{doctor.id}", headers=patient)
    assert one.status_code == 404
    assert one.json() == {"code": "doctor_unavailable"}

    booking = app_client.post(
        "/api/appointments",
        headers=patient,
        json={"doctor_id": doctor.id, "slot_start": _future()},
    )
    assert booking.status_code == 403
    assert booking.content == b""


# -- AC-029 / NFR-026 ----------------------------------------------------------


def test_ac029_deactivation_reports_the_count_of_future_booked_appointments(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id]},
    )
    patient = _make_user(db_session, role="patient")
    patient_headers = _auth(db_session, patient)

    for hours in (24, 48):
        created = app_client.post(
            "/api/appointments",
            headers=patient_headers,
            json={"doctor_id": doctor.id, "slot_start": _future(hours)},
        )
        assert created.status_code == 201, created.text

    # A past slot and a cancelled future slot are both excluded from the count.
    past = Appointment(
        doctor_id=doctor.id,
        patient_id=patient.id,
        slot_start=datetime.now(UTC) - timedelta(days=2),
        slot_end=datetime.now(UTC) - timedelta(days=2) + timedelta(minutes=30),
        status="booked",
    )
    cancelled = Appointment(
        doctor_id=doctor.id,
        patient_id=patient.id,
        slot_start=datetime.now(UTC) + timedelta(days=3),
        slot_end=datetime.now(UTC) + timedelta(days=3) + timedelta(minutes=30),
        status="cancelled",
    )
    db_session.add_all([past, cancelled])
    db_session.commit()

    resp = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert resp.status_code == 200
    assert resp.json()["affected_future_appointments"] == 2


def test_ac029_count_is_zero_when_the_doctor_stays_active_or_was_already_inactive(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id]},
    )
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    app_client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"doctor_id": doctor.id, "slot_start": _future()},
    )

    stays_active = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "bio": "still here"},
    )
    assert stays_active.json()["affected_future_appointments"] == 0

    first = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert first.json()["affected_future_appointments"] == 1

    again = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert again.json()["affected_future_appointments"] == 0


def test_ac029_nfr026_future_appointments_survive_deactivation_and_stay_readable(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id]},
    )
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    doctor_headers = _auth(db_session, doctor)
    booked = app_client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"doctor_id": doctor.id, "slot_start": _future()},
    ).json()

    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "is_active": False},
    )

    stored = db_session.get(Appointment, booked["id"])
    assert stored is not None and stored.status == "booked"

    by_patient = app_client.get(f"/api/appointments/{booked['id']}", headers=patient_headers)
    assert by_patient.status_code == 200
    assert by_patient.json()["status"] == "booked"

    # The doctor's own token stops working once deactivated, so read as the
    # doctor before relying on that: re-activate and read again.
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "is_active": True},
    )
    by_doctor = app_client.get(f"/api/appointments/{booked['id']}", headers=doctor_headers)
    assert by_doctor.status_code == 200
    assert by_doctor.json()["doctor_id"] == doctor.id


# -- minimal booking endpoint ---------------------------------------------------


def test_ac_booking_is_patient_only_and_refuses_a_duplicate_slot_with_409(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id]},
    )
    slot = _future(72)

    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    first = app_client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"doctor_id": doctor.id, "slot_start": slot},
    )
    assert first.status_code == 201
    body = first.json()
    assert body["status"] == "booked"
    assert body["doctor_id"] == doctor.id
    assert len(body["id"]) == 36

    other_patient = _auth(db_session, _make_user(db_session, role="patient"))
    dup = app_client.post(
        "/api/appointments",
        headers=other_patient,
        json={"doctor_id": doctor.id, "slot_start": slot},
    )
    assert dup.status_code == 409
    assert dup.json() == {"code": "slot_taken"}

    refused = app_client.post(
        "/api/appointments",
        headers=headers,
        json={"doctor_id": doctor.id, "slot_start": _future(96)},
    )
    assert refused.status_code == 403
    assert refused.content == b""


def test_ac_appointment_of_another_patient_is_403_empty_body(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id]},
    )
    owner = _auth(db_session, _make_user(db_session, role="patient"))
    booked = app_client.post(
        "/api/appointments",
        headers=owner,
        json={"doctor_id": doctor.id, "slot_start": _future()},
    ).json()

    stranger = _auth(db_session, _make_user(db_session, role="patient"))
    resp = app_client.get(f"/api/appointments/{booked['id']}", headers=stranger)
    assert resp.status_code == 403
    assert resp.content == b""


# -- NFR-013 --------------------------------------------------------------------


def test_nfr013_no_doctor_or_appointment_payload_carries_a_payment_field(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    saved = app_client.put(
        f"/api/admin/doctors/{doctor.id}",
        headers=headers,
        json={"specialization_ids": [spec_id], "consultation_fee": 30},
    ).json()
    patient_headers = _auth(db_session, _make_user(db_session, role="patient"))
    booked = app_client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"doctor_id": doctor.id, "slot_start": _future()},
    ).json()
    card = app_client.get(f"/api/doctors/{doctor.id}", headers=patient_headers).json()

    for payload in (saved, booked, card):
        keys = " ".join(payload).lower()
        assert not any(word in keys for word in _PAYMENT_WORDS)
