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
