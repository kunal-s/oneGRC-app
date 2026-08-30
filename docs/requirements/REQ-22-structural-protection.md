---
type: requirement
id: Requirement 22
spec: "§20.2"
status: planned
target: Phase 4
tags: [requirement, investigations, confidentiality]
aliases: ["Requirement 22", "Req 22"]
---

# Requirement 22 — The speak-up channel protects the reporter structurally

**The four tests:** the identity is not stored anywhere the platform can render it · a persona switch does not open a sealed case · a recused person is refused despite their role · the count of open reports is honest for every viewer. Protection is a property of the **design**, not of a setting.

## Proven by

- Workflows: [[WF-5.24-speak-up]]
- Rules: [[BR-SCP]] (BR-SCP-05 to BR-SCP-09) · [[BR-DAT]] (BR-DAT-02: the identity column does not exist) · [[BR-AUD]] (BR-AUD-05: act, never content)
- Screens: speak-up
- Chunks: [[phase-4-investigations-and-privacy#P4-01|P4-01]] confidentiality core (the automated tests are these four) · [[phase-4-investigations-and-privacy#P4-02|P4-02]] schema with no identity field · [[phase-4-investigations-and-privacy#P4-03|P4-03]] casework ("the four Requirement-22 acceptance tests pass in the browser")
- Invariant: build-plan **I-7** — confidentiality by construction; a field that does not exist cannot leak
- Authority boundary: [[ADR-010-committee-chair-authority]] — the chair reads and oversees, never closes

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
