"""Unit tests for the auth endpoints (US-001-2)."""

import secrets


def _body(email, password=None):
    return {
        "full_name": "Pat",
        "email": email,
        "phone": "123",
        "password": password or secrets.token_urlsafe(10),
    }


def test_ac001_ac002_register_then_duplicate_case_insensitive(client):
    email = f"{secrets.token_hex(4)}@example.com"
    r = client.post("/api/auth/register", json=_body(email))
    assert r.status_code == 201
    assert r.json()["landing"] == "/search"
    r2 = client.post("/api/auth/register", json=_body(email.upper()))
    assert r2.status_code == 409
    assert r2.json() == {"code": "email_in_use"}


def test_ac003_invalid_fields_listed_by_name(client):
    r = client.post(
        "/api/auth/register",
        json={"full_name": "x", "email": "bad", "password": "short"},
    )
    assert r.status_code == 422
    fields = {d["field"] for d in r.json()["detail"]}
    assert {"email", "password", "phone"} <= fields


def test_ac006_ac007_login_generic_failure_and_logout_revokes_one(client):
    email = f"{secrets.token_hex(4)}@example.com"
    pw = secrets.token_urlsafe(10)
    client.post("/api/auth/register", json=_body(email, pw))
    bad = client.post("/api/auth/login", json={"email": email, "password": "wrongwrong"})
    unknown = client.post(
        "/api/auth/login", json={"email": "no@example.com", "password": "wrongwrong"}
    )
    assert bad.status_code == unknown.status_code == 401
    assert bad.json() == unknown.json()
    t1 = client.post("/api/auth/login", json={"email": email, "password": pw}).json()["token"]
    t2 = client.post("/api/auth/login", json={"email": email, "password": pw}).json()["token"]
    h1 = {"Authorization": f"Bearer {t1}"}
    h2 = {"Authorization": f"Bearer {t2}"}
    assert client.post("/api/auth/logout", headers=h1).status_code == 204
    assert client.get("/api/auth/me", headers=h1).status_code == 401
    assert client.get("/api/auth/me", headers=h2).status_code == 200


def test_ac005_login_landing_is_role_specific(client, db_session):
    from app.models import User

    email = f"{secrets.token_hex(4)}@example.com"
    pw = secrets.token_urlsafe(10)
    client.post("/api/auth/register", json=_body(email, pw))
    patient = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert patient.status_code == 200
    assert patient.json()["landing"] == "/search"

    for role, landing in (("doctor", "/doctor-schedule"), ("admin", "/admin")):
        staff_email = f"{role}-{secrets.token_hex(4)}@example.com"
        staff_pw = secrets.token_urlsafe(10)
        client.post("/api/auth/register", json=_body(staff_email, staff_pw))
        u = db_session.query(User).filter(User.email == staff_email).first()
        u.role = role
        db_session.commit()
        resp = client.post("/api/auth/login", json={"email": staff_email, "password": staff_pw})
        assert resp.status_code == 200
        assert resp.json()["landing"] == landing


def test_ac_me_returns_profile_for_valid_token_and_401_without(client):
    email = f"{secrets.token_hex(4)}@example.com"
    pw = secrets.token_urlsafe(10)
    reg = client.post("/api/auth/register", json=_body(email, pw))
    token = reg.json()["token"]

    ok = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200
    body = ok.json()
    assert set(body) == {"id", "full_name", "email", "phone", "role"}
    assert body["role"] == "patient"
    assert body["email"] == email

    assert client.get("/api/auth/me").status_code == 401


def test_ac009_inactive_login_refused(client, db_session):
    from app.models import User

    email = f"{secrets.token_hex(4)}@example.com"
    pw = secrets.token_urlsafe(10)
    client.post("/api/auth/register", json=_body(email, pw))
    u = db_session.query(User).filter(User.email == email).first()
    u.is_active = False
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 403
    assert r.json() == {"code": "account_inactive"}
