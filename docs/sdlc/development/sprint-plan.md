# Sprint Plan

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start sprints -->
## Sprint 1: Sprint 1

Delivered: user accounts, administrator-created staff accounts and role/ownership enforcement across the API

Capacity: 20 points · Committed: 13

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-001 | Story | Patient self-registration with email and password | 5 | backend-agent | — |
| US-003 | Story | Administrator creates doctor and administrator accounts | 3 | backend-agent | US-001 |
| US-004 | Story | Role-based access enforcement across every screen and API call | 5 | security-agent | US-001, US-003 |

## Sprint 2: Sprint 2

Delivered: specializations, disease mapping catalogue admin, clinic settings and the encryption/hosting baseline

Capacity: 20 points · Committed: 16

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-006 | Story | Manage the clinic's specializations | 3 | backend-agent | US-004 |
| US-008 | Story | Configure clinic timezone and booking cutoff | 3 | backend-agent | US-004 |
| US-010 | Story | Administrator edits the disease-to-specialization mapping | 5 | backend-agent | US-006 |
| US-031 | Story | Health data protected in transit and at rest | 5 | devops-agent | — |

## Sprint 3: Sprint 3

Sign-in sessions and patient profile, seeded catalogue, and patient-facing doctor search with results

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-002 | Story | Sign in, sign out and session expiry | 5 | backend-agent | US-001, US-003 |
| US-005 | Story | Patient manages their own profile | 3 | backend-agent | US-001, US-002 |
| US-009 | Story | Seeded disease and symptom catalogue available at launch | 3 | backend-agent | US-006, US-010 |
| US-011 | Story | Patient searches by disease, symptom or specialization | 5 | backend-agent | US-009, US-010 |
| US-012 | Story | Doctor directory results with specialization and consultation fee | 3 | frontend-agent | US-011 |

## Sprint 4: Sprint 4

Doctor profiles patients can see, doctor weekly availability and exceptions, and one labelled clinic timezone everywhere

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-007 | Story | Create and maintain doctor profiles | 5 | backend-agent | US-003, US-006 |
| US-013 | Story | Doctor defines a weekly recurring availability pattern | 8 | backend-agent | US-003, US-008 |
| ↳ US-013-T1 | Task | Add weekly availability and break tables | — | backend-agent | — |
| ↳ US-013-T2 | Task | Implement pattern validation rules | — | backend-agent | — |
| ↳ US-013-T3 | Task | Implement get/put weekly availability endpoints | — | backend-agent | — |
| ↳ US-013-T4 | Task | Build the week-view availability editor | — | frontend-agent | — |
| US-014 | Story | Doctor records one-off availability exceptions | 5 | backend-agent | US-013 |
| US-030 | Story | Single language and single clinic timezone throughout | 2 | frontend-agent | US-008 |

## Sprint 5: Sprint 5

Bookable slots generated from availability, freshly refreshed on screen, and a booking that can never double-book

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-015 | Story | System generates discrete bookable slots that hold exactly one patient | 8 | backend-agent | US-013, US-014 |
| ↳ US-015-T1 | Task | Implement slot expansion from the weekly pattern | — | backend-agent | — |
| ↳ US-015-T2 | Task | Apply exceptions and clinic-time cutoff to generated slots | — | backend-agent | — |
| ↳ US-015-T3 | Task | Expose the availability endpoint with booked-slot marking | — | backend-agent | — |
| ↳ US-015-T4 | Task | Add a slot generation test suite | — | qa-agent | — |
| US-016 | Story | Patient views freshly refreshed slot availability | 3 | frontend-agent | US-015 |
| US-017 | Story | Patient books an appointment slot that can never be double-booked | 8 | backend-agent | US-015 |
| ↳ US-017-T1 | Task | Add the appointments table with a unique slot constraint | — | backend-agent | — |
| ↳ US-017-T2 | Task | Implement the transactional booking endpoint | — | backend-agent | — |
| ↳ US-017-T3 | Task | Add the duplicate-booking check for the same patient | — | backend-agent | — |
| ↳ US-017-T4 | Task | Build the slot selection and confirmation screen | — | frontend-agent | — |

## Sprint 6: Sprint 6

Proven race behaviour, reschedule and cancel within the cutoff, and appointment lists for patient and doctor

Capacity: 20 points · Committed: 17

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-018 | Story | Clear 'slot just taken' message when two patients race for a slot | 3 | qa-agent | US-017 |
| US-019 | Story | Patient reschedules an appointment before the cutoff | 5 | backend-agent | US-008, US-017 |
| US-020 | Story | Patient cancels an appointment before the cutoff and the slot is freed | 3 | backend-agent | US-008, US-017 |
| US-021 | Story | Patient views their upcoming and past appointments | 3 | frontend-agent | US-017 |
| US-022 | Story | Doctor views their upcoming and past appointments | 3 | frontend-agent | US-017 |

## Sprint 7: Sprint 7

Appointment status lifecycle plus consultation notes and structured prescriptions, restricted to patient and treating doctor

Capacity: 20 points · Committed: 16

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-023 | Story | Doctor updates appointment status through the lifecycle | 5 | backend-agent | US-022 |
| US-024 | Story | Doctor records consultation notes, diagnosis and advice | 5 | backend-agent | US-023 |
| US-025 | Story | Doctor records a structured prescription | 3 | backend-agent | US-024 |
| US-027 | Story | Clinical content restricted to the patient and the treating doctor | 3 | security-agent | US-004, US-024 |

## Sprint 8: Sprint 8

Patient consultation history with print, append-only audit log, responsive polish and handover documentation

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-026 | Story | Patient views and prints their own consultation history | 5 | frontend-agent | US-024, US-025 |
| US-028 | Story | Audit log of access to consultation records | 5 | backend-agent | US-024, US-027 |
| US-029 | Story | Responsive web application usable on mobile browsers | 5 | frontend-agent | US-012, US-021, US-022 |
| US-032 | Story | Setup and usage documentation for clinic staff | 5 | devops-agent | US-026, US-028, US-029 |

## Unscheduled

_Nothing unscheduled._
<!-- sdlc:auto:end sprints -->
