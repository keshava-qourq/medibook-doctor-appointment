"""Unit tests for patient self-service profile and password change (US-005-1)."""

import secrets


def _email() -> str:
    return f"pat-{secrets.token_hex(6)}@example.com"


def _register(client, email=None, password=None):
    email = email or _email()
    password = password or secrets.token_urlsafe(12)
    resp = client.post(
        "/api/auth/register",
        json={"full_name": "Pat Patient", "email": email, "phone": "123", "password": password},
    )
    assert resp.status_code == 201
    return email, password, resp.json()["token"]


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def _promote(db_session, email, role):
    from app.models import User

    user = db_session.query(User).filter(User.email == email).first()
    user.role = role
    db_session.commit()


# -- AC-018 -------------------------------------------------------------------


def test_ac018_get_me_returns_profile_fields(client):
    email, _, token = _register(client)
    resp = client.get("/api/patients/me", headers=_bearer(token))
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"id", "full_name", "email", "phone", "date_of_birth", "gender"}
    assert body["email"] == email
    assert body["date_of_birth"] is None
    assert body["gender"] is None
    assert "password" not in body
    assert "password_hash" not in body


def test_ac018_get_me_without_token_is_401(client):
    assert client.get("/api/patients/me").status_code == 401


# -- AC-019 -------------------------------------------------------------------


def test_ac019_patch_me_updates_fields_and_persists(client):
    email, _, token = _register(client)
    resp = client.patch(
        "/api/patients/me",
        headers=_bearer(token),
        json={
            "full_name": "New Name",
            "phone": "555-0100",
            "date_of_birth": "1990-05-04",
            "gender": "female",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["full_name"] == "New Name"
    assert body["phone"] == "555-0100"
    assert body["date_of_birth"] == "1990-05-04"
    assert body["gender"] == "female"
    assert body["email"] == email

    again = client.get("/api/patients/me", headers=_bearer(token))
    assert again.json()["full_name"] == "New Name"
    assert again.json()["date_of_birth"] == "1990-05-04"


def test_ac019_patch_me_does_not_mutate_email(client):
    email, _, token = _register(client)
    resp = client.patch(
        "/api/patients/me",
        headers=_bearer(token),
        json={"email": "hacker@example.com", "full_name": "Still Me"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == email


# -- AC-020 -------------------------------------------------------------------


def test_ac020_password_change_with_correct_current_replaces_hash(client):
    email, password, token = _register(client)
    new_password = secrets.token_urlsafe(12)
    resp = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": password, "new_password": new_password},
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    old = client.post("/api/auth/login", json={"email": email, "password": password})
    assert old.status_code == 401
    new = client.post("/api/auth/login", json={"email": email, "password": new_password})
    assert new.status_code == 200


def test_ac020_new_hash_is_bcrypt_and_not_plaintext(client, db_session):
    from app.models import User

    email, password, token = _register(client)
    new_password = secrets.token_urlsafe(12)
    client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": password, "new_password": new_password},
    )
    user = db_session.query(User).filter(User.email == email).first()
    assert user.password_hash != new_password
    assert user.password_hash.startswith("$2")


# -- AC-021 -------------------------------------------------------------------


def test_ac021_wrong_current_password_is_422_field_and_writes_nothing(client, db_session):
    from app.models import User

    email, password, token = _register(client)
    user = db_session.query(User).filter(User.email == email).first()
    original_hash = user.password_hash

    resp = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": "not-the-password", "new_password": secrets.token_urlsafe(12)},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["field"] == "current_password"

    db_session.refresh(user)
    assert user.password_hash == original_hash
    assert (
        client.post("/api/auth/login", json={"email": email, "password": password}).status_code
        == 200
    )


def test_weak_new_password_is_422_weak_password(client):
    _, password, token = _register(client)
    resp = client.post(
        "/api/patients/me/password",
        headers=_bearer(token),
        json={"current_password": password, "new_password": "short"},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any(d["field"] == "new_password" and "weak_password" in d["msg"] for d in detail)


# -- NFR-022 ------------------------------------------------------------------


def test_nfr022_invalid_patch_lists_offending_field_and_writes_nothing(client):
    _, _, token = _register(client)
    resp = client.patch(
        "/api/patients/me",
        headers=_bearer(token),
        json={"full_name": "   ", "date_of_birth": "not-a-date"},
    )
    assert resp.status_code == 422
    fields = {d["field"] for d in resp.json()["detail"]}
    assert "full_name" in fields
    assert "date_of_birth" in fields

    after = client.get("/api/patients/me", headers=_bearer(token))
    assert after.json()["full_name"] == "Pat Patient"


# -- role guard ---------------------------------------------------------------


def test_non_patient_role_is_403_empty_body(client, db_session):
    email, _, token = _register(client)
    _promote(db_session, email, "doctor")
    resp = client.get("/api/patients/me", headers=_bearer(token))
    assert resp.status_code == 403
    assert resp.content == b""
