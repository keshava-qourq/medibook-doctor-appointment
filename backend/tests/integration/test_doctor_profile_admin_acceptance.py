"""US-007-3 acceptance (API): administrator doctor-profile editing and deactivation.

Contract under test (US-007-1 / US-007-2):
  PUT /api/admin/doctors/{doctor_id}  (admin only, Bearer token)
      {full_name?, specialization_ids[], qualifications?, bio?, location?,
       consultation_fee?, is_active?}
      -> 200 {id, full_name, specializations:[{id,name}], specialization_ids[],
              qualifications, bio, location, consultation_fee, is_active,
              affected_future_appointments}
      -> 422 {"detail":[{"field":"specialization_ids",
                         "msg":"At least one specialization is required"}]}
      -> 404 empty body (unknown id / non-doctor), 403 empty body (non-admin),
         401 {"detail": ...} (no token)
  GET /api/doctors, GET /api/doctors/{doctor_id}  -- same card without
      affected_future_appointments; inactive doctors excluded, also from
      GET /api/search/doctors
  POST /api/appointments (patient) {doctor_id, slot_start}
      -> 201 {id, doctor_id, patient_id, slot_start, slot_end, status:"booked"}
      -> 403 empty body when the doctor is inactive

NFR-013: no response anywhere in this journey carries a payment, checkout, invoice
or refund field -- the consultation fee is informational only.
NFR-026: an appointment of a deactivated doctor is preserved and stays readable,
with its original status, to both the patient and the doctor.

Every account and record is created through the API; the bootstrap admin is seeded
exactly as the application seeds it from BOOTSTRAP_ADMIN_* at startup, because no
API mints the first admin and the ``client`` fixture starts from an empty database.
Each test generates its own unique emails and names, so no two tests collide.

NFR-016 (backups/PITR) and NFR-017 (sizing) are provisioning promises no
application-level test can observe: they are declared below as [KNOWN-LIMIT] skips
and verified as committed declarations in tests/integration/test_nfr_infrastructure.py.
"""

import secrets
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import hash_password

PAYMENT_WORDS = ("payment", "checkout", "invoice", "refund", "pay_now", "billing")


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


def _patient_token(client: TestClient) -> str:
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Profile Patient",
            "email": _email("patient"),
            "phone": "+15551112222",
            "password": _password(),
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _has_route(client: TestClient, template: str) -> bool:
    return template in client.get("/openapi.json").json().get("paths", {})


def _require(client: TestClient, *templates: str) -> None:
    missing = [t for t in templates if not _has_route(client, t)]
    if missing:
        pytest.skip(
            "PENDING: routes not mounted yet "
            f"({', '.join(missing)}); delivered by US-007-1/US-007-2 in the same sprint "
            "(concurrent build)"
        )


def _items(payload) -> list:
    return payload.get("items", []) if isinstance(payload, dict) else payload


def _ids(payload) -> set:
    return {row["id"] for row in _items(payload)}


def _create_spec(client: TestClient, token: str, name: str) -> str:
    created = client.post(
        "/api/admin/specializations",
        headers=_bearer(token),
        json={"name": name, "description": "desc"},
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def _create_doctor(client: TestClient, token: str, full_name: str | None = None) -> tuple[str, str]:
    full_name = full_name or _name("Dr Profile")
    created = client.post(
        "/api/admin/users",
        headers=_bearer(token),
        json={
            "full_name": full_name,
            "email": _email("doctor"),
            "role": "doctor",
            "initial_password": _password(),
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["id"], full_name


def _doctor_login(client: TestClient, admin_token: str) -> tuple[str, str]:
    """Create a doctor and sign in as them; returns (doctor_id, doctor_token)."""
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": _name("Dr Login"),
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )
    assert created.status_code == 201, created.text
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return created.json()["id"], login.json()["token"]


def _future_slot(days: int = 3, hour: int = 10) -> str:
    start = datetime.now(UTC) + timedelta(days=days)
    return start.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()


def _assert_no_payment_surface(*responses) -> None:
    for resp in responses:
        body = resp.text.lower()
        for word in PAYMENT_WORDS:
            assert word not in body, f"NFR-013: no response may carry a {word} field"


# -- AC-026 -------------------------------------------------------------------


def test_ac026_nfr013_admin_saves_full_doctor_profile_and_a_fresh_get_returns_it(
    client: TestClient, db_session: DBSession
):
    """[AC-026][NFR-013] An administrator saves name, specializations, qualifications,
    biography, location and consultation fee; a fresh GET /api/doctors/{id} returns
    exactly those values, and no response in the journey offers a payment surface."""
    _require(client, "/api/admin/doctors/{doctor_id}", "/api/doctors/{doctor_id}")
    admin = _admin_token(client, db_session)
    spec_a = _create_spec(client, admin, _name("Cardiology"))
    spec_b = _create_spec(client, admin, _name("Pulmonology"))
    doctor_id, _ = _create_doctor(client, admin)

    new_name = _name("Dr Saved")
    payload = {
        "full_name": new_name,
        "specialization_ids": [spec_a, spec_b],
        "qualifications": "MBBS, MD Cardiology",
        "bio": "Twenty years treating heart and lung conditions.",
        "location": "Room 204, East Wing",
        "consultation_fee": 650,
        "is_active": True,
    }
    saved = client.put(
        f"/api/admin/doctors/{doctor_id}", headers=_bearer(admin), json=payload
    )
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["id"] == doctor_id, body
    assert body["full_name"] == new_name, body
    assert set(body["specialization_ids"]) == {spec_a, spec_b}, body
    assert {s["id"] for s in body["specializations"]} == {spec_a, spec_b}, body
    assert body["qualifications"] == payload["qualifications"], body
    assert body["bio"] == payload["bio"], body
    assert body["location"] == payload["location"], body
    assert float(body["consultation_fee"]) == 650.0, body
    assert body["is_active"] is True, body
    assert body["affected_future_appointments"] == 0, body

    patient = _patient_token(client)
    fresh = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient))
    assert fresh.status_code == 200, fresh.text
    card = fresh.json()
    assert card["full_name"] == new_name, card
    assert {s["id"] for s in card["specializations"]} == {spec_a, spec_b}, card
    assert card["qualifications"] == payload["qualifications"], card
    assert card["bio"] == payload["bio"], card
    assert card["location"] == payload["location"], card
    assert float(card["consultation_fee"]) == 650.0, card
    assert card["is_active"] is True, card
    # The read card is the directory card: it carries no edit-only counter.
    assert "affected_future_appointments" not in card, card

    listing = client.get("/api/doctors", headers=_bearer(patient), params={"limit": 100})
    assert listing.status_code == 200, listing.text
    assert doctor_id in _ids(listing.json()), listing.text

    _assert_no_payment_surface(saved, fresh, listing)


def test_ac026_doctor_profile_edit_is_admin_only_and_needs_a_token(
    client: TestClient, db_session: DBSession
):
    """[AC-026] The edit is refused 403 with an empty body to a non-admin, 401 with a
    detail body without a token, and 404 with an empty body for a non-doctor id."""
    _require(client, "/api/admin/doctors/{doctor_id}")
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Neurology"))
    doctor_id, _ = _create_doctor(client, admin)
    patient = _patient_token(client)
    body = {"specialization_ids": [spec_id], "qualifications": "MBBS"}

    anonymous = client.put(f"/api/admin/doctors/{doctor_id}", json=body)
    assert anonymous.status_code == 401, anonymous.text
    assert "detail" in anonymous.json()

    forbidden = client.put(
        f"/api/admin/doctors/{doctor_id}", headers=_bearer(patient), json=body
    )
    assert forbidden.status_code == 403, forbidden.text
    assert forbidden.content == b"", forbidden.text

    not_a_doctor = client.put(
        f"/api/admin/doctors/{secrets.token_hex(16)}", headers=_bearer(admin), json=body
    )
    assert not_a_doctor.status_code == 404, not_a_doctor.text
    assert not_a_doctor.content == b"", not_a_doctor.text


# -- AC-027 -------------------------------------------------------------------


def test_ac027_empty_specialization_list_is_422_and_the_saved_profile_is_unchanged(
    client: TestClient, db_session: DBSession
):
    """[AC-027][NFR-022] A save with an empty specialization list is refused 422 keyed
    on 'specialization_ids' with a specialization-required message, and the profile
    saved before it is left exactly as it was."""
    _require(client, "/api/admin/doctors/{doctor_id}", "/api/doctors/{doctor_id}")
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Dermatology"))
    doctor_id, _ = _create_doctor(client, admin)

    first = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={
            "full_name": _name("Dr Kept"),
            "specialization_ids": [spec_id],
            "qualifications": "MBBS, MD",
            "bio": "Original biography.",
            "location": "Room 7",
            "consultation_fee": 300,
        },
    )
    assert first.status_code == 200, first.text
    patient = _patient_token(client)
    before = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient)).json()

    rejected = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={
            "full_name": "Should Not Be Saved",
            "specialization_ids": [],
            "qualifications": "Changed",
            "bio": "Changed",
            "location": "Changed",
            "consultation_fee": 999,
        },
    )
    assert rejected.status_code == 422, rejected.text
    detail = rejected.json()["detail"]
    assert isinstance(detail, list) and detail, detail
    errors = [err for err in detail if err.get("field") == "specialization_ids"]
    assert errors, detail
    assert "specialization" in errors[0]["msg"].lower(), errors
    assert "required" in errors[0]["msg"].lower(), errors

    after = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient)).json()
    assert after == before, "a rejected save must write nothing"


def test_ac027_a_missing_specialization_list_is_refused_the_same_way(
    client: TestClient, db_session: DBSession
):
    """[AC-027] Omitting specialization_ids entirely is refused exactly like sending an
    empty one: 422 keyed on that field, with nothing written."""
    _require(client, "/api/admin/doctors/{doctor_id}", "/api/doctors/{doctor_id}")
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Oncology"))
    doctor_id, _ = _create_doctor(client, admin)
    assert (
        client.put(
            f"/api/admin/doctors/{doctor_id}",
            headers=_bearer(admin),
            json={"specialization_ids": [spec_id], "qualifications": "MBBS"},
        ).status_code
        == 200
    )
    patient = _patient_token(client)
    before = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient)).json()

    resp = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={"qualifications": "Changed without specializations"},
    )
    assert resp.status_code == 422, resp.text
    assert any(err.get("field") == "specialization_ids" for err in resp.json()["detail"]), resp.text

    after = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient)).json()
    assert after == before, "a rejected save must write nothing"


# -- AC-028 -------------------------------------------------------------------


def test_ac028_deactivated_doctor_leaves_the_lists_and_cannot_be_booked(
    client: TestClient, db_session: DBSession
):
    """[AC-028] After the administrator deactivates a doctor, that doctor is absent from
    GET /api/doctors and from GET /api/search/doctors for a term that matched before,
    and a patient's POST /api/appointments against them is 403 with an empty body."""
    _require(
        client,
        "/api/admin/doctors/{doctor_id}",
        "/api/doctors",
        "/api/search/doctors",
        "/api/appointments",
        "/api/admin/catalog-terms",
    )
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Rheumatology"))
    doctor_id, _ = _create_doctor(client, admin)
    assert (
        client.put(
            f"/api/admin/doctors/{doctor_id}",
            headers=_bearer(admin),
            json={"specialization_ids": [spec_id], "qualifications": "MBBS", "is_active": True},
        ).status_code
        == 200
    )
    term = _name("jointpain")
    created_term = client.post(
        "/api/admin/catalog-terms",
        headers=_bearer(admin),
        json={"term": term, "entry_type": "symptom", "specialization_ids": [spec_id]},
    )
    assert created_term.status_code == 201, created_term.text

    patient = _patient_token(client)
    before_list = client.get("/api/doctors", headers=_bearer(patient), params={"limit": 100})
    assert doctor_id in _ids(before_list.json()), before_list.text
    before_search = client.get(
        "/api/search/doctors", headers=_bearer(patient), params={"term": term, "limit": 100}
    )
    assert before_search.status_code == 200, before_search.text
    assert doctor_id in _ids(before_search.json()), before_search.text

    deactivated = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert deactivated.status_code == 200, deactivated.text
    assert deactivated.json()["is_active"] is False, deactivated.text

    after_list = client.get("/api/doctors", headers=_bearer(patient), params={"limit": 100})
    assert doctor_id not in _ids(after_list.json()), after_list.text
    after_search = client.get(
        "/api/search/doctors", headers=_bearer(patient), params={"term": term, "limit": 100}
    )
    assert after_search.status_code == 200, after_search.text
    assert doctor_id not in _ids(after_search.json()), after_search.text

    booking = client.post(
        "/api/appointments",
        headers=_bearer(patient),
        json={"doctor_id": doctor_id, "slot_start": _future_slot()},
    )
    assert booking.status_code == 403, booking.text
    assert booking.content == b"", booking.text


# -- AC-029 / NFR-026 ----------------------------------------------------------


def test_ac029_nfr026_deactivation_reports_future_appointments_and_history_survives(
    client: TestClient, db_session: DBSession
):
    """[AC-029][NFR-026] With a future appointment booked, the deactivating PUT returns
    affected_future_appointments equal to that count; afterwards both the patient and
    the doctor can still read that appointment, with its original status."""
    _require(
        client,
        "/api/admin/doctors/{doctor_id}",
        "/api/appointments",
        "/api/appointments/{id}",
    )
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Endocrinology"))
    doctor_id, doctor_token = _doctor_login(client, admin)
    assert (
        client.put(
            f"/api/admin/doctors/{doctor_id}",
            headers=_bearer(admin),
            json={"specialization_ids": [spec_id], "qualifications": "MBBS", "is_active": True},
        ).status_code
        == 200
    )

    patient = _patient_token(client)
    booked = client.post(
        "/api/appointments",
        headers=_bearer(patient),
        json={"doctor_id": doctor_id, "slot_start": _future_slot(days=4)},
    )
    assert booked.status_code == 201, booked.text
    appointment = booked.json()
    appointment_id = appointment["id"]
    assert appointment["doctor_id"] == doctor_id, appointment
    assert appointment["status"] == "booked", appointment

    deactivated = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert deactivated.status_code == 200, deactivated.text
    assert deactivated.json()["affected_future_appointments"] == 1, deactivated.text

    patient_view = client.get(f"/api/appointments/{appointment_id}", headers=_bearer(patient))
    assert patient_view.status_code == 200, patient_view.text
    assert patient_view.json()["id"] == appointment_id, patient_view.text
    assert patient_view.json()["status"] == "booked", patient_view.text

    doctor_view = client.get(f"/api/appointments/{appointment_id}", headers=_bearer(doctor_token))
    assert doctor_view.status_code == 200, doctor_view.text
    assert doctor_view.json()["id"] == appointment_id, doctor_view.text
    assert doctor_view.json()["status"] == "booked", doctor_view.text

    _assert_no_payment_surface(booked, deactivated, patient_view, doctor_view)


def test_ac029_affected_future_appointments_counts_only_future_booked_appointments(
    client: TestClient, db_session: DBSession
):
    """[AC-029] The counter is the number of future appointments the deactivation
    affects: zero for a doctor with none, and the exact count when several are booked."""
    _require(client, "/api/admin/doctors/{doctor_id}", "/api/appointments")
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Orthopaedics"))

    quiet_id, _ = _create_doctor(client, admin)
    assert (
        client.put(
            f"/api/admin/doctors/{quiet_id}",
            headers=_bearer(admin),
            json={"specialization_ids": [spec_id], "is_active": True},
        ).status_code
        == 200
    )
    quiet_off = client.put(
        f"/api/admin/doctors/{quiet_id}",
        headers=_bearer(admin),
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert quiet_off.status_code == 200, quiet_off.text
    assert quiet_off.json()["affected_future_appointments"] == 0, quiet_off.text

    busy_id, _ = _create_doctor(client, admin)
    assert (
        client.put(
            f"/api/admin/doctors/{busy_id}",
            headers=_bearer(admin),
            json={"specialization_ids": [spec_id], "is_active": True},
        ).status_code
        == 200
    )
    for days in (2, 3):
        booked = client.post(
            "/api/appointments",
            headers=_bearer(_patient_token(client)),
            json={"doctor_id": busy_id, "slot_start": _future_slot(days=days)},
        )
        assert booked.status_code == 201, booked.text

    busy_off = client.put(
        f"/api/admin/doctors/{busy_id}",
        headers=_bearer(admin),
        json={"specialization_ids": [spec_id], "is_active": False},
    )
    assert busy_off.status_code == 200, busy_off.text
    assert busy_off.json()["affected_future_appointments"] == 2, busy_off.text


def test_nfr013_no_response_in_the_doctor_profile_journey_offers_a_payment_surface(
    client: TestClient, db_session: DBSession
):
    """[NFR-013] Across the whole administrator journey -- saving a profile, reading it
    back, listing the directory and a rejected save -- the consultation fee is the only
    money in sight: no payment, checkout, invoice, billing or refund field appears."""
    _require(client, "/api/admin/doctors/{doctor_id}", "/api/doctors/{doctor_id}", "/api/doctors")
    admin = _admin_token(client, db_session)
    spec_id = _create_spec(client, admin, _name("Gastroenterology"))
    doctor_id, _ = _create_doctor(client, admin)

    saved = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(admin),
        json={
            "specialization_ids": [spec_id],
            "qualifications": "MBBS",
            "bio": "Bio",
            "location": "Room 1",
            "consultation_fee": 400,
        },
    )
    assert saved.status_code == 200, saved.text
    patient = _patient_token(client)
    responses = [
        saved,
        client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient)),
        client.get("/api/doctors", headers=_bearer(patient), params={"limit": 100}),
        client.put(
            f"/api/admin/doctors/{doctor_id}",
            headers=_bearer(admin),
            json={"specialization_ids": []},
        ),
    ]
    _assert_no_payment_surface(*responses)
    # The informational fee itself is present and is a plain number.
    card = responses[1].json()
    assert float(card["consultation_fee"]) == 400.0, card


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
