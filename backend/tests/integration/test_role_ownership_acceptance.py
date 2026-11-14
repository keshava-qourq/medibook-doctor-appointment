"""US-004-3 acceptance (API) for role and ownership enforcement.

The enforcement primitives (``require_role``, ``authorize_ownership``) are live and
the admin router is role-guarded, so the role-failure and unauthenticated paths are
exercised here against real endpoints through the ``client`` fixture only.

The clinical ownership endpoints a doctor would use to read another doctor's data
(``/api/consultations/{id}`` and the booking/appointment surface) are delivered in
later sprints and may not be mounted yet while US-004 is in flight. Those tests are
gated on the live OpenAPI schema: when the route exists they assert the 403
empty-body contract, and until then they skip (concurrent build) rather than fail.
Every account bar the seeded admin is created through the API.
"""

import secrets

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

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


def _admin_token(client: TestClient, db: DBSession) -> str:
    password = _password()
    email = _seed_admin(db, password)
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def _patient_token(client: TestClient) -> str:
    email = _email("patient")
    password = _password()
    reg = client.post(
        "/api/auth/register",
        json={"full_name": "Role Patient", "email": email, "phone": "+15551112222",
              "password": password},
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _doctor_token(client: TestClient, admin_token: str) -> tuple[str, str]:
    email = _email("doctor")
    password = _password()
    created = client.post(
        "/api/admin/users",
        headers=_bearer(admin_token),
        json={"full_name": "Role Doctor", "email": email, "role": "doctor",
              "initial_password": password},
    )
    assert created.status_code == 201, created.text
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return login.json()["token"], created.json()["id"]


def _has_route(client: TestClient, template: str) -> bool:
    schema = client.get("/openapi.json").json()
    return template in schema.get("paths", {})


# -- AC-014: a patient hitting an admin/doctor API gets 403 with an empty body --


def test_ac014_patient_calling_admin_api_is_403_empty_body(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)
    patient_token = _patient_token(client)

    # Every admin-scoped verb is role-guarded, not just the one that writes.
    listing = client.get("/api/admin/users?limit=100", headers=_bearer(patient_token))
    assert listing.status_code == 403, listing.text
    assert listing.content == b""

    creating = client.post(
        "/api/admin/users",
        headers=_bearer(patient_token),
        json={"full_name": "Ghost", "email": _email("ghost"), "role": "doctor",
              "initial_password": _password()},
    )
    assert creating.status_code == 403
    assert creating.content == b""

    # The admin is unaffected: the guard denies the role, not the endpoint.
    ok = client.get("/api/admin/users?limit=100", headers=_bearer(admin_token))
    assert ok.status_code == 200


# -- AC-015: a patient cannot read another patient's record by id substitution --


def test_ac015_patient_cannot_read_another_patients_record_is_403_empty_body(
    client: TestClient, db_session: DBSession
):
    """[AC-015] A patient substituting the identifier of an appointment or consultation
    that belongs to a different patient is refused with 403 and an empty body, so the
    record is not returned and its existence cannot be probed. The patient-owned clinical
    read endpoints land in a later sprint; until one is mounted this is a pending contract
    test (concurrent build) rather than a failure."""
    import pytest

    template = next(
        (
            t
            for t in ("/api/appointments/{id}", "/api/consultations/{id}")
            if _has_route(client, t)
        ),
        None,
    )
    if template is None:
        pytest.skip(
            "PENDING: no patient-owned clinical read endpoint (/api/appointments/{id} or "
            "/api/consultations/{id}) mounted yet (delivered in a later sprint; US-004 "
            "ownership primitives are live)"
        )

    token = _patient_token(client)

    # A plausible-but-not-this-patient's record id: ownership must refuse it with the same
    # empty 403 whether it exists for another patient or not at all (no id probing).
    probe = client.get(
        template.replace("{id}", secrets.token_hex(16)),
        headers=_bearer(token),
    )
    assert probe.status_code == 403, probe.text
    assert probe.content == b""


# -- AC-016: a doctor cannot read another doctor's data at the API -------------


def test_ac016_doctor_cannot_read_another_doctors_record_is_403_empty_body(
    client: TestClient, db_session: DBSession
):
    """A doctor reading a clinical record that belongs to another doctor is refused
    with 403 and an empty body. The owning consultation endpoint lands in a later
    sprint; until it is mounted this is a pending contract test (concurrent build)."""
    import pytest

    if not _has_route(client, "/api/consultations/{id}"):
        pytest.skip(
            "PENDING: /api/consultations/{id} not mounted yet (clinical ownership "
            "endpoint is delivered in a later sprint; US-004 primitives are live)"
        )

    admin_token = _admin_token(client, db_session)
    other_doctor_token, _ = _doctor_token(client, admin_token)

    # A plausible-but-not-this-doctor's record id: ownership must refuse it with the
    # same empty 403 whether it exists elsewhere or not (no id probing).
    probe = client.get(
        f"/api/consultations/{secrets.token_hex(16)}",
        headers=_bearer(other_doctor_token),
    )
    assert probe.status_code == 403, probe.text
    assert probe.content == b""


# -- AC-017: unauthenticated API calls return 401 with a {"detail"} body -------


def test_ac017_no_token_api_call_is_401_with_detail_body(
    client: TestClient, db_session: DBSession
):
    admin_token = _admin_token(client, db_session)  # ensures the admin route is reachable

    me = client.get("/api/auth/me")
    assert me.status_code == 401, me.text
    assert "detail" in me.json()

    admin = client.get("/api/admin/users?limit=100")
    assert admin.status_code == 401
    assert "detail" in admin.json()

    # A malformed Authorization header is treated the same as a missing one.
    malformed = client.get("/api/auth/me", headers={"Authorization": "Token abc"})
    assert malformed.status_code == 401
    # No WWW-Authenticate challenge beyond the default.
    assert "www-authenticate" not in {k.lower() for k in malformed.headers}

    # Sanity: with the token the same route is 200, so the 401 is about the token.
    assert client.get("/api/admin/users?limit=100", headers=_bearer(admin_token)).status_code == 200


# -- Role failure and ownership failure are indistinguishable 403 empty bodies --


def test_ac014_ac016_role_and_ownership_failures_are_identical_403_empty_bodies(
    client: TestClient, db_session: DBSession
):
    """A role refusal and an ownership refusal must be the same response -- 403 with
    an empty body -- so neither an id nor an account's existence can be probed by
    comparing them. The role refusal is live; the ownership refusal is compared when
    its endpoint is mounted, otherwise this asserts the live half only."""
    admin_token = _admin_token(client, db_session)
    patient_token = _patient_token(client)

    role_fail = client.get("/api/admin/users?limit=100", headers=_bearer(patient_token))
    assert role_fail.status_code == 403
    assert role_fail.content == b""

    if _has_route(client, "/api/consultations/{id}"):
        other_doctor_token, _ = _doctor_token(client, admin_token)
        ownership_fail = client.get(
            f"/api/consultations/{secrets.token_hex(16)}",
            headers=_bearer(other_doctor_token),
        )
        assert ownership_fail.status_code == role_fail.status_code == 403
        assert ownership_fail.content == role_fail.content == b""
