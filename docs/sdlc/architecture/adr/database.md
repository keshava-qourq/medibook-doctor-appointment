<!-- sdlc:auto:start adr -->
# ADR-0003: Use PostgreSQL 16 for Database

Status: Accepted  
Date: 2026-11-13

## Context and Problem Statement

Which Database technology does the project use? Decided in architecture v1.

## Considered Options

- PostgreSQL 16
- MySQL 8
- SQLite
- MongoDB

## Decision Outcome

Chosen option: PostgreSQL 16, because The no-double-booking promise is a partial unique index on (doctor_id, slot_start) where the status is not cancelled, enforced by the engine inside the booking transaction rather than by application code. The same engine handles the disease-to-specialization mapping as a join table, the append-only audit log as an insert-only table, the catalogue suggestions as case-insensitive text matching with citext and trigram indexes, and timestamptz arithmetic in the clinic timezone. No separate search service is needed because the catalogue is a few thousand rows matched by plain SQL.

## Consequences

Partial unique indexes make cancellation free a slot instantly but mean the cancelled-status predicate must be identical in every query that treats a slot as taken. Transaction-level conflict handling requires the API to translate a unique-violation into a user-facing message rather than retry blindly.
<!-- sdlc:auto:end adr -->