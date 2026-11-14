"""Acceptance (API) for US-003-3: admin-created doctor/admin accounts, password
reissue, duplicate refusal and the unauthenticated/non-admin refusal.

Every account bar the bootstrap admin is created through the API. The bootstrap
admin itself is seeded directly, exactly as the application seeds it from
BOOTSTRAP_ADMIN_* at startup -- there is no API that mints the first admin, and
the ``client`` fixture starts from an empty database.
"""

import secrets

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import hash_password, verify_password


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


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


def _login(client: TestClient, email: str, password: str):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _admin_token(client: TestClient, db: DBSession) -> str:
    password = _password()
    email = _seed_admin(db, password)
    resp = _login(client, email, password)
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# -- AC-010 -------------------------------------------------------------------


def test_ac010_admin_creates_doctor_password_echoed_once_and_doctor_can_sign_in(
    client: TestClient, db_session: DBSession
):
    token = _admin_token(client, db_session)
    email = _email("doctor")
    password = _password()

    resp = client.post(
        "/api/admin/users",
        headers=_bearer(token),
        json={
            "full_name": "New Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["role"] == "doctor"
    assert body["is_active"] is True
    # The initial password is echoed exactly once, on creation, for hand-off.
    assert body["initial_password"] == password

    # It is never retrievable again: no read endpoint carries any password field.
    listing = client.get("/api/admin/users?limit=100", headers=_bearer(token))
    assert listing.status_code == 200
    for item in listing.json()["items"]:
        assert "initial_password" not in item
        assert "password" not in item
        assert "password_hash" not in item

    # The new doctor can sign in with the issued password.
    signin = _login(client, email, password)
    assert signin.status_code == 200, signin.text
    assert signin.json()["token"]
    assert signin.json()["landing"] == "/doctor-schedule"


def test_ac010_admin_can_create_another_admin(client: TestClient, db_session: DBSession):
    token = _admin_token(client, db_session)
    email = _email("newadmin")
    password = _password()

    resp = client.post(
        "/api/admin/users",
        headers=_bearer(token),
        json={
            "full_name": "Second Admin",
            "email": email,
            "role": "admin",
            "initial_password": password,
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == "admin"
    signin = _login(client, email, password)
    assert signin.status_code == 200
    assert signin.json()["landing"] == "/admin"


# -- AC-011 -------------------------------------------------------------------


def test_ac011_reissued_password_replaces_old_and_revokes_sessions(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    email = _email("doctor")
    old_password = _password()

    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Reissue Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": old_password,
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]

    # The doctor is signed in with an existing session before the reset.
    first = _login(client, email, old_password)
    assert first.status_code == 200
    old_token = first.json()["token"]
    assert client.get("/api/auth/me", headers=_bearer(old_token)).status_code == 200

    new_password = _password()
    reset = client.post(
        f"/api/admin/users/{user_id}/password",
        headers=_bearer(admin_token),
        json={"new_password": new_password},
    )
    assert reset.status_code == 204, reset.text

    # The old session is revoked immediately (NFR-002).
    assert client.get("/api/auth/me", headers=_bearer(old_token)).status_code == 401
    # The old password no longer authenticates.
    assert _login(client, email, old_password).status_code == 401
    # The new password works.
    assert _login(client, email, new_password).status_code == 200


def test_ac011_weak_reissued_password_is_rejected(client: TestClient, db_session: DBSession):
    admin_token = _admin_token(client, db_session)
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Weak Reset Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )
    user_id = created.json()["id"]

    resp = client.post(
        f"/api/admin/users/{user_id}/password",
        headers=_bearer(admin_token),
        json={"new_password": "short"},
    )
    assert resp.status_code == 422, resp.text
    # The original password still works: nothing changed on a rejected reset.
    assert _login(client, email, password).status_code == 200


# -- AC-012 -------------------------------------------------------------------


def test_ac012_duplicate_email_case_insensitive_is_409_and_creates_nothing(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    email = _email("dupe")
    password = _password()

    first = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={"full_name": "First", "email": email, "role": "doctor", "initial_password": password},
    )
    assert first.status_code == 201

    before = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]

    dup = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Second",
            "email": email.upper(),
            "role": "admin",
            "initial_password": _password(),
        },
    )
    assert dup.status_code == 409, dup.text
    assert dup.json()["code"] == "email_in_use"

    after = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]
    assert after == before


# -- AC-013 -------------------------------------------------------------------


def test_ac013_unauthenticated_create_is_401_and_creates_nothing(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    before = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]

    resp = client.post(
        "/api/admin/users",
        json={
            "full_name": "Ghost",
            "email": _email("ghost"),
            "role": "doctor",
            "initial_password": _password(),
        },
    )
    assert resp.status_code == 401, resp.text
    assert "detail" in resp.json()

    after = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]
    assert after == before


def test_ac013_non_admin_create_is_403_empty_body_and_creates_nothing(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)

    patient_email = _email("patient")
    patient_password = _password()
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Patient P",
            "email": patient_email,
            "phone": "+15551112222",
            "password": patient_password,
        },
    )
    assert reg.status_code == 201
    patient_token = reg.json()["token"]

    before = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]

    resp = client.post(
        "/api/admin/users",
        headers=_bearer(patient_token),
        json={
            "full_name": "Ghost",
            "email": _email("ghost"),
            "role": "doctor",
            "initial_password": _password(),
        },
    )
    assert resp.status_code == 403, resp.text
    assert resp.content == b""  # empty body, so it cannot be told apart from other 403s

    after = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]
    assert after == before


# -- NFR-001: passwords stored only as salted one-way hashes -------------------


def test_nfr001_admin_issued_password_stored_only_as_bcrypt_hash(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Hash Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )
    assert created.status_code == 201
    user = db_session.get(User, created.json()["id"])

    assert user.password_hash != password
    assert user.password_hash.startswith("$2")  # bcrypt, per-user salt
    assert verify_password(password, user.password_hash)
    assert not verify_password(password + "x", user.password_hash)


def test_nfr001_self_registration_password_stored_only_as_bcrypt_hash(
    client: TestClient, db_session: DBSession
):
    email = _email("patient")
    password = _password()
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Hash Patient",
            "email": email,
            "phone": "+15551113333",
            "password": password,
        },
    )
    assert reg.status_code == 201
    user = db_session.get(User, reg.json()["user"]["id"])
    assert user.password_hash != password
    assert user.password_hash.startswith("$2")
    assert verify_password(password, user.password_hash)


def test_nfr001_reissued_password_stored_only_as_bcrypt_hash(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    email = _email("doctor")
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Reset Hash Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": _password(),
        },
    )
    user_id = created.json()["id"]
    new_password = _password()
    reset = client.post(
        f"/api/admin/users/{user_id}/password",
        headers=_bearer(admin_token),
        json={"new_password": new_password},
    )
    assert reset.status_code == 204
    user = db_session.get(User, user_id)
    assert user.password_hash != new_password
    assert user.password_hash.startswith("$2")
    assert verify_password(new_password, user.password_hash)


# -- NFR-002: admin deactivation ends the user's session immediately ----------


def test_nfr002_deactivation_revokes_sessions_and_blocks_further_action(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Deactivate Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": password,
        },
    )
    user_id = created.json()["id"]

    signin = _login(client, email, password)
    doctor_token = signin.json()["token"]
    assert client.get("/api/auth/me", headers=_bearer(doctor_token)).status_code == 200

    deactivate = client.patch(
        f"/api/admin/users/{user_id}",
        headers=_bearer(admin_token),
        json={"is_active": False},
    )
    assert deactivate.status_code == 200, deactivate.text

    # The existing session ends immediately; any further action is rejected.
    assert client.get("/api/auth/me", headers=_bearer(doctor_token)).status_code == 401
    # A fresh sign-in is refused while the account is inactive.
    assert _login(client, email, password).status_code == 403


# -- NFR-022: inline field validation (server contract) -----------------------


def test_nfr022_invalid_create_is_422_lists_offending_fields_and_writes_nothing(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    before = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]

    resp = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "",
            "email": "not-an-email",
            "role": "doctor",
            "initial_password": "short",
        },
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    fields = {err["field"] for err in detail}
    assert {"full_name", "email", "password"} <= fields

    after = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).json()["total"]
    assert after == before
