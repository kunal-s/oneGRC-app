---
type: gap
id: G-20
area: Cockpit performance at scale
priority: High
status: planned
tags: [gap, metrics, platform]
aliases: [G-20]
---

# G-20 — Cockpit performance at scale

Prototype: everything derived on read over a small world. Production: a materialization strategy that **preserves the derivation guarantee** — write-invalidated caching of the same functions, never a hand-maintained column.

- Closed by: [[phase-5-intelligence-admin-handoff#P5-09|P5-09]] — pagination/filtering server-side, cockpit materialization with write-tied invalidation, load test at §17.1 volumes ×2
- The contract: [[dashboard-kpi-design]] §7.2 · rules [[BR-DRV]] (invariant I-1 survives the cache)
- Spec: [[functional-spec#19.2 The gap register|§19.2]], [[functional-spec#17.2 Performance|§17.2]]
