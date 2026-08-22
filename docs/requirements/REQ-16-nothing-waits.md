---
type: requirement
id: Requirement 16
spec: "§20.2"
status: planned
target: Phase 1
tags: [requirement, machinery]
aliases: ["Requirement 16", "Req 16"]
---

# Requirement 16 — Nothing waits on someone noticing

**The test:** an overdue duty shows exactly which reminders and escalations fired, when, and to whom — and the same events appear in the audit log. The firm can **prove** it chased.

## Proven by

- Workflows: [[WF-5.27-reminders-escalation]]
- Rules: [[BR-ESC]] (BR-ESC-01 to BR-ESC-07) · [[BR-AUD]] (BR-AUD-03)
- Screens: obligation detail, audit log
- Chunks: [[phase-1-platform-floor#P1-07|P1-07]] time-travel rig · [[phase-1-platform-floor#P1-08|P1-08]] (D-8 → D+8 fires exactly the 7/3/1 // 1/3/7 rungs to the right named people, idempotently) · closes [[G-05-scheduler]]

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
