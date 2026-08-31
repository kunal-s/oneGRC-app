---
type: rule-group
prefix: BR-DAT
spec: "§6.11"
count: 6
status: normative
tags: [rules, privacy, data]
aliases: [BR-DAT-01, BR-DAT-02, BR-DAT-03, BR-DAT-04, BR-DAT-05, BR-DAT-06]
---

# BR-DAT — Data handling, retention and privacy

You cannot leak what you do not hold: masking by default, no reporter identity stored, retention that outlives convenience. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.11]].

## The rules

- **BR-DAT-01** — data principals' identifiers display **masked** by default; unmasking is a governed, logged action. → [[WF-5.25-dsar]], [[phase-4-investigations-and-privacy#P4-05|P4-05]]
- **BR-DAT-02** — the speak-up reporter's identity **is not stored** — only a reference code and, where applicable, a sealed custody note. Structural, not configured (invariant I-7). → [[WF-5.24-speak-up]], [[phase-4-investigations-and-privacy#P4-02|P4-02]], [[REQ-22-structural-protection]]
- **BR-DAT-03** — retention rules are held per store and enforced; erasure conflicting with statutory retention is refused **with the rule cited**. → [[WF-5.25-dsar]], [[phase-4-investigations-and-privacy#P4-05|P4-05]]
- **BR-DAT-04** — where the law requires it, data stays in the jurisdiction; the split-plane deployment of §15 exists for this. → [[functional-spec#15. Deployment and Delivery Models|spec §15]]
- **BR-DAT-05** — the audit log has a retention floor nobody can shorten it below. → [[phase-1-platform-floor#P1-06|P1-06]], [[WF-5.30-admin-config-change]]
- **BR-DAT-06** — a register export carries the same access scope as the screen it came from. → [[phase-5-intelligence-admin-handoff#P5-08|P5-08]]

## Proves

[[REQ-22-structural-protection]] (identity not stored) · the erasure-vs-retention collision in [[WF-5.25-dsar]]
