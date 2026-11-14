# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Accounts, Authentication and Role-Based Access. Establishes the three-role model (patient, doctor, administrator) with email/password sign-in over hashed credentials and role-based authorisation. Patients self-register; doctor and admin accounts are created by an administrator who issues credentials.

Goal: one system shared by patients, doctors and administrators, with authentication by email and password, hashed credential storage, and role-based authorisation on every access.

Scope notes stated in the epic:
- Patients self-register.
- Doctor and administrator accounts are created by an administrator, who issues the credentials.

Open assumptions carried into this epic:
- (a) No SSO and no two-factor authentication in this build.
- (b) Transactional email is out of scope for this version, so there is no self-service email-based password reset; an administrator issues a replacement password instead.
- (c) Baseline safeguards for health data are applied (role-based access control, encryption in transit and at rest, audit logging of consultation record access), but the system is not being certified against a specific regime such as HIPAA or GDPR in this build.

Stories: US-001, US-002, US-003, US-004, US-005 (text attached verbatim to the plan). Planning assignment from the plan item list: US-001, US-002, US-003, US-005 to backend-agent; US-004 to security-agent. Points: US-001 5, US-002 5, US-003 3, US-004 5, US-005 3.

**Related:** US-001, US-002, US-003, US-004, US-005

### EPIC-002 · approved · source: planning:EPIC-002

Clinic Setup: Specializations, Doctor Roster and Settings. Administrators maintain the specialization list, doctor profiles and the configuration values the booking rules depend on. The system is fully standalone with no integration or bulk import.

Goal: give administrators control of the clinic's own roster and of the configuration the booking rules read. Specializations, doctors, disease mappings and patient accounts are all created inside the system; there is no integration and no bulk import.

Open assumptions carried into this epic:
- (a) The consultation fee is informational display text only. There is no payment, billing, invoicing or refund capability anywhere in the system; fees are settled offline at the clinic.
- (b) A single clinic timezone configured by the administrator applies to all users; no multi-timezone support.
- (c) Deferred to a later version at this Lightweight MVP scope, although discussed: the administrator's all-appointments oversight view; cancel/reassign of other people's appointments; booking on a walk-in patient's behalf; administrative management of patient accounts; operational reports (appointments per doctor, cancellations, no-shows).

Stories: US-006, US-007, US-008 (text attached verbatim). Plan item list: all three to backend-agent; points US-006 3, US-007 5, US-008 3.

**Related:** US-006, US-007, US-008

### EPIC-003 · approved · source: planning:EPIC-003

Disease and Symptom Catalogue and Doctor Search. Patients type a disease, symptom or specialization name; an administrator-maintained mapping table resolves the term to specializations and the clinic's matching active doctors are listed. Matching is strictly deterministic lookup over stored records.

Goal: let patients reach the right doctor without already knowing the specialty, using a predefined mapping table from disease/symptom terms to specializations.

Constraint stated in the epic: matching is strictly deterministic lookup over the stored catalogue. No AI, no large language model and no machine learning is used anywhere in it.

Open assumption carried into this epic: the disease and symptom catalogue is seeded at launch with a set of common conditions and symptoms, and is thereafter editable only by administrators.

Stories: US-009, US-010, US-011, US-012 (text attached verbatim). Plan item list: US-009, US-010, US-011 to backend-agent; US-012 to frontend-agent. Points: US-009 3, US-010 5, US-011 5, US-012 3.

**Related:** US-009, US-010, US-011, US-012

### EPIC-004 · approved · source: planning:EPIC-004

Doctor Availability and Slot Generation. Each doctor defines a weekly recurring schedule (working days, start/end times, slot length, breaks) plus one-off exceptions such as leave. The system expands that definition into discrete bookable slots, each holding exactly one patient.

Goal: derive bookable slots from a doctor-maintained availability definition rather than hand-entered times, and guarantee each generated slot holds exactly one patient.

Open assumption carried into this epic: availability is modelled as a recurring weekly pattern plus exceptions, not as individually hand-entered slots.

Stories: US-013 (8 pts, backend-agent), US-014 (5 pts, backend-agent), US-015 (8 pts, backend-agent). Story and criterion text is attached verbatim.

Tasks listed in the plan for this epic:
- US-013-T1 Add weekly availability and break tables (backend-agent)
- US-013-T2 Implement pattern validation rules (backend-agent)
- US-013-T3 Implement get/put weekly availability endpoints (backend-agent)
- US-013-T4 Build the week-view availability editor (frontend-agent)
- US-015-T1 Implement slot expansion from the weekly pattern (backend-agent)
- US-015-T2 Apply exceptions and clinic-time cutoff to generated slots (backend-agent)
- US-015-T3 Expose the availability endpoint with booked-slot marking (backend-agent)
- US-015-T4 Add a slot generation test suite (qa-agent)

**Related:** US-013, US-014, US-015

### EPIC-005 · approved · source: planning:EPIC-005

Appointment Booking, Reschedule and Cancellation. Patients book a specific generated slot inside a database transaction guarded by a uniqueness constraint on the doctor-and-slot pair, so the same slot can never be booked twice. A losing concurrent attempt receives a clear 'slot just taken' message.

Goal: a booking path that is safe under concurrency and always shows fresh availability.

Mechanism stated in the epic: booking runs inside a database transaction guarded by a uniqueness constraint on the doctor-and-slot pair; the losing concurrent attempt gets an explicit 'slot just taken' message rather than a silent collision.

Open assumptions carried into this epic:
- (a) 'Fresh availability' means a fresh fetch when the booking page opens plus a short-interval refresh, with the database transaction as the authoritative guard. There is no persistent push/websocket layer.
- (b) Transactional email is out of scope for this version, so booking, reschedule and cancellation confirmations are given on screen and in the patient's appointment list; no confirmation or reminder email is sent.
- (c) There is no waitlist and no automatic rebooking when a slot frees up; patients re-check availability themselves.
- (d) Patients may reschedule or cancel only up to the administrator-configured cutoff before the appointment start.

Stories: US-016 (3 pts, frontend-agent), US-017 (8 pts, backend-agent), US-018 (3 pts, qa-agent), US-019 (5 pts, backend-agent), US-020 (3 pts, backend-agent), US-021 (3 pts, frontend-agent).

Tasks listed in the plan for this epic:
- US-017-T1 Add the appointments table with a unique slot constraint (backend-agent)
- US-017-T2 Implement the transactional booking endpoint (backend-agent)
- US-017-T3 Add the duplicate-booking check for the same patient (backend-agent)
- US-017-T4 Build the slot selection and confirmation screen (frontend-agent)

**Related:** US-016, US-017, US-018, US-019, US-020, US-021

### EPIC-006 · approved · source: planning:EPIC-006

Doctor Appointment Workload and Status Management. Doctors see only their own upcoming and past appointments and move each one through its lifecycle. The agreed status set is Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator) and No-show.

Goal: give each doctor a view of their own workload and the ability to keep appointment status accurate.

Lifecycle stated in the epic: Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator), No-show.

Open assumption carried into this epic: the status set and the permitted transitions above are the agreed lifecycle for this build.

Stories: US-022 (3 pts, frontend-agent), US-023 (5 pts, backend-agent). Story and criterion text is attached verbatim.

**Related:** US-022, US-023

### EPIC-007 · approved · source: planning:EPIC-007

Consultation Records and Prescriptions. Per appointment, the treating doctor records notes, diagnosis and advice plus a structured prescription (medicine, dosage, duration); patients view and print their own history. Clinical scope stops here: this is not an electronic medical record.

Goal: document each visit against its appointment and give the patient a readable, printable record.

Scope boundary stated in the epic: not an EMR. Lab report uploads, medical file uploads and vitals tracking are out of scope.

Open assumptions carried into this epic:
- (a) Consultation notes and prescriptions are visible only to the patient they belong to and the treating doctor. Administrators can see scheduling data (who, when, status) but never clinical content.
- (b) An audit log records who viewed or changed a consultation record, as a baseline safeguard, without the system being certified against HIPAA, GDPR or any other specific regime in this build.

Stories: US-024 (5 pts, backend-agent), US-025 (3 pts, backend-agent), US-026 (5 pts, frontend-agent), US-027 (3 pts, security-agent), US-028 (5 pts, backend-agent).

**Related:** US-024, US-025, US-026, US-027, US-028

### EPIC-008 · approved · source: planning:EPIC-008

Platform Foundations and Clinic Documentation. Cross-cutting characteristics the whole product must hold, plus the written material clinic staff need to run it. Delivered as a single responsive web application, English only, in one clinic timezone.

Goal: establish the product-wide qualities (responsive web client, single language, single timezone, data protection) and hand over setup and usage documentation.

Open assumptions carried into this epic:
- (a) No native iOS or Android application is built.
- (b) The interface is English only, with no multi-language support.
- (c) Baseline health-data safeguards (encryption in transit and at rest, role-based access control, audit logging) are applied, but no specific certification such as HIPAA or GDPR is being pursued in this build.
- (d) Target operating scale is roughly 10-50 doctors and a few thousand registered patients, with everyday reliability as the priority.

Stories: US-029 (5 pts, frontend-agent), US-030 (2 pts, frontend-agent), US-031 (5 pts, devops-agent), US-032 (5 pts, devops-agent).

**Related:** US-029, US-030, US-031, US-032

### SPRINT-1 · draft · source: plan:SPRINT-1

Sprint 1 of plan version 1, capacity 20. Goal as recorded in the plan: "Delivered: user accounts, administrator-created staff accounts and role/ownership enforcement across the API."

Sprint name: Sprint 1. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Delivered: user accounts, administrator-created staff accounts and role/ownership enforcement across the API." Note the goal is phrased in the past tense ("Delivered:") in the source; no separate completion record was supplied in this input, so no outcome is asserted here.

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-2 · draft · source: plan:SPRINT-2

Sprint 2 of plan version 1, capacity 20. Goal as recorded in the plan: "Delivered: specializations, disease mapping catalogue admin, clinic settings and the encryption/hosting baseline."

Sprint name: Sprint 2. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Delivered: specializations, disease mapping catalogue admin, clinic settings and the encryption/hosting baseline." The goal is phrased in the past tense ("Delivered:") in the source; no completion evidence was supplied in this input.

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-3 · draft · source: plan:SPRINT-3

Sprint 3 of plan version 1, capacity 20. Goal as recorded in the plan: sign-in sessions and patient profile, seeded catalogue, and patient-facing doctor search with results.

Sprint name: Sprint 3. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Sign-in sessions and patient profile, seeded catalogue, and patient-facing doctor search with results."

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-4 · draft · source: plan:SPRINT-4

Sprint 4 of plan version 1, capacity 20. Goal as recorded in the plan: doctor profiles patients can see, doctor weekly availability and exceptions, and one labelled clinic timezone everywhere.

Sprint name: Sprint 4. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Doctor profiles patients can see, doctor weekly availability and exceptions, and one labelled clinic timezone everywhere."

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-5 · draft · source: plan:SPRINT-5

Sprint 5 of plan version 1, capacity 20. Goal as recorded in the plan: bookable slots generated from availability, freshly refreshed on screen, and a booking that can never double-book.

Sprint name: Sprint 5. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Bookable slots generated from availability, freshly refreshed on screen, and a booking that can never double-book."

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-6 · draft · source: plan:SPRINT-6

Sprint 6 of plan version 1, capacity 20. Goal as recorded in the plan: proven race behaviour, reschedule and cancel within the cutoff, and appointment lists for patient and doctor.

Sprint name: Sprint 6. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Proven race behaviour, reschedule and cancel within the cutoff, and appointment lists for patient and doctor."

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-7 · draft · source: plan:SPRINT-7

Sprint 7 of plan version 1, capacity 20. Goal as recorded in the plan: appointment status lifecycle plus consultation notes and structured prescriptions, restricted to patient and treating doctor.

Sprint name: Sprint 7. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Appointment status lifecycle plus consultation notes and structured prescriptions, restricted to patient and treating doctor."

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.

### SPRINT-8 · draft · source: plan:SPRINT-8

Sprint 8 of plan version 1, capacity 20. Goal as recorded in the plan: patient consultation history with print, append-only audit log, responsive polish and handover documentation.

Sprint name: Sprint 8. Capacity: 20. Plan status: generated, version 1.

Goal (verbatim from the plan): "Patient consultation history with print, append-only audit log, responsive polish and handover documentation."

Sprint backlog: the plan's item list is flat and does not assign items to sprints, so no story-to-sprint mapping is recorded.
<!-- sdlc:auto:end narrative -->
