"""Idempotent startup seeding of the bootstrap admin and smoke-test patient.

Runs once at application startup. Without `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD` or `SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD` set,
nothing is seeded -- exactly what a local run or the test suite needs.
"""

import os

from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password


def _seed_user(
    db: Session, email: str | None, password: str | None, role: str, full_name: str
) -> None:
    if not email or not password:
        return
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        return
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()


def seed_startup_users(db: Session) -> None:
    """Seed the admin (highest role) and a smoke-test patient (lowest role)."""
    _seed_user(
        db,
        os.getenv("BOOTSTRAP_ADMIN_EMAIL"),
        os.getenv("BOOTSTRAP_ADMIN_PASSWORD"),
        "admin",
        "Administrator",
    )
    _seed_user(
        db,
        os.getenv("SMOKE_TEST_EMAIL"),
        os.getenv("SMOKE_TEST_PASSWORD"),
        "patient",
        "Smoke Test Patient",
    )


__all__ = ["seed_startup_users"]
