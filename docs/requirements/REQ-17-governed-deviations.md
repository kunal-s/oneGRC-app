---
type: requirement
id: Requirement 17
spec: "§20.2"
status: planned
target: Phase 2
tags: [requirement, risk]
aliases: ["Requirement 17", "Req 17"]
---

# Requirement 17 — Deviations are governed, not hidden

**The test:** a control failure that cannot be fixed in the window becomes an approved, time-boxed exception with a compensating control, chased to expiry, renewal count visible — and an expired exception reads as an open exposure and escalates.

## Proven by

- Workflows: [[WF-5.14-exception-register]]
- Rules: [[BR-DRV]] (BR-DRV-08 expiry state) · [[BR-LFC]] (BR-LFC-13 expiry review, no auto-issue) · [[BR-AUT]] (BR-AUT-11 escalating renewal) · [[BR-LNK]] (BR-LNK-06 union register)
- Screens: exception register (the union view)
- Chunks: [[phase-2-risk-and-events#P2-04|P2-04]] first-class entity + union register · [[phase-2-risk-and-events#P2-13|P2-13]] expiry review, renewal escalation, convert-to-acceptance
- Decision: [[ADR-005-exception-first-class]] — "Requirement 17 is delivered properly" is that ADR's first stated consequence

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
