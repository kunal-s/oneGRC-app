---
type: requirement
id: Requirement 18
spec: "§20.2"
status: planned
target: Phase 2
tags: [requirement, risk]
aliases: ["Requirement 18", "Req 18"]
---

# Requirement 18 — Risk acceptance always expires

**The test:** an acceptance approved by someone other than the owner, chased from thirty days out, lapsing into an open, escalating exposure (`Acceptance lapsed`) when nobody decides — "accepted" can never mean "forgotten".

## Proven by

- Workflows: [[WF-5.13-risk-acceptance]]
- Rules: [[BR-LFC]] (BR-LFC-04) · [[BR-AUT]] (BR-AUT-07) · [[BR-ESC]] (BR-ESC-07, 30-day window)
- Screens: risk detail; appetite counts a lapsed acceptance as exposure
- Chunks: [[phase-2-risk-and-events#P2-03|P2-03]] (time-travel past expiry → escalates, appetite counts it)
- Naming: the lapse state renamed from `Exception expired` per [[ADR-005-exception-first-class]] — a lapse creates **no** Exception record

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
