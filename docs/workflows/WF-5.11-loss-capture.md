---
type: workflow
id: WF 5.11
spec: "§5.11"
status: specified
phase: Phase 2
tags: [workflow, risk, events]
aliases: ["WF 5.11"]
---

# WF 5.11 — Operational loss capture

One loss book on the standard seven operational-risk event categories: incidents and confirmed frauds book gross and recoveries; **net is always derived** (gross − recoveries, floored at zero), so list, detail and roll-up cannot disagree.

**Actors:** Control Owner or Investigator records · Finance reconciles · Risk Manager reports.
**States:** category set → gross recorded → recoveries appended (with accounting refs) → net derived.

**Spec:** [[functional-spec#5.11 Operational loss capture|functional-spec §5.11]]

## Governed by

- [[BR-DRV]] — BR-DRV-04: net never stored, never keyed; a recovery cannot exceed gross
- [[BR-LNK]] — BR-LNK-07: losses from any source land in the **one** loss engine

## Built by

- [[phase-2-risk-and-events#P2-07|P2-07]] — the loss engine (`core/loss`); fraud books into it from [[phase-4-investigations-and-privacy#P4-04|P4-04]]

## Proves

Feeds the Risk Committee loss section and the proactive-detection metric of [[WF-5.23-fraud-case]] · loss metrics in [[dashboard-kpi-design]] (Q5)

## Connects

Fed by [[WF-5.10-incident-multi-clock]] and [[WF-5.23-fraud-case]] · reported through [[WF-5.26-committee-packs]]
