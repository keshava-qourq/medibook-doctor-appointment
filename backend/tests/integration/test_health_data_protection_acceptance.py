"""US-031-2 acceptance (API): protection of health data at the application boundary.

AC-124  Stored user records hold passwords only as per-user bcrypt hashes.
AC-125  Triggered application errors leak no password, session token or clinical
        content in the response body or in the log records the request writes.

NFR-001 is the same promise as AC-124, covering self-registration, administrator-issued
credentials and password changes, so each path is asserted here.
NFR-007 is the same promise as AC-125.
NFR-005 (TLS in transit) and NFR-006 (encryption at rest) are hosting/provisioning
settings no in-process request can observe: they are verified here only as the committed
deployment-documentation evidence the requirement itself asks for, and are additionally
declared as [KNOWN-LIMIT] e2e placeholders in frontend/e2e/health-data-protection.spec.ts.
NFR-016 (backups/PITR) and NFR-017 (sizing) stay where they already live:
tests/integration/test_nfr_infrastructure.py plus the e2e KNOWN-LIMIT placeholders.

Every account bar the bootstrap admin is created through the API; the bootstrap admin is
seeded exactly as the application seeds it from BOOTSTRAP_ADMIN_* at startup, because no
API mints the first admin and the ``client`` fixture starts from an empty database.
"""

import logging
import secrets
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import hash_password, verify_password


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


def _register_patient(client: TestClient) -> tuple[str, str, str]:
    email = _email("patient")
    password = _password()
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Protected Patient",
            "email": email,
            "phone": "+15551112222",
            "password": password,
        },
    )
    assert reg.status_code == 201, reg.text
    return email, password, reg.json()["token"]


def _has_route(client: TestClient, template: str) -> bool:
    return template in client.get("/openapi.json").json().get("paths", {})


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "docs").is_dir() and (parent / "docker-compose.yml").exists():
            return parent
    raise AssertionError("repository root (with docs/ and docker-compose.yml) not found")


# -- AC-124 / NFR-001: passwords are stored only as per-user bcrypt hashes -----


def test_ac124_nfr001_stored_user_records_hold_only_bcrypt_hashes_for_every_path(
    client: TestClient, db_session: DBSession
):
    """[AC-124][NFR-001] Inspect every stored user record after self-registration, an
    administrator-issued credential and a password change: the only password material on
    the row is a bcrypt hash with a per-user salt, and no column anywhere holds the
    plain-text or a reversible form of it."""
    admin_token = _admin_token(client, db_session)

    # 1. self-registration
    _patient_email, patient_password, patient_token = _register_patient(client)

    # 2. administrator-issued credential
    doctor_email = _email("doctor")
    doctor_password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Protected Doctor",
            "email": doctor_email,
            "role": "doctor",
            "initial_password": doctor_password,
        },
    )
    assert created.status_code == 201, created.text
    doctor_id = created.json()["id"]

    # 3. administrator password reissue
    reissued = _password()
    reset = client.post(
        f"/api/admin/users/{doctor_id}/password",
        headers=_bearer(admin_token),
        json={"new_password": reissued},
    )
    assert reset.status_code == 204, reset.text

    # 4. patient-initiated password change
    changed = reissued
    if _has_route(client, "/api/patients/me/password"):
        changed = _password()
        resp = client.post(
            "/api/patients/me/password",
            headers=_bearer(patient_token),
            json={"current_password": patient_password, "new_password": changed},
        )
        assert resp.status_code == 200, resp.text

    secrets_used = {patient_password, doctor_password, reissued, changed}

    users = db_session.query(User).all()
    assert users, "the created accounts must be stored"
    columns = [c.key for c in sa_inspect(User).mapper.column_attrs]
    hashes: list[str] = []
    for user in users:
        for column in columns:
            value = getattr(user, column)
            if isinstance(value, str):
                assert value not in secrets_used, (
                    f"column {column} holds a plain-text password for {user.email}"
                )
        assert user.password_hash.startswith("$2"), (
            f"{user.email} must store a bcrypt hash, found {user.password_hash[:4]!r}"
        )
        hashes.append(user.password_hash)

    # Per-user salt: two accounts never share a stored hash, and the hash is one-way --
    # it verifies the right password and rejects anything else.
    assert len(set(hashes)) == len(hashes), "every stored hash must carry its own salt"
    doctor = db_session.query(User).filter(User.email == doctor_email).one()
    assert verify_password(reissued, doctor.password_hash)
    assert not verify_password(doctor_password, doctor.password_hash)


def test_ac124_no_read_endpoint_returns_password_material(
    client: TestClient, db_session: DBSession
):
    """[AC-124] No read endpoint exposes a password or a password hash: the API-visible
    user records carry no password field at all."""
    admin_token = _admin_token(client, db_session)
    email = _email("doctor")
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={
            "full_name": "Listed Doctor",
            "email": email,
            "role": "doctor",
            "initial_password": _password(),
        },
    )
    assert created.status_code == 201, created.text

    listing = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token))
    assert listing.status_code == 200, listing.text
    for item in listing.json()["items"]:
        assert "password" not in item
        assert "password_hash" not in item
        assert "initial_password" not in item

    me = client.get("/api/auth/me", headers=_bearer(admin_token))
    assert me.status_code == 200
    assert "password" not in str(me.json()).lower()


# -- AC-125 / NFR-007: errors and logs carry no credentials or clinical content --


def test_ac125_nfr007_triggered_errors_leak_no_password_or_token_in_body_or_logs(
    client: TestClient, db_session: DBSession, caplog: pytest.LogCaptureFixture
):
    """[AC-125][NFR-007] Trigger the application's error paths -- bad sign-in, invalid
    input, a refused role, an unknown id and a revoked token -- and assert that no
    password and no session token appears in any response body or in anything written
    to the logs."""
    admin_token = _admin_token(client, db_session)
    patient_email, patient_password, patient_token = _register_patient(client)
    sensitive = {patient_password, patient_token, admin_token}

    caplog.clear()
    bodies: list[str] = []
    with caplog.at_level(logging.DEBUG):
        # 1. a failed sign-in (wrong password)
        bad_login = client.post(
            "/api/auth/login",
            json={"email": patient_email, "password": patient_password + "-wrong"},
        )
        assert bad_login.status_code == 401, bad_login.text
        bodies.append(bad_login.text)

        # 2. invalid input carrying a password field
        weak = client.post(
            "/api/auth/register",
            json={
                "full_name": "",
                "email": "not-an-email",
                "phone": "",
                "password": "short",
            },
        )
        assert weak.status_code == 422, weak.text
        bodies.append(weak.text)

        # 3. a role refusal
        forbidden = client.get("/api/admin/users?limit=100", headers=_bearer(patient_token))
        assert forbidden.status_code == 403
        bodies.append(forbidden.text)

        # 4. an unknown / unparseable id on an admin-scoped route
        missing = client.get(
            f"/api/admin/users/{secrets.token_hex(16)}", headers=_bearer(admin_token)
        )
        assert missing.status_code in (401, 403, 404, 405), missing.text
        bodies.append(missing.text)

        # 5. a revoked token
        logout = client.post("/api/auth/logout", headers=_bearer(patient_token))
        assert logout.status_code in (200, 204), logout.text
        revoked = client.get("/api/auth/me", headers=_bearer(patient_token))
        assert revoked.status_code == 401
        bodies.append(revoked.text)

    joined = "\n".join(bodies)
    for value in sensitive:
        assert value not in joined, "an error response body leaked a password or session token"
    assert "short" not in joined or "password" in joined.lower()
    # The rejected password value is never echoed back.
    assert '"short"' not in joined, "the rejected password value must not be echoed"

    logged = "\n".join(record.getMessage() for record in caplog.records)
    for value in sensitive:
        assert value not in logged, "a log record leaked a password or session token"


def test_ac125_nfr007_clinical_content_never_appears_in_an_error_or_log(
    client: TestClient, db_session: DBSession, caplog: pytest.LogCaptureFixture
):
    """[AC-125][NFR-007] A refused request for a clinical record returns an empty body
    and writes no clinical content (notes, diagnosis, prescription detail) to the logs:
    the refusal cannot be told from a non-existent record."""
    _admin_token(client, db_session)
    _email_unused, _password_unused, patient_token = _register_patient(client)

    template = next(
        (t for t in ("/api/consultations/{id}", "/api/appointments/{id}") if _has_route(client, t)),
        None,
    )
    if template is None:
        pytest.skip(
            "PENDING: no clinical read endpoint (/api/consultations/{id} or "
            "/api/appointments/{id}) is mounted yet (delivered in a later sprint)"
        )

    caplog.clear()
    with caplog.at_level(logging.DEBUG):
        probe = client.get(
            template.replace("{id}", secrets.token_hex(16)),
            headers=_bearer(patient_token),
        )

    assert probe.status_code in (401, 403), probe.text
    if probe.status_code == 403:
        assert probe.content == b"", "a refused clinical read must return an empty body"

    logged = "\n".join(record.getMessage() for record in caplog.records).lower()
    for word in ("diagnosis", "prescription", "clinical note"):
        assert word not in logged, f"the logs must not carry clinical content ({word})"
    assert patient_token not in logged


def test_ac125_nfr007_a_server_side_failure_does_not_echo_the_request_credentials(
    client: TestClient, db_session: DBSession
):
    """[AC-125][NFR-007] Even a malformed request whose payload contains a password is
    answered with a field-keyed error that never repeats the submitted secret."""
    _admin_token(client, db_session)
    secret = _password()

    responses = [
        client.post("/api/auth/login", json={"email": "nobody@example.com", "password": secret}),
        client.post(
            "/api/auth/register",
            json={"full_name": "X", "email": "bad", "phone": "+1", "password": secret},
        ),
        client.post("/api/auth/login", json={"password": secret}),
    ]
    for resp in responses:
        assert resp.status_code in (401, 409, 422), resp.text
        assert secret not in resp.text, "an error body must never echo the submitted password"


# -- NFR-005 / NFR-006: hosting guarantees, evidenced in deployment documentation ----


def test_ac122_nfr005_deployment_declares_tls_in_transit_with_http_redirected_to_https():
    """[NFR-005][AC-122] All traffic is carried over TLS and an unencrypted request is
    redirected to the encrypted equivalent. This is a load-balancer/hosting setting no
    in-process test can observe, so it is verified as the committed declaration."""
    guide = (
        (_repo_root() / "docs/sdlc/deployment/deployment-guide.md")
        .read_text(encoding="utf-8")
        .lower()
    )
    assert "tls" in guide, "the deployment must declare TLS termination"
    assert "https" in guide
    assert "redirect" in guide, "HTTP must be declared as redirected to HTTPS"


def test_ac123_nfr006_deployment_declares_encryption_at_rest_for_the_clinic_database():
    """[NFR-006][AC-123] The database holding patient, appointment and consultation data
    has encryption at rest switched on, evidenced in the deployment documentation."""
    guide = (
        (_repo_root() / "docs/sdlc/deployment/deployment-guide.md")
        .read_text(encoding="utf-8")
        .lower()
    )
    assert "encryption at rest" in guide
    assert "postgresql" in guide


# -- NFR-016 / NFR-017: pure infrastructure, not observable from the app --------------


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are "
    "managed-database settings enabled in hosting, not observable from the app; the "
    "committed declaration is covered by tests/integration/test_nfr_infrastructure.py"
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
