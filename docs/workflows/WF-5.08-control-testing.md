---
type: workflow
id: WF 5.8
spec: "§5.8"
status: specified
phase: Phase 2
tags: [workflow, compliance, controls]
aliases: ["WF 5.8"]
---

# WF 5.8 — Control testing and re-testing

A control that is never tested is an assertion: tests run on cadence (or out-of-cycle after an incident/finding/change), results land as history rows, and a `Fail` raises a remediation issue automatically.

**Actors:** Control Owner tests · Auditor may test independently · Executive may direct a re-test.
**States (result):** `Pass | Partial | Fail` per test, history prepended; "latest result" is derived from test rows, never a stored column.

**Spec:** [[functional-spec#5.8 Control testing and re-testing|functional-spec §5.8]]

## Governed by

- [[BR-LFC]] — BR-LFC-11: Fail auto-raises an issue into [[WF-5.22-issue-remediation]]
- `Partial` is outside the pass-rate numerator but raises nothing ([[ADR-008-metric-honesty]] pass-rate definition, [[dashboard-kpi-design]] M5/M6)
- Unfixable failure → exception via [[WF-5.14-exception-register]]

## Built by

- [[phase-2-risk-and-events#P2-11|P2-11]] — retest API with history, fail→issue, heat map / appetite / pass-rate + duty-coverage metrics ([[G-19-duty-coverage-metric]] decided)

## Proves

[[REQ-05-map-once-satisfy-many]] (the control's grouped-by-act page) · [[REQ-14-metrics-on-demand]] (pass rate moves on retest)

## Connects

Continuous twin: [[WF-5.09-continuous-monitoring]] · evidence via [[WF-5.06-evidence]] · assurance over it in [[WF-5.21-audit-programme]] · risks it mitigates in [[WF-5.12-risk-lifecycle]]
