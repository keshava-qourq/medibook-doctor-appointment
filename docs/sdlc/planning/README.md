# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Establish accounts, authentication and role-based access for the three roles sharing one system. Patients self-register; doctor and administrator accounts are created by an administrator who issues credentials. Authentication is email and password with hashed storage and role-based authorisation.

Goal: one system, three roles (patient, doctor, administrator), with authorisation enforced on every screen and request.

Open assumptions carried into this epic:
(a) No SSO and no two-factor authentication in this build.
(b) Transactional email is out of scope for this version, so there is no self-service email-based password reset — an administrator issues a replacement password instead.
(c) Baseline health-data safeguards (role-based access control, encryption in transit and at rest, audit logging of consultation record access) are applied, but the system is not being certified against a specific regime such as HIPAA or GDPR in this build.

**Related:** US-001, US-002, US-003, US-004, US-005, REQ-010

### EPIC-002 · approved · source: planning:EPIC-002

Give administrators the tools to maintain the clinic's own roster and the configuration values the booking rules depend on: specializations, doctor profiles, clinic timezone and booking cutoff. The system is fully standalone with no integration or bulk import.

Goal: administrator-maintained clinic setup — specializations, doctors, disease mappings and patient accounts all created inside the system.

Open assumptions carried into this epic:
(a) The consultation fee is informational display text only — no payment, billing, invoicing or refund capability anywhere; fees are settled offline at the clinic.
(b) A single administrator-configured clinic timezone applies to all users; no multi-timezone support.
(c) Deferred to a later version at this Lightweight MVP scope, although discussed: the administrator's all-appointments oversight view, cancel/reassign of other people's appointments, booking on a walk-in patient's behalf, administrative management of patient accounts, and operational reports (appointments per doctor, cancellations, no-shows).

**Related:** US-006, US-007, US-008, REQ-015

### EPIC-003 · approved · source: planning:EPIC-003

Let patients find a doctor by typing a disease, symptom or specialization name. An administrator-maintained mapping table resolves the term to specializations and the system lists matching active doctors.

Goal: deterministic disease/symptom/specialization search over a predefined catalogue, with a doctor directory as the result.

Matching is strictly deterministic lookup over the stored catalogue and mapping — no AI, no large language model and no machine learning anywhere in it.

Open assumption carried into this epic: the disease and symptom catalogue is seeded at launch with a set of common conditions and symptoms, and is thereafter editable only by administrators.

**Related:** US-009, US-010, US-011, US-012, REQ-011, NFR-012

### EPIC-004 · approved · source: planning:EPIC-004

Each doctor defines a weekly recurring schedule (working days, start/end times, slot length, breaks) plus one-off exceptions such as leave days. The system generates discrete bookable slots from that definition.

Goal: turn doctor-defined availability into individual timed slots, where every generated slot holds exactly one patient.

Open assumption carried into this epic: availability is modelled as a recurring weekly pattern plus exceptions, not as individually hand-entered slots.

**Related:** US-013, US-014, US-015, REQ-013

### EPIC-005 · approved · source: planning:EPIC-005

Patients book a specific generated slot, with the same slot never bookable twice. Booking runs inside a database transaction guarded by a uniqueness constraint on the doctor-and-slot pair, so a losing concurrent attempt gets a clear 'slot just taken' message. Availability is always shown fresh.

Goal: reliable booking, reschedule and cancellation with no double-booking and no silent collisions.

Open assumptions carried into this epic:
(a) 'Fresh availability' means a fresh fetch when the booking page opens plus a short-interval refresh, with the database transaction as the authoritative guard — no persistent push/websocket layer.
(b) Transactional email is out of scope for this version, so booking, reschedule and cancellation confirmations are given on screen and in the patient's appointment list; no confirmation or reminder email is sent.
(c) No waitlist and no automatic rebooking when a slot frees up — patients re-check availability themselves.
(d) Patients may reschedule or cancel only up to the administrator-configured cutoff before the appointment start.

**Related:** US-016, US-017, US-018, US-019, US-020, US-021, REQ-012, NFR-014, NFR-015

### EPIC-006 · approved · source: planning:EPIC-006

Doctors see their own upcoming and past appointments and move each one through its lifecycle, so the schedule reflects what actually happened.

Goal: doctor-facing workload view plus appointment status management.

Statuses: Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator) and No-show.

Open assumption carried into this epic: the status set and the permitted transitions above are the agreed lifecycle for this build.

**Related:** US-022, US-023, REQ-013

### EPIC-007 · approved · source: planning:EPIC-007

Per appointment, the treating doctor records consultation notes, diagnosis and advice plus a structured prescription (medicine, dosage, duration). Patients view and print their own history.

Goal: lightweight clinical documentation with strict access limits and an audit trail.

Clinical content stops here: this is not an electronic medical record; lab report uploads, medical file uploads and vitals tracking are out of scope.

Open assumptions carried into this epic:
(a) Consultation notes and prescriptions are visible only to the patient they belong to and the treating doctor — administrators can see scheduling data (who, when, status) but never clinical content.
(b) An audit log records who viewed or changed a consultation record as a baseline safeguard, without the system being certified against HIPAA, GDPR or any other specific regime in this build.

**Related:** US-024, US-025, US-026, US-027, US-028, REQ-014, NFR-009, NFR-010

### EPIC-008 · approved · source: planning:EPIC-008

Cross-cutting platform characteristics the whole product must hold, plus the written material clinic staff need to run it. Delivered as a single responsive web application usable on mobile browsers, in English only, in one clinic timezone.

Goal: platform-wide qualities (responsiveness, single language/timezone, data protection) and the setup/usage documentation handover.

Open assumptions carried into this epic:
(a) No native iOS or Android application is built.
(b) The interface is English only with no multi-language support.
(c) Baseline health-data safeguards (encryption in transit and at rest, role-based access control, audit logging) are applied, but no specific certification such as HIPAA or GDPR is being pursued in this build.
(d) Target operating scale is roughly 10–50 doctors and a few thousand registered patients, with everyday reliability as the priority.

**Related:** US-029, US-030, US-031, US-032, REQ-016, NFR-018, NFR-020, NFR-025
<!-- sdlc:auto:end narrative -->
