---
type: workflow
id: WF 5.6
spec: "§5.6"
status: specified
phase: Phase 0
tags: [workflow, compliance, evidence]
aliases: ["WF 5.6"]
---

# WF 5.6 — Evidence: capture, submission and verification

Turns assertion into defence: proof is a byproduct of doing the work, captured once and linked to task, obligation, control and framework references — with a clear line between "someone said" (`Submitted`) and "someone independent checked" (`Verified`).

**Actors:** Maker attaches · Checker verifies · feeds capture automatically.
**States:** `Submitted → Verified`; auto-captured evidence still requires a human verification act.

**Spec:** [[functional-spec#5.6 Evidence: capture, submission and verification|functional-spec §5.6]]

## Governed by

- [[BR-EVD]] — the whole group: required (01), verified by another (02), auto still verified (03), linked everywhere (04), on-behalf-of (05), guidance first (06), generated text never evidence (07)
- [[BR-AI]] — BR-AI-04 twin of BR-EVD-07

## Built by

- [[phase-0-proof-chain-spike#P0-08|P0-08]] metadata attach/verify · [[phase-1-platform-floor#P1-05|P1-05]] real files: upload, sha256, streamed download, integrity re-verify, virus-scan seam ([[G-13-file-handling]], [[G-14-evidence-storage]])

## Proves

[[REQ-02-policy-driven-duties]] · [[REQ-10-multi-regulator-incident]] (one evidence set, three filings) · [[REQ-12-audit-flow]]

## Connects

Serves [[WF-5.04-obligation-and-tasks]], [[WF-5.08-control-testing]], [[WF-5.09-continuous-monitoring]] (auto-capture), [[WF-5.10-incident-multi-clock]], [[WF-5.26-committee-packs]] (issued pack filed as evidence)
