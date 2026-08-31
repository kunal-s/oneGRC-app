---
type: workflow
id: WF 5.20
spec: "§5.20"
status: specified
phase: Phase 3
tags: [workflow, risk, third-party, campaigns]
aliases: ["WF 5.20"]
---

# WF 5.20 — Third-party due diligence (campaign)

The periodic re-assessment of an arrangement on the shared campaign machinery: responses are **pre-filled from what the register already knows** so the reviewer contradicts facts rather than inventing them, and approval writes agreed changes back.

**Actors:** Compliance/Risk opens · vendor owner completes · checker approves (SoD) · system writes back.
**States:** campaign `Open → Closed`; one Task per arrangement; submission blocked while required gaps remain.

**Spec:** [[functional-spec#5.20 Third-party due diligence (campaign)|functional-spec §5.20]]

## Governed by

- Write-back on approval: re-rated criticality and refreshed diligence date patch the arrangement — the derived tier moves because the facts moved ([[BR-DRV]] BR-DRV-03)
- [[ADR-006-task-work-item]] — DD tasks ride the one Task engine (maker-checker policy)

## Built by

- [[phase-3-cycles-and-assurance#P3-05|P3-05]] — DD payload + write-back; concentration view

## Proves

[[REQ-21-computed-third-party-tier]] (diligence clock reset, tier movement)

## Connects

Re-assesses [[WF-5.19-third-party-risk]] · same container as [[WF-5.16-rcsa-campaign]] / [[WF-5.17-policy-attestation]] · certificate filed via [[WF-5.06-evidence]]
