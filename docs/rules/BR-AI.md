---
type: rule-group
prefix: BR-AI
spec: "§6.10"
count: 7
status: normative
tags: [rules, intelligence, machinery]
aliases: [BR-AI-01, BR-AI-02, BR-AI-03, BR-AI-04, BR-AI-05, BR-AI-06, BR-AI-07]
---

# BR-AI — Assistive and agentic intelligence

The system proposes; a human disposes. Every intelligent behaviour sits behind one seam ([[functional-spec#13.3 The seam|spec §13.3]], invariant I-5) so scripted behaviour can become a real model without a rework — and without ever gaining a mutation path of its own. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.10]].

## The rules

- **BR-AI-01** — an agent run **never mutates state**; it returns findings and proposals. → [[WF-5.29-agentic-run]], [[phase-5-intelligence-admin-handoff#P5-04|P5-04]]
- **BR-AI-02** — approving a proposal performs the **existing** governed action — same authority check, same audit entry; no agent-only path. → [[WF-5.29-agentic-run]], [[phase-5-intelligence-admin-handoff#P5-04|P5-04]]
- **BR-AI-03** — an extracted figure is **unverified** until a person confirms it; an unverified clause cannot be saved to a control. → [[WF-5.02-instrument-ingestion]], [[phase-5-intelligence-admin-handoff#P5-03|P5-03]]
- **BR-AI-04** — generated text is never evidence; the artifact remains the proof (twin of BR-EVD-07 in [[BR-EVD]]). → [[WF-5.06-evidence]], [[WF-5.26-committee-packs]]
- **BR-AI-05** — recommendations display as recommendations, with confidence and basis; a rejected recommendation stays on the record. → [[WF-5.01-source-to-action]], [[phase-5-intelligence-admin-handoff#P5-03|P5-03]]
- **BR-AI-06** — assistive answers are scoped to the record in hand and the asker's own access; never an access bypass. → [[phase-5-intelligence-admin-handoff#P5-03|P5-03]]
- **BR-AI-07** — decisions about individuals materially aided by intelligence attract the data-protection regime's heightened diligence. → [[functional-spec#13.4 Model governance, when it becomes real|spec §13.4]]

## Proves

[[REQ-09-regulatory-change]] (agentic arrival, Phase 5) · the propose-then-approve contract behind [[G-08-instrument-ingestion]], [[G-09-assistive-answers]], [[G-10-agent-runs]]
