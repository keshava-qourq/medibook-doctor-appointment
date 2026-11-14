# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Accounts, Authentication and Role-Based Access. Establishes the three-role model (patient, doctor, administrator) with email/password authentication over hashed credentials and role-based authorisation on every request. Patients self-register; doctor and admin accounts are issued by an administrator.

Goal: one system shared by patients, doctors and administrators, with authentication and authorisation that holds for every screen and server call.

Scope points stated in the epic:
- Patients self-register.
- Doctor and administrator accounts are created by an administrator, who issues the credentials.
- Authentication is email + password; credentials stored hashed.
- Authorisation is role-based, including ownership of the record.

Open assumptions carried into this epic (as recorded in the input):
(a) No SSO and no two-factor authentication in this build.
(b) Transactional email is out of scope for this version, so there is no self-service email-based password reset; an administrator issues a replacement password instead.
(c) Baseline safeguards for health data are applied (role-based access control, encryption in transit and at rest, audit logging of consultation record access), but the system is not being certified against a specific regime such as HIPAA or GDPR in this build.

Stories in this epic: US-001, US-002, US-003, US-004, US-005 (text attached verbatim to the plan document).

**Related:** US-001, US-002, US-003, US-004, US-005

### EPIC-002 · approved · source: planning:EPIC-002

Clinic Setup: Specializations, Doctor Roster and Settings. Administrators maintain specializations, doctor profiles and the configuration values the booking rules depend on. The system is standalone, with no integration or bulk import.

Goal: give administrators the clinic roster and configuration that search and booking depend on.

Scope points stated in the epic:
- Specializations, doctors, disease mappings and patient accounts are all created inside the system.
- No external integration and no bulk import.

Open assumptions carried into this epic (as recorded in the input):
(a) The consultation fee is informational display text only; there is no payment, billing, invoicing or refund capability anywhere in the system, and fees are settled offline at the clinic.
(b) A single clinic timezone configured by the administrator applies to all users; no multi-timezone support.
(c) Deferred to a later version at this Lightweight MVP scope, although discussed: the administrator's all-appointments oversight view, cancel/reassign of other people's appointments, booking on a walk-in patient's behalf, administrative management of patient accounts, and operational reports (appointments per doctor, cancellations, no-shows).

Stories in this epic: US-006, US-007, US-008.

**Related:** US-006, US-007, US-008

### EPIC-003 · approved · source: planning:EPIC-003

Disease and Symptom Catalogue and Doctor Search. Patients type a disease, symptom or specialization name and an administrator-maintained mapping table resolves it to one or more specializations, listing the clinic's matching active doctors.

Goal: let a patient find the right doctor without already knowing which specialty they need.

Scope points stated in the epic:
- A predefined, administrator-maintained mapping table resolves a term to one or more specializations.
- Matching is strictly deterministic lookup over the stored catalogue: no AI, no large language model and no machine learning anywhere in it.
- Results list the clinic's matching active doctors.

Open assumption carried into this epic (as recorded in the input): the disease and symptom catalogue is seeded at launch with a set of common conditions and symptoms, and is thereafter editable only by administrators.

Stories in this epic: US-009, US-010, US-011, US-012.

**Related:** US-009, US-010, US-011, US-012

### EPIC-004 · approved · source: planning:EPIC-004

Doctor Availability and Slot Generation. Each doctor defines a weekly recurring schedule (working days, start/end times, slot length, breaks) plus one-off exceptions such as leave. The system generates discrete bookable slots from that definition.

Goal: turn a doctor's stated consulting pattern into discrete, individually timed bookable slots.

Scope points stated in the epic:
- Weekly recurring schedule: working days, start and end times, slot length, break periods.
- One-off exceptions, such as leave days, layered on top.
- Generated slots are discrete and each holds exactly one patient.

Open assumption carried into this epic (as recorded in the input): availability is modelled as a recurring weekly pattern plus exceptions, not as individually hand-entered slots.

Stories in this epic: US-013, US-014, US-015.

Plan tasks recorded against stories in this epic:
- US-013-T1 Add weekly availability and break tables with migration (backend-agent)
- US-013-T2 Implement weekly pattern validation rules in the booking domain module (backend-agent)
- US-013-T3 Implement GET and PUT /api/doctors/me/weekly-availability (backend-agent)
- US-013-T4 Build the week-view availability editor screen (frontend-agent)
- US-015-T1 Implement the slot generation function in the booking domain module (backend-agent)
- US-015-T2 Overlay booked appointments onto generated slots (backend-agent)
- US-015-T3 Expose GET /api/doctors/{doctor_id}/availability (backend-agent)
- US-015-T4 Add a slot generation test suite covering boundary cases (qa-agent)

**Related:** US-013, US-014, US-015

### EPIC-005 · approved · source: planning:EPIC-005

Appointment Booking, Reschedule and Cancellation. Patients book a specific generated slot; the same slot can never be booked twice because booking runs in a database transaction guarded by a uniqueness constraint on the doctor-and-slot pair. A losing concurrent attempt gets a clear 'slot just taken' message.

Goal: a patient books, reschedules and cancels a specific slot, with double booking made structurally impossible.

Scope points stated in the epic:
- Booking runs inside a database transaction guarded by a uniqueness constraint on the doctor + slot pair.
- A losing concurrent attempt receives a clear 'slot just taken' message rather than a silent collision.
- Availability is always shown fresh.

Open assumptions carried into this epic (as recorded in the input):
(a) 'Fresh availability' means a fresh fetch when the booking page opens plus a short-interval refresh, with the database transaction as the authoritative guard; there is no persistent push/websocket layer.
(b) Transactional email is out of scope for this version, so booking, reschedule and cancellation confirmations are given on screen and in the patient's appointment list; no confirmation or reminder email is sent.
(c) There is no waitlist and no automatic rebooking when a slot frees up; patients re-check availability themselves.
(d) Patients may reschedule or cancel only up to the administrator-configured cutoff before the appointment start.

Stories in this epic: US-016, US-017, US-018, US-019, US-020, US-021.

Plan tasks recorded against stories in this epic:
- US-017-T1 Add appointments table with a unique constraint on doctor and slot start (backend-agent)
- US-017-T2 Implement the transactional booking operation (backend-agent)
- US-017-T3 Implement POST /api/appointments with duplicate detection (backend-agent)
- US-017-T4 Build the slot selection and booking confirmation screens (frontend-agent)

**Related:** US-016, US-017, US-018, US-019, US-020, US-021

### EPIC-006 · approved · source: planning:EPIC-006

Doctor Appointment Workload and Status Management. Doctors see their own upcoming and past appointments and move each one through its lifecycle statuses.

Goal: give each doctor their own workload view and control of appointment status.

Scope points stated in the epic:
- Doctors see only their own upcoming and past appointments.
- Status set: Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator) and No-show.

Open assumption carried into this epic (as recorded in the input): the status set and the permitted transitions above are the agreed lifecycle for this build.

Stories in this epic: US-022, US-023.

**Related:** US-022, US-023

### EPIC-007 · approved · source: planning:EPIC-007

Consultation Records and Prescriptions. Per appointment, the treating doctor records notes, diagnosis and advice plus a structured prescription (medicine, dosage, duration); patients view and print their own history. Clinical scope stops there - this is not an electronic medical record.

Goal: document each visit clinically, readable by the patient and the treating doctor only.

Scope points stated in the epic:
- Consultation notes, diagnosis and advice recorded per appointment by the treating doctor.
- Structured prescription lines: medicine, dosage, duration.
- Patients view and print their own history.
- Explicitly out of scope: lab report uploads, medical file uploads, vitals tracking; the system is not an EMR.

Open assumptions carried into this epic (as recorded in the input):
(a) Consultation notes and prescriptions are visible only to the patient they belong to and the treating doctor; administrators can see scheduling data (who, when, status) but never clinical content.
(b) An audit log records who viewed or changed a consultation record, as a baseline safeguard, without the system being certified against HIPAA, GDPR or any other specific regime in this build.

Stories in this epic: US-024, US-025, US-026, US-027, US-028.

**Related:** US-024, US-025, US-026, US-027, US-028

### EPIC-008 · approved · source: planning:EPIC-008

Platform Foundations and Clinic Documentation. Cross-cutting product characteristics - a single responsive web application, English only, one clinic timezone, encrypted data - plus the written setup and usage material clinic staff need to run the system.

Goal: the cross-cutting qualities the whole product must hold, and the handover documentation.

Scope points stated in the epic:
- Delivered as a single responsive web application usable on mobile browsers.
- English only.
- One clinic timezone.

Open assumptions carried into this epic (as recorded in the input):
(a) No native iOS or Android application is built.
(b) The interface is English only, with no multi-language support.
(c) Baseline health-data safeguards (encryption in transit and at rest, role-based access control, audit logging) are applied, but no specific certification such as HIPAA or GDPR is being pursued in this build.
(d) Target operating scale is roughly 10-50 doctors and a few thousand registered patients, with everyday reliability as the priority.

Stories in this epic: US-029, US-030, US-031, US-032.

**Related:** US-029, US-030, US-031, US-032

### SPRINT-1 · draft · source: plan:SPRINT-1

Sprint 1 delivers working authentication for all three roles. Patients self-register, staff accounts are issued by an administrator, and every request is authorised by role and by record ownership. Capacity is 20 points.

Goal (verbatim from plan): "Working authentication for all three roles: patients self-register, staff accounts are issued by an administrator, and every request is authorised by role and record ownership."
Capacity: 20.
Plan status: generated, version 6 - not stated as approved in the input, so recorded as draft.
Traceability note: the plan input lists sprints and backlog items as separate lists and does not state which items are assigned to which sprint. The epic link above is inferred from the sprint goal wording only and should be confirmed by a human.

**Related:** EPIC-001

### SPRINT-2 · draft · source: plan:SPRINT-2

Sprint 2 builds clinic configuration foundations: patient profile self-service, specializations, timezone and cutoff settings, the disease mapping catalogue, and deployed encryption safeguards. Capacity is 20 points.

Goal (verbatim from plan): "Clinic configuration foundations: patient profile self-service, specializations, timezone and cutoff settings, the disease mapping catalogue, and deployed encryption safeguards."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; epic links are inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-001, EPIC-002, EPIC-003, EPIC-008

### SPRINT-3 · draft · source: plan:SPRINT-3

Sprint 3 makes doctor discovery work end to end: doctor profiles with fees, a seeded catalogue, deterministic term-to-specialization search and a filterable directory, all shown in the clinic timezone. Capacity is 20 points.

Goal (verbatim from plan): "A patient can find the right doctor: doctor profiles with fees, a seeded catalogue, deterministic term-to-specialization search and a filterable directory, all shown in the clinic timezone."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; epic links are inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-002, EPIC-003

### SPRINT-4 · draft · source: plan:SPRINT-4

Sprint 4 lets doctors describe when they actually consult: the weekly recurring pattern with breaks, plus one-off leave and extra-hours exceptions. Capacity is 20 points.

Goal (verbatim from plan): "Doctors can describe when they actually consult: weekly recurring pattern with breaks, plus one-off leave and extra-hours exceptions."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; the epic link is inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-004

### SPRINT-5 · draft · source: plan:SPRINT-5

Sprint 5 makes slots exist and bookable exactly once: deterministic slot generation, freshly refreshed availability, and the transactional booking endpoint. Capacity is 20 points.

Goal (verbatim from plan): "Slots exist and can be booked exactly once: deterministic slot generation, freshly refreshed availability, and the transactional booking endpoint."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; epic links are inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-004, EPIC-005

### SPRINT-6 · draft · source: plan:SPRINT-6

Sprint 6 completes the appointment lifecycle for patients plus the doctor's own schedule: concurrency race handling, reschedule, cancel, and both appointment lists. Capacity is 20 points.

Goal (verbatim from plan): "The full appointment lifecycle for patients plus the doctor's own schedule: race handling, reschedule, cancel, and both appointment lists."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; epic links are inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-005, EPIC-006

### SPRINT-7 · draft · source: plan:SPRINT-7

Sprint 7 covers clinical documentation: doctors move appointments through their statuses and record notes, diagnosis, advice and structured prescriptions, visible only to the patient and the treating doctor. Capacity is 20 points.

Goal (verbatim from plan): "Clinical documentation: doctors move appointments through their statuses and record notes, diagnosis, advice and structured prescriptions, visible only to the patient and treating doctor."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; epic links are inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-006, EPIC-007

### SPRINT-8 · draft · source: plan:SPRINT-8

Sprint 8 gets the product handover-ready: append-only audit log, patient printable consultation history, responsive behaviour verified across viewports, and setup/usage documentation. Capacity is 20 points.

Goal (verbatim from plan): "Handover-ready: append-only audit log, patient printable consultation history, responsive behaviour verified across viewports, and setup/usage documentation."
Capacity: 20.
Plan status: generated, version 6 - recorded as draft.
Traceability note: no item-to-sprint assignment is given in the plan input; epic links are inferred from the goal wording only and should be confirmed by a human.

**Related:** EPIC-007, EPIC-008
<!-- sdlc:auto:end narrative -->
