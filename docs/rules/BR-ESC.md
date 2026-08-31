---
type: rule-group
prefix: BR-ESC
spec: "§6.5"
count: 7
status: normative
tags: [rules, escalation, machinery]
aliases: [BR-ESC-01, BR-ESC-02, BR-ESC-03, BR-ESC-04, BR-ESC-05, BR-ESC-06, BR-ESC-07]
---

# BR-ESC — Reminders and escalation

One fixed ladder (7/3/1 days before due; 1/3/7 days after), one engine, every fired rung logged so the firm can **prove** it chased. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.5]]; the engine is [[WF-5.27-reminders-escalation]], built in [[phase-1-platform-floor#P1-08|P1-08]].

> Note: `BR-ESC-01` still names the 3-day rung "Compliance Officer" while §5.27's ladder table (per change H-10 in [[spec-change-register]]) resolves it as "the compliance escalation owner — by default the Head of Compliance, via the department-head map". The §5.27 wording is the corrected one.

## The rules

- **BR-ESC-01** — the ladder is fixed: owner at 7/3/1 before; owner + line manager at 1 over, compliance escalation owner at 3, CRO at 7. Intervals configurable (§14); the ladder's existence is not. → [[phase-1-platform-floor#P1-08|P1-08]]
- **BR-ESC-02** — exactly **one** reminder engine; a module needing chasing registers a deadline, nothing more. → build-plan invariant I-2, [[WF-5.27-reminders-escalation]]
- **BR-ESC-03** — every fired rung is written to the audit log and surfaced on the record, in notifications and in the queue. → [[REQ-16-nothing-waits]]
- **BR-ESC-04** — escalation targets resolve to **real named people** via the department-head map. → [[phase-1-platform-floor#P1-08|P1-08]]
- **BR-ESC-05** — only active items carry a live ladder; a filed duty is not chased. → [[phase-1-platform-floor#P1-08|P1-08]]
- **BR-ESC-06** — multi-step duties chase **per step**, each on its own due date to its own owner. → [[WF-5.04-obligation-and-tasks]]
- **BR-ESC-07** — expiry chasing uses the same ladder with longer warning windows: 30 days for a risk acceptance, 60 for independent assurance, 7 for a control exception. → [[WF-5.13-risk-acceptance]], [[WF-5.14-exception-register]], [[WF-5.19-third-party-risk]], [[phase-2-risk-and-events#P2-03|P2-03]]

## Proves

[[REQ-16-nothing-waits]] (the whole group is its acceptance test) · closes [[G-05-scheduler]]
