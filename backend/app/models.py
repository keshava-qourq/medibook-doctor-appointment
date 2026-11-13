"""SQLAlchemy models: the auth core every endpoint depends on.

`User` holds the account and its bcrypt hash; `Session` holds only a hash of
the opaque bearer token issued at login, never the raw token.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
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
    role: Mapped[str] = mapped_column(Enum(*ROLES, name="user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Bcrypt hash only; no plain-text or reversible password is ever stored (NFR-001).
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


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


__all__ = ["Base", "User", "Session", "ROLES"]
