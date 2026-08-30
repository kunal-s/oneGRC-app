---
type: requirement
id: Requirement 5
spec: "§20.1"
status: planned
target: Phase 0
tags: [requirement, compliance]
aliases: ["Requirement 5", "Req 5"]
---

# Requirement 5 — Map once, satisfy many

**The test:** a single breach-response control satisfies both a data-protection clause and a security-regulator clause, shown on the control's own page **grouped by act**.

## Proven by

- Workflows: [[WF-5.01-source-to-action]] · [[WF-5.08-control-testing]]
- Rules: [[BR-LNK]] (BR-LNK-04) · cardinality per [[ADR-009-obligation-control-cardinality]] (the many-to-many extends to obligation ↔ control, the v2.1 §7.2 ruling)
- Screens: control detail
- Chunks: [[phase-0-proof-chain-spike#P0-11|P0-11]] (grouped-by-act panel) · schema in [[phase-0-proof-chain-spike#P0-03|P0-03]]

**Spec:** [[functional-spec#20.1 The customer's requirements|functional-spec §20.1]] · matrix: [[traceability]]
