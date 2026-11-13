<!-- sdlc:auto:start adr -->
# ADR-0002: Use FastAPI 0.115 for Backend

Status: Accepted  
Date: 2026-11-13

## Context and Problem Statement

Which Backend technology does the project use? Decided in architecture v1.

## Considered Options

- FastAPI 0.115
- Django REST Framework
- Express
- Spring Boot

## Decision Outcome

Chosen option: FastAPI 0.115, because Gives one clean place for the three rules the product rests on: the booking transaction that lets the database refuse a second insert and returns slot_taken to the loser, the role-plus-ownership dependency that keeps clinical notes away from administrators and other doctors, and the audit write on every consultation view. Pydantic request models produce the per-field inline validation errors the forms need, and slot generation from weekly patterns and exceptions is plain Python over the clinic timezone.

## Consequences

A modular monolith plus one worker, not services, which is right at 10-50 doctors but means the booking path and the admin console scale together. Async endpoints require care that no blocking call sneaks into a request handler.
<!-- sdlc:auto:end adr -->