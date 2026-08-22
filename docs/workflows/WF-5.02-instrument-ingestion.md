---
type: workflow
id: WF 5.2
spec: "§5.2"
status: specified
phase: Phase 5
tags: [workflow, compliance, source-spine, intelligence]
aliases: ["WF 5.2"]
---

# WF 5.2 — Creating a source instrument, with assistance

Makes getting law into the platform a **review task rather than a data-entry task**: the extractor proposes identity and clause breakdown from a URL or upload; a human accepts, edits or rejects clause by clause — and stays accountable for every accepted one.

**Actors:** Compliance (with clause authority) reviews and accepts · the extractor proposes.
**States:** draft ingestion → accepted set → instrument created with clauses at `Processing`/`Recommended`, entering [[WF-5.01-source-to-action]].

**Spec:** [[functional-spec#5.2 Creating a source instrument, with assistance|functional-spec §5.2]]

## Governed by

- [[BR-AI]] — BR-AI-03: every extracted figure is **unverified** until a person confirms it; an unverified clause cannot be saved to a control
- [[BR-AUT]] — BR-AUT-02: clause authority gates the whole flow
- Manual entry must remain a complete path, never a degraded one ([[G-08-instrument-ingestion]])

## Built by

- [[phase-5-intelligence-admin-handoff#P5-03|P5-03]] — the deterministic extractor ported behind the [[functional-spec#13.3 The seam|§13.3 seam]]; a real model replaces it later without reworking the flow

## Proves

[[REQ-03-clause-as-the-unit]] (instrument → clauses) · closes [[G-08-instrument-ingestion]] at seam level
