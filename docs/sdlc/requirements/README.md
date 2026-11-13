# Product Requirements

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
## Summary

### REQ-001 · approved · source: requirements:technology_stack

Product owner approved a fixed technology stack with no substitutions permitted. The stack is chosen around one hard guarantee: a slot is never booked twice. Reliability is prioritised over speed at the stated clinic scale.

Approved stack (design against exactly these; no substitutions):
- Backend: FastAPI 0.115. Hosts the no-double-booking rule as a DB transaction inserting against a unique constraint, returning "slot just taken" to the losing request. Also hosts role checks (keeping clinical notes away from admins), the audit log entry on every consultation record viewed, and slot generation from each doctor's weekly schedule plus leave exceptions. Capacity well above the 10–50 doctor / few-thousand-patient need — deliberate.
- Cloud: AWS. Chosen for a system in real daily clinical use holding identifiable health data, no deadline pressure, reliability first. Provides managed PostgreSQL with automated backups, point-in-time recovery, at-rest encryption, plus TLS termination for encryption in transit — the three committed safeguards delivered as configuration, not code. A signed agreement for a health-data regime remains possible later.
- Database: PostgreSQL 16. The no-double-booking promise rests on a unique constraint on (doctor, slot time) inside a transaction, so the database itself refuses the second booking rather than application code. Also carries the disease/symptom-to-specialization mapping as a join table, admin reports as plain queries, the audit log as an append-only table, and at-rest encryption from the managed service.
- Frontend: React 19. One responsive website serving patient on phone, doctor on tablet, admin on a filterable appointment list — one codebase to build, test and maintain.
  - Noted conflict: the analyst's note said "Next.js/React"; Next.js is not available on this platform, so this is plain React talking to the API. Nothing described (no public marketing pages, no SEO need, everything behind a login) depends on Next.js.

**Related:** REQ-002, REQ-003

### REQ-002 · approved · source: requirements:services

One approved runtime service: Redis used as a queue. It exists to schedule appointment reminders and to keep confirmation work off the booking request path, with retries.

- Queue: Redis (as a queue), container image redis:7-alpine. Include exactly this in runtime_needs.
- Rationale given: appointment reminders must go out at a set time before the visit; confirmation work should not make the patient wait while the booking saves; a queue with a scheduler covers both and retries if the provider is briefly down.
- API keys/environment required by the app: REDIS_URL.
- Conflict to note: email is listed as out of scope (SendGrid removed from the stack), while the queue rationale references confirmation and reminder emails. Both statements are recorded as given.

**Related:** REQ-001, REQ-003

### REQ-003 · approved · source: requirements:scope

Delivery scope is lightweight, requirements version 1, status approved. In-scope capabilities cover search, booking, doctor schedules, consultation records and clinic administration. A specific out-of-scope list is excluded from design and build.

Out of scope — do not design or build:
- Lab report and medical file uploads, vitals tracking, full EMR.
- Online/video consultations and in-app telemedicine calls.
- Google/Outlook calendar sync, EMR or hospital information system integration, bulk data import from spreadsheets.
- Email (the suggested SendGrid was removed from the stack).

In scope:
- Patient self-registration and sign-in; doctor and admin accounts created by an administrator.
- Disease, symptom and specialization search over the mapping catalogue; catalogue seeded with common conditions.
- Doctor directory with specialization and consultation fee (text only, settled at the clinic).
- Doctor weekly availability (days, hours, slot length, breaks) and automatic generation of bookable slots; each slot holds exactly one patient.
- Booking that can never double-book; "slot just taken" message on a race; freshly refreshed availability on page load (not live push).
- Patient reschedule and cancellation before the cutoff; patient appointment list.
- Doctor's upcoming/past appointment list and status updates.
- Consultation notes, diagnosis and advice per visit; structured prescriptions (medicine, dosage, duration); patient's own printable consultation history.
- Admin management of doctor accounts/profiles, specializations and the disease-to-specialization mapping.
- Patient profile management; clinic timezone and booking cutoff settings.
- Setup and usage documentation for clinic staff.
- English-only interface, single clinic timezone; responsive web app on mobile browsers, no native app.

**Related:** REQ-001, REQ-002

### REQ-010 · approved · source: requirements:functional:Sign-in & accounts

Covers how all three roles get accounts and are authenticated and authorised. Patients self-register; staff accounts are created by an administrator. Access is checked by role and record ownership on every screen and request.

Requirements in this group:
- Patient self-registration: visitor creates a patient account with full name, email, phone and a password meeting stated strength rules; email must not already be in use; on success the person is signed in and taken straight to doctor search.
- Sign in and sign out: patients, doctors and administrators sign in with email and password and land on the view for their role; signing out ends the session immediately and previously visited protected pages are no longer shown.
- Administrator creates staff accounts: admin enters name, email, role and an initial password, shown once for hand-off; nobody else can create Doctor/Administrator roles; an email already in use is rejected.
- Replacement password for staff: with no self-service reset, an administrator issues a replacement password; the old password stops working at once and any session that account holds stops working too.
- Access refused by role and owner: every screen and server request is checked against the signed-in user's role and ownership; requests for another user's appointment or record, for another role's screen, or made while signed out are refused or sent back to sign-in with no data returned.
- Patient profile and password: patient views and updates own name, phone, date of birth and gender, sees email as stored, and changes password by supplying the current one plus a new one meeting strength rules.

**Related:** NFR-001, NFR-002, NFR-003, NFR-004, NFR-008

### REQ-011 · approved · source: requirements:functional:Finding a doctor

Patients find a doctor by typing a disease, symptom or specialization. Matching is a deterministic lookup over the stored catalogue and mapping. Results list active doctors with fee shown as plain text.

Requirements in this group:
- Search by disease or symptom: typing at least two characters shows matching suggestions from the stored catalogue; submitting a term resolves it through the mapping to one or more specializations and lists every active doctor holding them.
- No match and no specialist messages: an unknown term produces a clear "nothing matched" message inviting another term or browsing all specializations; a matched specialization with no active doctors tells the patient the clinic has no specialist for that condition.
- Doctor results with fee: each result shows name, specializations, qualifications and consultation fee as plain text with a note the fee is paid at the clinic; selecting a doctor opens their profile and available slots, or says the doctor is no longer available if deactivated meanwhile.
- Filter the result list: narrow results by specialization or doctor name, showing active doctors only; applied filters are shown on screen and can be cleared.

**Related:** NFR-012, NFR-013, NFR-023

### REQ-012 · approved · source: requirements:functional:Booking appointments

Covers slot freshness, booking, the double-booking guard, duplicate refusal, reschedule and cancellation before the cutoff, and the patient's appointment list. One appointment per slot is the central rule.

Requirements in this group:
- Fresh slot availability: slot list fetched from the server when the page opens and refreshed at a short interval while open; changing doctor or date clears the old list and fetches the new one; a failed fetch shows an explicit error with nothing bookable.
- Book a slot: patient selects an open slot, optionally gives a reason, confirms; appointment created with status Booked; on-screen confirmation shows doctor, date and time in the clinic timezone, clinic location, fee payable at the clinic, and that the visit is in person.
- Slot just taken message: when two patients confirm the same slot almost simultaneously, only one booking is created; the other is told plainly the slot was just taken and no booking was made, and the slot list is refreshed.
- Duplicate booking refused: a repeat attempt for the same doctor, date and time the patient already holds is refused with a message pointing to the existing appointment.
- Reschedule before the cutoff: a Booked or Confirmed appointment further away than the configured cutoff can be moved to another open slot in one step; the new slot is taken and the old freed at once. Inside the cutoff, or once Completed/Cancelled/No-show, Reschedule is not offered and the reason and cutoff are stated.
- Cancel before the cutoff: cancellation of a Booked or Confirmed appointment outside the cutoff sets status Cancelled with who cancelled and when, and the slot immediately reopens. Inside the cutoff the Cancel action is disabled with an explanation and a note to contact the clinic.
- My appointments list: upcoming soonest first, past most recent first; each shows doctor, specialization, date and time in the clinic timezone, location and current status. Rows outside the cutoff offer Reschedule and Cancel; completed visits link to the consultation record; an empty list offers a link to search for a doctor.

**Related:** NFR-014, NFR-015, NFR-020, NFR-026

### REQ-013 · approved · source: requirements:functional:Doctor's schedule

Doctors define a weekly recurring availability pattern plus one-off exceptions; the system turns these into discrete timed slots. Doctors also see and manage their own appointment list and statuses.

Requirements in this group:
- Weekly availability pattern: per working day a start time, end time, slot length in minutes and any break periods, shown back as a week view in the clinic timezone. Rejected with a message naming the day and field for: end time at or before start, slot length of zero or less, breaks outside working hours, overlapping breaks.
- Warning about booked times: if a pattern change means an already-booked time is no longer a working time, the doctor is warned and shown the affected appointments, which are kept rather than deleted.
- One-off leave and extra hours: a future date, or a time range within a date, can be marked unavailable so no unbooked slots are offered then; an extra one-off window generates bookable slots at the usual slot length. Past dates are refused.
- Confirming leave over bookings: when a date marked unavailable already has bookings, the doctor is shown the affected appointments and must confirm; on confirmation each is set to Cancelled with the reason recorded, and the patient sees the cancellation and reason in their appointment list.
- Generating bookable slots: weekly pattern plus exceptions become individual timed slots at the configured length, excluding break periods, times beyond working hours, periods covered by an exception, and today's slots whose start time has passed. A booked slot shows as unavailable because it holds exactly one patient.
- Doctor's appointment list: My Schedule shows today's appointments in time order with patient name, slot time in the clinic timezone, stated reason and current status; another date or date range can be picked and status filtered; only the doctor's own appointments appear; empty days show a clear message.
- Update appointment status: the treating doctor moves an appointment to Confirmed, or after the slot time to Completed or No-show, or cancels with a reason (freeing the slot at once and showing the cancellation and reason to the patient). Each change records time and doctor identity; Completed or Cancelled appointments cannot be changed again.

**Related:** NFR-020, NFR-022, NFR-026

### REQ-014 · approved · source: requirements:functional:Consultation records

The treating doctor records notes, diagnosis, advice and structured prescriptions against an appointment. Patients read and print their own history. Every access to a record is audited.

Requirements in this group:
- Record consultation notes: the treating doctor records notes, a diagnosis and advice against an appointment that has taken place, saved with time and identity and shown when the appointment is reopened. Diagnosis is required; records can be edited and re-saved; no option to upload files or record vitals is offered.
- Structured prescription lines: each line holds medicine name, dosage and duration as separate fields, shown back as a table. A line missing any of the three is rejected; lines can be removed before saving; a consultation with no lines saves and shows as no medication prescribed.
- Patient consultation history: patient sees own consultations most recent first with date, doctor, specialization and diagnosis, and can open one to read notes, advice and the full prescription table. With no completed consultations an empty-state message explains records appear after a visit.
- Printable consultation record: a print view containing clinic name, patient name, date, doctor name and qualifications, diagnosis, advice and the prescription table, with no navigation, buttons or menus.
- Audit log of record access: every successful view, every create or edit by a doctor, and every refused access attempt writes an entry capturing who, which record and patient, the action and the time. Administrators can read the log, which shows identifiers and actions only.

**Related:** NFR-009, NFR-010, REQ-003

### REQ-015 · approved · source: requirements:functional:Clinic admin & settings

Administrators maintain specializations, doctor profiles, the seeded disease-to-specialization catalogue, and the clinic timezone and booking cutoff. History is preserved when things are deactivated or deleted.

Requirements in this group:
- Manage specializations: create, rename, list and deactivate; duplicate names refused. A specialization still used by a doctor or a mapping cannot be deleted — counts are shown and deactivation offered instead; a deactivated one disappears from patient search while past appointments stay intact.
- Maintain doctor profiles: display name, one or more specializations, qualifications, short biography, clinic room or location, consultation fee text and active status. At least one specialization required. Marking a doctor inactive removes them from search and new bookings while showing the count of affected future appointments, which remain visible to patient and doctor.
- Seeded disease catalogue: ships with a starter catalogue of common diseases and symptoms already mapped to specializations; each entry shows term, whether disease or symptom, and its specializations. Seeded entries are editable and deletable like any other, and re-running seeding never recreates or overwrites administrator changes.
- Edit disease mapping: add, edit and remove catalogue terms and their specializations, with at least one specialization required per entry. Changes take effect for patient search straight away; a term mapped to two specializations returns doctors from both; deleting a term leaves appointments already booked through it untouched.
- Timezone and cutoff settings: a single clinic timezone used to display all times, and the number of hours before an appointment within which patients may no longer reschedule or cancel. A negative or non-numeric cutoff is rejected inline and the previous value stays in force; until the timezone is confirmed a documented default applies and the settings page flags it.

**Related:** NFR-013, NFR-020, NFR-024, NFR-026

### REQ-016 · approved · source: requirements:functional:Help & documentation

Written setup and per-role usage documentation must be delivered with the system, matching the real interface and stating plainly what the system does not do.

Requirements in this group:
- Setup documentation: covers deployment and hosting, database provisioning, environment configuration, creating the first administrator account, setting the clinic timezone and booking cutoff, and the contents and editing of the seeded disease and symptom catalogue.
- Usage documentation per role: walks through the patient journey, the doctor journey and the administrator journey, with screen names and button labels matching the real interface. It also states plainly what the system does not do: no online payments, no video consultations, no file uploads or vitals, no calendar or record-system integration, no email or text notifications.

**Related:** NFR-025, REQ-003

### NFR-001 · approved · source: requirements:NFR-001

Security. Passwords for every role are stored only as salted one-way hashes.

No plain-text or reversible password exists anywhere, including in logs. Applies to self-registration, administrator-issued credentials and password changes.

**Related:** REQ-010

### NFR-002 · approved · source: requirements:NFR-002

Security. Sessions end on sign-out, inactivity, account deactivation or issue of a replacement password.

After any of those events, further action is rejected and the user must sign in again; protected pages are not shown from the browser's history.

**Related:** REQ-010

### NFR-003 · approved · source: requirements:NFR-003

Security. Role and ownership are checked on every server request, not just in the UI.

Guessing or substituting an identifier in the address, or calling an endpoint directly, returns an access-denied response with no data. Unauthenticated requests are sent to sign-in.

**Related:** REQ-010, REQ-014

### NFR-004 · approved · source: requirements:NFR-004

Security. Failed sign-in reveals nothing about whether an account exists.

One generic message is shown that does not say whether the email address is registered, and no session is created.

**Related:** REQ-010

### NFR-005 · approved · source: requirements:NFR-005

Security. All application traffic, including every API call, is encrypted in transit.

Requests made over an unencrypted connection are redirected to or refused in favour of the encrypted equivalent.

**Related:** REQ-001

### NFR-006 · approved · source: requirements:NFR-006

Security. The database holding patient, appointment and consultation data has encryption at rest enabled.

Encryption at rest must be switched on and evidenced in the deployment documentation.

**Related:** REQ-001

### NFR-007 · approved · source: requirements:NFR-007

Security. Errors and logs never contain credentials or clinical content.

On-screen error messages and log entries never contain a password, a session token, or clinical content such as notes, diagnosis or prescription detail.

**Related:** REQ-014

### NFR-008 · approved · source: requirements:NFR-008

Security, accepted risk. No single sign-on, no two-factor authentication and no self-service password reset in this build.

A doctor or administrator who loses their password must ask an administrator for a replacement. Explicitly accepted for this version.

**Related:** REQ-010

### NFR-009 · approved · source: requirements:NFR-009

Privacy. Clinical content is returned only to the patient it belongs to and the treating doctor.

Notes, diagnosis, advice and prescriptions go only to that patient and the doctor who treated that appointment. Administrators see scheduling data only (patient, doctor, date, time, status) and the underlying requests never return clinical content to them. A doctor's access covers only the consultations they treated.

**Related:** REQ-014, REQ-015

### NFR-010 · approved · source: requirements:NFR-010

Privacy. The audit log is append-only and holds no clinical content.

Entries for views, creations, edits and refused attempts on consultation records cannot be edited or deleted by anyone through the application, including administrators. Entries record identifiers, actions, people and times rather than the clinical content itself.

**Related:** REQ-014

### NFR-011 · approved · source: requirements:NFR-011

Compliance, accepted risk. Baseline health-data safeguards are applied without formal certification.

Safeguards applied: role-based access control, encryption in transit and at rest, audit logging of consultation record access. The system is knowingly not being certified or formally assessed against HIPAA, GDPR or any other specific regime in this build.

**Related:** NFR-003, NFR-005, NFR-006, NFR-010

### NFR-012 · approved · source: requirements:NFR-012

Compliance. Disease/symptom matching is deterministic lookup, never AI.

Resolving a typed disease, symptom or specialization to doctors is plain text matching against the stored catalogue and mapping table only. No artificial intelligence, language model or machine learning is used, and the patient is never shown a guessed or invented match.

**Related:** REQ-011

### NFR-013 · approved · source: requirements:NFR-013

Compliance. No payment or billing capability anywhere in the product.

The consultation fee is informational text settled at the clinic. No screen anywhere offers payment, checkout, invoicing or refunds. Booking and result pages state the fee is payable at the clinic.

**Related:** REQ-011, REQ-012, REQ-015

### NFR-014 · approved · source: requirements:NFR-014

Availability. Exactly one appointment per slot, even under a concurrent race.

When two patients submit a booking for the same doctor and slot at effectively the same moment, exactly one appointment exists afterwards. The losing attempt, and any other failed attempt, leaves no partial record behind and the slot stays correctly open or taken — as does a rejected registration.

**Related:** REQ-012, REQ-001

### NFR-015 · approved · source: requirements:NFR-015

Availability. Slot availability is kept fresh by polling, with no live push layer.

Availability is fetched from the server when the booking page opens and refreshed automatically at a short interval while the page stays open, rather than from a cached copy. There is no persistent push or websocket layer; the booking transaction remains the authoritative guard against a stale list.

**Related:** REQ-012

### NFR-016 · approved · source: requirements:NFR-016

Availability. Clinic data is held in a managed database with automated backups and point-in-time recovery.

Patient, appointment and consultation data must be restorable after a failure or mistake.

**Related:** REQ-001

### NFR-017 · approved · source: requirements:NFR-017

Scalability. Sized for one small clinic in everyday use, with reliability rather than raw speed as the priority.

Target: roughly 10–50 doctors and a few thousand registered patients.

**Related:** REQ-001

### NFR-018 · approved · source: requirements:NFR-018

Compatibility. Every task is completable on phone, tablet and desktop browsers.

Controls are reachable and tappable, content needs no horizontal scrolling, and the layout adapts across common breakpoints without clipping or overlap.

**Related:** REQ-001

### NFR-019 · approved · source: requirements:NFR-019

Compatibility, accepted risk. The responsive web application is the only client.

No native iOS or Android application is built in this version. Explicitly accepted.

**Related:** NFR-018, REQ-003

### NFR-020 · approved · source: requirements:NFR-020

Usability. All times are shown to every role in the single labelled clinic timezone.

Every slot, appointment and schedule is displayed in the configured clinic timezone with that timezone labelled on screen, never converted to the device timezone. Dates and times use one consistent documented format throughout.

**Related:** REQ-012, REQ-013, REQ-015

### NFR-021 · approved · source: requirements:NFR-021

Usability, accepted risk. English-only interface and a single clinic timezone.

No language selector is offered and only one clinic timezone is supported. Multi-language and multi-timezone support are knowingly left out of this build.

**Related:** NFR-020

### NFR-022 · approved · source: requirements:NFR-022

Usability. Inline validation identifies the faulty fields and keeps what the user typed.

When a form is rejected, the specific fields at fault are identified inline with a clear message, values already entered are preserved, and the previous saved values stay in force.

**Related:** REQ-010, REQ-013, REQ-015

### NFR-023 · approved · source: requirements:NFR-023

Usability. Explicit empty and error states instead of blank screens.

Where there is nothing to show or data cannot be loaded, the user sees a message explaining the situation and what to do next. Nothing is shown as bookable when availability could not be fetched.

**Related:** REQ-011, REQ-012

### NFR-024 · approved · source: requirements:NFR-024

Maintainability. Re-seeding the catalogue never overwrites administrator changes.

The starter disease and symptom catalogue can be seeded repeatedly across re-deployments and restarts without recreating or overwriting entries an administrator has edited or deleted.

**Related:** REQ-015

### NFR-025 · approved · source: requirements:NFR-025

Maintainability. Documentation must let new staff work unaided.

A new staff member following the written setup and usage documentation can complete each documented task on a test instance without help from the build team, with screen names and button labels in the documentation matching the actual interface.

**Related:** REQ-016

### NFR-026 · approved · source: requirements:NFR-026

Maintainability. History is preserved and never silently removed.

Cancelled appointments, appointments of deactivated doctors, and appointments referencing deactivated specializations or deleted catalogue terms remain stored and viewable to the people entitled to see them, rather than being deleted or disappearing from lists.

**Related:** REQ-012, REQ-015
<!-- sdlc:auto:end narrative -->

<!-- sdlc:auto:start summary -->
**Requirements version:** v1  
**Delivery scope:** lightweight  
**Approved:** 2026-11-13

**Capabilities in scope:** Patient self-registration and sign-in, Disease, symptom and specialization search over the mapping catalogue, Doctor directory with specialization and consultation fee, Doctor weekly availability (days, hours, slot length, breaks), Automatic generation of bookable time slots, Appointment booking that can never double-book a slot, "Slot just taken" message when two patients race for a slot, Freshly refreshed slot availability on the booking page, Patient reschedule and cancellation before the cutoff, Doctor's upcoming and past appointment list, Appointment status updates by the doctor, Consultation notes, diagnosis and advice per visit, Structured prescription entry (medicine, dosage, duration), Patient's own consultation history, printable, Admin management of doctor accounts and profiles, Admin management of specializations, Admin editing of the disease-to-specialization mapping, Patient profile management, Clinic timezone and booking cutoff settings, Setup and usage documentation for clinic staff, Patients self-register with email and password, Doctor and admin accounts created by an administrator, Disease and symptom catalogue seeded with common conditions, Each generated slot holds exactly one patient, Consultation fee shown as text only, settled at the clinic, English-only interface and a single clinic timezone, Responsive web app on mobile browsers, no native app, Availability refreshed on page load, not live push, No lab reports, file uploads or vitals tracking

**Approved technology stack:**

| Layer | Choice | Rationale |
|---|---|---|
| backend | FastAPI | The one rule you cannot bend — a slot is never booked twice — lives in the server code: a database transaction that inserts the booking against a unique constraint and returns "slot just taken" to whoever loses the race. FastAPI gives a clean place to put that, plus the role checks that keep clinical notes away from admins, the audit log entry on every consultation record viewed, and the slot generation from each doctor's weekly schedule and leave exceptions. At 10–50 doctors and a few thousand patients it is far more capacity than you need, which is what you asked for: reliability over speed. |
| cloud | AWS | You described a system in real daily clinical use holding identifiable health data, with no deadline pressure and reliability as the top priority. AWS gives you managed PostgreSQL with automated backups, point-in-time recovery and at-rest encryption switched on, plus TLS termination for encryption in transit — the three safeguards you committed to, as configuration rather than code. If the clinic later needs a signed agreement for a health-data regime, AWS can provide one; you are not locked out of that by this choice. |
| database | PostgreSQL | This is the choice the no-double-booking promise rests on. A unique constraint on (doctor, slot time) inside a transaction means the database itself refuses the second booking — not application code that might be bypassed under load. It also handles the rest cleanly: the disease/symptom-to-specialization mapping is a join table, the admin reports (appointments per doctor, cancellations, no-shows) are plain queries, the audit log is an append-only table, and at-rest encryption comes from the managed service rather than being built. |
| frontend | React | Your product is one responsive website that has to work equally well for a patient booking on a phone, a doctor writing up a consultation on a tablet between visits, and an admin working through a filterable list of every appointment in the clinic. React handles all three in one codebase, so there is one thing to build, test and maintain. The analyst's note said "Next.js/React" — Next.js is not available on this platform, so this is plain React talking to the API; nothing you described (no public marketing pages, no SEO need, everything behind a login) depends on what Next.js adds. |
<!-- sdlc:auto:end summary -->

<!-- sdlc:auto:start epics -->
## EPIC-001: Accounts, Authentication and Role-Based Access

Three roles share one system: patients, doctors and administrators. Patients self-register; doctor and admin accounts are created by an administrator who issues credentials. Authentication is email and password with hashed credential storage and role-based authorisation.

Open assumptions carried into this epic: (a) no SSO and no two-factor authentication in this build; (b) because transactional email is out of scope for this version, there is no self-service email-based password reset — an administrator issues a replacement password instead; (c) baseline safeguards for health data (role-based access control, encryption in transit and at rest, audit logging of consultation record access) are applied, but the system is not being certified against a specific regime such as HIPAA or GDPR in this build.

### US-001: Patient self-registration with email and password

**Priority:** critical

> As a prospective patient, I want to create my own account using my email address and a password, so that I can search for a doctor and book an appointment without needing clinic staff to set me up.

| ID | Given | When | Then |
|---|---|---|---|
| AC-001 | I am on the registration page and not signed in | I submit my full name, a valid email address, a contact phone number and a password that meets the stated minimum strength rules | an account is created with the Patient role, my password is stored only in hashed form (never in plain text or a reversible form), and I am signed in and taken to the doctor search page |
| AC-002 | an account already exists with the email address I entered | I submit the registration form | registration is rejected with a clear message that the email is already registered and no second account is created |
| AC-003 | I am on the registration page | I submit an invalid email format, a password below the stated minimum strength, or leave a required field empty | the form is rejected, the specific invalid fields are identified inline, and the values I already entered are preserved |
| AC-004 | a registration attempt has been rejected | an administrator inspects the stored data | no partial patient record exists for that attempt |

### US-002: Sign in, sign out and session expiry

**Priority:** critical

> As a registered user of any role, I want to sign in with my email and password and have my session end when I sign out or after a period of inactivity, so that my health information is not left accessible to whoever next uses the device.

| ID | Given | When | Then |
|---|---|---|---|
| AC-005 | I have an active account | I submit my correct email and password | I am signed in and taken to the landing view for my role (patient search, doctor schedule, or admin dashboard) |
| AC-006 | I have an active account | I submit an incorrect password or an unknown email | sign-in fails with a single generic message that does not reveal whether the email exists, and no session is created |
| AC-007 | I am signed in | I choose Sign out | my session ends immediately, and using the browser back button or re-requesting a previously visited protected page returns me to the sign-in page rather than showing cached protected content |
| AC-008 | I am signed in and leave the application idle beyond the configured session timeout | I next attempt any action that reads or writes data | the session is rejected as expired and I am required to sign in again |
| AC-009 | a user account has been deactivated by an administrator | that user attempts their next action using an existing session, or attempts to sign in again | the existing session is no longer accepted and sign-in is refused with a message that the account is inactive |

### US-003: Administrator creates doctor and administrator accounts

**Priority:** critical

> As a clinic administrator, I want to create accounts for doctors and for other administrators and issue them credentials, so that only clinic-employed staff can access the system, since doctors do not self-register.

| ID | Given | When | Then |
|---|---|---|---|
| AC-010 | I am signed in as an administrator | I create a new account specifying name, email, role (Doctor or Administrator) and an initial password | the account is created with that role and active status, the password is stored hashed, and the initial password is displayed to me once for hand-off to the account holder |
| AC-011 | a doctor or administrator account exists | I issue a replacement password for that account | the previous password no longer authenticates, the new password does, and any session that account currently holds is no longer accepted |
| AC-012 | I am signed in as an administrator | I attempt to create an account with an email address already in use by any user | the creation is rejected with a clear message and no account is created |
| AC-013 | the doctor self-registration route is probed directly | any unauthenticated visitor tries to create a Doctor or Administrator account | the request is refused, because only administrators may create these roles |

### US-004: Role-based access enforcement across every screen and API call

**Priority:** critical

> As a clinic administrator responsible for patient confidentiality, I want every screen and server request to be authorised against the signed-in user's role and ownership of the record, so that no user can reach data belonging to another user or to a role they do not hold.

| ID | Given | When | Then |
|---|---|---|---|
| AC-014 | I am signed in as a patient | I request a doctor-only or administrator-only screen or server endpoint directly by its address | the request is refused with an access-denied response and none of the underlying data is returned |
| AC-015 | I am signed in as a patient | I request an appointment or consultation record that belongs to a different patient by substituting its identifier | the request is refused and the record is not returned |
| AC-016 | I am signed in as a doctor | I request the appointment list or consultation records of a different doctor | the request is refused and only my own appointments and records remain accessible |
| AC-017 | I am not signed in at all | I request any screen or endpoint other than registration, sign-in and public clinic information | I am redirected to sign-in and no protected data is returned |

### US-005: Patient manages their own profile

**Priority:** high

> As a patient, I want to view and update my own profile details and change my password, so that the clinic has correct details for my visit and I control my own credentials.

| ID | Given | When | Then |
|---|---|---|---|
| AC-018 | I am signed in as a patient | I open My Profile | I see my name, email, phone number, date of birth and gender as currently stored |
| AC-019 | I am viewing My Profile | I change my name, phone number, date of birth or gender and save | the changes are persisted, confirmed on screen, and reflected on my next visit to the page |
| AC-020 | I am signed in as a patient | I change my password by supplying my current password and a new password meeting the strength rules | the new password is stored hashed, the old password no longer authenticates, and I am told the change succeeded |
| AC-021 | I attempt to change my password | I supply an incorrect current password | the change is rejected and my existing password remains in force |

## EPIC-002: Clinic Setup: Specializations, Doctor Roster and Settings

Administrators maintain the clinic's own roster and the configuration values the booking rules depend on. The system is fully standalone: specializations, doctors, disease mappings and patient accounts are all created inside the system, with no integration or bulk import.

Open assumptions carried into this epic: (a) the consultation fee is informational display text only — there is no payment, billing, invoicing or refund capability anywhere in the system and fees are settled offline at the clinic; (b) a single clinic timezone configured by the administrator applies to all users, with no multi-timezone support; (c) at this Lightweight MVP scope the administrator's all-appointments oversight view, cancel/reassign of other people's appointments, booking on a walk-in patient's behalf, administrative management of patient accounts, and operational reports (appointments per doctor, cancellations, no-shows) are deferred to a later version even though they were discussed.

### US-006: Manage the clinic's specializations

**Priority:** high

> As a clinic administrator, I want to create, rename, deactivate and list medical specializations, so that doctors can be classified consistently and disease mappings have a fixed set of targets to point at.

| ID | Given | When | Then |
|---|---|---|---|
| AC-022 | I am signed in as an administrator | I create a specialization with a name and optional description | it is saved, appears in the specialization list, and becomes selectable when editing a doctor profile and when editing a disease mapping |
| AC-023 | a specialization already exists with a given name | I try to create another with the same name | the creation is rejected with a message that the specialization already exists |
| AC-024 | a specialization is referenced by at least one doctor or one disease mapping | I attempt to delete it | deletion is refused with a message naming how many doctors and mappings reference it, and I am offered deactivation instead |
| AC-025 | a specialization has been deactivated | a patient searches | it no longer appears as a search filter or a search result, while historical appointments that reference it remain intact and viewable |

### US-007: Create and maintain doctor profiles

**Priority:** critical

> As a clinic administrator, I want to maintain each doctor's profile including specialization, qualifications, consultation fee text and active status, so that patients see accurate information about who they can book with.

| ID | Given | When | Then |
|---|---|---|---|
| AC-026 | I am signed in as an administrator and a doctor account exists | I set the doctor's display name, one or more specializations, qualifications, a short biography, clinic room or location and a consultation fee amount | the profile is saved and the fee is stored and displayed purely as informational text, with no payment, checkout or invoice action offered anywhere |
| AC-027 | I am editing a doctor profile | I save without selecting at least one specialization | the save is rejected with a message that a specialization is required, because search relies on it |
| AC-028 | a doctor is marked inactive | a patient performs a search that would otherwise match that doctor | the doctor does not appear in results and no new slots of theirs can be booked |
| AC-029 | a doctor is marked inactive and has future appointments already booked | the deactivation is saved | I am shown the count of affected future appointments and those appointments remain visible to the patient and to the doctor rather than disappearing silently |

### US-008: Configure clinic timezone and booking cutoff

**Priority:** high

> As a clinic administrator, I want to set the clinic's timezone and the cutoff period before an appointment within which patients may no longer reschedule or cancel, so that times are shown consistently to everyone and late changes do not disrupt the clinic's day.

| ID | Given | When | Then |
|---|---|---|---|
| AC-030 | I am signed in as an administrator | I set the clinic timezone in settings and save | all appointment times, slot times and schedules shown to every user in every role are displayed in that single clinic timezone, with the timezone labelled on screen |
| AC-031 | I am signed in as an administrator | I set the booking cutoff to a number of hours before the appointment start and save | the new cutoff takes effect immediately for all subsequent patient reschedule and cancellation attempts |
| AC-032 | I am editing settings | I enter a cutoff that is negative or not a number | the save is rejected with an inline validation message and the previous cutoff remains in force |
| AC-033 | the clinic timezone has never been configured | the system is first used | a documented default timezone is in force and the administrator settings page highlights that it has not yet been confirmed |

## EPIC-003: Disease and Symptom Catalogue and Doctor Search

Patients find a doctor by typing a disease, a symptom or a specialization name. A predefined, administrator-maintained mapping table resolves the term to one or more specializations and the system lists the clinic's matching active doctors. This matching is strictly deterministic lookup over the stored catalogue — no AI, no large language model and no machine learning is used anywhere in it.

Open assumption carried into this epic: the disease and symptom catalogue is seeded at launch with a set of common conditions and symptoms, and is thereafter editable only by administrators.

### US-009: Seeded disease and symptom catalogue available at launch

**Priority:** high

> As a clinic administrator, I want the system to ship with a starter catalogue of common diseases and symptoms already mapped to specializations, so that patient search is useful from day one without us having to type in hundreds of entries first.

| ID | Given | When | Then |
|---|---|---|---|
| AC-034 | the system has just been installed and no administrator has edited the catalogue | a patient types a common condition or symptom term from the documented seed list | the term is found in the catalogue and resolves to at least one specialization |
| AC-035 | the seeded catalogue is in place | an administrator reviews it | each seeded entry shows its term, its entry type (disease or symptom) and the specializations it maps to, and every seeded entry is editable and deletable like any entry the administrator created |
| AC-036 | the system is re-deployed or restarted | seeding runs again | entries an administrator has edited or deleted are not re-created or overwritten |

### US-010: Administrator edits the disease-to-specialization mapping

**Priority:** high

> As a clinic administrator, I want to add, edit and remove disease and symptom terms and the specializations each one maps to, so that patient search reflects the conditions this clinic actually treats and the specialists it actually employs.

| ID | Given | When | Then |
|---|---|---|---|
| AC-037 | I am signed in as an administrator | I add a catalogue term, mark it as a disease or a symptom, and link it to one or more active specializations | the entry is saved and a patient searching that term immediately resolves to those specializations |
| AC-038 | I am editing a catalogue entry | I save it with no specialization linked | the save is rejected with a message that at least one specialization is required, since an unmapped term would return no doctors |
| AC-039 | a catalogue term is mapped to two specializations | a patient searches that term | active doctors from both specializations appear in the results |
| AC-040 | I delete a catalogue term | a patient subsequently searches for it | it no longer appears in autocomplete and no longer resolves, while appointments already booked through it are unaffected |

### US-011: Patient searches by disease, symptom or specialization

**Priority:** critical

> As a patient, I want to type a disease, a symptom or a specialization name and be shown which specialists treat it, so that I can find the right doctor without already knowing which specialty I need.

| ID | Given | When | Then |
|---|---|---|---|
| AC-041 | I am signed in as a patient on the search page | I begin typing at least two characters of a term | matching disease, symptom and specialization entries from the stored catalogue are suggested, derived solely by text matching against stored records with no AI, language model or machine learning involved |
| AC-042 | I am on the search page | I select or submit a catalogue term | the system resolves it through the mapping table to one or more specializations and lists every active doctor holding those specializations |
| AC-043 | I submit a term that is not present in the catalogue | the search runs | I am shown a clear 'no match found' message with a prompt to try a different term or to browse the full list of specializations, and I am never shown a guessed or invented match |
| AC-044 | a matched specialization currently has no active doctors | the results are rendered | I am told the clinic has no available specialist for that condition rather than being shown an empty page |

### US-012: Doctor directory results with specialization and consultation fee

**Priority:** high

> As a patient, I want to see each matching doctor's specialization, qualifications and consultation fee, and to narrow the list, so that I can choose which doctor to book with before opening their slot calendar.

| ID | Given | When | Then |
|---|---|---|---|
| AC-045 | a search has returned matching doctors | the result list is displayed | each entry shows the doctor's name, specializations, qualifications and consultation fee as plain informational text, with a statement that the fee is payable at the clinic and no online payment option anywhere on the page |
| AC-046 | I am viewing search results | I filter by specialization or by doctor name | the list narrows to matching active doctors only and the applied filters are visible and clearable |
| AC-047 | I am viewing search results | I select a doctor | I am taken to that doctor's profile and available slots |
| AC-048 | a doctor has been deactivated since my results were loaded | I select that doctor | I am told the doctor is no longer available and returned to the result list |

## EPIC-004: Doctor Availability and Slot Generation

Each doctor defines a weekly recurring schedule (working days, start and end times, slot length, break periods) plus one-off exceptions such as leave days. The system generates discrete bookable slots from that definition, and every generated slot holds exactly one patient.

Open assumption carried into this epic: availability is modelled as a recurring weekly pattern plus exceptions, not as individually hand-entered slots.

### US-013: Doctor defines a weekly recurring availability pattern

**Priority:** critical

> As a doctor, I want to set which days of the week I work, my start and end times, my appointment slot length and my break periods, so that the system can offer patients only the times I actually consult.

| ID | Given | When | Then |
|---|---|---|---|
| AC-049 | I am signed in as a doctor on my availability page | I set, for each working day, a start time, an end time, a slot length in minutes and zero or more break periods, and save | the weekly pattern is stored and shown back to me as a week view in the clinic timezone |
| AC-050 | I am editing my weekly pattern | I enter an end time earlier than or equal to the start time, a slot length of zero or less, or a break that falls outside the working hours of that day | the save is rejected with an inline message identifying the specific day and field at fault |
| AC-051 | I am editing my weekly pattern | I enter two break periods on the same day that overlap each other | the save is rejected with a message that break periods may not overlap |
| AC-052 | I have an existing weekly pattern with future booked appointments | I change the pattern so that an already-booked time is no longer a working time | I am warned, shown the affected booked appointments, and those existing appointments are preserved rather than deleted |

### US-014: Doctor records one-off availability exceptions

**Priority:** high

> As a doctor, I want to mark specific dates or part-days as unavailable, such as leave, and to add extra one-off hours, so that patients cannot book me when I am away and can book me when I add an unscheduled session.

| ID | Given | When | Then |
|---|---|---|---|
| AC-053 | I am signed in as a doctor | I mark a future date, or a time range within a date, as unavailable and save | no unbooked slots are offered to patients within that period from that moment onward |
| AC-054 | I mark a date as unavailable and appointments are already booked on that date | I save the exception | I am shown the list of affected booked appointments and must explicitly confirm; on confirmation each affected appointment is set to Cancelled with the reason recorded, and the patient sees the cancellation and its reason in their appointment list |
| AC-055 | I am signed in as a doctor | I add an extra one-off availability window on a date outside my normal weekly pattern | slots are generated for that window using my configured slot length and become bookable by patients |
| AC-056 | I attempt to record an exception | the date I choose is in the past | the save is rejected with a message that exceptions can only be set for today or future dates |

### US-015: System generates discrete bookable slots that hold exactly one patient

**Priority:** critical

> As a patient, I want to be shown the doctor's availability as individual, clearly timed slots, so that I pick a specific start time rather than a vague window, and I know the time is mine alone.

| ID | Given | When | Then |
|---|---|---|---|
| AC-057 | a doctor has a weekly pattern of 09:00 to 12:00 with a 30-minute slot length and an 10:30 to 11:00 break on a given weekday | I view that doctor's availability for that date | I see exactly the slots 09:00, 09:30, 10:00, 11:00 and 11:30, with no slot inside the break and no slot extending beyond 12:00 |
| AC-058 | a slot has been booked by a patient | any other patient views that doctor's availability for that date | the slot is shown as unavailable and cannot be selected, because a slot holds exactly one patient |
| AC-059 | I am viewing a doctor's availability | the current clinic-time moment has already passed a slot's start time for today | that slot is not offered as bookable |
| AC-060 | a doctor has recorded an unavailability exception covering part of a working day | slots for that day are generated and displayed | no slot falls inside the exception period |

## EPIC-005: Appointment Booking, Reschedule and Cancellation

Patients book a specific generated slot. The same slot can never be booked twice: booking runs inside a database transaction guarded by a uniqueness constraint on the doctor-and-slot pair, so a losing concurrent attempt gets a clear 'slot just taken' message rather than a silent collision. Availability is always shown fresh.

Open assumptions carried into this epic: (a) 'fresh availability' means a fresh fetch when the booking page opens plus a short-interval refresh, with the database transaction as the authoritative guard — there is no persistent push/websocket layer; (b) because transactional email is out of scope for this version, booking, reschedule and cancellation confirmations are given on screen and in the patient's appointment list, and no confirmation or reminder email is sent; (c) there is no waitlist and no automatic rebooking when a slot frees up — patients re-check availability themselves; (d) patients may reschedule or cancel only up to the administrator-configured cutoff before the appointment start.

### US-016: Patient views freshly refreshed slot availability

**Priority:** critical

> As a patient, I want the slot list for a doctor and date to be fetched fresh when I open it and refreshed while I look at it, so that I am not choosing from a stale list of times that someone else already took.

| ID | Given | When | Then |
|---|---|---|---|
| AC-061 | another patient booked a slot one minute ago | I open that doctor's availability page for that date | the slot is already shown as unavailable, because the page fetches current data from the server rather than a cached copy |
| AC-062 | I have the availability page open and have not navigated away | the short refresh interval elapses and a slot has been taken in the meantime | the displayed list updates to show that slot as unavailable without me reloading the page manually |
| AC-063 | I am viewing availability | I change the selected date or doctor | slots for the new selection are fetched fresh from the server and the previous selection's slots are cleared from the view |
| AC-064 | the availability data cannot be fetched | I open or refresh the page | I am shown an explicit error state telling me availability could not be loaded, and no slots are shown as bookable |

### US-017: Patient books an appointment slot that can never be double-booked

**Priority:** critical

> As a patient, I want to book a specific open slot with a chosen doctor, so that I have a guaranteed in-person appointment time at the clinic.

| ID | Given | When | Then |
|---|---|---|---|
| AC-065 | I am signed in as a patient and a slot is open | I select the slot, optionally enter a reason for the visit, and confirm the booking | an appointment is created with status Booked, I see an on-screen confirmation showing doctor, date, time in the clinic timezone, clinic location and the fee as text payable at the clinic, and the appointment appears in My Appointments |
| AC-066 | an appointment already exists for a given doctor and slot start time | any further booking is attempted for that same doctor and slot | the database uniqueness constraint rejects it inside the booking transaction and no second appointment row is created |
| AC-067 | a booking attempt fails for any reason | the transaction rolls back | no partial appointment record remains and the slot is still shown as open to other patients |
| AC-068 | I already hold a booked appointment with the same doctor at the same date and time | I attempt to book it again | the duplicate is refused with a message pointing me to my existing appointment |
| AC-069 | the appointment is booked | the confirmation is displayed | it states that the appointment is an in-person visit at the clinic and offers no online or video consultation option |

### US-018: Clear 'slot just taken' message when two patients race for a slot

**Priority:** critical

> As a patient whose booking lost a race, I want an unambiguous message that the slot was taken a moment ago plus the refreshed list of remaining slots, so that I immediately understand what happened and can pick another time without guessing.

| ID | Given | When | Then |
|---|---|---|---|
| AC-070 | two patients submit a booking for the same doctor and slot at effectively the same moment | both transactions are processed | exactly one appointment exists for that slot afterwards |
| AC-071 | my booking is the one that lost the race | the server responds | I see a clear message that the slot was just taken by someone else, my booking was not made, and the slot list on the page is refreshed to show the remaining open slots |
| AC-072 | my booking lost the race | I check My Appointments | no appointment for that slot is listed for me |
| AC-073 | my booking won the race | the server responds | I receive the normal booking confirmation with no error or warning |

### US-019: Patient reschedules an appointment before the cutoff

**Priority:** high

> As a patient, I want to move my appointment to another open slot while I am still within the allowed window, so that I can adapt to a change in my plans without cancelling and rebooking from scratch.

| ID | Given | When | Then |
|---|---|---|---|
| AC-074 | I have a Booked or Confirmed appointment whose start time is further away than the configured cutoff | I choose Reschedule and select a different open slot | the appointment is moved to the new slot in a single transaction, the new slot is marked taken, the old slot is returned to the available pool immediately, and I see an on-screen confirmation of the new time |
| AC-075 | my appointment start time is now inside the configured cutoff window | I view the appointment | the Reschedule action is disabled and the reason is stated on screen, including the cutoff period in force |
| AC-076 | I am on the reschedule screen | the slot I select is taken by someone else before my request is processed | the reschedule fails with the 'slot just taken' message, my original appointment remains unchanged at its original time, and the refreshed slot list is shown |
| AC-077 | my appointment is already Completed, Cancelled or marked No-show | I view it | no Reschedule action is offered |

### US-020: Patient cancels an appointment before the cutoff and the slot is freed

**Priority:** high

> As a patient, I want to cancel my appointment while within the allowed window, so that I do not waste the doctor's time and another patient can take the slot.

| ID | Given | When | Then |
|---|---|---|---|
| AC-078 | I have a Booked or Confirmed appointment outside the cutoff window | I choose Cancel and confirm | the appointment status becomes Cancelled with the canceller recorded as the patient and the cancellation time stored, and I see an on-screen confirmation |
| AC-079 | an appointment has just been cancelled | any patient next loads that doctor's availability for that date | the freed slot is offered as open again immediately, with no manual step by staff |
| AC-080 | my appointment start time is inside the configured cutoff window | I view the appointment | the Cancel action is disabled with an on-screen explanation of the cutoff and a note to contact the clinic directly |
| AC-081 | an appointment has been cancelled | I view My Appointments | it is listed under past or cancelled appointments with its Cancelled status rather than being deleted from my history |

### US-021: Patient views their upcoming and past appointments

**Priority:** high

> As a patient, I want a single list of my upcoming and past appointments with their current status, so that I know when and with whom my next visit is and what happened at previous ones.

| ID | Given | When | Then |
|---|---|---|---|
| AC-082 | I am signed in as a patient with appointments in the past and the future | I open My Appointments | upcoming appointments are listed soonest-first and past appointments separately most-recent-first, each showing doctor, specialization, date and time in the clinic timezone, clinic location and current status |
| AC-083 | I am viewing an upcoming appointment outside the cutoff window | the row is rendered | Reschedule and Cancel actions are available on it |
| AC-084 | I have no appointments at all | I open My Appointments | I see an empty-state message with a link to search for a doctor |
| AC-085 | I am viewing my appointment list | an appointment has an associated completed consultation record | a link to view that consultation record is shown on the appointment |

## EPIC-006: Doctor Appointment Workload and Status Management

Doctors see their own upcoming and past appointments and move each one through its lifecycle. Statuses are Booked, Confirmed, Completed, Cancelled (by patient, doctor or administrator) and No-show.

Open assumption carried into this epic: the status set and the permitted transitions above are the agreed lifecycle for this build.

### US-022: Doctor views their upcoming and past appointments

**Priority:** critical

> As a doctor, I want a list of my own appointments for today, for a chosen date and in the past, so that I can see who I am seeing and when, and look back at previous visits.

| ID | Given | When | Then |
|---|---|---|---|
| AC-086 | I am signed in as a doctor | I open My Schedule | today's appointments are shown by default in chronological order, each with patient name, slot time in the clinic timezone, the patient's stated reason for visit and the current status |
| AC-087 | I am on My Schedule | I choose a different date or a date range, or filter by status | the list updates to show only my own appointments matching that selection |
| AC-088 | I am signed in as a doctor | I view the list | only appointments where I am the treating doctor appear, and no other doctor's appointments are included |
| AC-089 | I have no appointments on the selected date | the list loads | an explicit 'no appointments on this date' message is shown |

### US-023: Doctor updates appointment status through the lifecycle

**Priority:** high

> As a doctor, I want to mark each appointment as Confirmed, Completed, No-show or Cancelled, so that the schedule reflects what actually happened and the clinic has accurate records.

| ID | Given | When | Then |
|---|---|---|---|
| AC-090 | an appointment of mine has status Booked | I set it to Confirmed | the status changes to Confirmed, the change time and my identity are recorded, and the patient sees the updated status in My Appointments |
| AC-091 | an appointment of mine has status Booked or Confirmed and its slot time has passed | I set it to Completed or No-show | the status is updated and recorded with the change time and my identity |
| AC-092 | an appointment of mine has status Booked or Confirmed | I cancel it and give a reason | the status becomes Cancelled with the canceller recorded as the doctor and the reason stored, the slot returns to the available pool immediately, and the patient sees the cancellation and reason |
| AC-093 | an appointment is already Completed or Cancelled | I attempt to change its status again | the transition is refused with a message that the appointment has reached a final status |
| AC-094 | I attempt a status change on an appointment where I am not the treating doctor | the request reaches the server | it is refused with an access-denied response |

## EPIC-007: Consultation Records and Prescriptions

Per appointment, the treating doctor records consultation notes, diagnosis and advice plus a structured prescription (medicine, dosage, duration). Patients view and print their own history. Clinical content stops here: this is not an electronic medical record, and lab report uploads, medical file uploads and vitals tracking are out of scope.

Open assumptions carried into this epic: (a) consultation notes and prescriptions are visible only to the patient they belong to and the treating doctor — administrators can see scheduling data (who, when, status) but never clinical content; (b) an audit log records who viewed or changed a consultation record, as a baseline safeguard, without the system being certified against HIPAA, GDPR or any other specific regime in this build.

### US-024: Doctor records consultation notes, diagnosis and advice

**Priority:** critical

> As a doctor, I want to record my notes, the diagnosis and my advice against a specific appointment, so that the visit is documented and the patient can refer back to it.

| ID | Given | When | Then |
|---|---|---|---|
| AC-095 | I am the treating doctor on an appointment that has taken place | I open the appointment and enter consultation notes, a diagnosis and advice, then save | the record is stored against that appointment with the save timestamp and my identity, and is shown when the appointment is reopened |
| AC-096 | I have previously saved a consultation record | I edit and re-save it | the updated content is stored and the change is captured in the audit log with my identity and the time |
| AC-097 | I am recording a consultation | I save with the diagnosis field empty | the save is rejected with an inline message that a diagnosis is required |
| AC-098 | I am viewing the consultation record screen | the page renders | no option is offered to upload a lab report, attach a medical file or record vitals, since these are out of scope for this build |

### US-025: Doctor records a structured prescription

**Priority:** critical

> As a doctor, I want to add prescription lines each holding a medicine, a dosage and a duration, so that the patient has an unambiguous, readable record of what to take and for how long.

| ID | Given | When | Then |
|---|---|---|---|
| AC-099 | I am the treating doctor recording a consultation | I add one or more prescription lines, each with a medicine name, a dosage and a duration, and save | each line is stored as separate structured fields rather than as free text and is displayed back as a table |
| AC-100 | I am adding a prescription line | I save with any of medicine name, dosage or duration left empty on that line | the save is rejected and the incomplete line is identified |
| AC-101 | a prescription has multiple lines | I remove a line before saving | only the remaining lines are stored, in the order I arranged them |
| AC-102 | a consultation requires no medication | I save it with zero prescription lines | the consultation saves successfully and the patient's view shows 'no medication prescribed' |

### US-026: Patient views and prints their own consultation history

**Priority:** high

> As a patient, I want to see all my past consultations and prescriptions and print any of them, so that I can follow my treatment and take a paper copy to a pharmacy or another clinician.

| ID | Given | When | Then |
|---|---|---|---|
| AC-103 | I am signed in as a patient with completed consultations | I open My Consultation History | my consultations are listed most recent first, each showing date, doctor, specialization and diagnosis, and opening one shows the notes, advice and the full structured prescription |
| AC-104 | I am viewing a single consultation record | I choose Print | a print-formatted view is produced containing the clinic name, patient name, date, doctor name and qualifications, diagnosis, advice and the prescription table, without site navigation, buttons or menus |
| AC-105 | I have no completed consultations | I open My Consultation History | an empty-state message is shown explaining that records appear after a completed visit |
| AC-106 | I am viewing my history on a mobile browser | the page renders | the list and the record detail remain readable and usable without horizontal scrolling |

### US-027: Clinical content restricted to the patient and the treating doctor

**Priority:** critical

> As a patient, I want my consultation notes and prescriptions to be readable only by me and the doctor who treated me, so that my health information is not exposed to clinic staff who have no clinical need for it.

| ID | Given | When | Then |
|---|---|---|---|
| AC-107 | I am signed in as an administrator | I view appointment information anywhere in the system | I see the patient, doctor, date, time and status, and no consultation notes, diagnosis, advice or prescription content is shown or returned by the underlying request |
| AC-108 | I am signed in as a doctor who did not treat a given patient | I request that patient's consultation record directly by its identifier | the request is refused with an access-denied response |
| AC-109 | I am signed in as a patient | I request a consultation record belonging to another patient by its identifier | the request is refused with an access-denied response |
| AC-110 | a doctor treated a patient at one appointment | that doctor opens that specific consultation record | access is granted for that record only and does not extend to the patient's consultations with other doctors |

### US-028: Audit log of access to consultation records

**Priority:** high

> As a clinic administrator accountable for patient confidentiality, I want every view of and change to a consultation record to be logged, so that we can establish after the fact who saw or altered a patient's clinical information.

| ID | Given | When | Then |
|---|---|---|---|
| AC-111 | any user successfully views a consultation record | the record is returned to them | an audit entry is written capturing who, which record, which patient, what action (view) and the timestamp |
| AC-112 | a doctor creates or edits a consultation record or prescription | the save completes | an audit entry is written capturing who, which record, the action (create or update) and the timestamp |
| AC-113 | an access attempt to a consultation record is refused | the refusal happens | an audit entry is written recording the denied attempt and who made it |
| AC-114 | audit entries exist | any user including an administrator attempts to edit or delete them through the application | no such action is available and the entries remain append-only; administrators may read the log but the log shows record identifiers and actions, not the clinical content itself |

## EPIC-008: Platform Foundations and Clinic Documentation

Cross-cutting characteristics the whole product must hold, plus the written material clinic staff need to run it. Delivered as a single responsive web application usable on mobile browsers, in English only, in one clinic timezone.

Open assumptions carried into this epic: (a) no native iOS or Android application is built; (b) the interface is English only with no multi-language support; (c) baseline health-data safeguards (encryption in transit and at rest, role-based access control, audit logging) are applied, but no specific certification such as HIPAA or GDPR is being pursued in this build; (d) the target operating scale is roughly 10–50 doctors and a few thousand registered patients with everyday reliability as the priority.

### US-029: Responsive web application usable on mobile browsers

**Priority:** high

> As a patient using my phone, I want every screen to work in a mobile browser as well as on a desktop, so that I can search and book from my phone without needing an app to install.

| ID | Given | When | Then |
|---|---|---|---|
| AC-115 | I open the application in a mobile browser at a typical phone viewport width | I complete registration, search for a doctor, view slots, book, reschedule and cancel | every step is completable, all controls are reachable and tappable, and no horizontal scrolling is needed to read content |
| AC-116 | I am a doctor using a tablet or phone browser | I view my schedule, update a status and record a consultation with a prescription | each task is completable at that viewport width |
| AC-117 | I use the application on a desktop browser | I resize the window across common breakpoints | the layout adapts without content being clipped or overlapped |
| AC-118 | a user looks for a mobile application | they review the product | no native iOS or Android app is offered, as the responsive web application is the only client |

### US-030: Single language and single clinic timezone throughout

**Priority:** medium

> As a clinic administrator, I want the whole interface in English and every time displayed in the one configured clinic timezone, so that staff and patients never mistake a time or face a half-translated screen.

| ID | Given | When | Then |
|---|---|---|---|
| AC-119 | any user in any role is using the system | they move through any screen | all labels, messages and emails-free notifications are in English, with no language selector offered |
| AC-120 | a user's device is set to a timezone different from the clinic's | they view a slot, an appointment or a schedule | the time shown is the clinic timezone time and is labelled with that timezone, not converted to the device timezone |
| AC-121 | a date or time is displayed anywhere | it is rendered | it uses one consistent documented format across the whole application |

### US-031: Health data protected in transit and at rest

**Priority:** critical

> As a clinic administrator holding identifiable health data, I want all traffic encrypted and stored data encrypted at rest, with credentials stored hashed, so that patient information is not readable if traffic is intercepted or storage is obtained.

| ID | Given | When | Then |
|---|---|---|---|
| AC-122 | the application is deployed | any request is made over an unencrypted connection | it is redirected to or refused in favour of the encrypted equivalent, and all application traffic including every API call is encrypted in transit |
| AC-123 | the database holding patient, appointment and consultation data is provisioned | its configuration is inspected | encryption at rest is enabled and this is evidenced in the deployment documentation |
| AC-124 | any user account exists | the stored user records are inspected directly | passwords are present only as one-way hashes with a per-user salt, and no plain-text or reversibly encrypted password exists anywhere including in logs |
| AC-125 | an application error occurs | the error is displayed or logged | no password, session token or clinical content appears in the message or the log entry |

### US-032: Setup and usage documentation for clinic staff

**Priority:** medium

> As a clinic administrator rolling the system out, I want written setup and day-to-day usage documentation, so that we can configure the clinic and train doctors and front-desk staff without needing the build team.

| ID | Given | When | Then |
|---|---|---|---|
| AC-126 | the system is handed over | I open the setup documentation | it covers deployment and hosting, database provisioning, environment configuration, creating the first administrator account, setting the clinic timezone and booking cutoff, and the contents and editing of the seeded disease and symptom catalogue |
| AC-127 | the system is handed over | I open the usage documentation | it contains a walkthrough per role: the patient journey (register, search, book, reschedule, cancel, view and print consultation history), the doctor journey (set weekly availability, record exceptions, manage schedule and statuses, record consultations and prescriptions), and the administrator journey (manage specializations, doctor profiles and disease mappings, and configure settings) |
| AC-128 | I am reading the documentation | I look for what the system does not do | it states plainly that there are no online payments, no video or online consultations, no lab report or file uploads, no vitals tracking, no external calendar or EMR integration, and no email or SMS notifications in this version |
| AC-129 | a new staff member follows the usage documentation unaided | they attempt each documented task on a test instance | each task can be completed from the documentation alone, with screen names and button labels matching the actual interface |
<!-- sdlc:auto:end epics -->
