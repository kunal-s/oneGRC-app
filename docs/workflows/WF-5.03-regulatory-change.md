---
type: workflow
id: WF 5.3
spec: "§5.3"
status: specified
phase: Phase 2
tags: [workflow, compliance, source-spine]
aliases: ["WF 5.3"]
---

# WF 5.3 — Regulatory change management

Keeps the firm current: a change arrives with provenance, its impact across obligations, controls and policies is computed, owners are alerted automatically, and the change cannot close while anything impacted is unacknowledged.

**Actors:** Compliance Manager/Analyst assesses and acknowledges · Risk Manager where exposure moves · impacted-record owners are alerted.
**States:** `Assessed → In progress → Closed`, close gated on acknowledgements.

**Spec:** [[functional-spec#5.3 Regulatory change management|functional-spec §5.3]]

## Governed by

- [[BR-LFC]] — BR-LFC-08: no close while an impacted record is unacknowledged; BR-LFC-09: "no impact" is a recorded decision
- A genuinely new duty is **promoted into [[WF-5.01-source-to-action]]**, never edited into an existing obligation (provenance survives)

## Built by

- [[phase-2-risk-and-events#P2-09|P2-09]] — capture, impact set, auto owner alerts, acknowledge, patch, promote, gated close

## Proves

[[REQ-09-regulatory-change]]

## Connects

Fed by the source-scanning agent of [[WF-5.29-agentic-run]] · drives [[WF-5.18-policy-lifecycle]] revisions · cadence changes flow into [[WF-5.05-recurring-cycle]]
