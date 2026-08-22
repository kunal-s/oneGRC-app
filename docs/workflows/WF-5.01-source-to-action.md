---
type: workflow
id: WF 5.1
spec: "§5.1"
status: specified
phase: Phase 0
tags: [workflow, compliance, source-spine]
aliases: ["WF 5.1"]
---

# WF 5.1 — Source-to-action (headline)

Turns raw law into managed compliance: an instrument is broken into clauses, and one clause becomes a tracked, owned, evidenced control — the spine every other record connects to. **The clause is the unit.**

**Actors:** Compliance Manager (Compliance & Company Secretarial) decides · Analyst prepares · the assistant recommends · an external specialist interprets where asked.
**States (clause):** `Processing → Recommended → Saved | Specialist review | Not applicable` — the last three are *decided* states, each recorded with actor, timestamp and basis.

**Spec:** [[functional-spec#5.1 Source-to-action: from a law to a tracked control (headline)|functional-spec §5.1]]

## Governed by

- [[BR-AUT]] — BR-AUT-02: clause authority by **department**, not role
- [[BR-LFC]] — BR-LFC-02: supersession never carries decisions forward; BR-LFC-09: "not applicable" is a recorded decision
- [[BR-LNK]] — BR-LNK-01/02: the chain resolves both ways once saved
- [[BR-AI]] — BR-AI-05: rejected recommendations stay on the record

## Built by

- [[phase-0-proof-chain-spike#P0-07|P0-07]] read API + proof-chain resolver · [[phase-0-proof-chain-spike#P0-08|P0-08]] governed clause actions · [[phase-0-proof-chain-spike#P0-10|P0-10]] Source Library / instrument / clause screens

## Proves

[[REQ-03-clause-as-the-unit]] · [[REQ-04-source-to-action]] · [[REQ-05-map-once-satisfy-many]] · [[REQ-06-risk-from-consequence]] (severity derived from sourced penalty tiers) · [[REQ-07-connected-demonstration]]

## Connects

Fed by [[WF-5.02-instrument-ingestion]] (new instruments) and [[WF-5.03-regulatory-change]] (step 6 promotions) · produces the duties of [[WF-5.04-obligation-and-tasks]] · the control side continues in [[WF-5.08-control-testing]]
