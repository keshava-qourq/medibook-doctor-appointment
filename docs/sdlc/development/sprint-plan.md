# Sprint Plan

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start sprints -->
## Sprint 1: Sprint 1

Working authentication for all three roles: patients self-register, staff accounts are issued by an administrator, and every request is authorised by role and record ownership.

Capacity: 20 points · Committed: 18

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-001 | Story | Patient self-registration with email and password | 5 | backend-agent | — |
| US-002 | Story | Sign in, sign out and session expiry | 5 | backend-agent | US-001 |
| US-003 | Story | Administrator creates doctor and administrator accounts | 3 | backend-agent | US-002 |
| US-004 | Story | Role-based access enforcement across every screen and API call | 5 | security-agent | US-002 |

## Sprint 2: Sprint 2

Clinic configuration foundations: patient profile self-service, specializations, timezone and cutoff settings, the disease mapping catalogue, and deployed encryption safeguards.

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-005 | Story | Patient manages their own profile | 3 | backend-agent | US-002, US-004 |
| US-006 | Story | Manage the clinic's specializations | 3 | backend-agent | US-004 |
| US-008 | Story | Configure clinic timezone and booking cutoff | 3 | backend-agent | US-004 |
| US-010 | Story | Administrator edits the disease-to-specialization mapping | 5 | backend-agent | US-006 |
| US-031 | Story | Health data protected in transit and at rest | 5 | devops-agent | US-002 |

## Sprint 3: Sprint 3

A patient can find the right doctor: doctor profiles with fees, a seeded catalogue, deterministic term-to-specialization search and a filterable directory, all shown in the clinic timezone.

Capacity: 20 points · Committed: 16

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-007 | Story | Create and maintain doctor profiles | 5 | backend-agent | US-003, US-006 |
| US-009 | Story | Seeded disease and symptom catalogue available at launch | 3 | backend-agent | US-010 |
| US-011 | Story | Patient searches by disease, symptom or specialization | 5 | backend-agent | US-007, US-010 |
| US-012 | Story | Doctor directory results with specialization and consultation fee | 3 | frontend-agent | US-011 |

## Sprint 4: Sprint 4

Doctors can describe when they actually consult: weekly recurring pattern with breaks, plus one-off leave and extra-hours exceptions.

Capacity: 20 points · Committed: 15

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-013 | Story | Doctor defines a weekly recurring availability pattern | 8 | backend-agent | US-007, US-008 |
| ↳ US-013-T1 | Task | Add weekly availability and break tables with migration | — | backend-agent | — |
| ↳ US-013-T2 | Task | Implement weekly pattern validation rules in the booking domain module | — | backend-agent | — |
| ↳ US-013-T3 | Task | Implement GET and PUT /api/doctors/me/weekly-availability | — | backend-agent | — |
| ↳ US-013-T4 | Task | Build the week-view availability editor screen | — | frontend-agent | — |
| US-014 | Story | Doctor records one-off availability exceptions | 5 | backend-agent | US-013 |
| US-030 | Story | Single language and single clinic timezone throughout | 2 | frontend-agent | US-008 |

## Sprint 5: Sprint 5

Slots exist and can be booked exactly once: deterministic slot generation, freshly refreshed availability, and the transactional booking endpoint.

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-015 | Story | System generates discrete bookable slots that hold exactly one patient | 8 | backend-agent | US-013, US-014 |
| ↳ US-015-T1 | Task | Implement the slot generation function in the booking domain module | — | backend-agent | — |
| ↳ US-015-T2 | Task | Overlay booked appointments onto generated slots | — | backend-agent | — |
| ↳ US-015-T3 | Task | Expose GET /api/doctors/{doctor_id}/availability | — | backend-agent | — |
| ↳ US-015-T4 | Task | Add a slot generation test suite covering boundary cases | — | qa-agent | — |
| US-016 | Story | Patient views freshly refreshed slot availability | 3 | frontend-agent | US-015 |
| US-017 | Story | Patient books an appointment slot that can never be double-booked | 8 | backend-agent | US-015 |
| ↳ US-017-T1 | Task | Add appointments table with a unique constraint on doctor and slot start | — | backend-agent | — |
| ↳ US-017-T2 | Task | Implement the transactional booking operation | — | backend-agent | — |
| ↳ US-017-T3 | Task | Implement POST /api/appointments with duplicate detection | — | backend-agent | — |
| ↳ US-017-T4 | Task | Build the slot selection and booking confirmation screens | — | frontend-agent | — |

## Sprint 6: Sprint 6

The full appointment lifecycle for patients plus the doctor's own schedule: race handling, reschedule, cancel, and both appointment lists.

Capacity: 20 points · Committed: 17

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-018 | Story | Clear 'slot just taken' message when two patients race for a slot | 3 | qa-agent | US-017 |
| US-019 | Story | Patient reschedules an appointment before the cutoff | 5 | backend-agent | US-008, US-017 |
| US-020 | Story | Patient cancels an appointment before the cutoff and the slot is freed | 3 | backend-agent | US-008, US-017 |
| US-021 | Story | Patient views their upcoming and past appointments | 3 | frontend-agent | US-017, US-020 |
| US-022 | Story | Doctor views their upcoming and past appointments | 3 | frontend-agent | US-017, US-004 |

## Sprint 7: Sprint 7

Clinical documentation: doctors move appointments through their statuses and record notes, diagnosis, advice and structured prescriptions, visible only to the patient and treating doctor.

Capacity: 20 points · Committed: 16

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-023 | Story | Doctor updates appointment status through the lifecycle | 5 | backend-agent | US-022 |
| US-024 | Story | Doctor records consultation notes, diagnosis and advice | 5 | backend-agent | US-023 |
| US-025 | Story | Doctor records a structured prescription | 3 | backend-agent | US-024 |
| US-027 | Story | Clinical content restricted to the patient and the treating doctor | 3 | security-agent | US-004, US-024 |

## Sprint 8: Sprint 8

Handover-ready: append-only audit log, patient printable consultation history, responsive behaviour verified across viewports, and setup/usage documentation.

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-026 | Story | Patient views and prints their own consultation history | 5 | frontend-agent | US-024, US-025 |
| US-028 | Story | Audit log of access to consultation records | 5 | backend-agent | US-024, US-027 |
| US-029 | Story | Responsive web application usable on mobile browsers | 5 | frontend-agent | US-021, US-022, US-025 |
| US-032 | Story | Setup and usage documentation for clinic staff | 5 | devops-agent | US-026, US-029, US-031 |

## Unscheduled

_Nothing unscheduled._
<!-- sdlc:auto:end sprints -->
