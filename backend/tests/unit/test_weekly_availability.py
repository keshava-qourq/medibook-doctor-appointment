"""Unit tests for the doctor weekly availability pattern (US-013-1)."""

import secrets
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import Appointment, DoctorWeeklyAvailability, User
from app.routers import availability
from app.routers.settings import get_or_create_settings
from app.security import create_session, hash_password


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


@pytest.fixture
def app_client(db_session: DBSession) -> Iterator[TestClient]:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _handler(request, exc):
        return Response(status_code=exc.status_code)

    app.include_router(availability.router)
    yield TestClient(app)


def _make_user(db: DBSession, role: str = "doctor") -> User:
    user = User(
        email=_email(role),
        full_name=f"{role.title()} User",
        role=role,
        is_active=True,
        password_hash=hash_password(_password()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(db: DBSession, user: User) -> dict[str, str]:
    raw_token, _ = create_session(db, user)
    return {"Authorization": f"Bearer {raw_token}"}


def _day(weekday: int, **kwargs) -> dict:
    day = {
        "weekday": weekday,
        "is_working": False,
        "start_time": None,
        "end_time": None,
        "slot_minutes": None,
        "breaks": [],
    }
    day.update(kwargs)
    return day


def _working_week(overrides: dict[int, dict] | None = None) -> list[dict]:
    overrides = overrides or {}
    days = []
    for weekday in range(7):
        if weekday in overrides:
            days.append(_day(weekday, **overrides[weekday]))
        else:
            days.append(
                _day(
                    weekday,
                    is_working=True,
                    start_time="09:00",
                    end_time="17:00",
                    slot_minutes=30,
                )
            )
    return days


# -- AC-049 -------------------------------------------------------------------


def test_ac049_tables_exist_and_get_returns_seven_days_with_timezone(
    db_session: DBSession, app_client: TestClient
):
    doctor = _make_user(db_session)
    resp = app_client.get("/api/doctors/me/weekly-availability", headers=_auth(db_session, doctor))
    assert resp.status_code == 200
    body = resp.json()
    assert body["timezone"] == "UTC"
    assert [d["weekday"] for d in body["days"]] == list(range(7))
    assert all(d["is_working"] is False and d["breaks"] == [] for d in body["days"])


def test_ac049_put_replaces_the_whole_pattern_and_get_reads_it_back(
    db_session: DBSession, app_client: TestClient
):
    doctor = _make_user(db_session)
    headers = _auth(db_session, doctor)
    settings = get_or_create_settings(db_session)
    settings.timezone = "Europe/Paris"
    db_session.commit()

    first = app_client.put(
        "/api/doctors/me/weekly-availability",
        headers=headers,
        json={
            "days": _working_week(
                {
                    1: {
                        "is_working": True,
                        "start_time": "08:00",
                        "end_time": "12:00",
                        "slot_minutes": 20,
                        "breaks": [{"start_time": "10:00", "end_time": "10:30"}],
                    }
                }
            )
        },
    )
    assert first.status_code == 200
    assert first.json()["timezone"] == "Europe/Paris"
    assert first.json()["days"][1]["breaks"] == [{"start_time": "10:00", "end_time": "10:30"}]
    assert first.json()["affected_count"] == 0

    second = app_client.put(
        "/api/doctors/me/weekly-availability",
        headers=headers,
        json={"days": [_day(w) for w in range(7)]},
    )
    assert second.status_code == 200
    assert all(d["is_working"] is False for d in second.json()["days"])

    read_back = app_client.get("/api/doctors/me/weekly-availability", headers=headers).json()
    assert all(d["breaks"] == [] and d["slot_minutes"] is None for d in read_back["days"])
    rows = (
        db_session.query(DoctorWeeklyAvailability)
        .filter(DoctorWeeklyAvailability.doctor_id == doctor.id)
        .all()
    )
    assert len(rows) == 7


# -- AC-050 -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("override", "field"),
    [
        (
            {"is_working": True, "start_time": "17:00", "end_time": "17:00", "slot_minutes": 30},
            "days[2].end_time",
        ),
        (
            {"is_working": True, "start_time": "09:00", "end_time": "17:00", "slot_minutes": 0},
            "days[2].slot_minutes",
        ),
        (
            {
                "is_working": True,
                "start_time": "09:00",
                "end_time": "12:00",
                "slot_minutes": 30,
                "breaks": [{"start_time": "13:00", "end_time": "13:30"}],
            },
            "days[2].breaks",
        ),
    ],
)
def test_ac050_invalid_day_is_422_naming_the_field_and_writes_nothing(
    db_session: DBSession, app_client: TestClient, override: dict, field: str
):
    doctor = _make_user(db_session)
    headers = _auth(db_session, doctor)
    saved = app_client.put(
        "/api/doctors/me/weekly-availability", headers=headers, json={"days": _working_week()}
    )
    assert saved.status_code == 200

    resp = app_client.put(
        "/api/doctors/me/weekly-availability",
        headers=headers,
        json={"days": _working_week({2: override})},
    )
    assert resp.status_code == 422
    assert field in {err["field"] for err in resp.json()["detail"]}

    # The previously saved pattern stays in force (NFR-022).
    after = app_client.get("/api/doctors/me/weekly-availability", headers=headers).json()
    assert after["days"][2] == {
        "weekday": 2,
        "is_working": True,
        "start_time": "09:00",
        "end_time": "17:00",
        "slot_minutes": 30,
        "breaks": [],
    }


# -- AC-051 -------------------------------------------------------------------


def test_ac051_overlapping_breaks_are_422_on_that_days_breaks_field(
    db_session: DBSession, app_client: TestClient
):
    doctor = _make_user(db_session)
    resp = app_client.put(
        "/api/doctors/me/weekly-availability",
        headers=_auth(db_session, doctor),
        json={
            "days": _working_week(
                {
                    3: {
                        "is_working": True,
                        "start_time": "09:00",
                        "end_time": "17:00",
                        "slot_minutes": 30,
                        "breaks": [
                            {"start_time": "12:00", "end_time": "13:00"},
                            {"start_time": "12:30", "end_time": "14:00"},
                        ],
                    }
                }
            )
        },
    )
    assert resp.status_code == 422
    assert {"field": "days[3].breaks", "msg": "Break periods may not overlap"} in resp.json()[
        "detail"
    ]
    assert db_session.query(DoctorWeeklyAvailability).count() == 0


# -- AC-052 -------------------------------------------------------------------


def _book(db: DBSession, doctor: User, patient: User, start: datetime) -> Appointment:
    row = Appointment(
        doctor_id=doctor.id,
        patient_id=patient.id,
        slot_start=start,
        slot_end=start + timedelta(minutes=30),
        status="booked",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_ac052_booking_outside_new_hours_is_reported_and_preserved(
    db_session: DBSession, app_client: TestClient
):
    doctor = _make_user(db_session)
    patient = _make_user(db_session, role="patient")
    headers = _auth(db_session, doctor)

    # A future appointment at 16:00 UTC, in the current pattern's hours.
    start = (datetime.now(UTC) + timedelta(days=3)).replace(
        hour=16, minute=0, second=0, microsecond=0
    )
    appointment = _book(db_session, doctor, patient, start)
    weekday = start.weekday()

    resp = app_client.put(
        "/api/doctors/me/weekly-availability",
        headers=headers,
        json={
            "days": _working_week(
                {
                    weekday: {
                        "is_working": True,
                        "start_time": "09:00",
                        "end_time": "12:00",
                        "slot_minutes": 30,
                    }
                }
            )
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["affected_count"] == 1
    reported = body["affected_appointments"][0]
    assert reported["id"] == appointment.id
    assert reported["patient_name"] == patient.full_name
    assert reported["status"] == "booked"
    assert reported["slot_start"].startswith(start.strftime("%Y-%m-%dT16:00"))

    db_session.refresh(appointment)
    assert appointment.status == "booked"
    assert db_session.get(Appointment, appointment.id) is not None


def test_ac052_booking_still_inside_the_new_hours_is_not_reported(
    db_session: DBSession, app_client: TestClient
):
    doctor = _make_user(db_session)
    patient = _make_user(db_session, role="patient")
    start = (datetime.now(UTC) + timedelta(days=3)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    _book(db_session, doctor, patient, start)

    resp = app_client.put(
        "/api/doctors/me/weekly-availability",
        headers=_auth(db_session, doctor),
        json={"days": _working_week()},
    )
    assert resp.status_code == 200
    assert resp.json()["affected_count"] == 0


# -- role and token -----------------------------------------------------------


@pytest.mark.parametrize("role", ["patient", "admin"])
def test_ac049_other_roles_are_403_with_an_empty_body(
    db_session: DBSession, app_client: TestClient, role: str
):
    caller = _make_user(db_session, role=role)
    headers = _auth(db_session, caller)
    get_resp = app_client.get("/api/doctors/me/weekly-availability", headers=headers)
    put_resp = app_client.put(
        "/api/doctors/me/weekly-availability", headers=headers, json={"days": _working_week()}
    )
    assert get_resp.status_code == put_resp.status_code == 403
    assert get_resp.content == b"" and put_resp.content == b""


def test_ac049_no_token_is_401(app_client: TestClient):
    resp = app_client.get("/api/doctors/me/weekly-availability")
    assert resp.status_code == 401
    assert resp.json()["detail"]
