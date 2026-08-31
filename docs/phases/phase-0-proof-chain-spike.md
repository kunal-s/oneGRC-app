---
type: phase
id: Phase 0
status: in-progress
chunks: 13
tags: [phase]
aliases: [Phase 0, P0-01, P0-02, P0-03, P0-04, P0-05, P0-06, P0-07, P0-08, P0-09, P0-10, P0-11, P0-12, P0-13]
---

# Phase 0 — The proof-chain spike

The Compliance spine — clause → control → obligation → task → evidence, risk attached — persisted, server-authorized, audit-logged, rendered by the existing UI. Retires the stack risk and proves the governed-mutation pattern before anything else is built on it. **Status: P0-01 complete; next P0-02.**

- Plan detail: [[build-plan#Phase 0 — the proof-chain spike (exhaustive)|build-plan §6 Phase 0]]
- Proves the mechanisms for [[G-01-persistence]], [[G-03-authorization-enforcement]], [[G-15-audit-log-immutability]] on a slice
- Makes demonstrable (on the slice): [[REQ-03-clause-as-the-unit]], [[REQ-04-source-to-action]], [[REQ-05-map-once-satisfy-many]], [[REQ-07-connected-demonstration]]
- Decisions in play: [[ADR-001-stack-and-repo]], [[ADR-002-authorization-seam]], [[ADR-003-identifier-scheme]], [[ADR-004-obligation-and-cycle]], [[ADR-006-task-work-item]], [[ADR-009-obligation-control-cardinality]]

## Chunks

### P0-01
**Monorepo scaffold** *(S — complete)*. pnpm workspaces; prototype moved intact to `apps/web`. → [[ADR-001-stack-and-repo]]

### P0-02
**Postgres + NestJS skeleton in Compose** *(M)*. `/api/health` does a real DB round-trip. → groundwork for [[G-01-persistence]]; stack per [[ADR-001-stack-and-repo]]

### P0-03
**Spike schema + first migration** *(M)*. Slice models incl. Obligation/ObligationCycle, Task with `completionPolicy`, PenaltyTier, evidence joins; the §3.4 must-not-exist check; 11-char id cap. → [[ADR-004-obligation-and-cycle]], [[ADR-006-task-work-item]], [[ADR-009-obligation-control-cardinality]]; feeds [[REQ-05-map-once-satisfy-many]], [[REQ-06-risk-from-consequence]]

### P0-04
**Extract seed-world + load the spike slice** *(L)*. Generators moved to `packages/seed-world`, anchor parameterized; one worked chain loaded (statutory + the internal investment-policy duty). → [[G-26-historical-data]], [[REQ-02-policy-driven-duties]]

### P0-05
**Identity seam: sessions + dev impersonation** *(M)*. Server-side sessions; `/dev/impersonate`; `/whoami`. → [[G-02-identity-authentication]], [[ADR-002-authorization-seam]]

### P0-06
**Authority matrix + GovernedMutation runner + audit chain** *(L)*. The §4.10 matrix as data, guard + runner + backstop interceptor, hash-chained audit entries in the mutation transaction, chain-verify script. → [[BR-AUT]], [[BR-AUD]], [[G-03-authorization-enforcement]], [[G-15-audit-log-immutability]], [[ADR-007-roles-and-authority]]

### P0-07
**Read API + proof-chain resolver** *(M)*. Chain JSON byte-identical from any of the five anchors. → [[BR-LNK]] (01–05), [[WF-5.01-source-to-action]], [[REQ-04-source-to-action]]

### P0-08
**Write API: the spike's governed actions** *(L)*. Clause save/specialist/not-applicable, evidence attach, submit/verify/return, cycle approve — every illegal shortcut 4xx. → [[WF-5.01-source-to-action]], [[WF-5.04-obligation-and-tasks]], [[WF-5.06-evidence]], [[WF-5.07-maker-checker]]; rules [[BR-AUT]] 02/04/05, [[BR-EVD]] 01/02, [[BR-LFC]] 01/09/10

### P0-09
**Frontend API plumbing + persona → server identity** *(M)*. Typed client, TanStack Query, switcher calls `/dev/impersonate`. → [[G-02-identity-authentication]], [[G-03-authorization-enforcement]]

### P0-10
**Rewire Source Library, instrument detail, clause detail** *(L)*. Save a clause, reload, still saved; wrong department refused. → [[WF-5.01-source-to-action]], [[REQ-03-clause-as-the-unit]]

### P0-11
**Rewire control / obligation / task / evidence details + shared chain component** *(L)*. Full chain clickable both ways; minimal audit-log list. → [[BR-LNK]] 03/04, [[BR-AUD]] 07, [[REQ-04-source-to-action]], [[REQ-05-map-once-satisfy-many]], [[REQ-07-connected-demonstration]]

### P0-12
**Spike review: go/no-go checklist** *(S)*. All eight §2 invariants demonstrably in place; §23 demo-construct sweep. → gate to [[phase-1-platform-floor|Phase 1]]

### P0-13
**Identifier scheme v2.1 + old→new migration map** *(M — new in v1.1)*. `core/ids` per the two-pattern ≤11-char scheme; every prototype semantic id dies at the boundary, cross-links rewritten. → [[ADR-003-identifier-scheme]]
