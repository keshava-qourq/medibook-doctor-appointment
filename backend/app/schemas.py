"""Pydantic request and response models.

One pair per entity in the approved data model.
"""

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
