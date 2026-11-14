# Development

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### DEV-US-002 · approved · source: dev:US-002

Ticket US-002 delivered sign in, sign out and session expiry handling. The work was committed and the ticket is marked delivered in the development run. No date, author or review record was provided.

- Ticket: US-002 — "Sign in, sign out and session expiry"
- Status reported: delivered
- Commit: 5567bea48f86db598e9301bdc4d7a3fb708a1b3c
- Scope as titled: user sign-in, sign-out, and expiry of an authenticated session.
- Not stated in the input: implementation approach, session timeout value, credential storage, author, review/approval, date, or any linked test run.
- This is the only authentication-related ticket reported in this development run.

**Related:** US-002

### DEV-US-005 · draft · source: dev:US-005

Ticket US-005, patient self-service profile management, failed during the development run. No commit was produced, so no code from this ticket exists in the repository. The input gives no failure reason, so the cause is unknown and the ticket remains outstanding.

- Ticket: US-005 — "Patient manages their own profile"
- Status reported: failed
- Commit: none
- Consequence: patient profile management is NOT implemented as of the end of this development run.
- Not stated in the input: failure cause, error output, blocking dependency, retry plan, owner, or date.
- Open follow-up for a human: triage and re-queue US-005; it is the only failed ticket in this run.

**Related:** US-005

### DEV-US-009 · approved · source: dev:US-009

Ticket US-009 delivered the seeded disease and symptom catalogue so that reference data is present at application launch. It was committed together with US-011 and US-012 under a single shared commit. No date, author or review record was provided.

- Ticket: US-009 — "Seeded disease and symptom catalogue available at launch"
- Status reported: delivered
- Commit: 3d430b99b4e9b6b39f4f5bb0313b9a71ff86a9e9 (shared with US-011 and US-012)
- Scope as titled: disease and symptom reference data seeded and available when the application starts.
- Shared-commit note: because US-009, US-011 and US-012 landed in one commit, the three cannot be reverted or traced independently at commit granularity.
- Not stated in the input: seed data volume or source, the disease-to-specialization mapping contents, migration/seeding mechanism, author, review/approval, date, or linked test run.

**Related:** US-009, US-011, US-012

### DEV-US-011 · approved · source: dev:US-011

Ticket US-011 delivered patient search by disease, symptom or specialization. It was committed together with US-009 and US-012 under a single shared commit, and depends on the seeded catalogue from US-009. No date, author or review record was provided.

- Ticket: US-011 — "Patient searches by disease, symptom or specialization"
- Status reported: delivered
- Commit: 3d430b99b4e9b6b39f4f5bb0313b9a71ff86a9e9 (shared with US-009 and US-012)
- Scope as titled: three search entry points for patients — by disease, by symptom, and by specialization.
- Dependency implied by the shared commit: the seeded catalogue delivered under US-009 supplies the disease/symptom terms this search operates over.
- Not stated in the input: matching/lookup logic, handling of unmatched search terms, pagination, author, review/approval, date, or linked test run.

**Related:** US-011, US-009, US-012

### DEV-US-012 · approved · source: dev:US-012

Ticket US-012 delivered the doctor directory results view showing specialization and consultation fee. It was committed together with US-009 and US-011 under a single shared commit and presents the results of the US-011 search. No date, author or review record was provided.

- Ticket: US-012 — "Doctor directory results with specialization and consultation fee"
- Status reported: delivered
- Commit: 3d430b99b4e9b6b39f4f5bb0313b9a71ff86a9e9 (shared with US-009 and US-011)
- Scope as titled: result listing of doctors, displaying each doctor's specialization and consultation fee.
- Relationship: renders the output of the search delivered under US-011.
- Note on project scope: the consultation fee is displayed only; the project description states no payment gateway or online payment functionality is required, and no payment ticket appears in this run.
- Not stated in the input: result ordering, filters, empty-result behaviour, fee formatting/currency, author, review/approval, date, or linked test run.

**Related:** US-012, US-011, US-009

### DEV-RUN-SUMMARY · approved · source: dev:development run status

The development run itself is reported as completed, covering five tickets: four delivered and one failed. Only authentication, reference-data seeding, patient search and the doctor directory were produced. Appointment booking, rescheduling, cancellation, doctor availability management and the admin dashboard were not part of this run's reported tickets.

- Development run status: completed
- Tickets attempted: 5
- Delivered (4): US-002, US-009, US-011, US-012
- Failed (1): US-005 (no commit)
- Distinct commits: 2
  - 5567bea48f86db598e9301bdc4d7a3fb708a1b3c — US-002
  - 3d430b99b4e9b6b39f4f5bb0313b9a71ff86a9e9 — US-009, US-011, US-012
- Coverage gap, stated as an observation only: of the known requirement keys US-001 through US-032, this run reports work on just five. No ticket was reported for booking, rescheduling, cancelling, double-booking prevention, doctor availability, consultation records, or the admin dashboard.
- Not stated in the input: run start/end dates, environment, build or test results, reviewers, or whether unreported requirements are scheduled for a later run.

**Related:** US-002, US-005, US-009, US-011, US-012
<!-- sdlc:auto:end narrative -->
