# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Accounts, authentication and role-based access for three roles — patients (self-register), doctors and administrators (admin-created). Email/password auth with hashed credential storage and role-based authorisation.

Goal: one shared system serving patients, doctors and administrators; patients self-register while doctor/admin accounts are created by an administrator who issues credentials.

Stories: US-001, US-002, US-003, US-004, US-005.

Approved assumptions carried into this epic:
- No SSO and no two-factor authentication in this build.
- Transactional email is out of scope, so there is no self-service email-based password reset; an administrator issues a replacement password instead.
- Baseline health-data safeguards (RBAC, encryption in transit and at rest, audit logging of consultation record access) apply, but the system is not certified against HIPAA, GDPR or any specific regime in this build.

**Related:** US-001, US-002, US-003, US-004, US-005

### EPIC-002 · approved · source: planning:EPIC-002

Clinic setup: administrators maintain specializations, the doctor roster, disease mappings and the configuration values booking rules depend on. Fully standalone — no integration or bulk import.

Goal: administrators maintain the clinic's roster and configuration; specializations, doctors, disease mappings and patient accounts are all created inside the system.

Stories: US-006, US-007, US-008.

Approved assumptions carried into this epic:
- Consultation fee is informational display text only — no payment, billing, invoicing or refund capability anywhere; fees are settled offline at the clinic.
- A single administrator-configured clinic timezone applies to all users; no multi-timezone support.
- Deferred to a later version at this Lightweight MVP scope (discussed but out): admin all-appointments oversight view, cancel/reassign of others' appointments, booking on a walk-in patient's behalf, administrative management of patient accounts, and operational reports (appointments per doctor, cancellations, no-shows).

**Related:** US-006, US-007, US-008

### EPIC-003 · approved · source: planning:EPIC-003

Disease/symptom catalogue and doctor search. Patients type a disease, symptom or specialization; a predefined admin-maintained mapping resolves it to specializations and lists matching active doctors. Strictly deterministic lookup — no AI/LLM/ML.

Goal: patients find a doctor by typing a disease, symptom or specialization name; an administrator-maintained mapping table resolves the term to one or more specializations and the system lists matching active doctors via deterministic lookup only.

Stories: US-009, US-010, US-011, US-012.

Approved assumption carried into this epic: the disease and symptom catalogue is seeded at launch with common conditions and symptoms, and thereafter editable only by administrators.

**Related:** US-009, US-010, US-011, US-012

### EPIC-004 · approved · source: planning:EPIC-004

Doctor availability and slot generation. Each doctor defines a weekly recurring schedule plus one-off exceptions; the system generates discrete bookable slots, each holding exactly one patient.

Goal: doctors define a weekly recurring schedule (working days, start/end times, slot length, breaks) plus one-off exceptions (e.g. leave); the system generates discrete bookable slots, each holding exactly one patient.

Stories: US-013, US-014, US-015.

Approved assumption carried into this epic: availability is modelled as a recurring weekly pattern plus exceptions, not as individually hand-entered slots.

**Related:** US-013, US-014, US-015

### EPIC-005 · approved · source: planning:EPIC-005

Appointment booking, reschedule and cancellation. Booking runs in a DB transaction guarded by a uniqueness constraint on (doctor, slot), so the same slot can never be booked twice; a losing concurrent attempt gets a clear 'slot just taken' message.

Goal: patients book a specific generated slot; booking is protected by a uniqueness constraint on the doctor-and-slot pair inside a transaction, with availability always shown fresh.

Stories: US-016, US-017, US-018, US-019, US-020, US-021.

Approved assumptions carried into this epic:
- 'Fresh availability' = a fresh fetch on page open plus a short-interval refresh, with the DB transaction as the authoritative guard — no persistent push/websocket layer.
- Booking/reschedule/cancellation confirmations are on screen and in the patient's appointment list; no confirmation or reminder email is sent (transactional email out of scope).
- No waitlist and no automatic rebooking when a slot frees up — patients re-check availability themselves.
- Patients may reschedule or cancel only up to the administrator-configured cutoff before appointment start.

**Related:** US-016, US-017, US-018, US-019, US-020, US-021

### EPIC-006 · approved · source: planning:EPIC-006

Doctor appointment workload and status management. Doctors see their own upcoming and past appointments and move each through its lifecycle: Booked, Confirmed, Completed, Cancelled (by patient, doctor or admin) and No-show.

Goal: doctors view their own appointments and manage each one's lifecycle status.

Stories: US-022, US-023.

Approved assumption carried into this epic: the status set (Booked, Confirmed, Completed, Cancelled, No-show) and the permitted transitions are the agreed lifecycle for this build.

**Related:** US-022, US-023

### EPIC-007 · approved · source: planning:EPIC-007

Consultation records and prescriptions. Per appointment the treating doctor records notes, diagnosis, advice and a structured prescription (medicine, dosage, duration); patients view and print their own history. Not an EMR — no lab/file uploads or vitals.

Goal: treating doctors document each visit (notes, diagnosis, advice, structured prescription); patients view and print their own history. Clinical scope stops here — no EMR, lab report uploads, medical file uploads or vitals tracking.

Stories: US-024, US-025, US-026, US-027, US-028.

Approved assumptions carried into this epic:
- Consultation notes and prescriptions are visible only to the patient they belong to and the treating doctor; administrators see scheduling data (who, when, status) but never clinical content.
- An audit log records who viewed or changed a consultation record as a baseline safeguard, without certification against HIPAA, GDPR or any other specific regime in this build.

**Related:** US-024, US-025, US-026, US-027, US-028

### EPIC-008 · approved · source: planning:EPIC-008

Platform foundations and clinic documentation. A single responsive web application usable on mobile browsers, English only, one clinic timezone, with encryption and audit baselines, plus setup and usage documentation for clinic staff.

Goal: cross-cutting product characteristics plus the written material clinic staff need to run the system.

Stories: US-029, US-030, US-031, US-032.

Approved assumptions carried into this epic:
- No native iOS or Android application is built; the responsive web app is the only client.
- Interface is English only with no multi-language support.
- Baseline health-data safeguards (encryption in transit and at rest, RBAC, audit logging) apply, but no specific certification (HIPAA/GDPR) is pursued in this build.
- Target scale is roughly 10–50 doctors and a few thousand registered patients, with everyday reliability as the priority.

**Related:** US-029, US-030, US-031, US-032

### SPRINT-1 · approved · source: plan:SPRINT-1

Authentication foundation: patient registration, admin-created staff accounts and role-based access enforcement. Capacity 20 (plan version 1).

Goal: Authentication foundation — patient registration, admin-created staff accounts and role-based access enforcement.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-001, US-001, US-002, US-003, US-004

### SPRINT-2 · approved · source: plan:SPRINT-2

Clinic setup: specializations, disease mapping, settings and data-protection foundations. Capacity 20.

Goal: Clinic setup — specializations, disease mapping, settings and data-protection foundations.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-002, US-006, US-010, US-008, US-031

### SPRINT-3 · approved · source: plan:SPRINT-3

Sessions, seeded catalogue, doctor search and directory results. Capacity 20.

Goal: Sessions, seeded catalogue, doctor search and directory results.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-001, US-002, US-009, US-011, US-012

### SPRINT-4 · approved · source: plan:SPRINT-4

Doctor profiles, weekly availability, exceptions and timezone presentation. Capacity 20.

Goal: Doctor profiles, weekly availability, exceptions and timezone presentation.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-004, US-007, US-013, US-014, US-030

### SPRINT-5 · approved · source: plan:SPRINT-5

Slot generation, fresh availability and the no-double-booking booking flow. Capacity 24.

Goal: Slot generation, fresh availability and the no-double-booking booking flow.
Capacity: 24. Plan status: generated, version 1.

**Related:** EPIC-005, US-015, US-016, US-017

### SPRINT-6 · approved · source: plan:SPRINT-6

Race handling, reschedule, cancel and the patient and doctor appointment lists. Capacity 20.

Goal: Race handling, reschedule, cancel and the patient and doctor appointment lists.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-005, US-018, US-019, US-020, US-021, US-022

### SPRINT-7 · approved · source: plan:SPRINT-7

Doctor status lifecycle, consultation notes and prescriptions with clinical access control. Capacity 20.

Goal: Doctor status lifecycle, consultation notes and prescriptions with clinical access control.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-006, EPIC-007, US-023, US-024, US-025, US-027

### SPRINT-8 · approved · source: plan:SPRINT-8

Patient consultation history, audit log, responsiveness and clinic documentation. Capacity 20.

Goal: Patient consultation history, audit log, responsiveness and clinic documentation.
Capacity: 20. Plan status: generated, version 1.

**Related:** EPIC-007, EPIC-008, US-026, US-028, US-029, US-032
<!-- sdlc:auto:end narrative -->
