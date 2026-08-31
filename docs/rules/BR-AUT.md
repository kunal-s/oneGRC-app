---
type: rule-group
prefix: BR-AUT
spec: "§6.1"
count: 11
status: normative
tags: [rules, authority, machinery]
aliases: [BR-AUT-01, BR-AUT-02, BR-AUT-03, BR-AUT-04, BR-AUT-05, BR-AUT-06, BR-AUT-07, BR-AUT-08, BR-AUT-09, BR-AUT-10, BR-AUT-11]
---

# BR-AUT — Authority and separation of duties

Who may act, and who may never sign off their own work. Everything resolves through **one** central authority check (guard + `GovernedMutation` runner, [[build-plan#1. Target architecture|build-plan §1.3]]), never a per-screen role comparison. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.1]].

**Decisions that shape this group:** [[ADR-007-roles-and-authority]] (the §4.10 matrix is data; Person↔Role many-to-many) · [[ADR-010-committee-chair-authority]] (chairs review, never close — overrides the v2.0 matrix) · [[ADR-002-authorization-seam]] (enforcement is server-side from the first endpoint).

## The rules

- **BR-AUT-01** — every governed action passes one central authority check; no screen does its own role comparison. → [[phase-0-proof-chain-spike#P0-06|P0-06]], [[phase-1-platform-floor#P1-03|P1-03]]
- **BR-AUT-02** — clause authority (accept / specialist / applicability) is granted by **department** (Compliance & Company Secretarial), not role. → [[WF-5.01-source-to-action]], [[WF-5.02-instrument-ingestion]], [[phase-0-proof-chain-spike#P0-08|P0-08]]
- **BR-AUT-03** — an unlisted role is **refused**, not merely unshown; hiding a button is presentation, refusal is control. → [[phase-1-platform-floor#P1-16|P1-16]]
- **BR-AUT-04** — the checker is **nominated at creation**, before the work is done. → [[WF-5.07-maker-checker]], [[phase-1-platform-floor#P1-03|P1-03]]
- **BR-AUT-05** — the submitter may **never** approve; the platform's single most important control. → every approval; negative-tested in [[phase-0-proof-chain-spike#P0-06|P0-06]]
- **BR-AUT-06** — SoD covers every sign-off verb: approve, accept, renew, file, close, unseal, approve-narrative. → [[WF-5.07-maker-checker]]
- **BR-AUT-07** — an owner may not accept their own risk. → [[WF-5.13-risk-acceptance]], [[phase-2-risk-and-events#P2-03|P2-03]]
- **BR-AUT-08** — admin configuration changes are themselves maker-checked and logged. → [[WF-5.30-admin-config-change]], [[phase-5-intelligence-admin-handoff#P5-01|P5-01]], [[REQ-24-self-governance]]
- **BR-AUT-09** — the Administrator's all-department visibility confers no operational authority. → [[ADR-007-roles-and-authority]]
- **BR-AUT-10** — *configurable (§14):* the customer may require the checker to sit in a different line of defence. → [[G-17-lod-constraints]], [[phase-5-intelligence-admin-handoff#P5-01|P5-01]]
- **BR-AUT-11** — *(v2.1)* exception-renewal authority escalates with the count: 2nd renewal Executive-only, beyond 2nd named in the ARC pack. → [[WF-5.14-exception-register]], [[phase-2-risk-and-events#P2-13|P2-13]], [[ADR-005-exception-first-class]]

## Proves

[[REQ-17-governed-deviations]] (renewal escalation) · [[REQ-24-self-governance]] (config maker-check) · the SoD negative tests of [[phase-0-proof-chain-spike|Phase 0]] and [[phase-1-platform-floor|Phase 1]]
