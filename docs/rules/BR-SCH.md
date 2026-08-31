---
type: rule-group
prefix: BR-SCH
spec: "§6.4"
count: 9
status: normative
tags: [rules, scheduling, machinery]
aliases: [BR-SCH-01, BR-SCH-02, BR-SCH-03, BR-SCH-04, BR-SCH-05, BR-SCH-06, BR-SCH-07, BR-SCH-08, BR-SCH-09]
---

# BR-SCH — Scheduling, recurrence and clocks

One calendar, cycles that schedule themselves, and regulator clocks that start at detection and never quietly un-breach. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.4]].

## The rules

- **BR-SCH-01** — every deadline in the firm appears on **one** calendar. → [[phase-1-platform-floor#P1-13|P1-13]]
- **BR-SCH-02** — approving a recurring duty schedules the next cycle automatically, at the cadence, from the later of due date and today. → [[WF-5.05-recurring-cycle]], [[phase-1-platform-floor#P1-10|P1-10]], [[ADR-004-obligation-and-cycle]]
- **BR-SCH-03** — event-based, continuous and daily duties are **not** auto-scheduled; a generated next occurrence would be a fiction. → [[WF-5.05-recurring-cycle]]
- **BR-SCH-04** — on time = filed on or before due, else late; no grace band; one definition behind every metric. → [[phase-1-platform-floor#P1-10|P1-10]], [[dashboard-kpi-design]] M3
- **BR-SCH-05** — generating the next cycle never closes a missed one; a firm cannot outrun its own failures. → [[WF-5.05-recurring-cycle]], [[REQ-11-recurring-duties]]
- **BR-SCH-06** — incident regulator clocks start at **detection**, not at record-opening. → [[WF-5.10-incident-multi-clock]], [[phase-2-risk-and-events#P2-06|P2-06]]
- **BR-SCH-07** — a later-discovery duty's clock starts at that discovery, with the divergence recorded explicitly; *configurable per regulator (§14)*. → [[G-18-clock-start-config]], [[phase-2-risk-and-events#P2-06|P2-06]]
- **BR-SCH-08** — a breached clock stays visibly breached; closing the record never clears it. → [[WF-5.10-incident-multi-clock]], [[REQ-10-multi-regulator-incident]]
- **BR-SCH-09** — times are held unambiguously and displayed in the org's operating time zone, zone shown. → [[phase-1-platform-floor#P1-07|P1-07]]

## Proves

[[REQ-10-multi-regulator-incident]] · [[REQ-11-recurring-duties]] · the on-time denominator correction in [[ADR-008-metric-honesty]]
