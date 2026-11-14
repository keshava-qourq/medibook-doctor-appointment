"""Cheap password hashing in tests. The live app keeps its strong settings.

bcrypt is slow on purpose, and the tests create many users, so they pay that cost
hundreds of times: a suite that takes a minute takes a few seconds with the cheapest
cost (4 rounds). The hashes are still real bcrypt hashes, so a test that checks for
one still passes. pytest loads this file before the tests import the app, and nothing
outside pytest loads it.
"""

try:
    import bcrypt
except ImportError:  # the app does not hash with bcrypt
    bcrypt = None

if bcrypt is not None:
    _gensalt = bcrypt.gensalt

    def _cheap_gensalt(rounds: int = 4, prefix: bytes = b"2b") -> bytes:
        return _gensalt(4, prefix)

    bcrypt.gensalt = _cheap_gensalt

try:
    from passlib.handlers.bcrypt import bcrypt as _passlib_bcrypt
except ImportError:  # the app does not hash with passlib
    _passlib_bcrypt = None

if _passlib_bcrypt is not None:
    _passlib_bcrypt.default_rounds = 4
