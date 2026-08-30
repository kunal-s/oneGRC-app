---
type: gap
id: G-04
area: Multi-user concurrency
priority: Essential
status: planned
tags: [gap, floor]
aliases: [G-04]
---

# G-04 — Multi-user concurrency

Prototype: single user, single session. Production: concurrent editing, conflict detection, and the "someone else changed this" path (spec §17.5).

- Closed by: [[phase-1-platform-floor#P1-15|P1-15]] — optimistic `version` checks in the runner, 409 with a what-changed payload, conflict banner; never a silent overwrite
- Spec: [[functional-spec#19.2 The gap register|§19.2]], [[functional-spec#17.5 Data integrity and concurrency|§17.5]]
