---
type: workflow
id: WF 5.17
spec: "§5.17"
status: specified
phase: Phase 3
tags: [workflow, compliance, campaigns, policies]
aliases: ["WF 5.17"]
---

# WF 5.17 — Policy attestation (campaign)

Proves the people bound by a policy have read and accepted it — **against a version**: republishing at a new version carries nobody forward, and the reported rate is always computed against the current version.

**Actors:** Compliance opens, scoped to policy + population · assignees acknowledge and declare · checker reviews declarations.
**States:** campaign `Open → Closed`; one acknowledge-policy Task per person; rate derived.

**Spec:** [[functional-spec#5.17 Policy attestation (campaign)|functional-spec §5.17]]

## Governed by

- [[BR-LFC]] — BR-LFC-06: attestation is version-bound; no inherited acknowledgements
- [[BR-DRV]] — BR-DRV-13: attestation **rate** (v2.1 label — "coverage" is banned in the UI, [[ADR-008-metric-honesty]])
- A **cannot-comply declaration is a control gap**: it routes into [[WF-5.14-exception-register]] as a real, time-boxed, approved deviation — never a comment in a text box

## Built by

- [[phase-3-cycles-and-assurance#P3-03|P3-03]] — version-bound coverage, declarations, cannot-comply → exception

## Proves

[[REQ-20-version-bound-attestation]]

## Connects

Triggered by [[WF-5.18-policy-lifecycle]] publications · runs on the [[WF-5.16-rcsa-campaign]] container · declarations land in [[WF-5.14-exception-register]]
