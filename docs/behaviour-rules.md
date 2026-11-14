# Behaviour rules

How this app behaves where the requirements and the API contract do not say. QA's
tests and the code both follow these rules. The platform keeps this file: the first
rules come from the contract and the code, and each later rule from a decision made
when a test and the code disagreed.

- Login returns an opaque session token in the JSON body and clients send it as `Authorization: Bearer <token>`; no cookie is ever set and the API reads credentials only from that header.
- The server stores only a hash of the session token, so the raw token is shown once in the login/register response and cannot be retrieved again.
- A new sign-in opens an additional session and does not revoke the user's existing sessions, so the same account may hold several concurrent valid tokens.
- A session expires after `session_idle_minutes` (default 30) of inactivity measured from `last_seen_at`, and every authenticated request updates `last_seen_at` to slide that idle window forward until `expires_at`.
- Logout revokes only the caller's current token (setting `revoked_at`/`revoked_reason`) and leaves that user's other sessions working.
- Any request with a missing, malformed, expired or revoked token returns 401 with body `{"detail": ...}` and no `WWW-Authenticate` challenge beyond the default.
- A request for a resource that exists but belongs to another user, and a request for an id that does not exist where existence would leak information, both return 403 with an empty body so the two cases cannot be told apart.
- A missing id on admin-scoped endpoints that already distinguish 404 (e.g. `/api/admin/users/{user_id}`) returns 404 with an empty body, while clinical resources use the 403 empty-body form instead.
- Invalid input returns 422 with a body listing each offending field and a message, keyed by field name, and nothing is written when any field is invalid.
- Uniqueness conflicts return 409 with a stable machine-readable code string (e.g. `email_in_use`, `duplicate_name`, `slot_taken`) and no row is written.
- List endpoints accept `limit` (default 20, maximum 100) and `offset` (default 0) query parameters and always return `{items, total}` where `total` is the unpaged count.
- Appointment lists order upcoming items by `slot_start` ascending and past items by `slot_start` descending; consultation and audit-log lists order by timestamp descending (most recent first).
- All instant fields are serialized as ISO 8601 with an explicit offset, and all slot/schedule times are rendered in the single clinic timezone and never converted to the device timezone.
- The clinic timezone defaults to `UTC` with `timezone_confirmed=false` until an administrator saves settings, and all date math (slot generation, elapsed-slot filtering, cutoff and "today") resolves in that configured IANA timezone.
- "Today" and a slot being elapsed are judged against the current wall-clock time in the clinic timezone, so a slot whose start is at or before now is excluded from availability.
- Booking, rescheduling and patient cancellation are refused when the slot start is within `booking_cutoff_hours` of the current clinic-timezone time, returning 403 `cutoff_passed`.
- All primary keys are UUID version 4 strings, and an unparseable id is treated as not found/forbidden rather than returning 422.
- Email, specialization name and catalogue term are compared case-insensitively and stored as given (citext), so `A@x.com` and `a@x.com` collide as a duplicate.
- Passwords are hashed with bcrypt using a per-user salt, are never returned in any read endpoint, and a new password shorter than 8 characters is rejected as `weak_password`.
- Deactivating an account and issuing an administrator password reset both immediately revoke every session that account holds, forcing the user back to sign-in on their next request.
- Login returns a role-specific `landing` path (patient `/search`, doctor their schedule, admin the admin dashboard) and route guards send an unauthenticated or wrong-role visitor to sign-in.
- Deleting a specialization or catalogue term that is still referenced is refused with 409 and reference counts, while soft-deleted catalogue terms stop resolving in search and suggest but leave existing appointments untouched.
- Tests create every user and all data only through the API (patients via `/api/auth/register`, doctors and admins via `/api/admin/users`), never by writing the database directly.
- Each test generates its own unique email addresses and records so no two tests share state or collide on a unique constraint.
- The `/api/catalog/suggest` endpoint returns an empty list for a query shorter than two characters and matches stored terms by deterministic case-insensitive substring, with no fuzzy or ML ranking.
- When a criterion is a pure infrastructure/provisioning NFR that no application-level test can observe (backups/PITR, capacity sizing), it belongs to environment: the fix is enabling managed-DB backups/PITR and declaring sizing in deployment config (e.g. docker-compose.yml / IaC), and the e2e KNOWN-LIMIT skips are the appropriate, correct placeholder rather than a code or test defect. (decided in U
- Per the packet's contract rule, infrastructure-only NFRs (backups/PITR, sizing) belong to environment and are satisfied in deployment config (docker-compose.yml / IaC) with e2e KNOWN-LIMIT skips as the correct placeholder, not by code or test changes. (decided in US-005)
- The failing check is lint-only and the over-long lines sit in a QA-owned test file's docstring; the fix is to reflow those lines in that file, so QA owns it (backend cannot edit the test file). (decided in US-006)
- The e2e harness must provision a fresh/ephemeral database per run (e.g. a unique DATABASE_URL or deleting ./app.db before uvicorn starts in the Playwright webServer command); the test's "count a unique email via the 100-row list" is valid only against a clean DB, which the contract's unique-records/no-shared-state rule assumes, and the paginated endpoint (max 100 by NFR-017 scale) is correct, so n
- The behaviour-rule contract ("List endpoints ... always return {items, total}") outranks a test's exact-equality assertion, so the response shape with `total` stays and the stale assertion must be relaxed to check only that `items` is empty; because `backend/tests/unit/` is in the backend agent's editable scope (QA owns only integration/e2e), the backend agent must make that edit. (decided in US-0
- The cutoff rule and 24h default are contract/settings-correct, so the test is the defect for reusing a boundary value the cutoff makes unbookable; since backend/tests/unit/ is in the backend agent's editable scope (qa owns only integration/e2e), backend must change the test to book beyond the cutoff (e.g. 48 and 72 hours). (decided in US-017)
