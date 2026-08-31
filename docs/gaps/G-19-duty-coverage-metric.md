---
type: gap
id: G-19
area: Duty coverage metric
priority: High
status: decided
tags: [gap, metrics]
aliases: [G-19]
---

# G-19 — Duty coverage metric

Prototype: only the control-pass-rate sense of "coverage" is computed. **Decided (v2.1, §10.1 / §21.11):** both metrics built — "Control pass rate" and "Duty coverage" — and the bare word "coverage" banned from the UI.

- Decision: [[ADR-008-metric-honesty]] — the split, the definitions, and why duty coverage is the headline
- Closed by: [[phase-1-platform-floor#P1-14|P1-14]] both functions computed · [[phase-2-risk-and-events#P2-11|P2-11]] labelled tiles with honest denominators (tested-in-cadence; never-tested inflates neither)
- Definitions: [[dashboard-kpi-design]] M5/M6/M8
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
