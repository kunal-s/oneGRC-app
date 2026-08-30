---
type: workflow
id: WF 5.18
spec: "§5.18"
status: specified
phase: Phase 2
tags: [workflow, compliance, policies]
aliases: ["WF 5.18"]
---

# WF 5.18 — The policy lifecycle

Policies are where internal obligations come from: drafted citing the clauses behind them, published at explicit versions through maker-checker, mapped to the controls that operationalize them, attested per version, and chased to their review dates.

**Actors:** Owner drafts and submits · Approver publishes (SoD) · system schedules review + attestation.
**States:** `Draft → In review → Published` (version incremented; versions are rows, because attestation is version-bound).

**Spec:** [[functional-spec#5.18 The policy lifecycle|functional-spec §5.18]]

## Governed by

- [[BR-AUT]] — publish carries SoD · [[BR-LFC]] — BR-LFC-06 downstream (versions)
- An overdue review escalates but duties derived from the policy stay live — the gap is visible, the duty does not lapse

## Built by

- [[phase-2-risk-and-events#P2-10|P2-10]] — draft→review→publish, review-date chasing, provenance to clauses

## Proves

[[REQ-02-policy-driven-duties]] (the internal-duty provenance: policy → clause)

## Connects

Produces duties for [[WF-5.04-obligation-and-tasks]] · publication triggers [[WF-5.17-policy-attestation]] · revised under [[WF-5.03-regulatory-change]] · provenance continues [[WF-5.01-source-to-action]]'s chain
