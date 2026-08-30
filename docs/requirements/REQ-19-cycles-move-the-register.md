---
type: requirement
id: Requirement 19
spec: "§20.2"
status: planned
target: Phase 3
tags: [requirement, risk, campaigns]
aliases: ["Requirement 19", "Req 19"]
---

# Requirement 19 — Assessment cycles move the register

**The test:** an assessment cycle where an owner re-scores, a checker challenges, and approval writes the new score back to the risk — the register changes as a result, traceably.

## Proven by

- Workflows: [[WF-5.16-rcsa-campaign]]
- Rules: [[BR-DRV]] (BR-DRV-10 derived progress; the campaign record read back **is** the assessment history)
- Screens: campaigns, risk detail
- Chunks: [[phase-3-cycles-and-assurance#P3-01|P3-01]] container · [[phase-3-cycles-and-assurance#P3-02|P3-02]] write-back on approval ("an approved re-score visibly moves the risk register, traceably")

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
