---
type: workflow
id: WF 5.5
spec: "§5.5"
status: specified
phase: Phase 1
tags: [workflow, compliance, duty-cycle]
aliases: ["WF 5.5"]
---

# WF 5.5 — The recurring cycle

A firm never re-creates a duty it performs every month, and never loses track of which cycles were met: filing schedules the next instance automatically and records this one's on-time status in a per-period ledger.

**Actors:** system only.
**States:** on `Filed` → next instance created `Due` (same duty, owner, checker, provenance; evidence cleared); timing recorded on-time/late.

**Spec:** [[functional-spec#5.5 The recurring cycle|functional-spec §5.5]]

## Governed by

- [[ADR-004-obligation-and-cycle]] — the Obligation/ObligationCycle split is what makes the ledger and Requirement 11 computable
- [[BR-SCH]] — BR-SCH-02 (next = cadence from later of due/today) · BR-SCH-03 (event/continuous/daily never auto-scheduled) · BR-SCH-04 (one on-time definition) · BR-SCH-05 (generation never closes a missed cycle)

## Built by

- [[phase-1-platform-floor#P1-10|P1-10]] — recurrence + on-time ledger; historical cycles synthesized at seed so trends derive honestly ([[G-26-historical-data]])

## Proves

[[REQ-11-recurring-duties]] · feeds the M3 filed-on-time metric in [[dashboard-kpi-design]]

## Connects

Triggered by [[WF-5.04-obligation-and-tasks]] filing · cadence changes arrive via [[WF-5.03-regulatory-change]] · missed cycles escalate via [[WF-5.27-reminders-escalation]]
