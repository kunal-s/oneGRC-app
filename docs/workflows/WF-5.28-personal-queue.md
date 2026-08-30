---
type: workflow
id: WF 5.28
spec: "§5.28"
status: specified
phase: Phase 1
tags: [workflow, machinery, personas]
aliases: ["WF 5.28"]
---

# WF 5.28 — The personal queue and the working day

"What is mine and what do I do next", at the right altitude: assembled **from live state on every request** (never a stored inbox that can drift), scoped by department and case access **at source**, ordered by urgency, one action per item.

**Actors:** system assembles · the person acts, the item clears.
**Contents:** approvals waiting, owned duties due/overdue, remediation actions, campaign tasks, expiring exceptions and acceptances, breached indicators, lapsed diligence, cleared investigation work.

**Spec:** [[functional-spec#5.28 The personal queue and the working day|functional-spec §5.28]]

## Governed by

- [[BR-SCP]] — BR-SCP-09: case-restricted work filtered at source, so the queue never becomes the leak · department scope per BR-SCP-02
- The first-line owner's queue must be clearable in a sitting — length is a design constraint
- The queue is in the [[build-plan#3. The data model (Prisma schema outline)|build-plan §3.4]] must-not-exist list: assembled per request, never stored

## Built by

- [[phase-1-platform-floor#P1-12|P1-12]] — server-derived queue; restricted-case filter completed by [[phase-4-investigations-and-privacy#P4-01|P4-01]]

## Proves

[[REQ-08-role-based-views]] — three personas, three genuinely different queues, live

## Connects

Fed by [[WF-5.27-reminders-escalation]] rungs and every module's open work · persona/altitude model in [[personas]] · the switcher is a server-side identity act ([[ADR-002-authorization-seam]])
