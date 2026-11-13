"""Test fixtures: one fresh database per test, never the application's own.

Without this file every test shares the SQLite file `DATABASE_URL` names, so a row
one test writes is still there for the next one, and the order the tests run in
decides whether they pass. Worse, a deployment that points `DATABASE_URL` at
Postgres makes the suite need a database server to collect at all.

Each test gets an in-memory database of its own. `StaticPool` keeps every session
on the one connection that memory lives in, and the `get_db` override makes the
application use it instead of the engine `app.database` built at import.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 -- imported so the tables register before create_all
from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_session() -> Iterator[Session]:
    """An empty database, built and thrown away around one test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    """The application, talking to this test's database and nothing else."""

    def _get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = _get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
