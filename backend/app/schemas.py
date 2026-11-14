"""Pydantic request and response models.

One pair per entity in the approved data model.
"""

from datetime import date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from email_validator import EmailNotValidError, validate_email
from pydantic import AliasChoices, BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str

    @field_validator("full_name")
    @classmethod
    def _full_name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("required")
        return v

    @field_validator("email")
    @classmethod
    def _email_valid(cls, v: str) -> str:
        # test_environment=True so reserved domains (e.g. example.test used by the
        # e2e suite) validate; check_deliverability stays off for offline runs.
        try:
            return validate_email(v, check_deliverability=False, test_environment=True).normalized
        except EmailNotValidError as exc:
            raise ValueError("invalid_email") from exc

    @field_validator("phone")
    @classmethod
    def _phone_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("required")
        return v

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("weak_password")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class AdminUserCreate(BaseModel):
    full_name: str
    email: str
    role: str
    # The API contract (and the e2e client) send this as `initial_password`;
    # `password` is accepted too for backward compatibility.
    password: str = Field(validation_alias=AliasChoices("password", "initial_password"))


class AdminUserOut(BaseModel):
    """A user as a read endpoint returns it: never any password field."""

    id: str
    full_name: str
    email: str
    role: str
    is_active: bool


class AdminUserCreateOut(AdminUserOut):
    """Creation only: the initial password is echoed once for hand-off."""

    initial_password: str


class AdminUserListOut(BaseModel):
    items: list[AdminUserOut]
    total: int


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    full_name: str | None = None


class AdminPasswordReset(BaseModel):
    # The API contract (and the e2e client) send this as `new_password`;
    # `password` is accepted too for backward compatibility.
    password: str = Field(validation_alias=AliasChoices("password", "new_password"))


class SpecializationOut(BaseModel):
    """A specialization as the read/write endpoints return it."""

    id: str
    name: str
    description: str | None = None
    is_active: bool


class SpecializationListOut(BaseModel):
    items: list[SpecializationOut]
    total: int


class SpecializationCreate(BaseModel):
    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def _name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("required")
        return v


class SpecializationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("required")
        return v


class CatalogTermSpecOut(BaseModel):
    """A specialization as it appears nested inside a catalogue term."""

    id: str
    name: str
    is_active: bool


class CatalogTermOut(BaseModel):
    id: str
    term: str
    # `entry_type` is the stored column; `kind` is the contract's name for the same
    # value. Both are returned so old and new clients agree.
    entry_type: str
    kind: str
    specialization_ids: list[str]
    is_seeded: bool
    specializations: list[CatalogTermSpecOut]


class CatalogTermListOut(BaseModel):
    items: list[CatalogTermOut]
    total: int


_CATALOG_KINDS = ("disease", "symptom")


class CatalogTermCreate(BaseModel):
    term: str
    # The contract sends the type as `kind`; `entry_type` is accepted for
    # backward compatibility with earlier callers/tests.
    entry_type: str = Field(validation_alias=AliasChoices("kind", "entry_type"))
    specialization_ids: list[str]

    @field_validator("term")
    @classmethod
    def _term_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("required")
        return v

    @field_validator("entry_type")
    @classmethod
    def _kind_valid(cls, v: str) -> str:
        if v not in _CATALOG_KINDS:
            raise ValueError("invalid_kind")
        return v

    @field_validator("specialization_ids")
    @classmethod
    def _at_least_one_spec(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("at least one required")
        return v


class CatalogTermUpdate(BaseModel):
    term: str | None = None
    entry_type: str | None = Field(
        default=None, validation_alias=AliasChoices("kind", "entry_type")
    )
    specialization_ids: list[str] | None = None

    @field_validator("term")
    @classmethod
    def _term_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("required")
        return v

    @field_validator("entry_type")
    @classmethod
    def _kind_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in _CATALOG_KINDS:
            raise ValueError("invalid_kind")
        return v

    @field_validator("specialization_ids")
    @classmethod
    def _at_least_one_spec(cls, v: list[str] | None) -> list[str] | None:
        if v is not None and not v:
            raise ValueError("at least one required")
        return v


class CatalogSuggestItem(BaseModel):
    term: str
    kind: str


class CatalogSuggestOut(BaseModel):
    items: list[CatalogSuggestItem]


class PatientProfileOut(BaseModel):
    """A patient's own profile as the self-service endpoints return it."""

    id: str
    full_name: str
    email: str
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None


class PatientProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None

    @field_validator("full_name")
    @classmethod
    def _full_name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("required")
        return v


class PatientPasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("weak_password")
        return v


class ClinicSettingsOut(BaseModel):
    """Clinic-wide settings as GET /api/settings returns them."""

    timezone: str
    booking_cutoff_hours: int
    timezone_confirmed: bool


class ClinicSettingsUpdate(BaseModel):
    timezone: str
    # `strict` rejects a non-numeric or float cutoff with 422 rather than
    # silently coercing it; a negative value is rejected by the validator below.
    booking_cutoff_hours: int = Field(strict=True)

    @field_validator("timezone")
    @classmethod
    def _timezone_known(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("required")
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("unknown_timezone") from exc
        return v

    @field_validator("booking_cutoff_hours")
    @classmethod
    def _cutoff_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("must_be_non_negative")
        return v
