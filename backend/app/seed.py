"""Idempotent startup seeding of the bootstrap admin and smoke-test patient.

Runs once at application startup. Without `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD` or `SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD` set,
nothing is seeded -- exactly what a local run or the test suite needs.
"""

import os

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import CatalogTerm, Specialization, User
from app.security import hash_password
from app.seed_data.catalog import SEED_SPECIALIZATIONS, SEED_TERMS


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


def _seed_key(term: str) -> str:
    """Stable identity for a seeded term, independent of its displayed text."""
    return term.strip().lower()


def _get_or_create_specialization(db: Session, name: str, description: str) -> Specialization:
    """Match an existing specialization case-insensitively; create it as given
    only when none exists, so no name is ever duplicated or overwritten."""
    row = db.query(Specialization).filter(func.lower(Specialization.name) == name.lower()).first()
    if row is not None:
        return row
    row = Specialization(name=name, description=description, is_active=True)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def seed_catalog(db: Session) -> None:
    """Insert the starter disease/symptom catalogue idempotently (AC-034..036).

    Plain deterministic data insertion from ``app.seed_data.catalog``: no AI,
    LLM or ML (NFR-012). A seeded row that an administrator has edited or
    soft-deleted is recognised by its ``seed_key`` and is never recreated or
    overwritten (NFR-024), and running this twice creates nothing the second
    time.
    """
    specs: dict[str, Specialization] = {}
    for name, description in SEED_SPECIALIZATIONS:
        specs[name] = _get_or_create_specialization(db, name, description)

    existing_keys = {
        key
        for (key,) in db.query(CatalogTerm.seed_key).filter(CatalogTerm.seed_key.isnot(None)).all()
    }

    for term, entry_type, spec_names in SEED_TERMS:
        key = _seed_key(term)
        if key in existing_keys:
            continue
        # An administrator may already have created this term by hand; never
        # duplicate it, and never take it over.
        clash = (
            db.query(CatalogTerm)
            .filter(
                func.lower(CatalogTerm.term) == term.lower(),
                CatalogTerm.is_deleted.is_(False),
            )
            .first()
        )
        if clash is not None:
            continue
        row = CatalogTerm(
            term=term,
            entry_type=entry_type,
            is_seeded=True,
            seed_key=key,
        )
        row.specializations = [specs[n] for n in spec_names]
        db.add(row)
        db.commit()
        existing_keys.add(key)


__all__ = ["seed_startup_users", "seed_catalog"]
