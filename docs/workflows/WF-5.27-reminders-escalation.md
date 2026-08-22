---
type: workflow
id: WF 5.27
spec: "§5.27"
status: specified
phase: Phase 1
tags: [workflow, machinery, escalation]
aliases: ["WF 5.27"]
---

# WF 5.27 — Reminders and escalation

**Nothing in the platform waits on someone noticing.** One engine chases every deadline on one fixed ladder — owner at 7/3/1 days before due; owner + line manager at 1 day over, compliance escalation owner at 3, CRO at 7 — and its output is the trail proving the firm chased.

**Actors:** system; targets are real named people resolved via the department-head map.
**Pointed at:** obligation and task due dates (per step), remediation actions, risk reviews, exception and acceptance expiries, breached-indicator refreshes, diligence and assurance dates, campaign due dates, speak-up feedback windows, fraud investigation targets.

**Spec:** [[functional-spec#5.27 Reminders and escalation|functional-spec §5.27]]

## Governed by

- [[BR-ESC]] — the whole group: fixed ladder (01), one engine (02), every rung logged and surfaced (03), named targets (04), active items only (05), per-step (06), expiry windows 7/30/60 (07)
- [[BR-AUD]] — BR-AUD-03: fired rungs log with the system as actor

## Built by

- [[phase-1-platform-floor#P1-07|P1-07]] ClockService (frozen/real/offset — the time-travel test rig) · [[phase-1-platform-floor#P1-08|P1-08]] the reconciler: idempotent, compares due rungs vs dispatch records, fires the missing ([[G-05-scheduler]])

## Proves

[[REQ-16-nothing-waits]]

## Connects

Chases everything: [[WF-5.04-obligation-and-tasks]], [[WF-5.12-risk-lifecycle]], [[WF-5.13-risk-acceptance]], [[WF-5.14-exception-register]], [[WF-5.15-kri-breach]], [[WF-5.19-third-party-risk]], [[WF-5.16-rcsa-campaign]], [[WF-5.24-speak-up]], [[WF-5.23-fraud-case]] · rungs surface in [[WF-5.28-personal-queue]] and notifications
