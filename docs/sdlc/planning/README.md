# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Accounts, authentication and role-based access for three roles: patients, doctors, administrators. Patients self-register; doctor/admin accounts are created by an administrator who issues credentials. Auth is email+password with hashed storage and role-based authorisation.

Goal: deliver account creation, authentication and role/ownership enforcement across the system for all three roles.

Carried assumptions:
- (a) No SSO and no two-factor authentication in this build.
- (b) No self-service email-based password reset (transactional email out of scope); an administrator issues a replacement password instead.
- (c) Baseline health-data safeguards (RBAC, encryption in transit and at rest, audit logging of consultation record access) applied, but no certification against a specific regime (e.g. HIPAA, GDPR) in this build.

Stories: US-001 patient self-registration; US-002 sign in / sign out / session expiry; US-003 admin creates doctor and admin accounts; US-004 role-based access enforcement across every screen and API call; US-005 patient manages own profile.

**Related:** US-001, US-002, US-003, US-004, US-005

### EPIC-002 · approved · source: planning:EPIC-002

Clinic setup: administrators maintain specializations, the doctor roster and the configuration values booking rules depend on. Fully standalone — specializations, doctors, disease mappings and patient accounts are created inside the system with no integration or bulk import.

Goal: administrators configure the clinic's roster and the settings the booking logic relies on.

Carried assumptions:
- (a) Consultation fee is informational display text only — no payment, billing, invoicing or refund anywhere; fees are settled offline at the clinic.
- (b) A single clinic timezone configured by the administrator applies to all users; no multi-timezone support.
- (c) Deferred to a later version at this Lightweight MVP scope: admin all-appointments oversight view, cancel/reassign of other people's appointments, booking on a walk-in patient's behalf, administrative management of patient accounts, and operational reports (appointments per doctor, cancellations, no-shows).

Stories: US-006 manage specializations; US-007 create and maintain doctor profiles; US-008 configure clinic timezone and booking cutoff.

**Related:** US-006, US-007, US-008

### EPIC-003 · approved · source: planning:EPIC-003

Disease/symptom catalogue and doctor search. Patients type a disease, symptom or specialization name; a predefined admin-maintained mapping table resolves the term to one or more specializations and lists the clinic's matching active doctors. Strictly deterministic lookup — no AI, LLM or ML anywhere.

Goal: let patients find the right doctor from a disease/symptom/specialization term via a stored mapping, with no AI/ML.

Carried assumption: the disease and symptom catalogue is seeded at launch with common conditions and symptoms, and thereafter editable only by administrators.

Stories: US-009 seeded catalogue at launch; US-010 admin edits disease-to-specialization mapping; US-011 patient searches by disease/symptom/specialization; US-012 doctor directory results with specialization and consultation fee.

**Related:** US-009, US-010, US-011, US-012

### EPIC-004 · approved · source: planning:EPIC-004

Doctor availability and slot generation. Each doctor defines a weekly recurring schedule (working days, start/end times, slot length, breaks) plus one-off exceptions such as leave. The system generates discrete bookable slots, and every generated slot holds exactly one patient.

Goal: model doctor availability as a recurring weekly pattern plus exceptions and generate discrete single-patient slots from it.

Carried assumption: availability is modelled as a recurring weekly pattern plus exceptions, not individually hand-entered slots.

Stories: US-013 doctor defines weekly recurring availability pattern; US-014 doctor records one-off availability exceptions; US-015 system generates discrete bookable slots that hold exactly one patient.

**Related:** US-013, US-014, US-015

### EPIC-005 · approved · source: planning:EPIC-005

Appointment booking, reschedule and cancellation. Patients book a specific generated slot; a slot can never be booked twice — booking runs in a DB transaction guarded by a uniqueness constraint on the doctor-and-slot pair, so a losing concurrent attempt gets a clear 'slot just taken' message. Availability is always shown fresh.

Goal: deliver guarded, never-double-booked slot booking plus reschedule/cancel within the cutoff, with fresh availability and patient appointment lists.

Carried assumptions:
- (a) 'Fresh availability' = a fresh fetch when the booking page opens plus a short-interval refresh, with the DB transaction as the authoritative guard; no persistent push/websocket layer.
- (b) Booking, reschedule and cancellation confirmations are on-screen and in the appointment list; no confirmation or reminder email (transactional email out of scope).
- (c) No waitlist and no automatic rebooking when a slot frees up — patients re-check availability themselves.
- (d) Patients may reschedule or cancel only up to the admin-configured cutoff before appointment start.

Stories: US-016 freshly refreshed slot availability; US-017 double-booking-proof booking; US-018 'slot just taken' race message; US-019 reschedule before cutoff; US-020 cancel before cutoff with slot freed; US-021 patient views upcoming and past appointments.

**Related:** US-016, US-017, US-018, US-019, US-020, US-021

### EPIC-006 · approved · source: planning:EPIC-006

Doctor appointment workload and status management. Doctors see their own upcoming and past appointments and move each through its lifecycle: Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator) and No-show.

Goal: give doctors a view of their own appointments and the ability to advance each through the agreed status lifecycle.

Carried assumption: the status set and the permitted transitions (Booked, Confirmed, Completed, Cancelled, No-show) are the agreed lifecycle for this build.

Stories: US-022 doctor views upcoming and past appointments; US-023 doctor updates appointment status through the lifecycle.

**Related:** US-022, US-023

### EPIC-007 · approved · source: planning:EPIC-007

Consultation records and prescriptions. Per appointment, the treating doctor records notes, diagnosis and advice plus a structured prescription (medicine, dosage, duration). Patients view and print their own history. Not an EMR: lab report uploads, medical file uploads and vitals tracking are out of scope.

Goal: capture per-appointment clinical content and structured prescriptions, visible only to the patient and treating doctor, with print and an access audit log.

Carried assumptions:
- (a) Consultation notes and prescriptions are visible only to the patient they belong to and the treating doctor; administrators see scheduling data (who, when, status) but never clinical content.
- (b) An audit log records who viewed or changed a consultation record, as a baseline safeguard, without the system being certified against HIPAA, GDPR or any other specific regime in this build.

Stories: US-024 doctor records notes/diagnosis/advice; US-025 doctor records structured prescription; US-026 patient views and prints own consultation history; US-027 clinical content restricted to patient and treating doctor; US-028 audit log of access to consultation records.

**Related:** US-024, US-025, US-026, US-027, US-028

### EPIC-008 · approved · source: planning:EPIC-008

Platform foundations and clinic documentation. Cross-cutting characteristics the whole product must hold plus the written material clinic staff need. Delivered as a single responsive web application usable on mobile browsers, in English only, in one clinic timezone.

Goal: ensure product-wide qualities (responsive web, single language/timezone, encryption, hashed credentials) and deliver setup and usage documentation.

Carried assumptions:
- (a) No native iOS or Android application is built.
- (b) English only; no multi-language support.
- (c) Baseline health-data safeguards (encryption in transit and at rest, RBAC, audit logging) applied, but no specific certification (e.g. HIPAA, GDPR) pursued in this build.
- (d) Target scale ~10–50 doctors and a few thousand registered patients, with everyday reliability as the priority.

Stories: US-029 responsive web app usable on mobile browsers; US-030 single language and single clinic timezone throughout; US-031 health data protected in transit and at rest; US-032 setup and usage documentation for clinic staff.

**Related:** US-029, US-030, US-031, US-032

### SPRINT-1 · approved · source: plan:SPRINT-1

Sprint 1 (capacity 20). Goal: user accounts, administrator-created staff accounts and role/ownership enforcement across the API.

Plan version 3, status generated. Sprint 1 goal: 'Delivered: user accounts, administrator-created staff accounts and role/ownership enforcement across the API.' Capacity 20.

Stories associated with this epic group (EPIC-001): US-001 (5 pts, backend-agent), US-002 (5 pts, backend-agent), US-003 (3 pts, backend-agent), US-004 (5 pts, security-agent), US-005 (3 pts, backend-agent). Note: US-002 and US-005 sign-in sessions and patient profile are stated in the Sprint 3 goal; related stories are listed here by epic association.

**Related:** US-001, US-002, US-003, US-004, US-005

### SPRINT-2 · approved · source: plan:SPRINT-2

Sprint 2 (capacity 20). Goal: specializations, disease mapping catalogue admin, clinic settings and the encryption/hosting baseline.

Plan version 3, status generated. Sprint 2 goal: 'Delivered: specializations, disease mapping catalogue admin, clinic settings and the encryption/hosting baseline.' Capacity 20.

Related stories: US-006 manage specializations (3 pts, backend-agent); US-010 admin edits disease-to-specialization mapping (5 pts, backend-agent); US-008 configure clinic timezone and booking cutoff (3 pts, backend-agent); US-031 health data protected in transit and at rest (5 pts, devops-agent).

**Related:** US-006, US-008, US-010, US-031

### SPRINT-3 · approved · source: plan:SPRINT-3

Sprint 3 (capacity 20). Goal: sign-in sessions and patient profile, seeded catalogue, and patient-facing doctor search with results.

Plan version 3, status generated. Sprint 3 goal: 'Sign-in sessions and patient profile, seeded catalogue, and patient-facing doctor search with results.' Capacity 20.

Related stories: US-002 sign in/sign out/session expiry (5 pts, backend-agent); US-005 patient manages own profile (3 pts, backend-agent); US-009 seeded catalogue at launch (3 pts, backend-agent); US-011 patient searches by disease/symptom/specialization (5 pts, backend-agent); US-012 doctor directory results with specialization and fee (3 pts, frontend-agent).

**Related:** US-002, US-005, US-009, US-011, US-012

### SPRINT-4 · approved · source: plan:SPRINT-4

Sprint 4 (capacity 20). Goal: doctor profiles patients can see, doctor weekly availability and exceptions, and one labelled clinic timezone everywhere.

Plan version 3, status generated. Sprint 4 goal: 'Doctor profiles patients can see, doctor weekly availability and exceptions, and one labelled clinic timezone everywhere.' Capacity 20.

Related stories: US-007 create/maintain doctor profiles (5 pts, backend-agent); US-013 doctor defines weekly recurring availability pattern (8 pts, backend-agent) with tasks US-013-T1 availability & break tables, US-013-T2 pattern validation rules, US-013-T3 get/put weekly availability endpoints, US-013-T4 week-view availability editor (frontend-agent); US-014 doctor records one-off availability exceptions (5 pts, backend-agent); US-030 single language and single clinic timezone throughout (2 pts, frontend-agent).

**Related:** US-007, US-013, US-014, US-030

### SPRINT-5 · approved · source: plan:SPRINT-5

Sprint 5 (capacity 24). Goal: bookable slots generated from availability, freshly refreshed on screen, and a booking that can never double-book.

Plan version 3, status generated. Sprint 5 goal: 'Bookable slots generated from availability, freshly refreshed on screen, and a booking that can never double-book.' Capacity 24.

Related stories: US-015 system generates discrete single-patient slots (8 pts, backend-agent) with tasks US-015-T1 slot expansion from weekly pattern, US-015-T2 apply exceptions and clinic-time cutoff, US-015-T3 availability endpoint with booked-slot marking, US-015-T4 slot generation test suite (qa-agent); US-016 freshly refreshed slot availability (3 pts, frontend-agent); US-017 double-booking-proof booking (8 pts, backend-agent) with tasks US-017-T1 appointments table with unique slot constraint, US-017-T2 transactional booking endpoint, US-017-T3 duplicate-booking check for same patient, US-017-T4 slot selection and confirmation screen (frontend-agent).

**Related:** US-015, US-016, US-017

### SPRINT-6 · approved · source: plan:SPRINT-6

Sprint 6 (capacity 20). Goal: proven race behaviour, reschedule and cancel within the cutoff, and appointment lists for patient and doctor.

Plan version 3, status generated. Sprint 6 goal: 'Proven race behaviour, reschedule and cancel within the cutoff, and appointment lists for patient and doctor.' Capacity 20.

Related stories: US-018 'slot just taken' race message (3 pts, qa-agent); US-019 reschedule before cutoff (5 pts, backend-agent); US-020 cancel before cutoff with slot freed (3 pts, backend-agent); US-021 patient views upcoming and past appointments (3 pts, frontend-agent); US-022 doctor views upcoming and past appointments (3 pts, frontend-agent).

**Related:** US-018, US-019, US-020, US-021, US-022

### SPRINT-7 · approved · source: plan:SPRINT-7

Sprint 7 (capacity 20). Goal: appointment status lifecycle plus consultation notes and structured prescriptions, restricted to patient and treating doctor.

Plan version 3, status generated. Sprint 7 goal: 'Appointment status lifecycle plus consultation notes and structured prescriptions, restricted to patient and treating doctor.' Capacity 20.

Related stories: US-023 doctor updates appointment status through lifecycle (5 pts, backend-agent); US-024 doctor records notes/diagnosis/advice (5 pts, backend-agent); US-025 doctor records structured prescription (3 pts, backend-agent); US-027 clinical content restricted to patient and treating doctor (3 pts, security-agent).

**Related:** US-023, US-024, US-025, US-027

### SPRINT-8 · approved · source: plan:SPRINT-8

Sprint 8 (capacity 20). Goal: patient consultation history with print, append-only audit log, responsive polish and handover documentation.

Plan version 3, status generated. Sprint 8 goal: 'Patient consultation history with print, append-only audit log, responsive polish and handover documentation.' Capacity 20.

Related stories: US-026 patient views and prints own consultation history (5 pts, frontend-agent); US-028 audit log of access to consultation records (5 pts, backend-agent); US-029 responsive web app usable on mobile browsers (5 pts, frontend-agent); US-032 setup and usage documentation for clinic staff (5 pts, devops-agent).

**Related:** US-026, US-028, US-029, US-032
<!-- sdlc:auto:end narrative -->
