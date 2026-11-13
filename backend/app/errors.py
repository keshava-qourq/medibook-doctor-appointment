"""Exceptions whose HTTP response carries no JSON body.

The behaviour rules require a 403 that cannot be told apart from "this id
does not exist" to have an empty body, not FastAPI's default `{"detail": ...}`
shape. `main.py` registers the exception handler below for this type.
"""


class EmptyBodyHTTPError(Exception):
    """Raise to produce a response with `status_code` and no body at all."""

    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


__all__ = ["EmptyBodyHTTPError"]
