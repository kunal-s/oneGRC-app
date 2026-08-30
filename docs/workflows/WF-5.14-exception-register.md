---
type: workflow
id: WF 5.14
spec: "§5.14"
status: specified
phase: Phase 2
tags: [workflow, risk, compliance]
aliases: ["WF 5.14"]
---

# WF 5.14 — The exception register

A deviation that is *known, time-boxed, approved and compensated* is governance; the same deviation undocumented is a finding. **Exception is a first-class entity** (subject: the control or obligation deviated from; `issueId` optional — a proactive exception has none), surfacing beside issues in one union register.

**Actors:** Owner raises · Approver approves / renews / converts (SoD) · System chases expiry.
**States:** `Requested → Active → Expiring soon → Expired (under review) → Closed | Active (renewed) | Converted` — expiry states derived (BR-DRV-08), never stored.

**Spec:** [[functional-spec#5.14 The exception register|functional-spec §5.14]]

## Governed by

- [[ADR-005-exception-first-class]] — **overrides v2.0's exception-as-issue**; union register preserves BR-LNK-06's intent
- [[BR-LFC]] — BR-LFC-13: the expired exception **is** the open exposure; **no auto-issue on expiry**; an undecided expiry never goes quiet
- [[BR-AUT]] — BR-AUT-11: renewal authority escalates — 2nd renewal Executive-only, beyond 2nd named in the ARC pack
- [[BR-LNK]] — BR-LNK-06: one remediation register, a union view over Issues + Exceptions
- [[BR-DRV]] — BR-DRV-08 expiry state · [[BR-ESC]] — BR-ESC-07: 7-day warning window

## Built by

- [[phase-2-risk-and-events#P2-04|P2-04]] first-class entity + union register endpoint · [[phase-2-risk-and-events#P2-13|P2-13]] expiry review, escalating renewal, convert-to-acceptance

## Proves

[[REQ-17-governed-deviations]]

## Connects

Raised from [[WF-5.08-control-testing]], [[WF-5.09-continuous-monitoring]], [[WF-5.04-obligation-and-tasks]] (duty cannot be met), and cannot-comply declarations in [[WF-5.17-policy-attestation]] · converts into [[WF-5.13-risk-acceptance]] · appears in [[WF-5.22-issue-remediation]]'s union register and the ARC pack ([[WF-5.26-committee-packs]])
