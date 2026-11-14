"""Unit tests for clinic settings: timezone and booking cutoff (US-008-1)."""

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
from app.models import ClinicSettings, User
from app.routers import settings
from app.routers.settings import SINGLETON_ID
from app.security import create_session, hash_password


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

    app.include_router(settings.public_router)
    app.include_router(settings.admin_router)
    yield TestClient(app)


# -- AC-033 -------------------------------------------------------------------


def test_ac033_defaults_to_utc_unconfirmed_before_any_save(
    db_session: DBSession, app_client: TestClient
):
    user = _make_user(db_session, role="patient")
    resp = app_client.get("/api/settings", headers=_auth(db_session, user))
    assert resp.status_code == 200
    body = resp.json()
    assert body["timezone"] == "UTC"
    assert body["timezone_confirmed"] is False
    assert isinstance(body["booking_cutoff_hours"], int)


def test_get_settings_requires_authentication(app_client: TestClient):
    assert app_client.get("/api/settings").status_code == 401


# -- AC-030 -------------------------------------------------------------------


def test_ac030_put_valid_timezone_saves_confirms_and_is_read_back(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    put = app_client.put(
        "/api/admin/settings",
        headers=_auth(db_session, admin),
        json={"timezone": "America/New_York", "booking_cutoff_hours": 12},
    )
    assert put.status_code == 200
    body = put.json()
    assert body["timezone"] == "America/New_York"
    assert body["booking_cutoff_hours"] == 12
    assert body["timezone_confirmed"] is True

    patient = _make_user(db_session, role="patient")
    got = app_client.get("/api/settings", headers=_auth(db_session, patient))
    assert got.json() == {
        "timezone": "America/New_York",
        "booking_cutoff_hours": 12,
        "timezone_confirmed": True,
    }


def test_ac030_unknown_timezone_is_422_and_nothing_written(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    resp = app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "Mars/Phobos", "booking_cutoff_hours": 6},
    )
    assert resp.status_code == 422
    assert any(d["field"] == "timezone" for d in resp.json()["detail"])
    # Still the unconfirmed default: nothing was written.
    assert db_session.get(ClinicSettings, SINGLETON_ID) is None
    got = app_client.get("/api/settings", headers=headers)
    assert got.json()["timezone"] == "UTC"
    assert got.json()["timezone_confirmed"] is False


# -- AC-031 -------------------------------------------------------------------


def test_ac031_booking_cutoff_takes_effect_immediately(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "UTC", "booking_cutoff_hours": 48},
    )
    first = app_client.get("/api/settings", headers=headers)
    assert first.json()["booking_cutoff_hours"] == 48

    app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "UTC", "booking_cutoff_hours": 2},
    )
    second = app_client.get("/api/settings", headers=headers)
    assert second.json()["booking_cutoff_hours"] == 2


# -- AC-032 -------------------------------------------------------------------


def test_ac032_negative_cutoff_is_422_and_previous_cutoff_stays(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "Europe/London", "booking_cutoff_hours": 24},
    )

    resp = app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "Europe/London", "booking_cutoff_hours": -1},
    )
    assert resp.status_code == 422
    assert any(d["field"] == "booking_cutoff_hours" for d in resp.json()["detail"])

    unchanged = app_client.get("/api/settings", headers=headers)
    assert unchanged.json()["booking_cutoff_hours"] == 24
    assert unchanged.json()["timezone"] == "Europe/London"


def test_ac032_non_numeric_cutoff_is_422_and_previous_cutoff_stays(
    db_session: DBSession, app_client: TestClient
):
    admin = _make_user(db_session)
    headers = _auth(db_session, admin)
    app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "UTC", "booking_cutoff_hours": 10},
    )

    resp = app_client.put(
        "/api/admin/settings",
        headers=headers,
        json={"timezone": "UTC", "booking_cutoff_hours": "soon"},
    )
    assert resp.status_code == 422
    assert any(d["field"] == "booking_cutoff_hours" for d in resp.json()["detail"])

    unchanged = app_client.get("/api/settings", headers=headers)
    assert unchanged.json()["booking_cutoff_hours"] == 10


# -- authz --------------------------------------------------------------------


def test_put_settings_requires_admin_role(db_session: DBSession, app_client: TestClient):
    for role in ("patient", "doctor"):
        caller = _make_user(db_session, role=role)
        resp = app_client.put(
            "/api/admin/settings",
            headers=_auth(db_session, caller),
            json={"timezone": "UTC", "booking_cutoff_hours": 1},
        )
        assert resp.status_code == 403
        assert resp.content == b""


def test_put_settings_requires_authentication(app_client: TestClient):
    resp = app_client.put(
        "/api/admin/settings",
        json={"timezone": "UTC", "booking_cutoff_hours": 1},
    )
    assert resp.status_code == 401
