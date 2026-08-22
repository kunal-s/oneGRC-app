---
type: rule-group
prefix: BR-EVD
spec: "§6.3"
count: 7
status: normative
tags: [rules, evidence, compliance]
aliases: [BR-EVD-01, BR-EVD-02, BR-EVD-03, BR-EVD-04, BR-EVD-05, BR-EVD-06, BR-EVD-07]
---

# BR-EVD — Evidence

Proof as a byproduct of doing the work: nothing completes without evidence, and nothing counts until someone other than the attacher verified it. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.3]]; the workflow is [[WF-5.06-evidence]].

## The rules

- **BR-EVD-01** — no duty completes without evidence attached; submission is blocked, not warned. → [[WF-5.04-obligation-and-tasks]], [[phase-0-proof-chain-spike#P0-08|P0-08]], [[phase-1-platform-floor#P1-11|P1-11]]
- **BR-EVD-02** — evidence moves `Submitted → Verified`; the verifier is not the attacher. → [[WF-5.06-evidence]], [[phase-0-proof-chain-spike#P0-08|P0-08]]
- **BR-EVD-03** — auto-captured evidence still needs a human verification act: the feed proves the system ran, a person attests it proves the duty. → [[WF-5.09-continuous-monitoring]]
- **BR-EVD-04** — evidence links to its task, obligation, control and framework references — captured once, reachable from every direction. → explicit join tables in [[phase-0-proof-chain-spike#P0-03|P0-03]], [[REQ-10-multi-regulator-incident]]
- **BR-EVD-05** — capture on another person's behalf records both people. → [[phase-1-platform-floor#P1-05|P1-05]]
- **BR-EVD-06** — show what good proof looks like **before** the maker attaches anything. → guidance endpoint in [[phase-1-platform-floor#P1-05|P1-05]]
- **BR-EVD-07** — generated text is never evidence (twin of BR-AI-04 in [[BR-AI]]). → [[WF-5.06-evidence]], [[WF-5.29-agentic-run]]

## Proves

[[REQ-02-policy-driven-duties]] (missing evidence is visibly a gap) · [[REQ-12-audit-flow]] ("done but not documented" impossible) · metric M4 evidence-backed completions in [[dashboard-kpi-design]]
