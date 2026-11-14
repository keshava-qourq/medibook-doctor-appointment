"""Unit tests for the doctor directory (US-011-1).

Covers the profile fields (qualifications, consultation fee), the directory
listing and read-one endpoints, catalogue suggest entry types and the three
search resolutions.
"""

import secrets
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import User
from app.routers import doctors, search, specializations
from app.security import create_session, hash_password


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


def _make_user(db: DBSession, role: str = "admin", full_name: str | None = None) -> User:
    user = User(
        email=f"{role}-{secrets.token_hex(6)}@example.com",
        full_name=full_name or f"{role.title()} {secrets.token_hex(3)}",
        role=role,
        is_active=True,
        password_hash=hash_password(secrets.token_urlsafe(12)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(db: DBSession, user: User) -> dict[str, str]:
    raw_token, _ = create_session(db, user)
    return {"Authorization": f"Bearer {raw_token}"}


@pytest.fixture
def app_client(db_session: DBSession) -> Iterator[TestClient]:
    app = FastAPI()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    @app.exception_handler(EmptyBodyHTTPError)
    async def _empty(request, exc):
        return Response(status_code=exc.status_code)

    app.include_router(specializations.public_router)
    app.include_router(specializations.admin_router)
    app.include_router(doctors.router)
    app.include_router(doctors.public_router)
    app.include_router(search.router)
    yield TestClient(app)


def _spec(client: TestClient, headers: dict, name: str) -> str:
    resp = client.post("/api/admin/specializations", headers=headers, json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _term(client: TestClient, headers: dict, term: str, spec_ids: list[str]) -> None:
    resp = client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "disease", "specialization_ids": spec_ids},
    )
    assert resp.status_code == 201, resp.text


def _profile(client: TestClient, headers: dict, doctor_id: str, **body) -> dict:
    resp = client.put(f"/api/admin/doctors/{doctor_id}", headers=headers, json=body)
    assert resp.status_code == 200, resp.text
    return resp.json()


# -- profile fields ------------------------------------------------------------


def test_profile_update_stores_qualifications_and_consultation_fee(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("cardio"))
    doctor = _make_user(db_session, role="doctor")

    body = _profile(
        app_client,
        headers,
        doctor.id,
        specialization_ids=[spec_id],
        qualifications="MBBS, MD",
        consultation_fee=50,
    )
    assert body["qualifications"] == "MBBS, MD"
    assert body["consultation_fee"] == 50
    assert body["specialization_ids"] == [spec_id]

    card = app_client.get(f"/api/doctors/{doctor.id}", headers=headers).json()
    assert card["qualifications"] == "MBBS, MD"
    assert card["consultation_fee"] == 50


# -- AC-042 --------------------------------------------------------------------


def test_ac042_search_returns_doctor_cards_with_qualifications_and_fee(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("cardio"))
    doctor = _make_user(db_session, role="doctor")
    _profile(
        app_client,
        headers,
        doctor.id,
        specialization_ids=[spec_id],
        qualifications="MBBS",
        consultation_fee=42,
    )
    term = _name("chestpain")
    _term(app_client, headers, term, [spec_id])

    patient = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get("/api/search/doctors", headers=patient, params={"term": term}).json()
    assert body["resolution"] == "matched"
    item = next(i for i in body["items"] if i["id"] == doctor.id)
    assert item["full_name"] == doctor.full_name
    assert item["specializations"] == [{"id": spec_id, "name": item["specializations"][0]["name"]}]
    assert item["qualifications"] == "MBBS"
    assert item["consultation_fee"] == 42


# -- AC-041 / NFR-012 ----------------------------------------------------------


def test_ac041_nfr012_suggest_returns_terms_and_specializations_by_substring(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    token = secrets.token_hex(4)
    spec_id = _spec(app_client, headers, f"Cardio{token}")
    _term(app_client, headers, f"Chestpain{token}", [spec_id])

    found = app_client.get(
        "/api/catalog/suggest", headers=headers, params={"q": token.upper()}
    ).json()
    types = {i["entry_type"] for i in found["items"]}
    assert types == {"disease", "specialization"}
    assert found["total"] == len(found["items"])
    disease = next(i for i in found["items"] if i["entry_type"] == "disease")
    assert disease["specializations"][0]["id"] == spec_id
    assert disease["id"]


def test_ac041_suggest_is_empty_below_two_characters(db_session: DBSession, app_client: TestClient):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("derm"))
    _term(app_client, headers, _name("eczema"), [spec_id])
    for q in ("", "e"):
        body = app_client.get("/api/catalog/suggest", headers=headers, params={"q": q}).json()
        assert body["items"] == []


# -- AC-043 / AC-044 -----------------------------------------------------------


def test_ac043_unknown_term_is_no_match_with_no_guessed_alternative(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("derm"))
    _term(app_client, headers, "Eczema" + secrets.token_hex(3), [spec_id])

    patient = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get(
        "/api/search/doctors", headers=patient, params={"term": "ekzeema-nonsense"}
    ).json()
    assert body["resolution"] == "no_match"
    assert body["items"] == []
    assert body["specializations"] == []


def test_ac044_term_with_no_active_doctor_is_no_specialist_available(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("neuro"))
    term = _name("migraine")
    _term(app_client, headers, term, [spec_id])

    patient = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get("/api/search/doctors", headers=patient, params={"term": term}).json()
    assert body["resolution"] == "no_specialist_available"
    assert body["items"] == []
    assert [s["id"] for s in body["specializations"]] == [spec_id]


# -- AC-046 --------------------------------------------------------------------


def test_ac046_list_filters_by_specialization_and_name_and_paginates(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_a = _spec(app_client, headers, _name("a"))
    spec_b = _spec(app_client, headers, _name("b"))
    tag = secrets.token_hex(4)
    d1 = _make_user(db_session, role="doctor", full_name=f"Alice {tag}")
    d2 = _make_user(db_session, role="doctor", full_name=f"Bob {tag}")
    other = _make_user(db_session, role="doctor", full_name=f"Zed {tag}")
    _profile(app_client, headers, d1.id, specialization_ids=[spec_a])
    _profile(app_client, headers, d2.id, specialization_ids=[spec_a])
    _profile(app_client, headers, other.id, specialization_ids=[spec_b])

    patient = _auth(db_session, _make_user(db_session, role="patient"))
    by_spec = app_client.get(
        "/api/doctors", headers=patient, params={"specialization_id": spec_a}
    ).json()
    assert by_spec["total"] == 2
    assert {i["id"] for i in by_spec["items"]} == {d1.id, d2.id}

    by_name = app_client.get("/api/doctors", headers=patient, params={"name": "ALICE"}).json()
    assert [i["id"] for i in by_name["items"]] == [d1.id]

    paged = app_client.get(
        "/api/doctors", headers=patient, params={"specialization_id": spec_a, "limit": 1}
    ).json()
    assert paged["total"] == 2
    assert len(paged["items"]) == 1
    assert app_client.get("/api/doctors?limit=101", headers=patient).status_code == 422


def test_ac046_list_returns_active_doctors_only(db_session: DBSession, app_client: TestClient):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    active = _make_user(db_session, role="doctor")
    gone = _make_user(db_session, role="doctor")
    _profile(app_client, headers, active.id, specialization_ids=[spec_id])
    _profile(app_client, headers, gone.id, specialization_ids=[spec_id])
    gone.is_active = False
    db_session.commit()

    body = app_client.get(
        "/api/doctors", headers=headers, params={"specialization_id": spec_id}
    ).json()
    assert {i["id"] for i in body["items"]} == {active.id}
    assert body["total"] == 1


def test_ac046_list_requires_authentication(app_client: TestClient):
    assert app_client.get("/api/doctors").status_code == 401


# -- AC-047 / AC-048 -----------------------------------------------------------


def test_ac047_read_one_returns_the_full_card_for_an_active_doctor(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("cardio"))
    doctor = _make_user(db_session, role="doctor")
    _profile(
        app_client,
        headers,
        doctor.id,
        specialization_ids=[spec_id],
        qualifications="MBBS",
        consultation_fee=25,
    )

    patient = _auth(db_session, _make_user(db_session, role="patient"))
    card = app_client.get(f"/api/doctors/{doctor.id}", headers=patient).json()
    assert card["id"] == doctor.id
    assert card["full_name"] == doctor.full_name
    assert [s["id"] for s in card["specializations"]] == [spec_id]
    assert card["qualifications"] == "MBBS"
    assert card["consultation_fee"] == 25
    assert card["is_active"] is True


def test_ac048_unknown_non_doctor_and_deactivated_are_identical_404(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    patient_user = _make_user(db_session, role="patient")
    gone = _make_user(db_session, role="doctor")
    gone.is_active = False
    db_session.commit()

    responses = [
        app_client.get("/api/doctors/00000000-0000-4000-8000-000000000000", headers=headers),
        app_client.get(f"/api/doctors/{patient_user.id}", headers=headers),
        app_client.get(f"/api/doctors/{gone.id}", headers=headers),
    ]
    for resp in responses:
        assert resp.status_code == 404
        assert resp.json() == {"code": "doctor_unavailable"}


# -- browse-all fallback and NFR-013 -------------------------------------------


def test_specializations_listing_remains_available_to_a_patient(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    patient = _auth(db_session, _make_user(db_session, role="patient"))
    body = app_client.get("/api/specializations", headers=patient).json()
    assert spec_id in {s["id"] for s in body["items"]}
    assert body["total"] >= 1


def test_nfr013_no_doctor_endpoint_exposes_a_payment_field(
    db_session: DBSession, app_client: TestClient
):
    headers = _auth(db_session, _make_user(db_session))
    spec_id = _spec(app_client, headers, _name("gp"))
    doctor = _make_user(db_session, role="doctor")
    _profile(app_client, headers, doctor.id, specialization_ids=[spec_id], consultation_fee=10)
    card = app_client.get(f"/api/doctors/{doctor.id}", headers=headers).json()
    forbidden = {"payment", "checkout", "invoice", "refund", "upload", "telemedicine"}
    assert not any(any(word in key.lower() for word in forbidden) for key in card)
