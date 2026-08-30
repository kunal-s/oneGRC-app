---
type: gap
id: G-05
area: The scheduler
priority: Essential
status: planned
tags: [gap, floor, machinery]
aliases: [G-05]
---

# G-05 — The scheduler

Prototype: reminders are *derived* against the demo anchor — deterministic and provable, but nothing fires. Production: a real scheduler that fires on time with delivery, retry and confirmation, **while keeping the derivation property** so the ladder stays reconstructible. A floor item.

- Closed by: [[phase-1-platform-floor#P1-07|P1-07]] ClockService (frozen/real/offset preserves the provable-derivation property as time-travel tests) · [[phase-1-platform-floor#P1-08|P1-08]] the idempotent reconciler
- Workflow: [[WF-5.27-reminders-escalation]] · Rules: [[BR-ESC]] · Proves [[REQ-16-nothing-waits]]
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
