---
type: requirement
id: Requirement 6
spec: "§20.1"
status: planned
target: Phase 2
tags: [requirement, risk]
aliases: ["Requirement 6", "Req 6"]
---

# Requirement 6 — Risk derived from the consequence of non-compliance

**The test:** a clause whose penalty escalates (fixed fine → per-day charge → personal liability) carries a severity derived from those sourced tiers, and that severity flows into the connected risk.

## Proven by

- Workflows: [[WF-5.01-source-to-action]] (penalty tiers on the clause) · [[WF-5.12-risk-lifecycle]]
- Rules: the §20.3 matrix names none — the mechanism is the derive-don't-store contract: clause severity is on the [[build-plan#3. The data model (Prisma schema outline)|build-plan §3.4]] must-not-exist list, derived from `PenaltyTier` rows
- Screens: clause detail, risk detail
- Chunks: `PenaltyTier` schema in [[phase-0-proof-chain-spike#P0-03|P0-03]] · risk linkage in [[phase-2-risk-and-events#P2-02|P2-02]] · demo script in [[phase-2-risk-and-events#P2-12|P2-12]]

**Spec:** [[functional-spec#20.1 The customer's requirements|functional-spec §20.1]] · matrix: [[traceability]]
