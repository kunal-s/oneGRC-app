---
type: gap
id: G-18
area: Clock-start configuration
priority: High
status: planned
tags: [gap, events]
aliases: [G-18]
---

# G-18 — Clock-start configuration

Prototype: clock windows seeded per regulator. Production: administrator-configurable windows and trigger rules per regulator, including the discovery-based start (BR-SCH-07) — the platform's most legally sensitive clock rule.

- Closed by: [[phase-2-risk-and-events#P2-06|P2-06]] — per-regulator config table (default start = detection; discovery-based start with explicit divergence), customer-editable via [[phase-5-intelligence-admin-handoff#P5-01|P5-01]]
- Workflow: [[WF-5.10-incident-multi-clock]] · Rules: [[BR-SCH]] (BR-SCH-06/07)
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
