---
type: workflow
id: WF 5.29
spec: "§5.29"
status: specified
phase: Phase 5
tags: [workflow, machinery, intelligence]
aliases: ["WF 5.29"]
---

# WF 5.29 — An agentic run: propose, then approve to apply

Multi-step work returned as a proposal a person approves: a run executes over live state, **mutates nothing**, and approval performs the existing governed action — same authority check, same audit entry, run id stamped in.

**Actors:** person or schedule starts · system runs and proposes · person approves or rejects each proposal individually.
**Runs:** source scanning → regulatory changes · clause-to-control mapping proposals · chase-watch · pack assembly.

**Spec:** [[functional-spec#5.29 An agentic run: propose, then approve to apply|functional-spec §5.29]]

> v2.1: the old "same inputs, same result" determinism requirement became the **recorded-run requirement** — a run records its inputs, evidence and outputs so any proposal can be audited; bit-identical output remains a property of the deterministic provider only.

## Governed by

- [[BR-AI]] — BR-AI-01: a run never mutates · BR-AI-02: no agent-only path, ever
- [[BR-AUD]] — BR-AUD-06: an applied action names its proposing run · BR-AUD-03: runs log as system actor

## Built by

- [[phase-5-intelligence-admin-handoff#P5-04|P5-04]] — persisted `agent_run` + `agent_proposal`, applied via existing governed actions ([[G-10-agent-runs]]); provider seam in [[phase-5-intelligence-admin-handoff#P5-03|P5-03]]

## Proves

[[REQ-09-regulatory-change]]'s agentic arrival · the automation-governance half of [[REQ-24-self-governance]]'s spirit

## Connects

Feeds [[WF-5.03-regulatory-change]] (source scan), [[WF-5.01-source-to-action]] (mapping proposals), [[WF-5.26-committee-packs]] (assembly) · seam defined at [[functional-spec#13.3 The seam|spec §13.3]]
