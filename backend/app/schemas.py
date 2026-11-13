"""Pydantic request and response models.

One pair per entity in the approved data model, plus the placeholder every
generated route returns until it has been implemented.
"""

from pydantic import AliasChoices, BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("full_name")
    @classmethod
    def _full_name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("required")
        return v

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


class StubResponse(BaseModel):
    """What a generated route returns until someone implements it.

    A stub that returns a typed body rather than raising keeps the service
    startable and its OpenAPI document complete, so the frontend can be built
    against the agreed shape while the handlers are still being written.
    """

    endpoint: str
    status: str = "not_implemented"
    detail: str = "Scaffolded from the approved API spec; no behaviour yet."


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
