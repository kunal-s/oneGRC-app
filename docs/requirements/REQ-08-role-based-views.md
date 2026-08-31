---
type: requirement
id: Requirement 8
spec: "§20.1"
status: planned
target: Phase 1
tags: [requirement, personas]
aliases: ["Requirement 8", "Req 8"]
---

# Requirement 8 — Role-based, simplified views

**The test:** the cockpit roll-up, the compliance officer's full register, and an individual owner's single-task queue, switched live — same data, each persona's own altitude, the owner's view genuinely simple.

## Proven by

- Workflows: [[WF-5.28-personal-queue]]
- Rules: [[BR-SCP]] (BR-SCP-01 to BR-SCP-04)
- Screens: queue, cockpit, registers
- Chunks: [[phase-1-platform-floor#P1-04|P1-04]] department scope · [[phase-1-platform-floor#P1-12|P1-12]] server-derived queue ("three personas, three genuinely different queues") · [[phase-1-platform-floor#P1-16|P1-16]] capabilities-driven UI
- Model: [[personas]] — persona, role and person are three different things; the switcher is a server-side identity act ([[ADR-002-authorization-seam]])

**Spec:** [[functional-spec#20.1 The customer's requirements|functional-spec §20.1]] · matrix: [[traceability]]
