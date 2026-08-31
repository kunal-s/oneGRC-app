---
type: rule-group
prefix: BR-AUD
spec: "§6.9"
count: 7
status: normative
tags: [rules, audit-trail, machinery]
aliases: [BR-AUD-01, BR-AUD-02, BR-AUD-03, BR-AUD-04, BR-AUD-05, BR-AUD-06, BR-AUD-07]
---

# BR-AUD — Audit trail

The record the firm defends itself with: one entry per change, append-only, tamper-evident, navigable. Mechanism: hash-chained `audit_entry` written in the **same transaction** as the mutation ([[build-plan#1. Target architecture|build-plan §1.4]], invariant I-4). Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.9]].

## The rules

- **BR-AUD-01** — every record change writes one entry: actor, action, object, timestamp, before/after where relevant. → [[phase-0-proof-chain-spike#P0-06|P0-06]]
- **BR-AUD-02** — the log is **append-only and tamper-evident**; nobody, including the administrator, edits or deletes. → hash chain + DB grants + block trigger, [[phase-1-platform-floor#P1-06|P1-06]], [[G-15-audit-log-immutability]], [[REQ-24-self-governance]]
- **BR-AUD-03** — system-originated events (fired rungs, monitoring runs, agent runs) log with the system as actor. → [[WF-5.27-reminders-escalation]], [[WF-5.29-agentic-run]]
- **BR-AUD-04** — each entry links to the records involved; the trail is navigable, not just readable. → audit log surface, [[phase-0-proof-chain-spike#P0-11|P0-11]]
- **BR-AUD-05** — for confidential modules the log records **the act, never the content**. → [[WF-5.24-speak-up]], [[phase-4-investigations-and-privacy#P4-03|P4-03]], [[REQ-22-structural-protection]]
- **BR-AUD-06** — an action applied from an agent proposal names the run that proposed it. → [[WF-5.29-agentic-run]], [[phase-5-intelligence-admin-handoff#P5-04|P5-04]]
- **BR-AUD-07** — the log is readable by the second and third lines, not only the administrator. → [[phase-0-proof-chain-spike#P0-11|P0-11]], [[phase-5-intelligence-admin-handoff#P5-02|P5-02]]

## Proves

[[REQ-16-nothing-waits]] (the chase trail) · [[REQ-24-self-governance]] (uneditable log) · [[REQ-22-structural-protection]] (act-not-content)
