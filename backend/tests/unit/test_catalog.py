"""Unit tests for the disease/symptom catalogue: admin CRUD and suggest (US-010-1)."""

import secrets
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import CatalogTerm, User
from app.routers import specializations
from app.security import create_session, hash_password


def _name(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}"


def _make_user(db: DBSession, role: str = "admin") -> User:
    user = User(
        email=f"{role}-{secrets.token_hex(6)}@example.com",
        full_name=f"{role.title()} User",
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

    @app.exception_handler(RequestValidationError)
    async def _invalid(request, exc):
        detail = [
            {"field": str(err["loc"][-1]), "msg": err.get("msg", "invalid")} for err in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": detail})

    app.include_router(specializations.public_router)
    app.include_router(specializations.admin_router)
    yield TestClient(app)


def _spec(client: TestClient, headers: dict, name: str) -> str:
    resp = client.post("/api/admin/specializations", headers=headers, json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# -- AC-037 -------------------------------------------------------------------


def test_ac037_create_saves_and_resolves_to_specializations(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(client=app_client, headers=headers, name=_name("cardio"))

    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": _name("flu"), "kind": "disease", "specialization_ids": [spec_id]},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["kind"] == "disease"
    assert body["specialization_ids"] == [spec_id]

    listed = app_client.get("/api/admin/catalog-terms", headers=headers).json()
    match = [t for t in listed["items"] if t["id"] == body["id"]]
    assert match and match[0]["specialization_ids"] == [spec_id]


# -- AC-038 -------------------------------------------------------------------


def test_ac038_empty_specialization_list_is_422_keyed_on_field(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    before = db_session.query(CatalogTerm).count()

    resp = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": _name("pain"), "kind": "symptom", "specialization_ids": []},
    )
    assert resp.status_code == 422
    assert any(d["field"] == "specialization_ids" for d in resp.json()["detail"])
    assert db_session.query(CatalogTerm).count() == before


# -- AC-040 (part): soft-delete -----------------------------------------------


def test_ac040_delete_soft_deletes_and_term_stops_resolving_and_suggesting(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(client=app_client, headers=headers, name=_name("neuro"))
    term = _name("migraine")
    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "symptom", "specialization_ids": [spec_id]},
    ).json()

    deleted = app_client.delete(f"/api/admin/catalog-terms/{created['id']}", headers=headers)
    assert deleted.status_code == 204

    # The row is still stored (NFR-026) but flagged deleted.
    stored = db_session.get(CatalogTerm, created["id"])
    assert stored is not None and stored.is_deleted is True

    # It no longer appears in the admin list nor in suggest.
    listed = app_client.get("/api/admin/catalog-terms", headers=headers).json()
    assert all(t["id"] != created["id"] for t in listed["items"])

    suggest = app_client.get("/api/catalog/suggest", headers=headers, params={"q": term[:5]}).json()
    assert all(i["term"] != term for i in suggest["items"])


def test_ac040_delete_missing_is_404_empty_body(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    resp = app_client.delete(
        "/api/admin/catalog-terms/00000000-0000-4000-8000-000000000000",
        headers=_auth(db_session, admin),
    )
    assert resp.status_code == 404
    assert resp.content == b""


# -- suggest (NFR-012) --------------------------------------------------------


def test_suggest_returns_empty_for_short_query(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(client=app_client, headers=headers, name=_name("derm"))
    app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": "Eczema", "kind": "disease", "specialization_ids": [spec_id]},
    )
    for q in ("", "e"):
        resp = app_client.get("/api/catalog/suggest", headers=headers, params={"q": q})
        assert resp.status_code == 200
        body = resp.json()
        # List endpoints always return {items, total} (behaviour rule); below two
        # characters the item list is empty.
        assert body["items"] == []
        assert body["total"] == 0


def test_suggest_matches_case_insensitive_substring(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(client=app_client, headers=headers, name=_name("derm"))
    unique = secrets.token_hex(4)
    term = f"Eczema{unique}"
    app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "disease", "specialization_ids": [spec_id]},
    )

    resp = app_client.get(
        "/api/catalog/suggest", headers=headers, params={"q": f"ECZEMA{unique.upper()}"[:6]}
    )
    assert resp.status_code == 200
    matched = [i for i in resp.json()["items"] if i["term"] == term]
    assert matched and matched[0]["kind"] == "disease"


def test_suggest_requires_authentication(app_client: TestClient):
    assert app_client.get("/api/catalog/suggest", params={"q": "flu"}).status_code == 401


# -- list rules / duplicate / PUT ---------------------------------------------


def test_list_returns_items_total_and_paginates(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(client=app_client, headers=headers, name=_name("gp"))
    for _ in range(3):
        app_client.post(
            "/api/admin/catalog-terms",
            headers=headers,
            json={"term": _name("t"), "kind": "disease", "specialization_ids": [spec_id]},
        )

    body = app_client.get("/api/admin/catalog-terms", headers=headers).json()
    assert body["total"] == 3
    assert len(body["items"]) == 3

    paged = app_client.get("/api/admin/catalog-terms?limit=2&offset=1", headers=headers).json()
    assert paged["total"] == 3
    assert len(paged["items"]) == 2


def test_duplicate_term_case_insensitive_is_409(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    spec_id = _spec(client=app_client, headers=headers, name=_name("gp"))
    term = _name("Flu")
    first = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term, "kind": "disease", "specialization_ids": [spec_id]},
    )
    assert first.status_code == 201
    before = db_session.query(CatalogTerm).count()

    dup = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": term.upper(), "kind": "disease", "specialization_ids": [spec_id]},
    )
    assert dup.status_code == 409
    assert dup.json() == {"code": "duplicate_term"}
    assert db_session.query(CatalogTerm).count() == before


def test_put_updates_specializations_and_empty_list_is_422(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    s1 = _spec(client=app_client, headers=headers, name=_name("a"))
    s2 = _spec(client=app_client, headers=headers, name=_name("b"))
    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={"term": _name("cough"), "kind": "symptom", "specialization_ids": [s1]},
    ).json()

    updated = app_client.put(
        f"/api/admin/catalog-terms/{created['id']}",
        headers=headers,
        json={"specialization_ids": [s2]},
    )
    assert updated.status_code == 200
    assert updated.json()["specialization_ids"] == [s2]

    empty = app_client.put(
        f"/api/admin/catalog-terms/{created['id']}",
        headers=headers,
        json={"specialization_ids": []},
    )
    assert empty.status_code == 422


def test_put_missing_is_404_empty_body(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    resp = app_client.put(
        "/api/admin/catalog-terms/00000000-0000-4000-8000-000000000000",
        headers=_auth(db_session, admin),
        json={"term": "new"},
    )
    assert resp.status_code == 404
    assert resp.content == b""


def test_create_links_only_active_specializations(db_session: DBSession, app_client: TestClient):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    active = _spec(client=app_client, headers=headers, name=_name("active"))
    inactive = _spec(client=app_client, headers=headers, name=_name("inactive"))
    app_client.patch(
        f"/api/admin/specializations/{inactive}", headers=headers, json={"is_active": False}
    )

    created = app_client.post(
        "/api/admin/catalog-terms",
        headers=headers,
        json={
            "term": _name("fever"),
            "kind": "disease",
            "specialization_ids": [active, inactive],
        },
    )
    assert created.status_code == 201
    assert created.json()["specialization_ids"] == [active]


def test_catalog_terms_require_admin_role(db_session: DBSession, app_client: TestClient):
    caller = _make_user(db_session, role="doctor")
    resp = app_client.post(
        "/api/admin/catalog-terms",
        headers=_auth(db_session, caller),
        json={"term": _name("x"), "kind": "disease", "specialization_ids": ["x"]},
    )
    assert resp.status_code == 403
    assert resp.content == b""
