"""Application entrypoint.

Generated from the approved architecture: one router per component that owns
endpoints, one route per endpoint the API spec declares. The auth, admin and
clinical routers return real responses; this module wires them together, sets
up CORS and the shared error handlers, and creates the schema on startup.
"""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app import models  # noqa: F401 -- imported so the tables register before create_all
from app.database import Base, SessionLocal, engine
from app.errors import EmptyBodyHTTPError
from app.routers import (
    admin_users,
    appointments,
    auth,
    availability,
    doctors,
    patients,
    search,
    settings,
    specializations,
)
from app.routers.settings import get_or_create_settings
from app.security import validate_session_idle_minutes
from app.seed import seed_catalog, seed_startup_users
from app.services import configured_services


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """The scaffold ships no migrations, so the tables are created from the models
    when the application starts. Replace this with Alembic before anything holds data
    worth keeping.

    This runs on startup and not at import, so importing the application never opens a
    connection. A test can therefore point `get_db` at a database of its own, and a
    deployment whose `DATABASE_URL` names a server that is not up fails where you can
    read the error, not while pytest collects the files.

    A misconfigured `SESSION_IDLE_MINUTES` is rejected here, at startup, so a bad
    value fails loudly where an operator can read it rather than turning every
    authenticated request into a 500 on the hot path.
    """
    validate_session_idle_minutes()
    if engine.dialect.name == "postgresql":
        # The User.email column uses citext for case-insensitive uniqueness; the
        # extension must exist before create_all issues CREATE TABLE ... CITEXT.
        with engine.begin() as conn:
            conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS citext")
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql":
        # The patient-profile columns are additive to an existing `users` table that
        # predates them; create_all never alters a table that already exists, so add
        # them idempotently and backward-compatibly here.
        with engine.begin() as conn:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32)")
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE")
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(32)")
            # Doctor directory fields are additive to an existing `users` table.
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS qualifications TEXT")
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10, 2)"
            )
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)")
            # Directory visibility, additive and defaulting to visible so existing
            # rows keep behaving exactly as before.
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "profile_active BOOLEAN NOT NULL DEFAULT TRUE"
            )
            # Optional visit reason is additive to an existing appointments table.
            conn.exec_driver_sql(
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason VARCHAR(500)"
            )
            # catalog_terms soft-delete flag is additive to an existing table.
            conn.exec_driver_sql(
                "ALTER TABLE catalog_terms ADD COLUMN IF NOT EXISTS "
                "is_deleted BOOLEAN NOT NULL DEFAULT FALSE"
            )
            # Seeded-row identity is additive to an existing catalog_terms table.
            conn.exec_driver_sql(
                "ALTER TABLE catalog_terms ADD COLUMN IF NOT EXISTS seed_key VARCHAR(64)"
            )
    db = SessionLocal()
    try:
        seed_startup_users(db)
        # Starter disease/symptom catalogue: idempotent, never overwrites or
        # recreates administrator edits or deletions (NFR-024).
        seed_catalog(db)
        # Seed the single clinic-settings row idempotently so the documented
        # default (UTC, timezone_confirmed=false) is readable before any save.
        get_or_create_settings(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="MediBook \u2013 Doctor Appointment & Consultation Management System",
    description="Develop a web-based healthcare appointment management application where patients can search for doctors based on their disease, symptoms, or medical specialization, view available doctors and their consultation time slots, and book, reschedule, or cancel appointments. Doctors can manage their availability, view scheduled appointments, maintain patient consultation records, and update consultation statuses. The system should support role-based access for patients, doctors, and administrators, with an admin dashboard to manage doctors, specializations, and appointments.\n\nThe application must use predefined disease-to-specialization mappings to help patients find relevant doctors, without using AI, LLMs, or machine learning. It should prevent double bookings and display real-time appointment availability. **No payment gateway or online payment functionality is required.**",  # noqa: E501
    version="0.1.0",
    lifespan=lifespan,
)

# The SPA runs on a different origin than the API, so the browser refuses its calls
# unless that origin is allowed here. In development that is the Vite dev server; when
# deployed, the platform injects the frontend's real URL as ALLOWED_ORIGINS (comma
# separated). Point ALLOWED_ORIGINS at the real thing and nothing else has to change.
_dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
_allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins or _dev_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(admin_users.router, prefix="/api/admin", tags=["admin"])
app.include_router(appointments.router)
app.include_router(patients.router)
app.include_router(specializations.public_router)
app.include_router(specializations.admin_router)
app.include_router(settings.public_router)
app.include_router(settings.admin_router)
app.include_router(search.router)
app.include_router(doctors.router)
app.include_router(doctors.public_router)
app.include_router(availability.router)
app.include_router(availability.public_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Invalid input returns 422 listing each offending field, keyed by field name."""
    detail = [
        {
            "field": str(err["loc"][-1]),
            "msg": err.get("msg", "invalid"),
            "message": err.get("msg", "invalid"),
        }
        for err in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(EmptyBodyHTTPError)
async def empty_body_error_handler(request: Request, exc: EmptyBodyHTTPError) -> Response:
    """403/404 responses that must carry no body, so they cannot be told apart
    from one another by anything in the payload."""
    return Response(status_code=exc.status_code)


@app.get("/health")
async def health() -> dict[str, object]:
    """Liveness probe reporting the configured backing services."""
    return {"status": "ok", "services": configured_services()}
