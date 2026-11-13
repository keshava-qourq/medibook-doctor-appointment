# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Establishes the three-role account model (patient, doctor, administrator) on one system, with email/password authentication over hashed credentials and role-based authorisation. Patients self-register; doctor and administrator accounts are created by an administrator who issues credentials. Covers 5 stories totalling 21 points.

Goal: a single system shared by patients, doctors and administrators, with authentication by email and password, hashed credential storage, and authorisation by role.

Scope of the epic:
- Patient self-registration (US-001, 5 pts, backend-agent)
- Sign in, sign out, session expiry (US-002, 5 pts, backend-agent)
- Administrator-issued doctor and administrator accounts (US-003, 3 pts, backend-agent)
- Role-based access enforcement on every screen and API call (US-004, 5 pts, security-agent)
- Patient self-service profile and password change (US-005, 3 pts, backend-agent)

Open assumptions carried into this epic (as stated in the input):
(a) no SSO and no two-factor authentication in this build;
(b) transactional email is out of scope, so there is no self-service email password reset — an administrator issues a replacement password instead;
(c) baseline health-data safeguards (role-based access control, encryption in transit and at rest, audit logging of consultation record access) are applied, but the system is not being certified against a specific regime such as HIPAA or GDPR in this build.

Status: approved. Authoring party and approval date not stated in the input.

**Related:** US-001, US-002, US-003, US-004, US-005

### EPIC-002 · approved · source: planning:EPIC-002

Administrators maintain the clinic's own roster and the configuration the booking rules depend on: specializations, doctor profiles, clinic timezone and booking cutoff. The system is fully standalone with no integration or bulk import. Covers 3 stories totalling 11 points.

Goal: administrators maintain specializations, doctors, disease mappings and patient accounts entirely inside the system — no external integration and no bulk import.

Scope of the epic:
- Manage specializations: create, rename, deactivate, list (US-006, 3 pts, backend-agent)
- Create and maintain doctor profiles including specializations, qualifications, fee text and active status (US-007, 5 pts, backend-agent)
- Configure clinic timezone and booking cutoff (US-008, 3 pts, backend-agent)

Open assumptions carried into this epic (as stated in the input):
(a) the consultation fee is informational display text only — no payment, billing, invoicing or refund capability anywhere; fees are settled offline at the clinic;
(b) a single administrator-configured clinic timezone applies to all users, with no multi-timezone support;
(c) deferred to a later version at this Lightweight MVP scope, although discussed: the administrator all-appointments oversight view, cancel/reassign of other people's appointments, booking on a walk-in patient's behalf, administrative management of patient accounts, and operational reports (appointments per doctor, cancellations, no-shows).

Status: approved.

**Related:** US-006, US-007, US-008

### EPIC-003 · approved · source: planning:EPIC-003

Patients find a doctor by typing a disease, symptom or specialization name; an administrator-maintained mapping table resolves the term to specializations and lists the clinic's matching active doctors. Matching is strictly deterministic lookup over stored records — no AI, LLM or machine learning. Covers 4 stories totalling 16 points.

Goal: a predefined, administrator-maintained disease/symptom catalogue resolves a typed term to one or more specializations, from which the clinic's active doctors are listed. The epic states explicitly that this matching is deterministic text lookup over the stored catalogue and uses no AI, no large language model and no machine learning anywhere.

Scope of the epic:
- Seeded disease and symptom catalogue available at launch (US-009, 3 pts, backend-agent)
- Administrator edits of disease-to-specialization mappings (US-010, 5 pts, backend-agent)
- Patient search by disease, symptom or specialization with autocomplete (US-011, 5 pts, backend-agent)
- Doctor directory results showing specialization, qualifications and fee, with filtering (US-012, 3 pts, frontend-agent)

Open assumption carried into this epic (as stated in the input): the disease and symptom catalogue is seeded at launch with a set of common conditions and symptoms and is thereafter editable only by administrators.

Status: approved.

**Related:** US-009, US-010, US-011, US-012

### EPIC-004 · approved · source: planning:EPIC-004

Doctors define a weekly recurring schedule (working days, start/end times, slot length, breaks) plus one-off exceptions such as leave or extra hours. The system generates discrete bookable slots from that definition, each holding exactly one patient. Covers 3 stories totalling 21 points, with 8 named tasks.

Goal: model doctor availability as a recurring weekly pattern plus exceptions, and generate from it discrete bookable slots that each hold exactly one patient.

Scope of the epic:
- Weekly recurring availability pattern with breaks (US-013, 8 pts, backend-agent)
  Tasks: US-013-T1 weekly availability and break tables with migration (backend-agent); US-013-T2 weekly pattern validation rules in the booking domain module (backend-agent); US-013-T3 GET and PUT /api/doctors/me/weekly-availability (backend-agent); US-013-T4 week-view availability editor screen (frontend-agent).
- One-off availability exceptions: leave days, part-day unavailability, extra one-off hours (US-014, 5 pts, backend-agent)
- Deterministic slot generation, one patient per slot (US-015, 8 pts, backend-agent)
  Tasks: US-015-T1 slot generation function in the booking domain module (backend-agent); US-015-T2 overlay booked appointments onto generated slots (backend-agent); US-015-T3 expose GET /api/doctors/{doctor_id}/availability (backend-agent); US-015-T4 slot generation test suite covering boundary cases (qa-agent).

Open assumption carried into this epic (as stated in the input): availability is modelled as a recurring weekly pattern plus exceptions, not as individually hand-entered slots.

Status: approved.

**Related:** US-013, US-014, US-015

### EPIC-005 · approved · source: planning:EPIC-005

Patients book a specific generated slot, with double booking prevented by a database transaction guarded by a uniqueness constraint on the doctor-and-slot pair; a losing concurrent attempt receives a clear 'slot just taken' message. Also covers reschedule, cancellation and the patient appointment list. Covers 6 stories totalling 25 points, with 4 named tasks.

Goal: booking a generated slot is transactional and collision-free. The uniqueness constraint on the doctor-and-slot pair inside the booking transaction is the authoritative guard; availability is always shown fresh.

Scope of the epic:
- Freshly refreshed slot availability (US-016, 3 pts, frontend-agent)
- Transactional booking that can never be double-booked (US-017, 8 pts, backend-agent)
  Tasks: US-017-T1 appointments table with unique constraint on doctor and slot start (backend-agent); US-017-T2 transactional booking operation (backend-agent); US-017-T3 POST /api/appointments with duplicate detection (backend-agent); US-017-T4 slot selection and booking confirmation screens (frontend-agent).
- 'Slot just taken' race handling (US-018, 3 pts, qa-agent)
- Patient reschedule before the cutoff (US-019, 5 pts, backend-agent)
- Patient cancellation before the cutoff, freeing the slot (US-020, 3 pts, backend-agent)
- Patient upcoming and past appointment list (US-021, 3 pts, frontend-agent)

Open assumptions carried into this epic (as stated in the input):
(a) 'fresh availability' means a fresh fetch on page open plus a short-interval refresh, with the database transaction as the authoritative guard — no persistent push/websocket layer;
(b) transactional email is out of scope, so booking, reschedule and cancellation confirmations are on screen and in the patient's appointment list only; no confirmation or reminder email is sent;
(c) no waitlist and no automatic rebooking when a slot frees up — patients re-check availability themselves;
(d) patients may reschedule or cancel only up to the administrator-configured cutoff before the appointment start.

Status: approved.

**Related:** US-016, US-017, US-018, US-019, US-020, US-021

### EPIC-006 · approved · source: planning:EPIC-006

Doctors see their own upcoming and past appointments and move each one through its lifecycle. The agreed status set is Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator) and No-show. Covers 2 stories totalling 8 points.

Goal: give each doctor a view of their own schedule and the ability to advance appointment status so the record reflects what actually happened.

Scope of the epic:
- Doctor views own upcoming and past appointments, with date/date-range and status filtering (US-022, 3 pts, frontend-agent)
- Doctor updates appointment status through the lifecycle, including cancellation with a reason (US-023, 5 pts, backend-agent)

Lifecycle as stated: Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator), No-show.

Open assumption carried into this epic (as stated in the input): the status set and the permitted transitions above are the agreed lifecycle for this build.

Status: approved.

**Related:** US-022, US-023

### EPIC-007 · approved · source: planning:EPIC-007

Per appointment, the treating doctor records consultation notes, diagnosis and advice plus a structured prescription (medicine, dosage, duration). Patients view and print their own history. Clinical content is restricted to the patient and treating doctor and every access is audit-logged. Covers 5 stories totalling 21 points.

Goal: document each visit against its appointment, with structured prescription lines, patient-visible and printable history, and strict confinement of clinical content.

Scope of the epic:
- Doctor records notes, diagnosis and advice (US-024, 5 pts, backend-agent)
- Doctor records a structured prescription: medicine, dosage, duration per line (US-025, 3 pts, backend-agent)
- Patient views and prints their own consultation history (US-026, 5 pts, frontend-agent)
- Clinical content restricted to the patient and the treating doctor (US-027, 3 pts, security-agent)
- Append-only audit log of consultation record access (US-028, 5 pts, backend-agent)

Explicit boundary stated in the epic: clinical content stops here — this is not an electronic medical record; lab report uploads, medical file uploads and vitals tracking are out of scope.

Open assumptions carried into this epic (as stated in the input):
(a) consultation notes and prescriptions are visible only to the owning patient and the treating doctor — administrators can see scheduling data (who, when, status) but never clinical content;
(b) an audit log records who viewed or changed a consultation record as a baseline safeguard, without the system being certified against HIPAA, GDPR or any other specific regime in this build.

Status: approved.

**Related:** US-024, US-025, US-026, US-027, US-028

### EPIC-008 · approved · source: planning:EPIC-008

Cross-cutting product characteristics plus the written material clinic staff need to run the system: a single responsive web application, English only, one clinic timezone, encryption in transit and at rest, and setup/usage documentation. Covers 4 stories totalling 17 points.

Goal: deliver the product as one responsive web application usable on mobile browsers, in English only and in a single clinic timezone, with baseline health-data protection and handover documentation.

Scope of the epic:
- Responsive web application usable on mobile browsers (US-029, 5 pts, frontend-agent)
- Single language and single clinic timezone throughout (US-030, 2 pts, frontend-agent)
- Health data protected in transit and at rest, credentials hashed (US-031, 5 pts, devops-agent)
- Setup and usage documentation for clinic staff (US-032, 5 pts, devops-agent)

Open assumptions carried into this epic (as stated in the input):
(a) no native iOS or Android application is built;
(b) the interface is English only with no multi-language support;
(c) baseline health-data safeguards (encryption in transit and at rest, role-based access control, audit logging) are applied, but no specific certification such as HIPAA or GDPR is being pursued in this build;
(d) target operating scale is roughly 10-50 doctors and a few thousand registered patients, with everyday reliability as the priority.

Status: approved.

**Related:** US-029, US-030, US-031, US-032

### SPRINT-1 · approved · source: plan:SPRINT-1

First sprint of approved plan version 1, capacity 20. Goal: working authentication for all three roles — patients self-register, staff accounts are issued by an administrator, and every request is authorised by role and record ownership.

Goal (verbatim): "Working authentication for all three roles: patients self-register, staff accounts are issued by an administrator, and every request is authorised by role and record ownership."
Capacity: 20.

Item assignment: the plan input lists sprints and plan items as separate lists and does not state which items belong to which sprint. From the goal wording this sprint corresponds to EPIC-001 stories US-001 (5), US-002 (5), US-003 (3) and US-004 (5) — 18 points against capacity 20. This mapping is inferred, not stated in the input.

**Related:** EPIC-001, US-001, US-002, US-003, US-004

### SPRINT-2 · approved · source: plan:SPRINT-2

Second sprint of approved plan version 1, capacity 20. Goal: clinic configuration foundations — patient profile self-service, specializations, timezone and cutoff settings, the disease mapping catalogue, and deployed encryption safeguards.

Goal (verbatim): "Clinic configuration foundations: patient profile self-service, specializations, timezone and cutoff settings, the disease mapping catalogue, and deployed encryption safeguards."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-005 (3, patient profile), US-006 (3, specializations), US-008 (3, timezone and cutoff), US-010 (5, disease mapping catalogue) and US-031 (5, encryption in transit and at rest) — 19 points against capacity 20. Mapping inferred, not stated.

**Related:** US-005, US-006, US-008, US-010, US-031

### SPRINT-3 · approved · source: plan:SPRINT-3

Third sprint of approved plan version 1, capacity 20. Goal: a patient can find the right doctor — doctor profiles with fees, a seeded catalogue, deterministic term-to-specialization search and a filterable directory, all shown in the clinic timezone.

Goal (verbatim): "A patient can find the right doctor: doctor profiles with fees, a seeded catalogue, deterministic term-to-specialization search and a filterable directory, all shown in the clinic timezone."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-007 (5, doctor profiles and fee text), US-009 (3, seeded catalogue), US-011 (5, deterministic search), US-012 (3, filterable directory) and US-030 (2, single language and clinic timezone) — 18 points against capacity 20. Mapping inferred, not stated.

**Related:** US-007, US-009, US-011, US-012, US-030

### SPRINT-4 · approved · source: plan:SPRINT-4

Fourth sprint of approved plan version 1, capacity 20. Goal: doctors can describe when they actually consult — a weekly recurring pattern with breaks, plus one-off leave and extra-hours exceptions.

Goal (verbatim): "Doctors can describe when they actually consult: weekly recurring pattern with breaks, plus one-off leave and extra-hours exceptions."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-013 (8) with its four tasks US-013-T1 to US-013-T4, and US-014 (5) — 13 points against capacity 20. Mapping inferred, not stated.

**Related:** EPIC-004, US-013, US-014

### SPRINT-5 · approved · source: plan:SPRINT-5

Fifth sprint of approved plan version 1, capacity 20. Goal: slots exist and can be booked exactly once — deterministic slot generation, freshly refreshed availability, and the transactional booking endpoint.

Goal (verbatim): "Slots exist and can be booked exactly once: deterministic slot generation, freshly refreshed availability, and the transactional booking endpoint."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-015 (8) with tasks US-015-T1 to US-015-T4, US-016 (3) and US-017 (8) with tasks US-017-T1 to US-017-T4 — 19 points against capacity 20. Mapping inferred, not stated.

**Related:** US-015, US-016, US-017

### SPRINT-6 · approved · source: plan:SPRINT-6

Sixth sprint of approved plan version 1, capacity 20. Goal: the full appointment lifecycle for patients plus the doctor's own schedule — race handling, reschedule, cancel, and both appointment lists.

Goal (verbatim): "The full appointment lifecycle for patients plus the doctor's own schedule: race handling, reschedule, cancel, and both appointment lists."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-018 (3, race handling), US-019 (5, reschedule), US-020 (3, cancel), US-021 (3, patient appointment list) and US-022 (3, doctor schedule list) — 17 points against capacity 20. Mapping inferred, not stated.

**Related:** US-018, US-019, US-020, US-021, US-022

### SPRINT-7 · approved · source: plan:SPRINT-7

Seventh sprint of approved plan version 1, capacity 20. Goal: clinical documentation — doctors move appointments through their statuses and record notes, diagnosis, advice and structured prescriptions, visible only to the patient and treating doctor.

Goal (verbatim): "Clinical documentation: doctors move appointments through their statuses and record notes, diagnosis, advice and structured prescriptions, visible only to the patient and treating doctor."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-023 (5, status lifecycle), US-024 (5, notes/diagnosis/advice), US-025 (3, structured prescription) and US-027 (3, clinical content restricted to patient and treating doctor) — 16 points against capacity 20. Mapping inferred, not stated.

**Related:** US-023, US-024, US-025, US-027

### SPRINT-8 · approved · source: plan:SPRINT-8

Eighth and final sprint of approved plan version 1, capacity 20. Goal: handover-ready — append-only audit log, patient printable consultation history, responsive behaviour verified across viewports, and setup/usage documentation.

Goal (verbatim): "Handover-ready: append-only audit log, patient printable consultation history, responsive behaviour verified across viewports, and setup/usage documentation."
Capacity: 20.

Item assignment: not stated in the plan input. From the goal wording this sprint corresponds to US-028 (5, audit log), US-026 (5, printable consultation history), US-029 (5, responsive web application) and US-032 (5, setup and usage documentation) — 20 points, exactly at capacity. Mapping inferred, not stated.

Note on plan totals: the eight inferred sprint allocations account for all 32 stories and the full 140 story points in the plan.

**Related:** US-026, US-028, US-029, US-032
<!-- sdlc:auto:end narrative -->
