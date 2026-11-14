"""US-002-1 acceptance (API): sign-in, generic failure, sign-out, idle expiry and
deactivation.

Contract:
  POST /api/auth/login  {email,password} -> 200 {token, landing, user{...}}
                                         -> 401 {"detail": <generic>} (bad password OR
                                            unknown email, byte-identical bodies)
                                         -> 403 {"code": "account_inactive"}
  POST /api/auth/logout (Bearer)         -> 204, revokes only that token
  GET  /api/auth/me     (Bearer)         -> 200 user payload | 401 missing/expired/revoked

Every account bar the bootstrap admin is created through the API; the bootstrap admin is
seeded exactly as the application seeds it from BOOTSTRAP_ADMIN_* at startup, because no
API mints the first admin and the ``client`` fixture starts from an empty database.
"""

import secrets
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import Session as SessionModel
from app.models import User
from app.security import hash_password


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


def _admin(client: TestClient, db: DBSession) -> tuple[str, str, str]:
    """Sign the seeded bootstrap admin in; return (email, password, token)."""
    password = _password()
    email = _seed_admin(db, password)
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return email, password, resp.json()["token"]


def _register_patient(client: TestClient) -> tuple[str, str, str, str]:
    """Register a patient through the public API; return (email, password, token, id)."""
    email = _email("patient")
    password = _password()
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Session Patient",
            "email": email,
            "phone": "+15551112222",
            "password": password,
        },
    )
    assert reg.status_code == 201, reg.text
    return email, password, reg.json()["token"], reg.json()["user"]["id"]


def _create_staff(client: TestClient, admin_token: str, role: str) -> tuple[str, str, str]:
    """Create a doctor/admin through /api/admin/users; return (email, password, id)."""
    email = _email(role)
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": f"Session {role.title()}",
            "email": email,
            "role": role,
            "initial_password": password,
        },
    )
    assert created.status_code == 201, created.text
    return email, password, created.json()["id"]


# -- AC-005: each role signs in and is sent to its own landing path ------------


def test_ac005_each_role_logs_in_and_gets_its_role_specific_landing(
    client: TestClient, db_session: DBSession
):
    """[AC-005] A patient, a doctor and an admin each sign in through
    POST /api/auth/login and receive the landing path for their role."""
    admin_email, admin_password, admin_token = _admin(client, db_session)

    # patient -> /search
    patient_email, patient_password, _token, _id = _register_patient(client)
    patient_login = client.post(
        "/api/auth/login", json={"email": patient_email, "password": patient_password}
    )
    assert patient_login.status_code == 200, patient_login.text
    patient_body = patient_login.json()
    assert patient_body["landing"] == "/search"
    assert patient_body["user"]["role"] == "patient"
    assert patient_body["token"]

    # doctor -> /doctor-schedule
    doctor_email, doctor_password, _doctor_id = _create_staff(client, admin_token, "doctor")
    doctor_login = client.post(
        "/api/auth/login", json={"email": doctor_email, "password": doctor_password}
    )
    assert doctor_login.status_code == 200, doctor_login.text
    assert doctor_login.json()["landing"] == "/doctor-schedule"
    assert doctor_login.json()["user"]["role"] == "doctor"

    # admin -> /admin
    admin_login = client.post(
        "/api/auth/login", json={"email": admin_email, "password": admin_password}
    )
    assert admin_login.status_code == 200, admin_login.text
    assert admin_login.json()["landing"] == "/admin"
    assert admin_login.json()["user"]["role"] == "admin"

    # The issued token authenticates the caller it was issued to, and no password
    # material travels in the payload.
    me = client.get("/api/auth/me", headers=_bearer(patient_body["token"]))
    assert me.status_code == 200, me.text
    assert me.json()["email"].lower() == patient_email.lower()
    assert "password" not in str(patient_body).lower()


# -- AC-006 / NFR-004: a failed sign-in reveals nothing and creates no session --


def test_ac006_nfr004_wrong_password_and_unknown_email_are_byte_identical_401(
    client: TestClient, db_session: DBSession
):
    """[AC-006][NFR-004] A wrong password and an unknown email both return 401 with
    the identical generic detail -- the raw bodies are byte-for-byte the same, so the
    response cannot say whether the address is registered -- and neither opens a
    session: no token is handed back and no authenticated call can be made."""
    email, password, _token, _id = _register_patient(client)

    wrong_password = client.post(
        "/api/auth/login", json={"email": email, "password": password + "-wrong"}
    )
    unknown_email = client.post(
        "/api/auth/login", json={"email": _email("nobody"), "password": password}
    )

    assert wrong_password.status_code == 401, wrong_password.text
    assert unknown_email.status_code == 401, unknown_email.text
    assert "detail" in wrong_password.json()
    assert wrong_password.content == unknown_email.content, (
        "the two failure bodies must be byte-identical so neither reveals the account"
    )
    for resp in (wrong_password, unknown_email):
        assert "token" not in resp.json(), "a failed sign-in must not issue a token"
        assert email not in resp.text

    # No session row was created by either failure: the only live session is the one
    # registration opened, and a call authenticated with nothing is refused.
    assert db_session.query(SessionModel).count() == 1
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=_bearer("not-a-real-token")).status_code == 401


# -- AC-007 / NFR-002: sign-out ends that session only -------------------------


def test_ac007_nfr002_logout_revokes_only_the_callers_token(
    client: TestClient, db_session: DBSession
):
    """[AC-007][NFR-002] After sign-out the logged-out token is refused 401 on any
    further action, while the same user's other concurrent session keeps working."""
    email, password, first_token, _id = _register_patient(client)
    second = client.post("/api/auth/login", json={"email": email, "password": password})
    assert second.status_code == 200, second.text
    second_token = second.json()["token"]
    assert first_token != second_token

    assert client.get("/api/auth/me", headers=_bearer(first_token)).status_code == 200
    assert client.get("/api/auth/me", headers=_bearer(second_token)).status_code == 200

    logout = client.post("/api/auth/logout", headers=_bearer(first_token))
    assert logout.status_code == 204, logout.text

    revoked = client.get("/api/auth/me", headers=_bearer(first_token))
    assert revoked.status_code == 401, revoked.text
    assert "detail" in revoked.json()
    assert "www-authenticate" not in {k.lower() for k in revoked.headers}
    # The user's other token is untouched.
    assert client.get("/api/auth/me", headers=_bearer(second_token)).status_code == 200

    # Signing out again with the revoked token is refused the same way.
    assert client.post("/api/auth/logout", headers=_bearer(first_token)).status_code == 401
    # Signing in again issues a fresh working token.
    again = client.post("/api/auth/login", json={"email": email, "password": password})
    assert again.status_code == 200
    assert client.get("/api/auth/me", headers=_bearer(again.json()["token"])).status_code == 200


# -- AC-008 / NFR-002: a session lapses after session_idle_minutes -------------


def test_ac008_nfr002_session_past_idle_window_is_401_and_relogin_is_required(
    client: TestClient, db_session: DBSession
):
    """[AC-008][NFR-002] Driving a live session past session_idle_minutes of inactivity
    (its idle window is moved into the past, standing in for wall-clock time) makes the
    next read and the next write 401; signing in again restores access."""
    email, password, token, user_id = _register_patient(client)
    assert client.get("/api/auth/me", headers=_bearer(token)).status_code == 200

    # Age the session past its idle window, as the clock would.
    session = db_session.query(SessionModel).filter(SessionModel.user_id == user_id).one()
    past = datetime.now(UTC) - timedelta(seconds=1)
    session.last_seen_at = past - timedelta(minutes=60)
    session.expires_at = past
    db_session.add(session)
    db_session.commit()

    read = client.get("/api/auth/me", headers=_bearer(token))
    assert read.status_code == 401, read.text
    assert "detail" in read.json()
    write = client.post("/api/auth/logout", headers=_bearer(token))
    assert write.status_code == 401, write.text

    # Re-login is required, and it works.
    fresh = client.post("/api/auth/login", json={"email": email, "password": password})
    assert fresh.status_code == 200, fresh.text
    assert client.get("/api/auth/me", headers=_bearer(fresh.json()["token"])).status_code == 200


def test_ac008_each_authenticated_call_slides_the_idle_window_forward(
    client: TestClient, db_session: DBSession
):
    """[AC-008][NFR-002] The idle window is measured from last_seen_at: an authenticated
    call pushes last_seen_at and expires_at forward, so an active user is not signed out
    mid-use."""
    _email_unused, _password_unused, token, user_id = _register_patient(client)
    session = db_session.query(SessionModel).filter(SessionModel.user_id == user_id).one()
    session.last_seen_at = datetime.now(UTC) - timedelta(minutes=29)
    session.expires_at = datetime.now(UTC) + timedelta(seconds=5)
    db_session.add(session)
    db_session.commit()
    before_expiry = session.expires_at

    assert client.get("/api/auth/me", headers=_bearer(token)).status_code == 200

    db_session.refresh(session)

    def _aware(value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)

    assert _aware(session.expires_at) > _aware(before_expiry)


# -- AC-009 / NFR-002: deactivation ends the session and refuses re-login ------


def test_ac009_nfr002_deactivated_user_token_is_rejected_and_relogin_is_refused(
    client: TestClient, db_session: DBSession
):
    """[AC-009][NFR-002] Once an administrator deactivates an account, the user's existing
    token is rejected 401 on the next action and a fresh sign-in is refused with the
    inactive-account response (403 account_inactive), not the generic 401."""
    _admin_email, _admin_password, admin_token = _admin(client, db_session)
    doctor_email, doctor_password, doctor_id = _create_staff(client, admin_token, "doctor")

    login = client.post(
        "/api/auth/login", json={"email": doctor_email, "password": doctor_password}
    )
    assert login.status_code == 200, login.text
    doctor_token = login.json()["token"]
    assert client.get("/api/auth/me", headers=_bearer(doctor_token)).status_code == 200

    deactivate = client.patch(
        f"/api/admin/users/{doctor_id}",
        headers=_bearer(admin_token),
        json={"is_active": False},
    )
    assert deactivate.status_code == 200, deactivate.text

    rejected = client.get("/api/auth/me", headers=_bearer(doctor_token))
    assert rejected.status_code == 401, rejected.text
    assert "detail" in rejected.json()

    refused = client.post(
        "/api/auth/login", json={"email": doctor_email, "password": doctor_password}
    )
    assert refused.status_code == 403, refused.text
    assert refused.json()["code"] == "account_inactive"

    # Reactivating restores sign-in, so the refusal was the account state, not the password.
    reactivate = client.patch(
        f"/api/admin/users/{doctor_id}",
        headers=_bearer(admin_token),
        json={"is_active": True},
    )
    assert reactivate.status_code == 200, reactivate.text
    assert (
        client.post(
            "/api/auth/login", json={"email": doctor_email, "password": doctor_password}
        ).status_code
        == 200
    )


def test_nfr002_admin_password_reset_ends_every_session_the_account_holds(
    client: TestClient, db_session: DBSession
):
    """[NFR-002] An administrator-issued replacement password immediately ends every
    session the account holds, forcing the user back to sign-in."""
    _admin_email, _admin_password, admin_token = _admin(client, db_session)
    doctor_email, doctor_password, doctor_id = _create_staff(client, admin_token, "doctor")

    tokens = []
    for _ in range(2):
        resp = client.post(
            "/api/auth/login", json={"email": doctor_email, "password": doctor_password}
        )
        assert resp.status_code == 200, resp.text
        tokens.append(resp.json()["token"])
    for token in tokens:
        assert client.get("/api/auth/me", headers=_bearer(token)).status_code == 200

    new_password = _password()
    reset = client.post(
        f"/api/admin/users/{doctor_id}/password",
        headers=_bearer(admin_token),
        json={"new_password": new_password},
    )
    assert reset.status_code == 204, reset.text

    for token in tokens:
        assert client.get("/api/auth/me", headers=_bearer(token)).status_code == 401
    assert (
        client.post(
            "/api/auth/login", json={"email": doctor_email, "password": new_password}
        ).status_code
        == 200
    )


# -- NFR-016 / NFR-017: infrastructure/provisioning, not observable from the app --


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-"
    "database settings enabled in hosting/deployment config (docker-compose.yml / IaC), not "
    "observable from the app; the declaration is covered by "
    "tests/integration/test_nfr_infrastructure.py"
)
def test_nfr016_backups_and_pitr_are_infrastructure():  # pragma: no cover
    pass


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic is a provisioning/capacity "
    "target declared in deployment config (docker-compose.yml / IaC), not observable from "
    "the app; the declaration is covered by tests/integration/test_nfr_infrastructure.py"
)
def test_nfr017_sizing_is_infrastructure():  # pragma: no cover
    pass
