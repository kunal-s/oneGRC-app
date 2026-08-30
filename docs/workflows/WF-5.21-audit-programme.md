---
type: workflow
id: WF 5.21
spec: "§5.21"
status: specified
phase: Phase 3
tags: [workflow, audit]
aliases: ["WF 5.21"]
---

# WF 5.21 — The audit programme: plan, fieldwork, finding

The third line's workspace: a risk-based plan, fieldwork that pulls evidence **from the connected model** rather than by email, working papers, findings raised from failed papers, and remediation the auditor — not the owner — verifies closed.

**Actors:** Head of Internal Audit plans and reports · Internal Auditor performs fieldwork · Control Owner responds · Audit Committee Chair oversees.
**States:** plan entry `Planned → In progress → Complete | Deferred`; audit `Planned → In progress → Reporting → Closed`; finding `Open → In remediation → Closed`.

**Spec:** [[functional-spec#5.21 The audit programme: plan, fieldwork, finding|functional-spec §5.21]]

## Governed by

- [[BR-LFC]] — BR-LFC-07: closure requires auditor verification; self-certified remediation is how repeat findings are born
- [[BR-DRV]] — BR-DRV-11: plan delivery and quarter coverage derived — the committee sees coverage, not intentions
- A failed working paper that never became a finding is surfaced as an **unescalated failure**; finding → issue is 1:1

## Built by

- [[phase-3-cycles-and-assurance#P3-06|P3-06]] full programme · [[phase-3-cycles-and-assurance#P3-10|P3-10]] repeat-findings link (predecessor set at raise time) + ARC ageing bands

## Proves

[[REQ-12-audit-flow]]

## Connects

Findings spawn issues in [[WF-5.22-issue-remediation]] · evidence pulled from [[WF-5.06-evidence]] · reported through [[WF-5.26-committee-packs]] · repeat findings and ageing on the ARC view ([[dashboard-kpi-design]] M21)
