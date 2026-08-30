---
type: workflow
id: WF 5.4
spec: "§5.4"
status: specified
phase: Phase 0
tags: [workflow, compliance, duty-cycle]
aliases: ["WF 5.4"]
---

# WF 5.4 — The obligation and its tasks

The duty cycle most users live inside. **The obligation is the duty, the task is the work**: maker-checker, evidence and chasing live at the task level, so a four-step duty has four owners, four deadlines, four evidence trails.

**Actors:** Owner performs · Maker attaches proof · Checker verifies · Compliance Manager oversees the register.
**States:** cycle `Due → In review → Filed`; task `Open · InProgress · Submitted · Returned · Done · Cancelled` gated by `completionPolicy`; `Overdue` is always derived (BR-DRV-17).

**Spec:** [[functional-spec#5.4 The obligation and its tasks|functional-spec §5.4]]

## Governed by

- [[ADR-006-task-work-item]] — **one Task engine** for obligations, remediation, campaigns, DSAR stages, attestations; policy gates transitions (resolves the §7.1/§7.3 conflict)
- [[ADR-004-obligation-and-cycle]] — Obligation (standing duty) vs ObligationCycle (instance)
- [[BR-EVD]] — BR-EVD-01: submission blocked without evidence
- [[BR-AUT]] — BR-AUT-05: submitter never approves; the exception path is [[WF-5.14-exception-register]], the only legitimate way to be late without the ladder running
- [[BR-ESC]] — BR-ESC-06: multi-step duties chase per step

## Built by

- [[phase-0-proof-chain-spike#P0-08|P0-08]] governed task/cycle actions · [[phase-1-platform-floor#P1-11|P1-11]] full flows incl. return-with-reason and on-behalf-of

## Proves

[[REQ-02-policy-driven-duties]] (internal duty ≡ statutory filing) · [[REQ-11-recurring-duties]] (with [[WF-5.05-recurring-cycle]]) · [[REQ-01-one-platform]]

## Connects

Duties born in [[WF-5.01-source-to-action]] or [[WF-5.18-policy-lifecycle]] · proof via [[WF-5.06-evidence]] · approval pattern [[WF-5.07-maker-checker]] · chased by [[WF-5.27-reminders-escalation]]
