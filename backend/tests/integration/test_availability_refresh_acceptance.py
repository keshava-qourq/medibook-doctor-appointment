"""Acceptance (API) for US-016: a patient sees freshly refreshed slot availability.

US-016 is delivered mostly on the patient's booking screen: it fetches availability
from the server when the page opens, polls it on a short interval while the page stays
open, re-fetches on a new date/doctor selection, and shows an explicit error state when
the fetch fails. The *server contract* those behaviours rest on is provable here through
the public availability endpoint and the booking endpoint; the purely on-screen halves
(the automatic poll timer firing, the rendered error banner, "nothing shown as bookable")
are React-Query/UI concerns that this backend suite cannot observe and are noted per
criterion below.

Mapping:
  AC-061  A slot another patient booked a minute ago is already returned as
          available=false on the next fetch, because the endpoint reads current data
          (no cached copy).  [server half fully tested here]
  AC-062  A slot taken "in the meantime" turns available=false on a *subsequent* fetch of
          the same selection -- exactly what the page's short-interval poll re-fetches.
          [server half tested here; the automatic timer is UI, noted]
  AC-063  Each request returns only the requested selection (its date range / its doctor),
          so changing date or doctor yields that selection's fresh slots and nothing from
          the previous one.  [server half tested here; clearing the old view is UI, noted]
  AC-064  When availability cannot be fetched, the request fails (401 without a token) and
          no bookable slots are returned; an unknown/inactive doctor yields an empty list
          with nothing bookable.  [server half tested here; the on-screen error banner is UI]
  NFR-015 Freshness without live push: availability is a plain polled GET (no websocket /
          persistent push), and the booking transaction is the authoritative guard against
          a stale list -- a second booking of the same slot is refused 409 slot_taken.
  NFR-016 backups/PITR and NFR-017 sizing are provisioning promises no application test can
          observe; they remain declared in tests/integration/test_nfr_infrastructure.py and
          are repeated here as [KNOWN-LIMIT] skips.

The availability/booking routes are delivered by US-013 and consumed by US-016 in the same
sprint; each criterion is gated on the live OpenAPI schema and is PENDING (skipped,
concurrent build) until the route exists, rather than failing on a 404 nobody wrote yet.

Every account and record is created through the API. The bootstrap admin is seeded exactly
as the application seeds it from BOOTSTRAP_ADMIN_* at startup, because no API mints the
first admin and the ``client`` fixture starts from an empty database.
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
AVAILABILITY = "/api/doctors/{doctor_id}/availability"
APPOINTMENTS = "/api/appointments"
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
            "PENDING: availability/booking routes not mounted yet "
            f"({', '.join(missing)}); delivered by US-013 and consumed by US-016 in the "
            "same sprint (concurrent build)"
        )


def _set_clinic_timezone(client: TestClient, admin: str) -> None:
    resp = client.put(
        "/api/admin/settings",
        headers=_bearer(admin),
        json={"timezone": CLINIC_TZ, "booking_cutoff_hours": 1},
    )
    assert resp.status_code == 200, resp.text


def _create_spec(client: TestClient, admin: str) -> str:
    created = client.post(
        "/api/admin/specializations",
        headers=_bearer(admin),
        json={"name": _name("Cardiology"), "description": "desc"},
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def _create_doctor(client: TestClient, admin: str) -> tuple[str, str]:
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin),
        json={
            "full_name": _name("Dr Refresh"),
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


def _day(weekday: int, *, is_working: bool = True) -> dict[str, object]:
    return {
        "weekday": weekday,
        "is_working": is_working,
        "start_time": "09:00",
        "end_time": "17:00",
        "slot_minutes": 30,
        "breaks": [],
    }


def _put_working_week(client: TestClient, doctor: str) -> None:
    days = [_day(w, is_working=w <= 4) for w in range(7)]
    resp = client.put(WEEKLY, headers=_bearer(doctor), json={"days": days})
    assert resp.status_code == 200, resp.text


def _tz() -> ZoneInfo:
    return ZoneInfo(CLINIC_TZ)


def _next_weekday(weekday: int, *, min_days_ahead: int = 7) -> date:
    candidate = datetime.now(_tz()).date() + timedelta(days=min_days_ahead)
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


def _slot(items: list[dict], slot_iso: str) -> dict | None:
    target = datetime.fromisoformat(slot_iso)
    for item in items:
        if datetime.fromisoformat(item["slot_start"]) == target:
            return item
    return None


def _book(client: TestClient, patient: str, doctor_id: str, slot_iso: str):
    return client.post(
        APPOINTMENTS,
        headers=_bearer(patient),
        json={"doctor_id": doctor_id, "slot_start": slot_iso},
    )


def _setup(client: TestClient, db: DBSession) -> tuple[str, str]:
    """Return (doctor_id, viewing_patient_token) with a working week saved."""
    admin = _admin_token(client, db)
    _set_clinic_timezone(client, admin)
    doctor_id, doctor = _create_doctor(client, admin)
    _put_working_week(client, doctor)
    viewer = _create_patient(client)
    return doctor_id, viewer


# -- AC-061 -------------------------------------------------------------------


def test_ac061_a_slot_another_patient_just_booked_is_already_unavailable_on_fetch(
    client: TestClient, db_session: DBSession
):
    """[AC-061] A slot another patient booked is returned available=false the next time
    the availability page is opened, because the endpoint reads current server data rather
    than a cached copy."""
    _require(client, AVAILABILITY, APPOINTMENTS)
    doctor_id, viewer = _setup(client, db_session)
    day = _next_weekday(0)  # a working Monday, comfortably past the cutoff
    slot = _slot_at(day, "10:00")

    # Another patient books the slot.
    other = _create_patient(client)
    assert _book(client, other, doctor_id, slot).status_code == 201

    # The viewing patient opens the page now: a brand-new request to the server.
    fetched = _availability(client, viewer, doctor_id, day, day)
    assert fetched.status_code == 200, fetched.text
    item = _slot(fetched.json()["items"], slot)
    assert item is not None, "the booked slot is still listed, but marked unavailable"
    assert item["available"] is False, "a just-booked slot must already read as unavailable"


# -- AC-062 -------------------------------------------------------------------


def test_ac062_a_refetch_reflects_a_slot_taken_in_the_meantime(
    client: TestClient, db_session: DBSession
):
    """[AC-062] A slot that was free when the page opened reads available=false on a
    *subsequent* fetch of the same selection once it has been taken -- which is exactly the
    fresh data the page's short-interval poll re-fetches. The automatic interval firing is a
    client-side timer the backend cannot observe; only the server half (the second fetch
    returns the updated state without any mutation request from the viewer) is proven here."""
    _require(client, AVAILABILITY, APPOINTMENTS)
    doctor_id, viewer = _setup(client, db_session)
    day = _next_weekday(0)
    slot = _slot_at(day, "11:00")

    first = _availability(client, viewer, doctor_id, day, day)
    assert first.status_code == 200, first.text
    before = _slot(first.json()["items"], slot)
    assert before is not None and before["available"] is True, "the slot starts out bookable"

    # Someone else takes it in the meantime; the viewer sends no booking of their own.
    other = _create_patient(client)
    assert _book(client, other, doctor_id, slot).status_code == 201

    second = _availability(client, viewer, doctor_id, day, day)
    assert second.status_code == 200, second.text
    after = _slot(second.json()["items"], slot)
    assert after is not None, "the slot stays listed"
    assert after["available"] is False, "the next fetch must show it taken, without a manual reload"


# -- AC-063 -------------------------------------------------------------------


def test_ac063_each_fetch_returns_only_the_selected_date_range(
    client: TestClient, db_session: DBSession
):
    """[AC-063] Changing the selected date fetches that date's slots fresh; the response
    carries only the requested range, so the previous selection's slots are not mixed in.
    Clearing the old slots from the rendered view is a UI concern (a new query key); the
    server half -- strict per-selection scoping -- is proven here."""
    _require(client, AVAILABILITY)
    doctor_id, viewer = _setup(client, db_session)
    day_a = _next_weekday(0)
    day_b = _next_weekday(1)
    assert day_a != day_b

    resp_a = _availability(client, viewer, doctor_id, day_a, day_a)
    resp_b = _availability(client, viewer, doctor_id, day_b, day_b)
    assert resp_a.status_code == 200 and resp_b.status_code == 200
    days_a = {datetime.fromisoformat(s["slot_start"]).date() for s in resp_a.json()["items"]}
    days_b = {datetime.fromisoformat(s["slot_start"]).date() for s in resp_b.json()["items"]}

    assert days_a == {day_a}, "selecting date A returns only date A's slots"
    assert days_b == {day_b}, "selecting date B returns only date B's slots"
    assert day_b not in days_a and day_a not in days_b, "no slot leaks across the selection change"


def test_ac063_each_fetch_returns_only_the_selected_doctor(
    client: TestClient, db_session: DBSession
):
    """[AC-063] Changing the selected doctor fetches the new doctor's slots fresh; a booking
    on one doctor never appears as unavailable on the other, because each doctor's
    availability is fetched independently from the server."""
    _require(client, AVAILABILITY, APPOINTMENTS)
    admin = _admin_token(client, db_session)
    _set_clinic_timezone(client, admin)
    doctor_a, token_a = _create_doctor(client, admin)
    doctor_b, token_b = _create_doctor(client, admin)
    _put_working_week(client, token_a)
    _put_working_week(client, token_b)
    viewer = _create_patient(client)

    day = _next_weekday(0)
    slot = _slot_at(day, "10:00")

    # Book the slot on doctor A only.
    other = _create_patient(client)
    assert _book(client, other, doctor_a, slot).status_code == 201

    on_a = _slot(_availability(client, viewer, doctor_a, day, day).json()["items"], slot)
    on_b = _slot(_availability(client, viewer, doctor_b, day, day).json()["items"], slot)
    assert on_a is not None and on_a["available"] is False, "doctor A's slot reads as taken"
    assert on_b is not None and on_b["available"] is True, "doctor B's same-time slot stays free"


# -- AC-064 -------------------------------------------------------------------


def test_ac064_an_unauthenticated_fetch_fails_and_returns_no_bookable_slots(
    client: TestClient, db_session: DBSession
):
    """[AC-064] When availability cannot be fetched, the request fails and no bookable slots
    come back. Without a token the endpoint returns 401 with a detail body and no slot list,
    so the page has nothing to show as bookable. The explicit on-screen error banner is a UI
    concern (rendered from this failure); the server half is proven here."""
    _require(client, AVAILABILITY)
    doctor_id, _viewer = _setup(client, db_session)
    day = _next_weekday(0)

    resp = client.get(
        AVAILABILITY.format(doctor_id=doctor_id),
        params={"date_from": day.isoformat(), "date_to": day.isoformat()},
    )
    assert resp.status_code == 401, resp.text
    body = resp.json()
    assert "detail" in body
    assert "items" not in body, "a failed fetch returns no slot list, so nothing is bookable"


def test_ac064_an_unknown_doctor_yields_an_empty_list_with_nothing_bookable(
    client: TestClient, db_session: DBSession
):
    """[AC-064] A selection the server cannot resolve to real availability (an unknown or
    inactive doctor) returns an empty slot list, so nothing is ever presented as bookable."""
    _require(client, AVAILABILITY)
    _doctor_id, viewer = _setup(client, db_session)
    day = _next_weekday(0)

    resp = _availability(client, viewer, "00000000-0000-4000-8000-000000000000", day, day)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["items"] == [], "an unresolvable selection offers no bookable slots"
    assert body["total"] == 0


# -- NFR-015 ------------------------------------------------------------------


def test_nfr015_booking_transaction_is_the_authoritative_guard_against_a_stale_list(
    client: TestClient, db_session: DBSession
):
    """[NFR-015] Freshness is kept by a polled pull, not a live push: the booking
    transaction remains the authoritative guard against a stale list. Even if a viewer's
    polled list still showed a slot as free, a second booking of the same slot is refused
    409 slot_taken and writes no duplicate, so the transaction -- not the list -- decides."""
    _require(client, AVAILABILITY, APPOINTMENTS)
    doctor_id, viewer = _setup(client, db_session)
    day = _next_weekday(0)
    slot = _slot_at(day, "12:00")

    first = _book(client, viewer, doctor_id, slot)
    assert first.status_code == 201, first.text

    racing = _create_patient(client)
    second = _book(client, racing, doctor_id, slot)
    assert second.status_code == 409, second.text
    assert second.json()["code"] == "slot_taken", "the transaction is the final guard"


def test_nfr015_availability_is_a_plain_polled_get_not_a_push_channel(
    client: TestClient, db_session: DBSession
):
    """[NFR-015] There is no persistent push/websocket layer: availability is a plain REST
    GET the page polls. The endpoint exists as a GET and the API exposes no websocket path
    for availability, so freshness can only come from re-fetching."""
    _require(client, AVAILABILITY)
    paths = client.get("/openapi.json").json().get("paths", {})
    methods = {m.lower() for m in paths.get(AVAILABILITY, {})}
    assert "get" in methods, "availability must be fetchable with a plain GET for polling"
    assert not any(
        "ws" in str(p).lower() or "socket" in str(p).lower() for p in paths
    ), "no websocket/push path should exist: freshness is by polled GET only"


# -- NFR-016 / NFR-017 (infrastructure, not observable here) ------------------


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are "
    "managed-database provisioning settings enabled in hosting; they cannot be observed "
    "from the running application. Declared in tests/integration/test_nfr_infrastructure.py."
)
def test_nfr016_backups_and_pitr_are_infrastructure():
    raise AssertionError("not run")


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic (10-50 doctors, a few thousand "
    "patients) is a provisioning/capacity target declared in deployment config, not "
    "observable from the application. Declared in tests/integration/test_nfr_infrastructure.py."
)
def test_nfr017_sizing_is_infrastructure():
    raise AssertionError("not run")
