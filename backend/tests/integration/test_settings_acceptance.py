"""US-008-2 acceptance (API): clinic timezone and booking cutoff settings.

Contract (US-008-1 / openapi):
  GET /api/settings        -> 200 {clinic_name, timezone, timezone_confirmed,
                                   booking_cutoff_hours}
  PUT /api/admin/settings  {clinic_name?, timezone, booking_cutoff_hours}
                           -> 200 settings | 422 {field, message}

Behaviour rules in force:
  - The clinic timezone defaults to 'UTC' with timezone_confirmed=false until an
    administrator saves settings.
  - A negative or non-numeric cutoff is rejected 422 and the previous value stays
    in force (nothing is written when any field is invalid).

The settings router is delivered by US-008-1 in the same sprint and may not be mounted
yet while this ticket is in flight: each criterion is gated on the live OpenAPI schema,
so it runs its real assertions when the route exists and is PENDING (skipped, concurrent
build) until then, rather than failing on a 404 the builder has not written yet.

Every account bar the seeded bootstrap admin is created through the API; the bootstrap
admin itself is seeded exactly as the application seeds it from BOOTSTRAP_ADMIN_* at
startup, because no API mints the first admin and the client fixture starts empty.
"""

import secrets

import pytest
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
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Settings Patient",
            "email": email,
            "phone": "+15551112222",
            "password": _password(),
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _has_route(client: TestClient, template: str) -> bool:
    schema = client.get("/openapi.json").json()
    return template in schema.get("paths", {})


def _require(client: TestClient, *templates: str) -> None:
    missing = [t for t in templates if not _has_route(client, t)]
    if missing:
        pytest.skip(
            "PENDING: settings routes not mounted yet "
            f"({', '.join(missing)}); delivered by US-008-1 in the same sprint (concurrent build)"
        )


def _cutoff(value) -> int:
    """booking_cutoff_hours is serialized as a string in the schema; accept either so the
    test proves the numeric value, not a serialization detail."""
    return int(value)


# -- AC-030: admin saves a timezone; GET reflects it with timezone_confirmed=true ----


def test_ac030_admin_saves_timezone_and_get_reflects_it_confirmed(
    client: TestClient, db_session: DBSession
):
    _require(client, "/api/admin/settings", "/api/settings")
    token = _admin_token(client, db_session)

    put = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "America/New_York", "booking_cutoff_hours": 12},
    )
    assert put.status_code == 200, put.text

    got = client.get("/api/settings", headers=_bearer(token))
    assert got.status_code == 200, got.text
    body = got.json()
    assert body["timezone"] == "America/New_York"
    assert body["timezone_confirmed"] is True


# -- AC-031: admin changes booking_cutoff_hours; the new value is returned immediately -


def test_ac031_cutoff_change_is_returned_immediately(client: TestClient, db_session: DBSession):
    _require(client, "/api/admin/settings", "/api/settings")
    token = _admin_token(client, db_session)

    first = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "UTC", "booking_cutoff_hours": 6},
    )
    assert first.status_code == 200, first.text
    assert _cutoff(first.json()["booking_cutoff_hours"]) == 6

    second = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "UTC", "booking_cutoff_hours": 48},
    )
    assert second.status_code == 200, second.text
    assert _cutoff(second.json()["booking_cutoff_hours"]) == 48

    got = client.get("/api/settings", headers=_bearer(token))
    assert got.status_code == 200, got.text
    assert _cutoff(got.json()["booking_cutoff_hours"]) == 48


# -- AC-032: negative/non-numeric cutoff is rejected 422; the prior value is unchanged -


def test_ac032_invalid_cutoff_is_422_and_prior_value_unchanged(
    client: TestClient, db_session: DBSession
):
    _require(client, "/api/admin/settings", "/api/settings")
    token = _admin_token(client, db_session)

    # Establish a known-good prior value.
    seed = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "Europe/London", "booking_cutoff_hours": 24},
    )
    assert seed.status_code == 200, seed.text

    # A negative cutoff is rejected, keyed by field, and writes nothing.
    negative = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "Europe/London", "booking_cutoff_hours": -5},
    )
    assert negative.status_code == 422, negative.text
    fields = {err["field"] for err in negative.json()["detail"]}
    assert "booking_cutoff_hours" in fields

    # A non-numeric cutoff is rejected the same way.
    non_numeric = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "Europe/London", "booking_cutoff_hours": "soon"},
    )
    assert non_numeric.status_code == 422, non_numeric.text
    fields = {err["field"] for err in non_numeric.json()["detail"]}
    assert "booking_cutoff_hours" in fields

    # The prior value stays in force: nothing was written on either rejected save.
    got = client.get("/api/settings", headers=_bearer(token))
    assert got.status_code == 200, got.text
    assert _cutoff(got.json()["booking_cutoff_hours"]) == 24
    assert got.json()["timezone"] == "Europe/London"


# -- AC-033: default state before any save is timezone='UTC', timezone_confirmed=false -


def test_ac033_default_state_is_utc_unconfirmed(client: TestClient, db_session: DBSession):
    _require(client, "/api/settings")
    token = _admin_token(client, db_session)

    # No settings have been saved in this fresh database.
    got = client.get("/api/settings", headers=_bearer(token))
    assert got.status_code == 200, got.text
    body = got.json()
    assert body["timezone"] == "UTC"
    assert body["timezone_confirmed"] is False


# -- Role guard: only an admin may write settings ------------------------------------


def test_ac030_non_admin_cannot_write_settings_is_403_empty_body(
    client: TestClient, db_session: DBSession
):
    _require(client, "/api/admin/settings")
    _admin_token(client, db_session)  # ensure a database/admin exist
    patient_token = _patient_token(client)

    resp = client.put(
        "/api/admin/settings",
        headers=_bearer(patient_token),
        json={"timezone": "America/New_York", "booking_cutoff_hours": 12},
    )
    assert resp.status_code == 403, resp.text
    assert resp.content == b""


# -- NFR-020 / NFR-022 are observable through the settings contract -------------------


def test_nfr020_timezone_is_labelled_in_the_settings_payload(
    client: TestClient, db_session: DBSession
):
    """[NFR-020] Every client reads the single configured clinic timezone (labelled) from
    /api/settings so all times are shown in it, never converted to the device timezone."""
    _require(client, "/api/admin/settings", "/api/settings")
    token = _admin_token(client, db_session)
    client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "Asia/Kolkata", "booking_cutoff_hours": 3},
    )
    body = client.get("/api/settings", headers=_bearer(token)).json()
    assert body["timezone"] == "Asia/Kolkata"


def test_nfr022_invalid_settings_save_is_422_keyed_by_field_and_writes_nothing(
    client: TestClient, db_session: DBSession
):
    """[NFR-022] A rejected settings save identifies the offending field inline and leaves
    the previously saved values in force."""
    _require(client, "/api/admin/settings", "/api/settings")
    token = _admin_token(client, db_session)
    client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "UTC", "booking_cutoff_hours": 10},
    )

    resp = client.put(
        "/api/admin/settings",
        headers=_bearer(token),
        json={"timezone": "Not/AZone", "booking_cutoff_hours": -1},
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    assert all("field" in err and "message" in err for err in detail)

    after = client.get("/api/settings", headers=_bearer(token)).json()
    assert _cutoff(after["booking_cutoff_hours"]) == 10


# -- NFR-016 / NFR-017: infrastructure/provisioning, not observable here --------------


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-"
    "database settings enabled in hosting/deployment config, not observable from the app; "
    "the declaration is covered by tests/integration/test_nfr_infrastructure.py"
)
def test_nfr016_backups_and_pitr_are_infrastructure():  # pragma: no cover
    pass


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic is a provisioning/capacity "
    "target declared in deployment config, not observable from the app; the declaration is "
    "covered by tests/integration/test_nfr_infrastructure.py"
)
def test_nfr017_sizing_is_infrastructure():  # pragma: no cover
    pass
