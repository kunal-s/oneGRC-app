---
type: workflow
id: WF 5.25
spec: "§5.25"
status: specified
phase: Phase 4
tags: [workflow, privacy]
aliases: ["WF 5.25"]
---

# WF 5.25 — Data-subject request: erasure versus retention

The worked case where two legal duties collide: a principal asks for erasure, the firm must retain some of it — and the resolution is explicit and auditable, with the **partial refusal citing its statutory basis as the deliverable**, not a failure.

**Actors:** DPO owns · Compliance Analyst executes.
**States:** erasure runs five staged tasks — locate → check retention → erase what may be erased → log per store → produce the audit record (`Complete`); other request types run three.

**Spec:** [[functional-spec#5.25 Data-subject request: erasure versus retention|functional-spec §5.25]]

## Governed by

- [[BR-DAT]] — BR-DAT-03: erasure conflicting with statutory retention is refused with the rule cited · BR-DAT-01: principals' identifiers masked by default, unmasking a logged act
- [[ADR-006-task-work-item]] — the stages are Tasks (simple policy) ordered by dependency; completion derived
- A missed statutory response window is itself flagged breached and escalates

## Built by

- [[phase-4-investigations-and-privacy#P4-05|P4-05]] — inventory, stepwise DSAR, refusals cited, breach routing, masking

## Proves

Contributes to [[REQ-01-one-platform]] and [[REQ-14-metrics-on-demand]] (privacy duties on the same rails); the masking tests ride with [[REQ-22-structural-protection]]'s spirit

## Connects

A request revealing a breach routes into [[WF-5.10-incident-multi-clock]] with the data-protection clock started · discharges cycles in [[WF-5.04-obligation-and-tasks]]
