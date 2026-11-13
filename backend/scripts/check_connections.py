"""Connection check, written by Dex. Do not edit: Dex rewrites it when the service list changes.

Connects to every backing service this app is configured for, reading the settings the way
the app does (its own settings module when it has one, else the environment), and prints
one JSON line per service: {"service": ..., "ok": true|false, "detail": "..."}.
It never prints a setting's value. It always exits 0: the result is in the lines.

Run it from the repository root: backend/.venv/bin/python backend/scripts/check_connections.py
"""

import contextlib
import importlib
import importlib.util
import io
import json
import os
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SERVICES = ["postgres", "redis"]

TIMEOUT = 5.0
BACKEND = Path(__file__).resolve().parent.parent
SETTINGS_MODULES = ("app.config", "app.settings", "app.core.config", "app.core.settings")
VECTOR_SQL = "SELECT 1 FROM pg_extension WHERE extname = 'vector'"


def load_settings():
    """The app's own settings object, if it has one; None otherwise."""
    sys.path.insert(0, str(BACKEND))
    for name in SETTINGS_MODULES:
        try:
            quiet = io.StringIO()
            with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
                module = importlib.import_module(name)
                found = getattr(module, "settings", None)
                if found is None and callable(getattr(module, "get_settings", None)):
                    found = module.get_settings()
        except KeyboardInterrupt:
            raise
        except BaseException:  # noqa: BLE001 -- optional; even a sys.exit() falls back to env
            continue
        if found is not None:
            return found
    return None


SETTINGS = None


def setting(name):
    """A setting's value: the app's settings first (NAME or name), then the environment."""
    if SETTINGS is not None:
        for attr in (name, name.lower()):
            value = getattr(SETTINGS, attr, None)
            if value is not None and hasattr(value, "get_secret_value"):
                value = value.get_secret_value()
            if value is not None and str(value):
                return str(value)
    return os.environ.get(name, "")


def failure(exc):
    # The class name only: an exception's text can hold a host, a URL or a password.
    return False, "could not connect (" + type(exc).__name__ + ")"


def sync_url(url):
    """``url`` with an async driver swapped for an installed sync one; "" when none is."""
    scheme, sep, rest = url.partition("://")
    if "+asyncpg" not in scheme:
        return url
    for driver in ("psycopg", "psycopg2"):
        if importlib.util.find_spec(driver) is not None:
            return scheme.replace("+asyncpg", "+" + driver) + sep + rest
    return ""


def check_database(vector):
    url = setting("DATABASE_URL")
    if not url:
        return False, "DATABASE_URL is not set"
    if url.startswith("sqlite"):
        return False, "DATABASE_URL points at SQLite, not the sandbox Postgres"
    url = sync_url(url)
    if not url:
        return False, "DATABASE_URL uses an async driver; the check needs a sync URL"
    try:
        import sqlalchemy
        import sqlalchemy.exc
        from sqlalchemy.pool import NullPool
    except ImportError:
        sqlalchemy = None
    if sqlalchemy is not None:
        try:
            engine = sqlalchemy.create_engine(
                url, poolclass=NullPool, connect_args={"connect_timeout": int(TIMEOUT)}
            )
        except (ImportError, sqlalchemy.exc.NoSuchModuleError):
            return False, "the database driver DATABASE_URL names is not installed in the app"
        try:
            with engine.connect() as conn:
                conn.execute(sqlalchemy.text("SELECT 1"))
                has_vector = conn.execute(sqlalchemy.text(VECTOR_SQL)).scalar() if vector else 1
        finally:
            engine.dispose()
    else:
        dsn = "postgresql://" + url.split("://", 1)[-1]
        try:
            import psycopg as driver
        except ImportError:
            try:
                import psycopg2 as driver
            except ImportError:
                return False, "no Postgres client library is installed in the app"
        conn = driver.connect(dsn, connect_timeout=int(TIMEOUT))
        try:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
            has_vector = 1
            if vector:
                cur.execute(VECTOR_SQL)
                has_vector = cur.fetchone()
        finally:
            conn.close()
    if not has_vector:
        return False, "connected, but the vector extension is not installed"
    if vector:
        return True, "SELECT 1 answered; vector extension present"
    return True, "SELECT 1 answered"


def resp(*parts):
    out = b"*" + str(len(parts)).encode() + b"\r\n"
    for part in parts:
        data = part.encode()
        out += b"$" + str(len(data)).encode() + b"\r\n" + data + b"\r\n"
    return out


def redis_line(sock):
    data = b""
    while not data.endswith(b"\r\n"):
        chunk = sock.recv(1)
        if not chunk:
            break
        data += chunk
    return data.decode("utf-8", "replace")


def redis_refusal(line):
    if line.startswith("-NOAUTH"):
        return False, "Redis needs a password the settings do not give"
    if line.startswith("-WRONGPASS") or "invalid password" in line:
        return False, "Redis refused the password"
    return False, "Redis did not answer PING"


def check_redis():
    url = setting("REDIS_URL")
    if not url:
        return False, "REDIS_URL is not set"
    try:
        import redis
    except ImportError:
        redis = None
    if redis is not None:
        client = redis.from_url(url, socket_connect_timeout=TIMEOUT, socket_timeout=TIMEOUT)
        try:
            client.ping()
        except (redis.exceptions.AuthenticationError, redis.exceptions.ResponseError) as exc:
            if "NOAUTH" in str(exc) or "Authentication required" in str(exc):
                return False, "Redis needs a password the settings do not give"
            if isinstance(exc, redis.exceptions.AuthenticationError):
                return False, "Redis refused the password"
            raise
        finally:
            client.close()
        return True, "PING answered"
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ("redis", "rediss"):
        return False, "REDIS_URL is not a redis:// URL"
    sock = socket.create_connection((parts.hostname or "localhost", parts.port or 6379), TIMEOUT)
    try:
        sock.settimeout(TIMEOUT)
        if parts.scheme == "rediss":
            sock = ssl.create_default_context().wrap_socket(sock, server_hostname=parts.hostname)
        if parts.password:
            user = urllib.parse.unquote(parts.username or "")
            secret = urllib.parse.unquote(parts.password)
            sock.sendall(resp("AUTH", user, secret) if user else resp("AUTH", secret))
            answer = redis_line(sock)
            if not answer.startswith("+"):
                return redis_refusal(answer)
        sock.sendall(resp("PING"))
        answer = redis_line(sock)
    finally:
        sock.close()
    if answer.startswith("+PONG"):
        return True, "PING answered"
    return redis_refusal(answer)


def http_get(url, headers):
    # No proxy: the sandbox's services are on its own network, not behind the egress proxy.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    request = urllib.request.Request(url, headers=headers)
    try:
        with opener.open(request, timeout=TIMEOUT) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, b""


def check_meilisearch():
    url = setting("MEILI_URL")
    if not url:
        return False, "MEILI_URL is not set"
    if urllib.parse.urlsplit(url).scheme not in ("http", "https"):
        return False, "MEILI_URL is not an http(s) URL"
    key = setting("MEILI_MASTER_KEY")
    if not key:
        return False, "MEILI_MASTER_KEY is not set"
    base = url.rstrip("/")
    status, body = http_get(base + "/health", {})
    if status != 200 or b"available" not in body:
        return False, "Meilisearch is not healthy"
    status, _ = http_get(base + "/version", {"Authorization": "Bearer " + key})
    if status in (401, 403):
        return False, "Meilisearch refused the master key"
    if status != 200:
        return False, "Meilisearch did not answer"
    return True, "health answered; key accepted"


def check_bucket(needs_endpoint):
    bucket = setting("S3_BUCKET")
    if not bucket:
        return False, "S3_BUCKET is not set"
    endpoint = setting("S3_ENDPOINT_URL") or None
    if needs_endpoint and not endpoint:
        return False, "S3_ENDPOINT_URL is not set"
    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import ClientError, NoCredentialsError
    except ImportError:
        return False, "boto3 is not installed in the app"
    keys = {}
    for name, arg in (
        ("AWS_ACCESS_KEY_ID", "aws_access_key_id"),
        ("AWS_SECRET_ACCESS_KEY", "aws_secret_access_key"),
        ("AWS_SESSION_TOKEN", "aws_session_token"),
    ):
        value = setting(name)
        if value:
            keys[arg] = value
    config = Config(
        connect_timeout=TIMEOUT,
        read_timeout=TIMEOUT,
        retries={"max_attempts": 1},
        s3={"addressing_style": "path"} if endpoint else {},
    )
    client = boto3.client(
        "s3",
        region_name=setting("AWS_REGION") or None,
        endpoint_url=endpoint,
        config=config,
        **keys,
    )
    try:
        client.head_bucket(Bucket=bucket)
    except NoCredentialsError:
        return False, "no AWS credentials found"
    except ClientError as exc:
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code in ("403", "AccessDenied", "Forbidden"):
            return False, "access to the bucket was refused"
        if code in ("404", "NoSuchBucket", "NotFound"):
            return False, "the bucket does not exist"
        return failure(exc)
    return True, "bucket reachable"


CHECKS = {
    "postgres": lambda: check_database(vector=False),
    "pgvector": lambda: check_database(vector=True),
    "redis": check_redis,
    "meilisearch": check_meilisearch,
    "minio": lambda: check_bucket(needs_endpoint=True),
    "s3": lambda: check_bucket(needs_endpoint=False),
}


def main():
    global SETTINGS
    SETTINGS = load_settings()
    for name in SERVICES:
        try:
            ok, detail = CHECKS[name]()
        except KeyboardInterrupt:
            raise
        except BaseException as exc:  # noqa: BLE001 -- every failure is one line, never a crash
            ok, detail = failure(exc)
        print(json.dumps({"service": name, "ok": bool(ok), "detail": detail}), flush=True)


if __name__ == "__main__":
    main()
    sys.exit(0)
