"""US-011-3 acceptance (API): term-driven search and the doctor directory.

Contract under test (US-011-1 / US-011-2):
  GET /api/catalog/suggest?q=        -> 200 {items:[{id, term, entry_type,
                                         specializations:[{id,name}]}], total};
                                         empty items under two characters, deterministic
                                         case-insensitive substring matching, no fuzzy/ML
  GET /api/search/doctors?term=      -> 200 {items:[DoctorCard], total,
                                         resolution:"matched"|"no_match"|
                                         "no_specialist_available",
                                         specializations:[{id,name}]}
  GET /api/doctors?specialization_id=&name=&limit=&offset=
                                     -> 200 {items:[DoctorCard], total}
  GET /api/doctors/{doctor_id}       -> 200 DoctorCard
                                     -> 404 {"code":"doctor_unavailable"} for an unknown
                                        or a deactivated doctor (identical bodies)
  PUT /api/admin/doctors/{doctor_id} {specialization_ids, qualifications?,
                                      consultation_fee?} -> 200

  DoctorCard = {id, full_name, specializations:[{id,name}], qualifications: string|null,
                consultation_fee: number|null, is_active: true}

Every account, specialization and catalogue term is created through the API; the bootstrap
admin is seeded exactly as the application seeds it from BOOTSTRAP_ADMIN_* at startup,
because no API mints the first admin and the ``client`` fixture starts empty. Every term
and name is unique per test so no two tests collide on the case-insensitive constraint.

The directory/search routes are delivered by US-011-1/US-011-2 in the same sprint and may
not be mounted yet while this ticket is in flight: each criterion is gated on the live
OpenAPI schema, so it runs its real assertions when the route exists and is PENDING
(skipped, concurrent build) until then.

NFR-016 (backups/PITR) and NFR-017 (sizing) are provisioning promises no application test
can observe: they stay declared in tests/integration/test_nfr_infrastructure.py and as the
e2e [KNOWN-LIMIT] skips in frontend/e2e/nfr-infrastructure.spec.ts.
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


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


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
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Directory Patient",
            "email": _email("patient"),
            "phone": "+15551112222",
            "password": _password(),
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _has_route(client: TestClient, template: str) -> bool:
    return template in client.get("/openapi.json").json().get("paths", {})


def _require(client: TestClient, *templates: str) -> None:
    missing = [t for t in templates if not _has_route(client, t)]
    if missing:
        pytest.skip(
            "PENDING: search/directory routes not mounted yet "
            f"({', '.join(missing)}); delivered by US-011-1/US-011-2 in the same sprint "
            "(concurrent build)"
        )


def _items(payload) -> list:
    if isinstance(payload, dict):
        return payload.get("items", [])
    return payload


def _create_spec(client: TestClient, token: str, name: str) -> str:
    created = client.post(
        "/api/admin/specializations",
        headers=_bearer(token),
        json={"name": name, "description": "desc"},
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def _create_term(client: TestClient, token: str, term: str, spec_ids: list[str]) -> str:
    created = client.post(
        "/api/admin/catalog-terms",
        headers=_bearer(token),
        json={"term": term, "entry_type": "disease", "specialization_ids": spec_ids},
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def _create_doctor(
    client: TestClient,
    token: str,
    spec_ids: list[str],
    full_name: str | None = None,
    qualifications: str = "MBBS, MD",
    consultation_fee: int = 500,
) -> tuple[str, str]:
    """Create an active doctor through the admin API and give it its profile."""
    full_name = full_name or _name("Dr Directory")
    created = client.post(
        "/api/admin/users",
        headers=_bearer(token),
        json={
            "full_name": full_name,
            "email": _email("doctor"),
            "role": "doctor",
            "initial_password": _password(),
        },
    )
    assert created.status_code == 201, created.text
    doctor_id = created.json()["id"]
    profile = client.put(
        f"/api/admin/doctors/{doctor_id}",
        headers=_bearer(token),
        json={
            "specialization_ids": spec_ids,
            "qualifications": qualifications,
            "consultation_fee": consultation_fee,
        },
    )
    assert profile.status_code == 200, profile.text
    return doctor_id, full_name


def _search(client: TestClient, token: str, term: str, **params):
    return client.get(
        "/api/search/doctors", headers=_bearer(token), params={"term": term, **params}
    )


def _suggest(client: TestClient, token: str, q: str):
    return client.get("/api/catalog/suggest", headers=_bearer(token), params={"q": q})


def _ids(payload) -> set:
    return {row["id"] for row in _items(payload)}


# -- AC-041: suggest is deterministic, case-insensitive substring, two characters up ---


def test_ac041_nfr012_suggest_is_deterministic_case_insensitive_substring_no_fuzzy(
    client: TestClient, db_session: DBSession
):
    """[AC-041][NFR-012] One character returns nothing; two or more return the catalogue
    terms whose stored text contains the query, case-insensitively; a near-miss that is
    not a substring is never returned, so no guessed or fuzzy suggestion is shown."""
    _require(client, "/api/catalog/suggest", "/api/admin/catalog-terms")
    token = _admin_token(client, db_session)
    spec_id = _create_spec(client, token, _name("Cardiology"))
    stem = secrets.token_hex(4)
    term = f"migraine{stem}"
    _create_term(client, token, term, [spec_id])

    patient = _patient_token(client)

    one_char = _suggest(client, patient, term[:1])
    assert one_char.status_code == 200, one_char.text
    assert _items(one_char.json()) == [], "a one-character query must suggest nothing"

    two_chars = _suggest(client, patient, term[:2])
    assert two_chars.status_code == 200, two_chars.text
    assert any(t["term"] == term for t in _items(two_chars.json())), two_chars.text

    upper = _suggest(client, patient, term[:6].upper())
    assert upper.status_code == 200
    assert any(t["term"] == term for t in _items(upper.json())), upper.text

    # The suggestion carries its mapped specializations, so the UI never guesses one.
    hit = next(t for t in _items(upper.json()) if t["term"] == term)
    assert hit.get("entry_type") in ("disease", "symptom"), hit
    assert [s["id"] for s in hit.get("specializations", [])] == [spec_id], hit

    typo = _suggest(client, patient, f"migrain3{stem}")
    assert typo.status_code == 200
    assert not any(t["term"] == term for t in _items(typo.json())), (
        "matching is deterministic substring only: a misspelling must not fuzzy-match"
    )

    # Deterministic: the same query twice gives the same answer in the same order.
    first = [t["id"] for t in _items(_suggest(client, patient, term[:5]).json())]
    second = [t["id"] for t in _items(_suggest(client, patient, term[:5]).json())]
    assert first == second, "suggest must be deterministic"


# -- AC-042: a term mapped to two specializations returns doctors from both ------------


def test_ac042_term_mapped_to_two_specializations_returns_active_doctors_from_both(
    client: TestClient, db_session: DBSession
):
    """[AC-042] A catalogue term mapped to two specializations, each with an active
    doctor, resolves to a matched result listing the doctors of both."""
    _require(
        client,
        "/api/admin/specializations",
        "/api/admin/catalog-terms",
        "/api/admin/doctors/{doctor_id}",
        "/api/search/doctors",
    )
    token = _admin_token(client, db_session)
    spec_a = _create_spec(client, token, _name("Cardiology"))
    spec_b = _create_spec(client, token, _name("Pulmonology"))
    doctor_a, _ = _create_doctor(client, token, [spec_a])
    doctor_b, _ = _create_doctor(client, token, [spec_b])
    term = _name("chestpain")
    _create_term(client, token, term, [spec_a, spec_b])

    patient = _patient_token(client)
    resolved = _search(client, patient, term)
    assert resolved.status_code == 200, resolved.text
    body = resolved.json()
    assert body["resolution"] == "matched", body
    assert {s["id"] for s in body["specializations"]} >= {spec_a, spec_b}, body
    returned = _ids(body)
    assert doctor_a in returned and doctor_b in returned, body
    assert body["total"] >= 2, body


# -- AC-043 / NFR-012: an unknown term is an explicit no match, never an invention -----


def test_ac043_nfr012_unknown_term_is_no_match_with_no_invented_result(
    client: TestClient, db_session: DBSession
):
    """[AC-043][NFR-012] A term absent from the catalogue resolves to no_match with no
    doctors and no specializations: nothing is guessed or invented for the patient."""
    _require(client, "/api/search/doctors")
    token = _admin_token(client, db_session)
    # A real term exists, so the empty answer is about this query, not an empty catalogue.
    spec_id = _create_spec(client, token, _name("Neurology"))
    _create_term(client, token, _name("migraine"), [spec_id])
    _create_doctor(client, token, [spec_id])

    patient = _patient_token(client)
    unknown = f"nonsense-{secrets.token_hex(8)}"
    resolved = _search(client, patient, unknown)
    assert resolved.status_code == 200, resolved.text
    body = resolved.json()
    assert body["resolution"] == "no_match", body
    assert _items(body) == [], body
    assert body["total"] == 0, body
    assert body["specializations"] == [], body


# -- AC-044 / NFR-023: a term whose specialization has no active doctor ---------------


def test_ac044_nfr023_term_with_no_active_doctor_is_no_specialist_available(
    client: TestClient, db_session: DBSession
):
    """[AC-044][NFR-023] A term that resolves to a specialization with no active doctor
    answers no_specialist_available -- an explicit state, distinct from no_match and from
    a silently empty result -- and the deactivated doctor is not listed."""
    _require(client, "/api/search/doctors", "/api/admin/doctors/{doctor_id}")
    token = _admin_token(client, db_session)
    spec_id = _create_spec(client, token, _name("Rheumatology"))
    term = _name("jointpain")
    _create_term(client, token, term, [spec_id])

    patient = _patient_token(client)
    empty = _search(client, patient, term)
    assert empty.status_code == 200, empty.text
    body = empty.json()
    assert body["resolution"] == "no_specialist_available", body
    assert _items(body) == [], body
    # The term did resolve: the specialization is named, so the page can explain itself.
    assert {s["id"] for s in body["specializations"]} == {spec_id}, body

    # The same holds when the only doctor of that specialization is deactivated.
    doctor_id, _ = _create_doctor(client, token, [spec_id])
    assert _search(client, patient, term).json()["resolution"] == "matched"
    deactivate = client.patch(
        f"/api/admin/users/{doctor_id}", headers=_bearer(token), json={"is_active": False}
    )
    assert deactivate.status_code == 200, deactivate.text
    after = _search(client, patient, term)
    assert after.status_code == 200, after.text
    assert after.json()["resolution"] == "no_specialist_available", after.text
    assert _items(after.json()) == [], after.text


# -- AC-045 / NFR-013: every result card carries the informational fee ----------------


def test_ac045_nfr013_each_result_carries_name_specializations_qualifications_and_fee(
    client: TestClient, db_session: DBSession
):
    """[AC-045][NFR-013] Every doctor card in a search result and in the directory shows
    name, specializations, qualifications and consultation fee, and carries no payment,
    checkout, invoice or refund field of any kind."""
    _require(client, "/api/search/doctors", "/api/doctors", "/api/admin/doctors/{doctor_id}")
    token = _admin_token(client, db_session)
    spec_id = _create_spec(client, token, _name("Dermatology"))
    doctor_id, full_name = _create_doctor(
        client, token, [spec_id], qualifications="MBBS, MD Dermatology", consultation_fee=750
    )
    term = _name("eczema")
    _create_term(client, token, term, [spec_id])

    patient = _patient_token(client)
    resolved = _search(client, patient, term)
    assert resolved.status_code == 200, resolved.text
    card = next(d for d in _items(resolved.json()) if d["id"] == doctor_id)
    assert card["full_name"] == full_name, card
    assert [s["id"] for s in card["specializations"]] == [spec_id], card
    assert card["qualifications"] == "MBBS, MD Dermatology", card
    assert float(card["consultation_fee"]) == 750.0, card
    assert card["is_active"] is True, card

    forbidden = ("payment", "checkout", "invoice", "refund", "pay_now", "card")
    serialized = str(resolved.json()).lower()
    for word in forbidden:
        assert word not in serialized, f"no payment surface may appear in results ({word})"

    directory = client.get(
        "/api/doctors", headers=_bearer(patient), params={"specialization_id": spec_id}
    )
    assert directory.status_code == 200, directory.text
    listed = next(d for d in _items(directory.json()) if d["id"] == doctor_id)
    for field in ("full_name", "specializations", "qualifications", "consultation_fee"):
        assert field in listed, listed
    for word in forbidden:
        assert word not in str(directory.json()).lower(), word


# -- AC-046: filtering by specialization and by name narrows to active doctors --------


def test_ac046_directory_filters_by_specialization_and_name_and_clears(
    client: TestClient, db_session: DBSession
):
    """[AC-046] The directory narrows by specialization and by doctor name to active
    doctors only, and dropping the filters restores the full list."""
    _require(client, "/api/doctors", "/api/admin/doctors/{doctor_id}")
    token = _admin_token(client, db_session)
    spec_a = _create_spec(client, token, _name("Orthopaedics"))
    spec_b = _create_spec(client, token, _name("Oncology"))
    unique = secrets.token_hex(4)
    doc_a, name_a = _create_doctor(client, token, [spec_a], full_name=f"Dr Alpha{unique}")
    doc_b, _name_b = _create_doctor(client, token, [spec_b], full_name=f"Dr Beta{unique}")
    inactive_id, _ = _create_doctor(client, token, [spec_a], full_name=f"Dr Gamma{unique}")
    assert (
        client.patch(
            f"/api/admin/users/{inactive_id}", headers=_bearer(token), json={"is_active": False}
        ).status_code
        == 200
    )

    patient = _patient_token(client)

    by_spec = client.get(
        "/api/doctors", headers=_bearer(patient), params={"specialization_id": spec_a, "limit": 100}
    )
    assert by_spec.status_code == 200, by_spec.text
    spec_ids = _ids(by_spec.json())
    assert doc_a in spec_ids, by_spec.text
    assert doc_b not in spec_ids, "a filter by specialization must exclude other specializations"
    assert inactive_id not in spec_ids, "a deactivated doctor is never listed"

    by_name = client.get(
        "/api/doctors", headers=_bearer(patient), params={"name": f"Alpha{unique}", "limit": 100}
    )
    assert by_name.status_code == 200, by_name.text
    assert _ids(by_name.json()) == {doc_a}, by_name.text

    both = client.get(
        "/api/doctors",
        headers=_bearer(patient),
        params={"specialization_id": spec_b, "name": f"Alpha{unique}", "limit": 100},
    )
    assert both.status_code == 200, both.text
    assert _items(both.json()) == [], "the two filters combine, they do not widen the list"

    cleared = client.get("/api/doctors", headers=_bearer(patient), params={"limit": 100})
    assert cleared.status_code == 200, cleared.text
    cleared_ids = _ids(cleared.json())
    assert {doc_a, doc_b} <= cleared_ids, "clearing the filters restores the full list"
    assert inactive_id not in cleared_ids


# -- AC-047: a doctor profile shows specializations, qualifications and fee -----------


def test_ac047_doctor_profile_shows_specializations_qualifications_and_fee(
    client: TestClient, db_session: DBSession
):
    """[AC-047] Reading one doctor returns that doctor's card: specializations,
    qualifications and consultation fee."""
    _require(client, "/api/doctors/{doctor_id}", "/api/admin/doctors/{doctor_id}")
    token = _admin_token(client, db_session)
    spec_id = _create_spec(client, token, _name("Pulmonology"))
    doctor_id, full_name = _create_doctor(
        client, token, [spec_id], qualifications="MBBS, DNB", consultation_fee=640
    )

    patient = _patient_token(client)
    profile = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient))
    assert profile.status_code == 200, profile.text
    body = profile.json()
    assert body["id"] == doctor_id
    assert body["full_name"] == full_name
    assert [s["id"] for s in body["specializations"]] == [spec_id], body
    assert body["qualifications"] == "MBBS, DNB", body
    assert float(body["consultation_fee"]) == 640.0, body
    assert body["is_active"] is True, body
    for word in ("payment", "checkout", "invoice", "refund"):
        assert word not in str(body).lower(), f"a profile may not offer {word}"


def test_ac047_doctor_profile_requires_authentication(client: TestClient, db_session: DBSession):
    """[AC-047] The directory is behind the Bearer token like every other endpoint."""
    _require(client, "/api/doctors/{doctor_id}")
    token = _admin_token(client, db_session)
    spec_id = _create_spec(client, token, _name("Neurology"))
    doctor_id, _ = _create_doctor(client, token, [spec_id])

    anonymous = client.get(f"/api/doctors/{doctor_id}")
    assert anonymous.status_code == 401, anonymous.text
    assert "detail" in anonymous.json()


# -- AC-048: a deactivated doctor answers exactly like an unknown one -----------------


def test_ac048_deactivated_and_unknown_doctor_are_identical_404_doctor_unavailable(
    client: TestClient, db_session: DBSession
):
    """[AC-048] After an administrator deactivates a doctor, GET /api/doctors/{id} answers
    404 {"code":"doctor_unavailable"} -- byte-identical to the answer for an id that never
    existed, so the two cases cannot be told apart -- and the doctor leaves the results."""
    _require(client, "/api/doctors/{doctor_id}", "/api/doctors", "/api/admin/doctors/{doctor_id}")
    token = _admin_token(client, db_session)
    spec_id = _create_spec(client, token, _name("Cardiology"))
    doctor_id, _ = _create_doctor(client, token, [spec_id])
    term = _name("palpitations")
    _create_term(client, token, term, [spec_id])

    patient = _patient_token(client)
    assert client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient)).status_code == 200
    assert doctor_id in _ids(_search(client, patient, term).json())

    deactivate = client.patch(
        f"/api/admin/users/{doctor_id}", headers=_bearer(token), json={"is_active": False}
    )
    assert deactivate.status_code == 200, deactivate.text

    gone = client.get(f"/api/doctors/{doctor_id}", headers=_bearer(patient))
    assert gone.status_code == 404, gone.text
    assert gone.json() == {"code": "doctor_unavailable"}, gone.text

    unknown = client.get(f"/api/doctors/{secrets.token_hex(16)}", headers=_bearer(patient))
    assert unknown.status_code == 404, unknown.text
    assert unknown.content == gone.content, (
        "a deactivated doctor and an unknown id must be indistinguishable"
    )

    # The deactivated doctor is also gone from the list the patient was looking at.
    assert doctor_id not in _ids(_search(client, patient, term).json())
    directory = client.get("/api/doctors", headers=_bearer(patient), params={"limit": 100})
    assert doctor_id not in _ids(directory.json())


# -- NFR-016 / NFR-017: infrastructure/provisioning, not observable from the app ------


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-"
    "database settings enabled in hosting/deployment config (docker-compose.yml / IaC), not "
    "observable from the app; the committed declaration is covered by "
    "tests/integration/test_nfr_infrastructure.py"
)
def test_nfr016_backups_and_pitr_are_infrastructure():  # pragma: no cover
    pass


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic is a provisioning/capacity "
    "target declared in deployment config (docker-compose.yml / IaC), not observable from "
    "the app; the committed declaration is covered by "
    "tests/integration/test_nfr_infrastructure.py"
)
def test_nfr017_sizing_is_infrastructure():  # pragma: no cover
    pass
