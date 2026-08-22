---
type: phase
id: Phase 3
status: planned
chunks: 10
tags: [phase]
aliases: [Phase 3, P3-01, P3-02, P3-03, P3-04, P3-05, P3-06, P3-07, P3-08, P3-09, P3-10]
---

# Phase 3 — Cycles & assurance

Campaigns (RCSA / attestation / due diligence) with write-back, vendor tiering, the audit programme, and committee packs with snapshot-as-evidence.

- Plan detail: [[build-plan#Phase 3 — cycles & assurance|build-plan §6 Phase 3]]
- Closes: [[G-22-bulk-operations]] (partial), [[G-23-reporting-formats]] (snapshot half)
- Makes demonstrable: [[REQ-12-audit-flow]], [[REQ-13-packs-as-a-view]], [[REQ-19-cycles-move-the-register]], [[REQ-20-version-bound-attestation]], [[REQ-21-computed-third-party-tier]]

## Chunks

### P3-01
**Campaign container** *(M)*. Open/fan-out/submit/review (SoD)/close + completion certificate as evidence; payloads opaque jsonb the container never reads (§14.3 extensibility — a fourth cycle type is a payload). → [[WF-5.16-rcsa-campaign]] pattern, [[ADR-006-task-work-item]]

### P3-02
**RCSA payload + write-back** *(M)*. Approved re-scores patch the risk with a timeline entry. → [[WF-5.16-rcsa-campaign]], [[BR-DRV]] 10, [[REQ-19-cycles-move-the-register]]

### P3-03
**Attestation payload** *(M)*. Version-bound rate; cannot-comply routes to the exception register. → [[WF-5.17-policy-attestation]], [[BR-LFC]] 06, [[BR-DRV]] 13, [[REQ-20-version-bound-attestation]]

### P3-04
**Vendor register + derived attributed tier** *(L)*. Diligence/assurance chasing on the 60-day window; no tier field exists to type over. → [[WF-5.19-third-party-risk]], [[BR-DRV]] 03, [[REQ-21-computed-third-party-tier]]

### P3-05
**Vendor DD payload + write-back; concentration view** *(M)*. An approved DD re-rates criticality and resets the diligence clock. → [[WF-5.20-vendor-dd-campaign]]

### P3-06
**Audit programme** *(L)*. Plan entries, audits, working papers, findings 1:1 issues, auditor-verified closure, unescalated-failure surfacing, derived plan delivery. → [[WF-5.21-audit-programme]], [[WF-5.22-issue-remediation]], [[BR-LFC]] 07, [[BR-DRV]] 11, [[REQ-12-audit-flow]]

### P3-07
**Committee packs** *(L)*. Compose from live queries under a named basis; narrative maker-check; issue → snapshot filed as evidence against the meeting obligation; absent-not-empty sections. → [[WF-5.26-committee-packs]], [[REQ-13-packs-as-a-view]], [[G-23-reporting-formats]] (snapshot)

### P3-08
**Bulk operations + saved views** *(S)*. Bulk-resolve records each item's own resolution and audit entry. → [[G-22-bulk-operations]], [[WF-5.22-issue-remediation]]

### P3-09
**Rewire campaigns, vendors, audits, sector pack, pack generator** *(M)*. Phase demo script for Requirements 12/13/19/20/21. → phase exit

### P3-10
**Committee-chair dashboards + repeat findings** *(L — new v1.1)*. RMC and ARC surfaces trimmed to remit; finding→predecessor link set at raise time powering repeat findings (M21); ageing bands + oldest replace every mean-age display; sealed cases counted honestly. → [[dashboard-kpi-design]], [[WF-5.21-audit-programme]], [[ADR-008-metric-honesty]], [[ADR-010-committee-chair-authority]]
