---
type: rule-group
prefix: BR-LFC
spec: "§6.7"
count: 13
status: normative
tags: [rules, lifecycle]
aliases: [BR-LFC-01, BR-LFC-02, BR-LFC-03, BR-LFC-04, BR-LFC-05, BR-LFC-06, BR-LFC-07, BR-LFC-08, BR-LFC-09, BR-LFC-10, BR-LFC-11, BR-LFC-12, BR-LFC-13]
---

# BR-LFC — Lifecycle and transitions

State machines that are law, not advice: only §7.3's transitions are legal, and every gate that stops a record closing over an undischarged duty lives here. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.7]]; the state machines are [[functional-spec#7.3 Consolidated state models|spec §7.3]], encoded as data in `packages/domain/stateMachines.ts`.

## The rules

- **BR-LFC-01** — only the §7 transitions are legal; anything else is refused, not silently permitted. → runner enforcement in [[phase-0-proof-chain-spike#P0-06|P0-06]]
- **BR-LFC-02** — superseding an instrument never carries clause decisions forward; prior decisions stay visible against the prior version. → [[WF-5.01-source-to-action]]
- **BR-LFC-03** — a treatment plan cannot reach `Awaiting approval` while a remediation action is open; execution is the gate. → [[WF-5.12-risk-lifecycle]], [[phase-2-risk-and-events#P2-02|P2-02]]
- **BR-LFC-04** — an expired risk acceptance is not "accepted" — it is an open exposure that reads as such and escalates. → [[WF-5.13-risk-acceptance]], [[phase-2-risk-and-events#P2-03|P2-03]], [[REQ-18-acceptance-expires]]
- **BR-LFC-05** — an incident may not close while a required regulator track is unfiled. → [[WF-5.10-incident-multi-clock]], [[phase-2-risk-and-events#P2-06|P2-06]]
- **BR-LFC-06** — attestation is recorded **against a version**; a new version inherits no acknowledgements. → [[WF-5.17-policy-attestation]], [[phase-3-cycles-and-assurance#P3-03|P3-03]], [[REQ-20-version-bound-attestation]]
- **BR-LFC-07** — a finding closes only on auditor-verified remediation, never the owner's say-so. → [[WF-5.21-audit-programme]], [[phase-3-cycles-and-assurance#P3-06|P3-06]], [[REQ-12-audit-flow]]
- **BR-LFC-08** — a regulatory change cannot close while an impacted record is unacknowledged. → [[WF-5.03-regulatory-change]], [[phase-2-risk-and-events#P2-09|P2-09]], [[REQ-09-regulatory-change]]
- **BR-LFC-09** — every negative decision ("not applicable", "no impact", "unsubstantiated", "not reportable") is recorded with actor, timestamp and basis. → platform-wide; first enforced in [[phase-0-proof-chain-spike#P0-08|P0-08]]
- **BR-LFC-10** — a returned item carries the reason for its return. → [[WF-5.07-maker-checker]], [[phase-1-platform-floor#P1-11|P1-11]]
- **BR-LFC-11** — a failing control test raises a remediation issue automatically; nobody has to remember. → [[WF-5.08-control-testing]], [[WF-5.09-continuous-monitoring]], [[phase-2-risk-and-events#P2-11|P2-11]]
- **BR-LFC-12** — a speak-up report closes only with an outcome and substantive feedback owed to the reporter. → [[WF-5.24-speak-up]], [[phase-4-investigations-and-privacy#P4-03|P4-03]]
- **BR-LFC-13** — *(v2.1)* an expired exception enters review and **is itself** the open exposure — escalating in the union register until closed, renewed or converted; **no issue is auto-created on expiry**. → [[WF-5.14-exception-register]], [[phase-2-risk-and-events#P2-13|P2-13]], [[ADR-005-exception-first-class]]

## Proves

[[REQ-09-regulatory-change]] · [[REQ-12-audit-flow]] · [[REQ-17-governed-deviations]] · [[REQ-18-acceptance-expires]] · [[REQ-20-version-bound-attestation]]
