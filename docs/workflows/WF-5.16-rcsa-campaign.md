---
type: workflow
id: WF 5.16
spec: "§5.16"
status: specified
phase: Phase 3
tags: [workflow, risk, campaigns]
aliases: ["WF 5.16"]
---

# WF 5.16 — Risk and control self-assessment (campaign)

The periodic cycle where first-line owners re-score their own risks and second line challenges — with the blunt contract that **an assessment cycle that collects opinions and files them is theatre**: approval writes the new score back to the register.

**Actors:** Risk/Compliance opens and scopes · owners re-score · second-line checker challenges (SoD) · approval writes back.
**States:** campaign `Open → In review → Closed`; one Task per in-scope risk (`Assigned`/`Approved` are campaign projections of the Task machine).

**Spec:** [[functional-spec#5.16 Risk and control self-assessment (campaign)|functional-spec §5.16]]

## Governed by

- [[BR-DRV]] — BR-DRV-10: campaign progress derived from tasks; the assessment history *is* the campaign record read back — nothing extra stored on the risk
- [[ADR-006-task-work-item]] — campaign tasks are Tasks (maker-checker policy) with an opaque payload the container never reads (§14.3 extensibility)

## Built by

- [[phase-3-cycles-and-assurance#P3-01|P3-01]] campaign container · [[phase-3-cycles-and-assurance#P3-02|P3-02]] RCSA payload + write-back on approval

## Proves

[[REQ-19-cycles-move-the-register]]

## Connects

Writes back into [[WF-5.12-risk-lifecycle]] · same container as [[WF-5.17-policy-attestation]] and [[WF-5.20-vendor-dd-campaign]] · chased by [[WF-5.27-reminders-escalation]] · completion certificate filed via [[WF-5.06-evidence]]
