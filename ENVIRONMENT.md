# ENVIRONMENT

Written by Dex. Do not edit: Dex rewrites this file whenever the project's service list changes.

How this project's code reaches its backing services. Every connection setting is an environment variable named below. The sandbox provides the values (the deployment does in production); never write a value into code, tests, config files or this repository.

Check every connection from the app's own code:

```sh
backend/.venv/bin/python backend/scripts/check_connections.py
```

## PostgreSQL

The app's relational database.

| Variable | Holds |
|---|---|
| `DATABASE_URL` | SQLAlchemy URL of the database, password included |

```python
import os

from sqlalchemy import create_engine, text

engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
```

Tests use the real PostgreSQL the sandbox runs (same `DATABASE_URL`); no mocks, no SQLite stand-in.

## Redis

Cache and/or queue broker.

| Variable | Holds |
|---|---|
| `REDIS_URL` | redis:// URL of the server, including the database number |

```python
import os

import redis

client = redis.from_url(os.environ["REDIS_URL"])
client.set("greeting", "hello", ex=60)
```

Tests use the real Redis the sandbox runs (same `REDIS_URL`); no mocks.
