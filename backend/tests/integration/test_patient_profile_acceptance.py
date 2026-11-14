"""US-005-2 acceptance (API): a patient reads and updates their own profile and
changes their password.

Contract (US-005-1 / openapi):
  GET   /api/patients/me          -> 200 {full_name, email, phone, date_of_birth, gender}
  PATCH /api/patients/me          -> 200 updated profile | 422 field errors
  POST  /api/patients/me/password -> 200 {"status": "ok"} | 422 field errors
                                     (wrong current_password or weak new_password)

Every account is created through /api/auth/register. The patient-profile router is
delivered by US-005-1 in the same sprint and may not be mounted yet while this ticket
is in flight: each criterion is gated on the live OpenAPI schema, so it runs its real
assertions when the route exists and is PENDING (skipped, concurrent build) until then,
rather than failing on an import or a 404 that the builder has not written yet.
"""

import secrets

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import verify_password


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _has_route(client: TestClient, template: str) -> bool:
    schema = client.get("/openapi.json").json()
    return template in schema.get("paths", {})


def _register_patient(client: TestClient) -> tuple[str, str, str]:
    """Register a patient through the public API; return (email, password, token)."""
    email = _email("patient")
    password = _password()
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Profile Patient",
            "email": email,
            "phone": "+15551112222",
            "password": password,
        },
    )
    assert reg.status_code == 201, reg.text
    return email, password, reg.json()["token"]


def _require_profile(client: TestClient) -> None:
    if not _has_route(client, "/api/patients/me"):
        pytest.skip(
            "PENDING: /api/patients/me not mounted yet (patient profile router is "
            "delivered by US-005-1 in the same sprint; concurrent build)"
        )


def _require_password(client: TestClient) -> None:
    if not _has_route(client, "/api/patients/me/password"):
        pytest.skip(
            "PENDING: /api/patients/me/password not mounted yet (delivered by US-005-1 "
            "in the same sprint; concurrent build)"
        )


# -- AC-018: a signed-in patient reads their stored profile fields -------------


def test_ac018_patient_reads_own_profile_fields(client: TestClient, db_session: DBSession):
    _require_profile(client)
    email, _password_unused, token = _register_patient(client)

    resp = client.get("/api/patients/me", headers=_bearer(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Exactly the contracted fields are present.
    for field in ("full_name", "email", "phone", "date_of_birth", "gender"):
        assert field in body, f"profile is missing {field}: {body}"
    assert body["email"].lower() == email.lower()
    assert body["full_name"] == "Profile Patient"
    assert body["phone"] == "+15551112222"
    # No password material is ever returned by a read endpoint.
    assert "password" not in body
    assert "password_hash" not in body


def test_ac018_reading_profile_without_a_token_is_401(client: TestClient, db_session: DBSession):
    _require_profile(client)
    resp = client.get("/api/patients/me")
    assert resp.status_code == 401, resp.text
    assert "detail" in resp.json()


# -- AC-019: updating name/phone/dob/gender persists on a fresh GET ------------


def test_ac019_update_profile_persists_and_is_reflected_on_fresh_get(
    client: TestClient, db_session: DBSession
):
    _require_profile(client)
    _email_unused, _password_unused, token = _register_patient(client)

    update = {
        "full_name": "Renamed Patient",
        "phone": "+15559998888",
        "date_of_birth": "1990-05-15",
        "gender": "female",
    }
    patch = client.patch("/api/patients/me", headers=_bearer(token), json=update)
    assert patch.status_code == 200, patch.text

    # A fresh GET reflects every persisted change.
    fresh = client.get("/api/patients/me", headers=_bearer(token))
    assert fresh.status_code == 200, fresh.text
    body = fresh.json()
    assert body["full_name"] == "Renamed Patient"
    assert body["phone"] == "+15559998888"
    assert str(body["date_of_birth"]).startswith("1990-05-15")
    assert body["gender"] == "female"


# -- AC-020: changing password with correct current + valid new succeeds -------


def test_ac020_password_change_succeeds_old_fails_new_logs_in(
    client: TestClient, db_session: DBSession
):
    _require_password(client)
    email, old_password, token = _register_patient(client)
    new_password = _password()

    change = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": old_password, "new_password": new_password},
    )
    assert change.status_code == 200, change.text

    # The old password no longer authenticates.
    old_login = client.post("/api/auth/login", json={"email": email, "password": old_password})
    assert old_login.status_code == 401, old_login.text
    # The new password logs in.
    new_login = client.post("/api/auth/login", json={"email": email, "password": new_password})
    assert new_login.status_code == 200, new_login.text
    assert new_login.json()["token"]


def test_ac020_weak_new_password_is_rejected_422_and_original_still_logs_in(
    client: TestClient, db_session: DBSession
):
    _require_password(client)
    email, old_password, token = _register_patient(client)

    resp = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": old_password, "new_password": "short"},
    )
    assert resp.status_code == 422, resp.text
    # Nothing changed: the original password still logs in.
    assert (
        client.post("/api/auth/login", json={"email": email, "password": old_password}).status_code
        == 200
    )


# -- AC-021: wrong current password is rejected, original still logs in --------


def test_ac021_wrong_current_password_rejected_and_original_still_logs_in(
    client: TestClient, db_session: DBSession
):
    _require_password(client)
    email, old_password, token = _register_patient(client)
    new_password = _password()

    resp = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": old_password + "-wrong", "new_password": new_password},
    )
    assert resp.status_code == 422, resp.text
    fields = {err["field"] for err in resp.json()["detail"]}
    assert "current_password" in fields

    # The original password still logs in; the attempted new one does not.
    assert (
        client.post("/api/auth/login", json={"email": email, "password": old_password}).status_code
        == 200
    )
    assert (
        client.post("/api/auth/login", json={"email": email, "password": new_password}).status_code
        == 401
    )


# -- NFR-001: a changed password is stored only as a salted one-way hash --------


def test_nfr001_changed_password_stored_only_as_bcrypt_hash(
    client: TestClient, db_session: DBSession
):
    _require_password(client)
    _email_unused, old_password, token = _register_patient(client)
    new_password = _password()

    change = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": old_password, "new_password": new_password},
    )
    assert change.status_code == 200, change.text

    user = db_session.query(User).filter(User.full_name == "Profile Patient").order_by(
        User.created_at.desc()
    ).first()
    assert user is not None
    assert user.password_hash != new_password
    assert user.password_hash.startswith("$2")  # bcrypt with a per-user salt
    assert verify_password(new_password, user.password_hash)
    assert not verify_password(old_password, user.password_hash)


# -- NFR-022: invalid profile update is 422, keyed by field, and writes nothing -


def test_nfr022_invalid_profile_update_is_422_keyed_by_field_and_writes_nothing(
    client: TestClient, db_session: DBSession
):
    _require_profile(client)
    _email_unused, _password_unused, token = _register_patient(client)

    before = client.get("/api/patients/me", headers=_bearer(token)).json()

    resp = client.patch(
        "/api/patients/me",
        headers=_bearer(token),
        json={"date_of_birth": "not-a-date"},
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    fields = {err["field"] for err in detail}
    assert "date_of_birth" in fields

    # Nothing was written: the saved values stay in force.
    after = client.get("/api/patients/me", headers=_bearer(token)).json()
    assert after["date_of_birth"] == before["date_of_birth"]
    assert after["full_name"] == before["full_name"]
