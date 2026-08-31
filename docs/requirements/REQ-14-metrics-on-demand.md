---
type: requirement
id: Requirement 14
spec: "§20.1"
status: planned
target: Phase 2
tags: [requirement, metrics, governance]
aliases: ["Requirement 14", "Req 14"]
---

# Requirement 14 — Inspection-readiness and metrics on demand

**The test:** answer from the cockpit what is failing, what is overdue, how long findings have been open, where exposure sits against appetite — and drill from each number into the records behind it.

## Proven by

- Workflows: [[WF-5.28-personal-queue]] · every metric definition in [[functional-spec#10. Metrics, Reporting and Pack Catalogue|spec §10]]
- Rules: [[BR-DRV]] — the entire group; every number derived, drillable, denominated
- Screens: cockpit (governed by [[dashboard-kpi-design]])
- Chunks: [[phase-1-platform-floor#P1-14|P1-14]] server-derived subset · [[phase-2-risk-and-events#P2-11|P2-11]] pass rate / heat map / appetite · [[phase-2-risk-and-events#P2-14|P2-14]] the honest cockpit (kills the fabricated 7.8/10 headline and RNG trends)
- Decision: [[ADR-008-metric-honesty]] — coverage split, no synthesized series, no mean-age

**Spec:** [[functional-spec#20.1 The customer's requirements|functional-spec §20.1]] · matrix: [[traceability]]
