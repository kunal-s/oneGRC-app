---
type: requirement
id: Requirement 24
spec: "§20.2"
status: planned
target: Phase 5
tags: [requirement, governance, machinery]
aliases: ["Requirement 24", "Req 24"]
---

# Requirement 24 — The platform governs itself

**The test:** a configuration change that is maker-checked and logged, and an audit log the administrator cannot edit — the platform passes, on itself, the test it applies to its customer.

## Proven by

- Workflows: [[WF-5.30-admin-config-change]]
- Rules: [[BR-AUT]] (BR-AUT-08) · [[BR-AUD]] (BR-AUD-02) · [[BR-DAT]] (BR-DAT-05 retention floor)
- Screens: settings, audit log
- Chunks: [[phase-5-intelligence-admin-handoff#P5-01|P5-01]] config engine ("disabling SoD is not possible anywhere") · [[phase-5-intelligence-admin-handoff#P5-02|P5-02]] settings click-through · log immutability landed early in [[phase-1-platform-floor#P1-06|P1-06]]

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
