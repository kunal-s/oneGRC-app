---
type: workflow
id: WF 5.7
spec: "§5.7"
status: specified
phase: Phase 0
tags: [workflow, machinery, authority]
aliases: ["WF 5.7"]
---

# WF 5.7 — Maker-and-checker: the shared pattern

One separation-of-duties pattern reused everywhere — filings, acceptances, exceptions, pack narratives, investigation closures, configuration changes — rather than a different approval mechanism per module.

**Actors:** Maker does and submits · Checker (nominated at creation) approves or returns with a reason.
**States:** `Drafted → Submitted → Approved | Returned → Drafted` — for work items these are **projections of the Task machine**, not a second state machine ([[ADR-006-task-work-item]]).

**Spec:** [[functional-spec#5.7 Maker-and-checker: the shared pattern|functional-spec §5.7]]

## Governed by

- [[BR-AUT]] — BR-AUT-04 (checker nominated before the work) · BR-AUT-05 (maker never approves) · BR-AUT-06 (applies to every sign-off verb) · BR-AUT-10 (optional line-of-defence constraint, [[G-17-lod-constraints]])
- [[BR-LFC]] — BR-LFC-10: a return carries its reason

## Built by

- [[phase-0-proof-chain-spike#P0-06|P0-06]] SoD in the GovernedMutation runner · [[phase-1-platform-floor#P1-03|P1-03]] nominated checkers everywhere + full matrix contract test

## Proves

The SoD half of nearly every requirement; explicitly named in [[REQ-13-packs-as-a-view]], [[REQ-18-acceptance-expires]], [[REQ-24-self-governance]]

## Connects

Applied by [[WF-5.04-obligation-and-tasks]], [[WF-5.10-incident-multi-clock]] (filings), [[WF-5.12-risk-lifecycle]], [[WF-5.13-risk-acceptance]], [[WF-5.14-exception-register]], [[WF-5.16-rcsa-campaign]], [[WF-5.26-committee-packs]], [[WF-5.23-fraud-case]]/[[WF-5.24-speak-up]] (closure, unseal), [[WF-5.30-admin-config-change]]
