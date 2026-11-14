"""SQLAlchemy models: the auth core every endpoint depends on.

`User` holds the account and its bcrypt hash; `Session` holds only a hash of
the opaque bearer token issued at login, never the raw token.
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base


def _uuid4() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(UTC)


class CIText(TypeDecorator):
    """Case-insensitive text.

    `CITEXT` on Postgres (the real deployment and comparisons must treat
    `A@x.com` and `a@x.com` as the same address); plain text elsewhere, since
    the test suite's SQLite database has no such type.
    """

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(CITEXT())
        return dialect.type_descriptor(String(320))


ROLES = ("patient", "doctor", "admin")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    email: Mapped[str] = mapped_column(CIText(), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    role: Mapped[str] = mapped_column(Enum(*ROLES, name="user_role"), nullable=False)
    # Doctor profile fields (informational only -- the fee is settled at the
    # clinic, no payment is ever taken here, NFR-013). NULL for other roles.
    qualifications: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    consultation_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Directory visibility of a doctor, separate from the account being usable:
    # an administrator who deactivates a doctor's profile hides them from the
    # directory, search and booking, while the doctor keeps their session and can
    # still read the appointments already booked with them (AC-028/AC-029, NFR-026).
    profile_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Bcrypt hash only; no plain-text or reversible password is ever stored (NFR-001).
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


class Specialization(Base):
    """A medical specialization. Name is case-insensitive unique (citext on
    Postgres), stored as given. Soft-deactivated via `is_active`, never hard
    deleted while referenced (NFR-026)."""

    __tablename__ = "specializations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    name: Mapped[str] = mapped_column(CIText(), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


term_specializations = Table(
    "term_specializations",
    Base.metadata,
    Column("term_id", String(36), ForeignKey("catalog_terms.id"), primary_key=True),
    Column("specialization_id", String(36), ForeignKey("specializations.id"), primary_key=True),
)


class CatalogTerm(Base):
    """A disease/symptom/specialization catalogue term mapped to one or more
    specializations. Deactivating or deleting a specialization never removes the
    term or its mapping (NFR-026)."""

    __tablename__ = "catalog_terms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    term: Mapped[str] = mapped_column(CIText(), nullable=False, index=True)
    entry_type: Mapped[str] = mapped_column(String(32), nullable=False)
    is_seeded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Stable identity of a seeded row, independent of the term text, so an
    # administrator may rename a seeded term without the seeder recreating the
    # original (NFR-024). NULL for administrator-created terms.
    seed_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # Soft-delete: a deleted term stops resolving and stops appearing in suggest,
    # but the row stays so already-booked appointments that reference it are
    # untouched (NFR-026).
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    specializations: Mapped[list["Specialization"]] = relationship(
        secondary=term_specializations, lazy="selectin"
    )


doctor_specializations = Table(
    "doctor_specializations",
    Base.metadata,
    Column("doctor_id", String(36), ForeignKey("users.id"), primary_key=True),
    Column("specialization_id", String(36), ForeignKey("specializations.id"), primary_key=True),
)


class ClinicSettings(Base):
    """The single clinic-wide settings row (a singleton, keyed by a fixed id).

    The clinic timezone defaults to ``UTC`` with ``timezone_confirmed=False``
    until an administrator saves settings; all date math (slot generation,
    elapsed-slot filtering, cutoff, "today") resolves in this configured IANA
    timezone. ``booking_cutoff_hours`` is exposed here; cutoff enforcement
    itself lives in the appointments surface.
    """

    __tablename__ = "clinic_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    booking_cutoff_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)
    timezone_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


APPOINTMENT_STATUSES = ("booked", "confirmed", "completed", "cancelled")


class Appointment(Base):
    """A booked slot. History is preserved: deactivating a doctor never deletes,
    cancels or hides their appointments (NFR-026). No payment field exists
    anywhere on this record (NFR-013)."""

    __tablename__ = "appointments"
    # Unique per doctor+slot for live rows only, so a cancelled slot can be
    # re-booked while a booked/confirmed one cannot be double-booked.
    __table_args__ = (
        Index(
            "uq_appointment_doctor_slot",
            "doctor_id",
            "slot_start",
            unique=True,
            sqlite_where=text("status <> 'cancelled'"),
            postgresql_where=text("status <> 'cancelled'"),
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    slot_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(*APPOINTMENT_STATUSES, name="appointment_status"),
        nullable=False,
        default="booked",
    )
    # Optional free-text visit reason the patient gives when booking (US-017-T3).
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cancelled_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class DoctorWeeklyAvailability(Base):
    """One doctor's working pattern for one weekday (0=Monday..6=Sunday).

    Times are stored as local clinic wall-clock ``HH:MM`` strings; the clinic
    timezone itself lives in ``ClinicSettings``.
    """

    __tablename__ = "doctor_weekly_availability"
    __table_args__ = (Index("uq_doctor_weekday", "doctor_id", "weekday", unique=True),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    is_working: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    slot_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    breaks: Mapped[list["AvailabilityBreak"]] = relationship(
        back_populates="day", cascade="all, delete-orphan", lazy="selectin"
    )


class AvailabilityBreak(Base):
    """A non-bookable period inside one weekday's working hours."""

    __tablename__ = "availability_breaks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    availability_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("doctor_weekly_availability.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)

    day: Mapped["DoctorWeeklyAvailability"] = relationship(back_populates="breaks")


AVAILABILITY_EXCEPTION_KINDS = ("unavailable", "extra_hours")


class DoctorAvailabilityException(Base):
    """A one-off override of the weekly pattern for a single date.

    ``kind='unavailable'`` withdraws the whole date, or the ``start_time``..
    ``end_time`` range inside it; ``kind='extra_hours'`` adds a bookable window
    on that date. Times are clinic-local ``HH:MM`` strings, like the weekly
    pattern.
    """

    __tablename__ = "doctor_availability_exceptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid4)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    # Only a hash of the raw opaque token: the token itself is returned once at
    # issuance and cannot be recovered from the database afterwards.
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped["User"] = relationship(back_populates="sessions")


__all__ = [
    "Base",
    "User",
    "Session",
    "Specialization",
    "CatalogTerm",
    "ClinicSettings",
    "Appointment",
    "APPOINTMENT_STATUSES",
    "DoctorWeeklyAvailability",
    "AvailabilityBreak",
    "DoctorAvailabilityException",
    "AVAILABILITY_EXCEPTION_KINDS",
    "term_specializations",
    "doctor_specializations",
    "ROLES",
]
