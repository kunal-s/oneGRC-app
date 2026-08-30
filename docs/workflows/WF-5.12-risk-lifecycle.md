---
type: workflow
id: WF 5.12
spec: "§5.12"
status: specified
phase: Phase 2
tags: [workflow, risk]
aliases: ["WF 5.12"]
---

# WF 5.12 — The risk lifecycle

A risk is a thing that moves, not a noun in a list: identified from somewhere real, assessed, treated by named actions with owners and dates, evidenced, challenged, approved, then monitored — with the **stage always derived from the record**, so register and detail cannot disagree.

**Actors:** Risk Manager / Control Owner owns and executes · Risk Manager or Executive approves (SoD) · Auditor tests independently.
**States:** `Identified → Assessed → Treatment planned → In execution → Evidenced → Under review → Awaiting approval → Monitoring → Closed`, with `Accepted → Acceptance lapsed` via [[WF-5.13-risk-acceptance]].

**Spec:** [[functional-spec#5.12 The risk lifecycle|functional-spec §5.12]]

## Governed by

- [[BR-LFC]] — BR-LFC-03: **actions gate approval** — no `Awaiting approval` while an action is open
- [[BR-DRV]] — BR-DRV-01 (stage derived) · BR-DRV-14 (projected residual beside current, so a plan behind cannot present as done)
- [[BR-AUT]] — approve carries SoD

## Built by

- [[phase-2-risk-and-events#P2-02|P2-02]] — lifecycle API with the gate; derived stage and projected residual serialized

## Proves

[[REQ-06-risk-from-consequence]] (severity flows from sourced penalties into the connected risk) · [[REQ-19-cycles-move-the-register]] (write-back target) · [[REQ-07-connected-demonstration]]

## Connects

Fed by findings ([[WF-5.21-audit-programme]]), incidents ([[WF-5.10-incident-multi-clock]]), assessments ([[WF-5.16-rcsa-campaign]]), investigations ([[WF-5.23-fraud-case]]) · watched by [[WF-5.15-kri-breach]] · accepts via [[WF-5.13-risk-acceptance]]
