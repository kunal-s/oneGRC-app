---
type: gap
id: G-08
area: Instrument ingestion
priority: High
status: planned
tags: [gap, intelligence]
aliases: [G-08]
---

# G-08 — Instrument ingestion

Prototype: the extractor is scripted and deterministic; no model call. Production: a real extractor behind the **same seam**, accuracy measured before it is trusted, manual entry preserved as a complete path.

- Closed by: [[phase-5-intelligence-admin-handoff#P5-03|P5-03]] — the deterministic provider ported behind the §13.3 seam, honestly labelled; a real model is a post-v1 provider swap (may legitimately stay simulated per §19.3)
- Workflow: [[WF-5.02-instrument-ingestion]] · Rules: [[BR-AI]] (BR-AI-03)
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
