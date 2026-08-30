---
type: rule-group
prefix: BR-LNK
spec: "§6.8"
count: 10
status: normative
tags: [rules, provenance, compliance]
aliases: [BR-LNK-01, BR-LNK-02, BR-LNK-03, BR-LNK-04, BR-LNK-05, BR-LNK-06, BR-LNK-07, BR-LNK-08, BR-LNK-09, BR-LNK-10]
---

# BR-LNK — Linkage and provenance

The connected model as law: "why does this duty exist" and "what did this law produce" must both be answerable from the system, and every register of record is singular. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.8]].

**Decisions that shape this group:** [[ADR-005-exception-first-class]] (BR-LNK-06 becomes a union view) · [[ADR-009-obligation-control-cardinality]] (obligation ↔ control many-to-many, the v2.1 §7.2 ruling).

## The rules

- **BR-LNK-01** — every obligation and control traces back to a clause, or to a policy that itself traces to one. → [[WF-5.01-source-to-action]], [[phase-0-proof-chain-spike#P0-07|P0-07]], [[REQ-04-source-to-action]]
- **BR-LNK-02** — every clause resolves forward to everything it produced. → [[phase-0-proof-chain-spike#P0-07|P0-07]], [[REQ-04-source-to-action]]
- **BR-LNK-03** — the proof chain renders identically from whichever record anchors it; one shared component. → [[phase-0-proof-chain-spike#P0-11|P0-11]], [[REQ-07-connected-demonstration]]
- **BR-LNK-04** — a control may satisfy many clauses across many instruments, grouped **by act** on its own page. → [[phase-0-proof-chain-spike#P0-11|P0-11]], [[REQ-05-map-once-satisfy-many]]
- **BR-LNK-05** — every detail screen offers a cross-reference panel. → [[REQ-01-one-platform]], [[REQ-07-connected-demonstration]]
- **BR-LNK-06** — remediation from any source lands in the **one** register — *(v2.1)* a union view over Issues and Exceptions: two entities, one place to look, nothing invisible. → [[WF-5.22-issue-remediation]], [[WF-5.14-exception-register]], [[phase-2-risk-and-events#P2-04|P2-04]], [[ADR-005-exception-first-class]]
- **BR-LNK-07** — losses from any source book into the **one** loss engine on the standard categories. → [[WF-5.11-loss-capture]], [[phase-2-risk-and-events#P2-07|P2-07]]
- **BR-LNK-08** — a substantiated investigation pushes its outcome into the risk register. → [[WF-5.23-fraud-case]], [[phase-4-investigations-and-privacy#P4-04|P4-04]]
- **BR-LNK-09** — converting a speak-up report to a fraud case carries **the reference code and nothing else**. → [[WF-5.24-speak-up]], [[phase-4-investigations-and-privacy#P4-04|P4-04]]
- **BR-LNK-10** — deleting or archiving never orphans citing records; provenance survives. → join tables + soft-delete-only, [[build-plan#3. The data model (Prisma schema outline)|build-plan §3.1]]

## Proves

[[REQ-04-source-to-action]] · [[REQ-05-map-once-satisfy-many]] · [[REQ-07-connected-demonstration]] · [[REQ-12-audit-flow]] (one register)
