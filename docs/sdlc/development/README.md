# Development

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### DEV-US-005 · draft · source: dev:US-005

Ticket US-005 (Patient manages their own profile) did not complete. The development run reports status = failed with no commit recorded. No delivered code is associated with this ticket.

- Ticket: US-005 — Patient manages their own profile
- Outcome: failed
- Commit: none recorded
- Implication: patient profile self-management is not evidenced as built in this development run; it remains open work.
- Input provides no failure reason, owner, date, retry plan, or linked defect. Not documented here because it was not stated.

**Related:** US-005

### DEV-US-006 · approved · source: dev:US-006

Ticket US-006 (Manage the clinic's specializations) was delivered. Work is captured under a single commit. No defects or follow-ups were reported in the input.

- Ticket: US-006 — Manage the clinic's specializations
- Outcome: delivered
- Commit: b0b69f8ab9514f7dfa572d2979aec6d83203c70d
- Scope of this ticket supports administrator management of the specialization list used elsewhere in the system.
- Input gives no reviewer, date, test evidence, or deployment reference for this ticket.

**Related:** US-006

### DEV-US-008 · approved · source: dev:US-008

Ticket US-008 (Configure clinic timezone and booking cutoff) was delivered. Work is captured under a single commit. No defects or follow-ups were reported in the input.

- Ticket: US-008 — Configure clinic timezone and booking cutoff
- Outcome: delivered
- Commit: 56e7c31b0f27faaf24402070ed05e7be0e739939
- Scope of this ticket covers clinic-level configuration of timezone and the booking cutoff setting applied to appointment scheduling.
- Input gives no reviewer, date, test evidence, or deployment reference for this ticket.

**Related:** US-008

### DEV-US-010 · approved · source: dev:US-010

Ticket US-010 (Administrator edits the disease-to-specialization mapping) was delivered. Work is captured under a single commit. It is linked to the specialization management work delivered under US-006, which supplies the specializations being mapped.

- Ticket: US-010 — Administrator edits the disease-to-specialization mapping
- Outcome: delivered
- Commit: e28536ff7383c671babf8c6d22c7d19e2e1fc18e
- Scope of this ticket covers administrator editing of the predefined disease-to-specialization mappings used to route patients to relevant doctors (no AI/ML involved, per project scope).
- Relationship to US-006 is inferred from the specialization data both tickets act on; the input does not state an explicit dependency.
- Input gives no reviewer, date, test evidence, or deployment reference for this ticket.

**Related:** US-010, US-006

### DEV-US-031 · approved · source: dev:US-031

Ticket US-031 (Health data protected in transit and at rest) was delivered. Work is captured under a single commit. This is the non-functional security/privacy item for protection of patient health data.

- Ticket: US-031 — Health data protected in transit and at rest
- Outcome: delivered
- Commit: adb8f7c61996c6a2a491fb68ad8d2ea2b45a27aa
- Scope of this ticket covers protection of health data both in transit and at rest.
- The input does not state which specific mechanisms, algorithms, key management approach, or configuration were used; those are deliberately not documented here. Any credentials or keys involved are to be referenced only as placeholders such as <encryption-key> until the implementing team supplies verified detail.
- No verification/audit evidence for this control was supplied in the development input; it should be confirmed in testing.

**Related:** US-031
<!-- sdlc:auto:end narrative -->
