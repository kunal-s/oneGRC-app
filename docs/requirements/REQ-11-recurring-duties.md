---
type: requirement
id: Requirement 11
spec: "§20.1"
status: planned
target: Phase 1
tags: [requirement, compliance]
aliases: ["Requirement 11", "Req 11"]
---

# Requirement 11 — Recurring duties that run to completion every cycle, with proof

**The test:** monthly and quarterly obligations cycle through due → in review → filed with the next instance scheduled automatically and overdue cycles escalating — the firm never re-creates a duty, and the register always shows which cycles were on time.

## Proven by

- Workflows: [[WF-5.04-obligation-and-tasks]] · [[WF-5.05-recurring-cycle]]
- Rules: [[BR-SCH]] (BR-SCH-02 to BR-SCH-05)
- Screens: obligation detail (per-period ledger), calendar
- Chunks: [[phase-1-platform-floor#P1-10|P1-10]] (next cycle appears immediately; a missed cycle stays overdue and escalating while the next exists)
- Decision: [[ADR-004-obligation-and-cycle]] — the Obligation/ObligationCycle split is what makes this demonstrable

**Spec:** [[functional-spec#20.1 The customer's requirements|functional-spec §20.1]] · matrix: [[traceability]]
