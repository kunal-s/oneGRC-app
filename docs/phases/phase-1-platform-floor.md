---
type: phase
id: Phase 1
status: planned
chunks: 19
tags: [phase]
aliases: [Phase 1, P1-01, P1-02, P1-03, P1-04, P1-05, P1-06, P1-07, P1-08, P1-09, P1-10, P1-11, P1-12, P1-13, P1-14, P1-15, P1-16, P1-17, P1-18, P1-19]
---

# Phase 1 — The platform floor

The six §19.3 floor items made real for the duty cycle; full core seed; queue, calendar and a cockpit subset live from the API. After this phase the six things no real deployment can fake — persistence, auth, server authorization, scheduler, evidence storage, log immutability — exist in earnest.

- Plan detail: [[build-plan#Phase 1 — the platform floor (exhaustive)|build-plan §6 Phase 1]]
- Closes: [[G-01-persistence]], [[G-03-authorization-enforcement]], [[G-04-concurrency]], [[G-05-scheduler]], [[G-13-file-handling]], [[G-14-evidence-storage]], [[G-15-audit-log-immutability]] (full); [[G-26-historical-data]] (core); [[G-06-notification-delivery]] (in-app half)
- Makes demonstrable: [[REQ-01-one-platform]], [[REQ-02-policy-driven-duties]], [[REQ-03-clause-as-the-unit]], [[REQ-04-source-to-action]], [[REQ-05-map-once-satisfy-many]], [[REQ-07-connected-demonstration]], [[REQ-08-role-based-views]], [[REQ-11-recurring-duties]], [[REQ-16-nothing-waits]]

## Chunks

### P1-01
**Core schema completion** *(M)*. Policy/versions, Issue + first-class Exception, committees, deadlines, notifications, config, evidence files, department heads. → [[WF-5.22-issue-remediation]], [[ADR-005-exception-first-class]]

### P1-02
**Seed the full compliance core** *(L)*. All 217 obligations with synthesized historical cycles, 46 policies, 649 evidence rows with real placeholder artifacts, issues + exceptions. Transformer asserts derived-value parity. → [[G-26-historical-data]]

### P1-03
**Full authority matrix + nominated checkers everywhere** *(M)*. Every §4.10 row active; the action × role contract test. → [[BR-AUT]], [[ADR-007-roles-and-authority]], [[G-17-lod-constraints]] (lod on Person), [[WF-5.07-maker-checker]]

### P1-04
**Department scope on discovery surfaces** *(M)*. Lists scoped, details unscoped, scope banner fed. → [[BR-SCP]] 01–04, [[REQ-08-role-based-views]]

### P1-05
**Evidence files for real** *(L)*. Upload/download with sha256, integrity re-verify, virus-scan seam, on-behalf-of, guidance endpoint. → [[G-13-file-handling]], [[G-14-evidence-storage]], [[WF-5.06-evidence]], [[BR-EVD]] 05/06

### P1-06
**Audit log hardening + retention floor** *(M)*. INSERT/SELECT-only role, block trigger, floor as protected config, chain-verify in CI + backups. → [[G-15-audit-log-immutability]], [[BR-AUD]] 02, [[BR-DAT]] 05

### P1-07
**ClockService + time-travel** *(S)*. Frozen/real/offset; lint ban on bare `Date.now()`; the rig that makes derived-Overdue and ladder tests provable. → [[G-05-scheduler]], [[BR-SCH]] 09, [[BR-DRV]] 17

### P1-08
**The reminder/escalation engine** *(L)*. Pure ladder math + idempotent reconciler; rungs to real named people, logged. → [[WF-5.27-reminders-escalation]], [[BR-ESC]] (all), [[G-05-scheduler]], [[REQ-16-nothing-waits]]

### P1-09
**Notifications API + bell** *(S)*. Persisted per-person notifications; restricted-case filtering hooked for Phase 4. → [[G-06-notification-delivery]] (in-app)

### P1-10
**Recurrence: cycles that schedule themselves** *(M)*. On-time recorded, next cycle created, missed cycles never closed by generation. → [[WF-5.05-recurring-cycle]], [[BR-SCH]] 02–05, [[REQ-11-recurring-duties]], [[ADR-004-obligation-and-cycle]]

### P1-11
**Duty-cycle flows complete** *(M)*. Return-with-reason, per-step chasing, on-behalf-of, evidence-blocked submission — the full 5.4 alternate paths. → [[WF-5.04-obligation-and-tasks]], [[BR-LFC]] 10, [[BR-EVD]] 01, [[REQ-02-policy-driven-duties]]

### P1-12
**The personal queue, server-derived** *(M)*. Assembled from live state per 5.28; scope + case filters at source. → [[WF-5.28-personal-queue]], [[BR-SCP]] 09, [[REQ-08-role-based-views]]

### P1-13
**One calendar** *(S)*. Every dated thing so far on one surface; person and regulator filters. → [[BR-SCH]] 01, [[REQ-01-one-platform]]

### P1-14
**Cockpit metrics, server-derived (subset)** *(M)*. M1–M4 to the dashboard doc's definitions; both coverage senses computed; trend endpoints per BR-DRV-18; the prototype's `trends.ts` has no importers. → [[dashboard-kpi-design]], [[ADR-008-metric-honesty]], [[G-19-duty-coverage-metric]], [[REQ-14-metrics-on-demand]] (partial)

### P1-15
**Concurrency: optimistic versioning** *(M)*. Version checks in the runner; 409 with a what-changed payload; conflict banner. → [[G-04-concurrency]]

### P1-16
**Dev login screen + capabilities-driven UI sweep** *(S)*. No client role comparisons anywhere; refused actions have no buttons and no endpoints. → [[G-02-identity-authentication]], [[BR-AUT]] 03

### P1-17
**CI, tests, backup/restore** *(M)*. Typecheck, contract tests, chain verify, seed verify; backup/restore drill documented and performed. → hand-off repeatability

### P1-18
**`<EntityRef>` component + shortTitle sweep** *(M — new in v1.1)*. One component rendering id + shortTitle everywhere; no list renders a full title. → [[ADR-003-identifier-scheme]]

### P1-19
**Colour discipline + enterprise design pass** *(M — new in v1.2)*. Categorical colour confined to visualisations; saturated colour reserved for severity/status/band; heat map retained as built. → [[ADR-011-colour-discipline]], [[G-28-accessibility]] groundwork
