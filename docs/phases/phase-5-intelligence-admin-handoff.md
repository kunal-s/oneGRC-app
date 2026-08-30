---
type: phase
id: Phase 5
status: planned
chunks: 11
tags: [phase]
aliases: [Phase 5, P5-01, P5-02, P5-03, P5-04, P5-05, P5-06, P5-07, P5-08, P5-09, P5-10, P5-11]
---

# Phase 5 — Intelligence, admin, hand-off

Agent runs and ingestion behind the seam, maker-checked admin configuration, email delivery, OIDC, one real connector, reports and exports, packaging and the on-prem hand-off package.

- Plan detail: [[build-plan#Phase 5 — intelligence, admin, hand-off|build-plan §6 Phase 5]]
- Closes: [[G-02-identity-authentication]], [[G-06-notification-delivery]] (full), [[G-07-connectors]] (framework + 1 real), [[G-08-instrument-ingestion]]/[[G-09-assistive-answers]]/[[G-10-agent-runs]] (at the seam, deterministic provider honestly labelled), [[G-12-regulator-filing]] (governed manual), [[G-16-delegation]], [[G-17-lod-constraints]] (config half), [[G-20-cockpit-performance]], [[G-23-reporting-formats]], [[G-28-accessibility]]. Deferred: [[G-27-data-migration]] (first real client). **Claimed but unchunked: [[G-21-search]]** — no P5 chunk implements it.
- Makes demonstrable: [[REQ-09-regulatory-change]] (agentic arrival), [[REQ-15-shaped-to-a-standard]] (no dedicated chunk — phase-level), [[REQ-24-self-governance]]

## Chunks

### P5-01
**Admin config engine** *(L)*. ConfigItem catalogue, maker-checker on every change, before/after logged, §14.2 never-configurable list enforced in code. → [[WF-5.30-admin-config-change]], [[BR-AUT]] 08/10, [[G-17-lod-constraints]], [[REQ-24-self-governance]]

### P5-02
**Settings screens rewired** *(M)*. Nine sections; read-only for non-admins; audit log for 2nd/3rd lines. → [[BR-AUD]] 07, [[REQ-24-self-governance]]

### P5-03
**Intelligence seam live** *(L)*. Deterministic provider ported (extractor, recommendations with confidence + rejected-stays, scoped Q&A, narrative draft); unverified-figure gating. → [[WF-5.02-instrument-ingestion]], [[BR-AI]] 03/05/06, [[G-08-instrument-ingestion]], [[G-09-assistive-answers]]

### P5-04
**Agent runs** *(L)*. Persisted propose-then-approve; applied via existing governed actions; run named in audit. → [[WF-5.29-agentic-run]], [[BR-AI]] 01/02, [[BR-AUD]] 06, [[G-10-agent-runs]], [[REQ-09-regulatory-change]]

### P5-05
**Email transport + digests + delivery confirmation** *(M)*. SMTP behind a provider seam; per-rung delivery recorded. → [[G-06-notification-delivery]], [[WF-5.27-reminders-escalation]]

### P5-06
**Connector framework + one real read-only connector** *(L)*. Directory/HR import; sync history; simulated spokes labelled simulated. → [[G-07-connectors]], [[WF-5.09-continuous-monitoring]]

### P5-07
**OIDC adapter + prod auth mode** *(L)*. Code flow against the client IdP; switcher → view selector; dev impersonation disabled. → [[G-02-identity-authentication]], [[ADR-002-authorization-seam]] *(the plan's "G-17" ref here is read as §21.17 — see [[G-17-lod-constraints]])*

### P5-08
**Exports & report formats** *(L)*. Register exports under caller scope; pack PDF/XLSX with filters on the face; **governed manual regulator filing**. → [[BR-DAT]] 06, [[G-12-regulator-filing]], [[G-23-reporting-formats]], [[WF-5.26-committee-packs]]

### P5-09
**Performance & scale pass** *(L)*. Server-side pagination everywhere; cockpit materialization with write-tied invalidation preserving derive-don't-store; NFR load test. → [[G-20-cockpit-performance]], [[BR-DRV]]

### P5-10
**Delegation (minimal)** *(M)*. Time-boxed stand-in inherits queue + maker rights, never approval rights; trail names both. → [[G-16-delegation]]

### P5-11
**Accessibility + hand-off package** *(L)*. Keyboard/contrast/labels pass, state-never-colour-alone audit, `install.md`, image tarballs, restore drill, ops runbook. → [[G-28-accessibility]], [[ADR-011-colour-discipline]]
