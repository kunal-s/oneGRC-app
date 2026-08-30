---
type: requirement
id: Requirement 20
spec: "§20.2"
status: planned
target: Phase 3
tags: [requirement, compliance, campaigns]
aliases: ["Requirement 20", "Req 20"]
---

# Requirement 20 — Attestation is version-bound

**The test:** the attestation rate against a policy, then the policy republished at a new version and the rate correctly falling — a signature against a superseded version is visibly not a signature against the current one.

## Proven by

- Workflows: [[WF-5.17-policy-attestation]] · [[WF-5.18-policy-lifecycle]]
- Rules: [[BR-LFC]] (BR-LFC-06) · [[BR-DRV]] (BR-DRV-13 — "attestation rate", never "coverage")
- Screens: campaigns, policy detail
- Chunks: [[phase-3-cycles-and-assurance#P3-03|P3-03]] ("republish the policy → coverage falls correctly; a cannot-comply declaration exists as a time-boxed exception")

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
