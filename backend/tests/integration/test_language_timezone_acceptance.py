"""US-030 acceptance (API): one language and one clinic timezone throughout.

Criteria covered here:
  AC-119 every label, message and notification is in English and nothing offers a
         language choice (the API half: no endpoint accepts or returns a language or
         locale, and an `Accept-Language` header changes no message).
  AC-120 slot, appointment and schedule times are rendered in the configured clinic
         timezone and labelled with it, never converted to the device timezone.
  AC-121 one consistent documented format for every date and time: ISO 8601 with an
         explicit offset on the wire (docs/behaviour-rules.md).
  NFR-020 the same promise stated as a usability requirement.
  NFR-016 / NFR-017 are provisioning promises; see tests/integration/
         test_nfr_infrastructure.py for the declaration tests.

Every account bar the bootstrap admin is created through the API; the bootstrap admin
is seeded exactly as the application seeds it from BOOTSTRAP_ADMIN_* at startup,
because no API mints the first admin and the client fixture starts from empty.
"""

import os
import re
import secrets
import time
from datetime import date as date_cls
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import hash_password

# A zone with a half-hour offset and no daylight saving: an offset no device default
# and no UTC rendering can produce by accident.
CLINIC_TZ = "Asia/Kolkata"
CLINIC_OFFSET = timedelta(hours=5, minutes=30)

WEEKLY = "/api/doctors/me/weekly-availability"

# ISO 8601 with an explicit offset (or Z), to the second: the one documented wire format.
ISO_WITH_OFFSET = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


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


def _set_clinic_timezone(client: TestClient, admin: str, timezone: str = CLINIC_TZ) -> None:
    resp = client.put(
        "/api/admin/settings",
        headers=_bearer(admin),
        json={"timezone": timezone, "booking_cutoff_hours": 1},
    )
    assert resp.status_code == 200, resp.text


def _create_doctor(client: TestClient, admin: str) -> tuple[str, str]:
    """Create an active doctor through the admin API; returns (doctor_id, token)."""
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin),
        json={
            "full_name": f"Doctor {secrets.token_hex(4)}",
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )
    assert created.status_code == 201, created.text
    doctor_id = created.json()["id"]
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return doctor_id, login.json()["token"]


def _create_patient(client: TestClient) -> str:
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": f"Patient {secrets.token_hex(4)}",
            "email": _email("patient"),
            "phone": "+15551112222",
            "password": _password(),
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _working_week(start: str = "09:00", end: str = "17:00") -> list[dict[str, object]]:
    return [
        {
            "weekday": weekday,
            "is_working": True,
            "start_time": start,
            "end_time": end,
            "slot_minutes": 30,
            "breaks": [],
        }
        for weekday in range(7)
    ]


def _save_week(client: TestClient, doctor: str) -> None:
    saved = client.put(WEEKLY, headers=_bearer(doctor), json={"days": _working_week()})
    assert saved.status_code == 200, saved.text


def _future_day() -> date_cls:
    return datetime.now(ZoneInfo(CLINIC_TZ)).date() + timedelta(days=7)


def _availability(client: TestClient, token: str, doctor_id: str, day: date_cls):
    return client.get(
        f"/api/doctors/{doctor_id}/availability",
        headers=_bearer(token),
        params={"date_from": day.isoformat(), "date_to": day.isoformat()},
    )


def _instants(payload: object) -> list[str]:
    """Every string in the payload that looks like a date-time instant."""
    found: list[str] = []
    if isinstance(payload, dict):
        for value in payload.values():
            found.extend(_instants(value))
    elif isinstance(payload, list):
        for value in payload:
            found.extend(_instants(value))
    elif isinstance(payload, str) and re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", payload):
        found.append(payload)
    return found


# -- AC-120 / NFR-020 ---------------------------------------------------------


def test_ac120_nfr020_slot_times_are_in_the_clinic_timezone_and_labelled_with_it(
    client: TestClient, db_session: DBSession
):
    """[AC-120][NFR-020] Slots for a doctor are returned in the configured clinic
    timezone, labelled with that timezone, with the doctor's local working hours
    intact rather than converted to any other zone."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor = _create_doctor(client, admin)
    _save_week(client, doctor)
    patient = _create_patient(client)

    day = _future_day()
    resp = _availability(client, patient, doctor_id, day)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["timezone"] == CLINIC_TZ, f"the clinic timezone must be labelled: {body}"
    slots = body["items"]
    assert slots, "the doctor's working day must produce bookable slots"

    for slot in slots:
        start = datetime.fromisoformat(slot["slot_start"])
        assert start.utcoffset() == CLINIC_OFFSET, (
            f"slot_start must carry the clinic timezone offset, got {slot['slot_start']}"
        )
        assert start.date() == day, slot
        assert 9 <= start.hour < 17, (
            f"the doctor's 09:00-17:00 clinic hours must be shown as such, got {start}"
        )

    first = datetime.fromisoformat(slots[0]["slot_start"])
    assert (first.hour, first.minute) == (9, 0), f"the day must open at 09:00 clinic time: {first}"


def test_ac120_nfr020_the_device_timezone_never_changes_the_times_shown(
    client: TestClient, db_session: DBSession
):
    """[AC-120][NFR-020] With the device (process) timezone set far from the clinic's,
    the very same request returns the very same clinic-timezone times: nothing is
    converted to the device timezone."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor = _create_doctor(client, admin)
    _save_week(client, doctor)
    patient = _create_patient(client)
    day = _future_day()

    baseline = _availability(client, patient, doctor_id, day)
    assert baseline.status_code == 200, baseline.text

    previous = os.environ.get("TZ")
    try:
        os.environ["TZ"] = "America/Los_Angeles"
        if hasattr(time, "tzset"):
            time.tzset()
        shifted = _availability(client, patient, doctor_id, day)
    finally:
        if previous is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = previous
        if hasattr(time, "tzset"):
            time.tzset()

    assert shifted.status_code == 200, shifted.text
    assert shifted.json() == baseline.json(), (
        "a different device timezone must not change the times shown"
    )
    assert shifted.json()["timezone"] == CLINIC_TZ


def test_ac120_nfr020_a_booked_appointment_is_returned_in_the_clinic_timezone(
    client: TestClient, db_session: DBSession
):
    """[AC-120][NFR-020] The appointment the patient booked is read back at the clinic
    timezone time it was booked for, labelled with that timezone, in both the list and
    the single read."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor = _create_doctor(client, admin)
    _save_week(client, doctor)
    patient = _create_patient(client)

    day = _future_day()
    slots = _availability(client, patient, doctor_id, day).json()["items"]
    assert slots, "the doctor must have a bookable slot"
    slot_start = slots[0]["slot_start"]

    booked = client.post(
        "/api/appointments",
        headers=_bearer(patient),
        json={"doctor_id": doctor_id, "slot_start": slot_start},
    )
    assert booked.status_code == 201, booked.text
    created = booked.json()
    assert datetime.fromisoformat(created["slot_start"]).utcoffset() == CLINIC_OFFSET, (
        f"the booked appointment must be returned in the clinic timezone: {created}"
    )
    assert created.get("timezone") == CLINIC_TZ, (
        f"the appointment must be labelled with the clinic timezone: {created}"
    )

    listed = client.get("/api/appointments", headers=_bearer(patient))
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert items, "the booked appointment must be listed"
    for item in items:
        assert datetime.fromisoformat(item["slot_start"]).utcoffset() == CLINIC_OFFSET, item
        assert item.get("timezone") == CLINIC_TZ, item

    one = client.get(f"/api/appointments/{created['id']}", headers=_bearer(patient))
    assert one.status_code == 200, one.text
    assert datetime.fromisoformat(one.json()["slot_start"]).utcoffset() == CLINIC_OFFSET
    assert one.json().get("timezone") == CLINIC_TZ


def test_ac120_nfr020_changing_the_clinic_timezone_moves_every_time_with_it(
    client: TestClient, db_session: DBSession
):
    """[AC-120][NFR-020] There is one timezone for the whole clinic: after the
    administrator saves a different one, slots are labelled and offset with the new
    zone for every role."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor = _create_doctor(client, admin)
    _save_week(client, doctor)
    patient = _create_patient(client)
    day = _future_day()

    before = _availability(client, patient, doctor_id, day).json()
    assert before["timezone"] == CLINIC_TZ

    _set_clinic_timezone(client, admin, "Pacific/Honolulu")  # UTC-10, no daylight saving
    after = _availability(client, patient, doctor_id, day).json()
    assert after["timezone"] == "Pacific/Honolulu", after
    for slot in after["items"]:
        start = datetime.fromisoformat(slot["slot_start"])
        assert start.utcoffset() == timedelta(hours=-10), slot
        assert 9 <= start.hour < 17, slot

    # The doctor's own view agrees with the patient's: one timezone, every role.
    doctor_view = _availability(client, doctor, doctor_id, day).json()
    assert doctor_view["timezone"] == "Pacific/Honolulu"
    assert [s["slot_start"] for s in doctor_view["items"]] == [
        s["slot_start"] for s in after["items"]
    ]


# -- AC-121 -------------------------------------------------------------------


def test_ac121_every_instant_uses_one_iso8601_format_with_an_explicit_offset(
    client: TestClient, db_session: DBSession
):
    """[AC-121] Dates and times are rendered in one consistent documented format:
    ISO 8601 with an explicit offset, the same on every endpoint of the journey."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor = _create_doctor(client, admin)
    _save_week(client, doctor)
    patient = _create_patient(client)
    day = _future_day()

    availability = _availability(client, patient, doctor_id, day)
    slot_start = availability.json()["items"][0]["slot_start"]
    booked = client.post(
        "/api/appointments",
        headers=_bearer(patient),
        json={"doctor_id": doctor_id, "slot_start": slot_start},
    )
    assert booked.status_code == 201, booked.text

    responses = {
        "availability": availability,
        "appointment_create": booked,
        "appointment_list": client.get("/api/appointments", headers=_bearer(patient)),
        "weekly_availability": client.get(WEEKLY, headers=_bearer(doctor)),
        "exceptions": client.get("/api/doctors/me/exceptions", headers=_bearer(doctor)),
        "settings": client.get("/api/settings", headers=_bearer(patient)),
        "me": client.get("/api/auth/me", headers=_bearer(patient)),
    }
    checked = 0
    for name, resp in responses.items():
        assert resp.status_code in (200, 201), f"{name}: {resp.text}"
        for value in _instants(resp.json()):
            checked += 1
            assert ISO_WITH_OFFSET.match(value), (
                f"{name}: '{value}' is not the documented ISO 8601 format with an offset"
            )
    assert checked, "the journey must carry at least one date-time to check"


def test_ac121_clock_times_use_one_consistent_hh_mm_format(
    client: TestClient, db_session: DBSession
):
    """[AC-121] Clock times saved as HH:MM are returned in that one format, not in a
    mixture of 24-hour, 12-hour or second-bearing renderings."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    _doctor_id, doctor = _create_doctor(client, admin)
    _save_week(client, doctor)

    week = client.get(WEEKLY, headers=_bearer(doctor))
    assert week.status_code == 200, week.text
    pattern = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
    for day in week.json()["days"]:
        if not day["is_working"]:
            continue
        for field in ("start_time", "end_time"):
            value = day[field]
            assert pattern.match(value), (
                f"{field} must use one consistent HH:MM format, got '{value}'"
            )


# -- AC-119 -------------------------------------------------------------------


def test_ac119_no_endpoint_offers_or_requires_a_language_choice(
    client: TestClient, db_session: DBSession
):
    """[AC-119] The product is English only: no settings or profile payload carries a
    language or locale to choose, so no screen can offer a language selector."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    patient = _create_patient(client)

    for path, token in (
        ("/api/settings", patient),
        ("/api/patients/me", patient),
        ("/api/auth/me", patient),
    ):
        resp = client.get(path, headers=_bearer(token))
        assert resp.status_code == 200, f"{path}: {resp.text}"
        keys = {k.lower() for k in resp.json()}
        assert not keys & {"language", "locale", "languages", "available_locales"}, (
            f"{path} must offer no language choice: {keys}"
        )

    rejected = client.put(
        "/api/admin/settings",
        headers=_bearer(admin),
        json={"timezone": CLINIC_TZ, "booking_cutoff_hours": 1, "language": "fr"},
    )
    assert rejected.status_code in (200, 422), rejected.text
    if rejected.status_code == 200:
        assert "language" not in {k.lower() for k in rejected.json()}, (
            "an unknown language field must never be stored or echoed back"
        )


def test_ac119_an_accept_language_header_changes_no_message(
    client: TestClient, db_session: DBSession
):
    """[AC-119] Messages are in English for every user: asking for another language
    returns byte-identical English content and the identical validation message."""
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    patient = _create_patient(client)

    english = client.get("/api/settings", headers=_bearer(patient))
    french = client.get(
        "/api/settings",
        headers={**_bearer(patient), "Accept-Language": "fr-FR,fr;q=0.9"},
    )
    assert english.status_code == french.status_code == 200
    assert english.json() == french.json()

    bad = {"timezone": "Not/AZone", "booking_cutoff_hours": -1}
    plain = client.put("/api/admin/settings", headers=_bearer(admin), json=bad)
    translated = client.put(
        "/api/admin/settings",
        headers={**_bearer(admin), "Accept-Language": "fr-FR,fr;q=0.9"},
        json=bad,
    )
    assert plain.status_code == translated.status_code == 422, plain.text
    assert plain.json() == translated.json(), "validation messages must not be translated"

    detail = plain.json().get("detail", [])
    message = " ".join(
        str(err.get("message", "")) for err in detail if isinstance(err, dict)
    )
    assert message.strip(), "a rejection must carry a message"
    assert message.isascii(), f"messages are English: {message!r}"


def test_ac119_an_unauthenticated_refusal_is_the_same_english_message_for_everyone(
    client: TestClient,
):
    """[AC-119] The refusal a visitor sees carries one English message whatever
    language their device asks for."""
    plain = client.get("/api/settings")
    translated = client.get("/api/settings", headers={"Accept-Language": "hi-IN,hi;q=0.9"})
    assert plain.status_code == translated.status_code == 401
    assert plain.json() == translated.json()
    assert str(plain.json()["detail"]).isascii()


# -- NFR-016 / NFR-017 --------------------------------------------------------


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are "
    "managed-database settings enabled in hosting, not observable from the app; the "
    "declaration is covered by tests/integration/test_nfr_infrastructure.py"
)
def test_nfr016_backups_and_pitr_are_infrastructure():  # pragma: no cover
    pass


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic is a provisioning/capacity "
    "target declared in deployment config, not observable from the app; the declaration "
    "is covered by tests/integration/test_nfr_infrastructure.py"
)
def test_nfr017_sizing_is_infrastructure():  # pragma: no cover
    pass
