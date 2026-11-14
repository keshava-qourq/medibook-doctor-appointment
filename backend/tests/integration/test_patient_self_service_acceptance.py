"""US-005-3 acceptance (API): patient self-service profile and password change.

Contract:
  GET   /api/patients/me          -> 200 {id, full_name, email, phone, date_of_birth, gender}
                                     401 for an unauthenticated read
  PATCH /api/patients/me          -> 200 same shape | 422 {"detail":[{field,msg}]}
  POST  /api/patients/me/password {current_password, new_password}
                                  -> 200 {"status":"ok"} | 422 field-keyed
  Authorization: Bearer <token> on every call.

Every test creates its own patient through /api/auth/register with a freshly
generated unique email and a password generated at run time, so no two tests
share state or collide on the unique email constraint.

NFR-016 (backups/PITR) and NFR-017 (sizing) are provisioning promises no
application-level test can observe; they are declared below as [KNOWN-LIMIT]
skips and verified as committed declarations in
tests/integration/test_nfr_infrastructure.py.
"""

import secrets

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import verify_password

PROFILE = "/api/patients/me"
PASSWORD = "/api/patients/me/password"
LOGIN = "/api/auth/login"
REGISTER = "/api/auth/register"

_FIELDS = ("id", "full_name", "email", "phone", "date_of_birth", "gender")


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email() -> str:
    return f"selfservice-{secrets.token_hex(6)}@example.com"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, **overrides) -> dict:
    """Create this test's own patient through the public API."""
    payload = {
        "full_name": "Self Service Patient",
        "email": _email(),
        "phone": "+15551110000",
        "password": _password(),
    }
    payload.update(overrides)
    resp = client.post(REGISTER, json=payload)
    assert resp.status_code == 201, resp.text
    return {**payload, "token": resp.json()["token"]}


def _login(client: TestClient, email: str, password: str):
    return client.post(LOGIN, json={"email": email, "password": password})


# -- AC-018 -------------------------------------------------------------------


def test_ac018_registered_patient_reads_back_exactly_the_registration_fields(
    client: TestClient, db_session: DBSession
):
    """[AC-018] A registered patient reads back exactly the profile fields stored at
    registration, in the contracted shape, with no password material."""
    patient = _register(client)

    resp = client.get(PROFILE, headers=_bearer(patient["token"]))
    assert resp.status_code == 200, resp.text
    body = resp.json()

    for field in _FIELDS:
        assert field in body, f"{field} missing from the profile: {body}"
    assert body["full_name"] == patient["full_name"]
    assert body["email"].lower() == patient["email"].lower()
    assert body["phone"] == patient["phone"]
    # Nothing was invented for fields never supplied at registration.
    assert body["date_of_birth"] is None, body
    assert body["gender"] is None, body
    # No password material in a read endpoint (NFR-001).
    serialized = str(body).lower()
    assert "password" not in serialized, body
    assert patient["password"] not in resp.text


def test_ac018_unauthenticated_profile_read_is_401(client: TestClient, db_session: DBSession):
    """[AC-018] An unauthenticated read is 401 with a {"detail": ...} body, and a
    malformed or revoked token is treated the same way."""
    patient = _register(client)

    anonymous = client.get(PROFILE)
    assert anonymous.status_code == 401, anonymous.text
    assert "detail" in anonymous.json()

    malformed = client.get(PROFILE, headers={"Authorization": "Token nonsense"})
    assert malformed.status_code == 401, malformed.text

    garbage = client.get(PROFILE, headers=_bearer(secrets.token_hex(16)))
    assert garbage.status_code == 401, garbage.text

    logout = client.post("/api/auth/logout", headers=_bearer(patient["token"]))
    assert logout.status_code in (200, 204), logout.text
    revoked = client.get(PROFILE, headers=_bearer(patient["token"]))
    assert revoked.status_code == 401, revoked.text


# -- AC-019 -------------------------------------------------------------------


def test_ac019_update_persists_and_is_reflected_on_a_fresh_get_in_a_new_request(
    client: TestClient, db_session: DBSession
):
    """[AC-019] An update persists: the PATCH response and a fresh GET made in a new
    request, with a token obtained by a separate sign-in, both show the new values."""
    patient = _register(client)
    update = {
        "full_name": "Renamed Self Service",
        "phone": "+15557776666",
        "date_of_birth": "1988-02-29",
        "gender": "female",
    }

    patch = client.patch(PROFILE, headers=_bearer(patient["token"]), json=update)
    assert patch.status_code == 200, patch.text
    patched = patch.json()
    for field in _FIELDS:
        assert field in patched, patched
    assert patched["full_name"] == update["full_name"]

    # A fresh request, with a session opened after the write, sees the stored values.
    relogin = _login(client, patient["email"], patient["password"])
    assert relogin.status_code == 200, relogin.text
    fresh = client.get(PROFILE, headers=_bearer(relogin.json()["token"]))
    assert fresh.status_code == 200, fresh.text
    body = fresh.json()
    assert body["full_name"] == update["full_name"]
    assert body["phone"] == update["phone"]
    assert str(body["date_of_birth"]).startswith("1988-02-29")
    assert body["gender"] == update["gender"]
    # The identity the token resolves is unchanged by the update.
    assert body["id"] == patched["id"]
    assert body["email"].lower() == patient["email"].lower()


def test_ac019_a_partial_update_leaves_the_untouched_fields_in_force(
    client: TestClient, db_session: DBSession
):
    """[AC-019][NFR-022] Sending one field changes only that field; the previously
    saved values of the others stay in force."""
    patient = _register(client)
    first = client.patch(
        PROFILE,
        headers=_bearer(patient["token"]),
        json={"full_name": "First Name", "phone": "+15551234567", "gender": "male"},
    )
    assert first.status_code == 200, first.text

    second = client.patch(
        PROFILE, headers=_bearer(patient["token"]), json={"phone": "+15550000001"}
    )
    assert second.status_code == 200, second.text

    body = client.get(PROFILE, headers=_bearer(patient["token"])).json()
    assert body["phone"] == "+15550000001"
    assert body["full_name"] == "First Name"
    assert body["gender"] == "male"


def test_ac019_update_without_a_token_is_401_and_writes_nothing(
    client: TestClient, db_session: DBSession
):
    """[AC-019] An unauthenticated PATCH is refused and changes nothing."""
    patient = _register(client)
    before = client.get(PROFILE, headers=_bearer(patient["token"])).json()

    resp = client.patch(PROFILE, json={"full_name": "Intruder"})
    assert resp.status_code == 401, resp.text

    after = client.get(PROFILE, headers=_bearer(patient["token"])).json()
    assert after == before


# -- AC-020 -------------------------------------------------------------------


def test_ac020_after_a_password_change_the_old_password_fails_and_the_new_one_succeeds(
    client: TestClient, db_session: DBSession
):
    """[AC-020] A password change with the correct current password returns
    {"status":"ok"}; afterwards the old password fails login and the new one succeeds."""
    patient = _register(client)
    new_password = _password()

    change = client.post(
        PASSWORD,
        headers=_bearer(patient["token"]),
        json={"current_password": patient["password"], "new_password": new_password},
    )
    assert change.status_code == 200, change.text
    assert change.json() == {"status": "ok"}, change.text

    old = _login(client, patient["email"], patient["password"])
    assert old.status_code == 401, old.text

    new = _login(client, patient["email"], new_password)
    assert new.status_code == 200, new.text
    assert new.json()["token"]
    # The new session reads the same profile, so the account is intact.
    me = client.get(PROFILE, headers=_bearer(new.json()["token"]))
    assert me.status_code == 200, me.text
    assert me.json()["email"].lower() == patient["email"].lower()


def test_ac020_a_new_password_under_eight_characters_is_refused_and_the_old_one_still_works(
    client: TestClient, db_session: DBSession
):
    """[AC-020][NFR-022] A new password shorter than eight characters is rejected 422
    keyed on new_password, and the original password still logs in."""
    patient = _register(client)

    resp = client.post(
        PASSWORD,
        headers=_bearer(patient["token"]),
        json={"current_password": patient["password"], "new_password": "short"},
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    assert isinstance(detail, list), detail
    assert any(err.get("field") == "new_password" for err in detail), detail

    assert _login(client, patient["email"], patient["password"]).status_code == 200


def test_ac020_password_change_without_a_token_is_401(client: TestClient, db_session: DBSession):
    """[AC-020] The password endpoint requires the bearer token like every other call."""
    patient = _register(client)
    new_password = _password()

    resp = client.post(
        PASSWORD,
        json={"current_password": patient["password"], "new_password": new_password},
    )
    assert resp.status_code == 401, resp.text
    assert _login(client, patient["email"], patient["password"]).status_code == 200
    assert _login(client, patient["email"], new_password).status_code == 401


# -- AC-021 -------------------------------------------------------------------


def test_ac021_a_wrong_current_password_is_refused_and_the_original_still_logs_in(
    client: TestClient, db_session: DBSession
):
    """[AC-021] A wrong current password is refused 422 keyed on current_password, the
    attempted new password never works, and the original password still logs in."""
    patient = _register(client)
    attempted = _password()

    resp = client.post(
        PASSWORD,
        headers=_bearer(patient["token"]),
        json={"current_password": _password(), "new_password": attempted},
    )
    assert resp.status_code == 422, resp.text
    fields = {err.get("field") for err in resp.json()["detail"]}
    assert "current_password" in fields, resp.text

    assert _login(client, patient["email"], attempted).status_code == 401
    assert _login(client, patient["email"], patient["password"]).status_code == 200


def test_ac021_repeated_wrong_attempts_do_not_change_the_stored_password(
    client: TestClient, db_session: DBSession
):
    """[AC-021] Several failed attempts in a row leave the stored hash untouched, and a
    correct change still works afterwards."""
    patient = _register(client)
    user_id = client.get(PROFILE, headers=_bearer(patient["token"])).json()["id"]
    before = db_session.get(User, user_id).password_hash

    for _ in range(3):
        resp = client.post(
            PASSWORD,
            headers=_bearer(patient["token"]),
            json={"current_password": _password(), "new_password": _password()},
        )
        assert resp.status_code == 422, resp.text

    db_session.expire_all()
    assert db_session.get(User, user_id).password_hash == before

    good = _password()
    ok = client.post(
        PASSWORD,
        headers=_bearer(patient["token"]),
        json={"current_password": patient["password"], "new_password": good},
    )
    assert ok.status_code == 200, ok.text
    assert _login(client, patient["email"], good).status_code == 200


# -- NFR-001 ------------------------------------------------------------------


def test_nfr001_changed_password_is_stored_only_as_a_bcrypt_hash_and_is_in_no_response_body(
    client: TestClient, db_session: DBSession
):
    """[NFR-001] After a self-service change, the only password material stored on the
    row is a one-way bcrypt hash with a per-user salt, no column holds the plain text,
    and neither the change response nor any read endpoint repeats either password."""
    patient = _register(client)
    user_id = client.get(PROFILE, headers=_bearer(patient["token"])).json()["id"]
    new_password = _password()

    change = client.post(
        PASSWORD,
        headers=_bearer(patient["token"]),
        json={"current_password": patient["password"], "new_password": new_password},
    )
    assert change.status_code == 200, change.text
    assert new_password not in change.text
    assert patient["password"] not in change.text

    db_session.expire_all()
    user = db_session.get(User, user_id)
    assert user is not None
    columns = [c.key for c in sa_inspect(User).mapper.column_attrs]
    for column in columns:
        value = getattr(user, column)
        if isinstance(value, str):
            assert value != new_password, f"{column} holds the plain-text new password"
            assert value != patient["password"], f"{column} holds the plain-text old password"

    assert user.password_hash.startswith("$2"), user.password_hash[:4]
    assert verify_password(new_password, user.password_hash)
    assert not verify_password(patient["password"], user.password_hash)

    # The hash is salted per user: a second patient with the same password stores
    # a different hash.
    twin = _register(client, password=new_password)
    twin_id = client.get(PROFILE, headers=_bearer(twin["token"])).json()["id"]
    db_session.expire_all()
    assert db_session.get(User, twin_id).password_hash != user.password_hash

    # No read endpoint repeats password material.
    for resp in (
        client.get(PROFILE, headers=_bearer(patient["token"])),
        client.get("/api/auth/me", headers=_bearer(patient["token"])),
    ):
        assert resp.status_code == 200, resp.text
        assert new_password not in resp.text
        assert user.password_hash not in resp.text
        assert "password" not in resp.text.lower()


# -- NFR-022 ------------------------------------------------------------------


def test_nfr022_invalid_profile_update_is_422_keyed_by_field_and_writes_nothing(
    client: TestClient, db_session: DBSession
):
    """[NFR-022] An invalid update is refused 422 with each offending field named and a
    message, and nothing is written: the previously saved values stay in force."""
    patient = _register(client)
    saved = client.patch(
        PROFILE,
        headers=_bearer(patient["token"]),
        json={"full_name": "Saved Name", "phone": "+15552223333", "date_of_birth": "1975-07-04"},
    )
    assert saved.status_code == 200, saved.text
    before = client.get(PROFILE, headers=_bearer(patient["token"])).json()

    resp = client.patch(
        PROFILE,
        headers=_bearer(patient["token"]),
        json={"full_name": "", "date_of_birth": "not-a-date"},
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    assert isinstance(detail, list) and detail, detail
    for err in detail:
        assert err.get("field"), err
        assert err.get("msg"), err
    fields = {err["field"] for err in detail}
    assert "date_of_birth" in fields, detail

    after = client.get(PROFILE, headers=_bearer(patient["token"])).json()
    assert after == before, "a rejected update must write nothing"


def test_nfr022_a_rejected_password_change_names_the_field_and_keeps_the_saved_password(
    client: TestClient, db_session: DBSession
):
    """[NFR-022][AC-021] The password form's failure is reported per field, with the
    saved password still in force."""
    patient = _register(client)

    resp = client.post(
        PASSWORD,
        headers=_bearer(patient["token"]),
        json={"current_password": "", "new_password": ""},
    )
    assert resp.status_code == 422, resp.text
    detail = resp.json()["detail"]
    assert isinstance(detail, list) and detail, detail
    for err in detail:
        assert err.get("field"), err
        assert err.get("msg"), err

    assert _login(client, patient["email"], patient["password"]).status_code == 200


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
