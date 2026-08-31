---
type: workflow
id: WF 5.26
spec: "§5.26"
status: specified
phase: Phase 3
tags: [workflow, governance, reporting]
aliases: ["WF 5.26"]
---

# WF 5.26 — Board and committee packs

Committee preparation as a **view, not a project** — the product's closing argument. Sections are live queries; the pack names the authority it is produced under; the narrative is maker-checked; and issuing it files the snapshot as evidence against the meeting obligation, discharging the duty.

**Actors:** Compliance or Risk composes and drafts · a second person approves the narrative (SoD) · committee chair consumes.
**States:** `Composed → Narrative drafted → Approved → Issued` (snapshot filed as evidence).

**Spec:** [[functional-spec#5.26 Board and committee packs|functional-spec §5.26]]

## Governed by

- [[BR-AUT]] — BR-AUT-06: narrative approval is a sign-off · [[BR-AI]] — BR-AI-04: the assistant may draft narrative; generated text is never evidence — the snapshot is
- An unbuilt section is **absent, not empty** — an empty heading reads "nothing to report" when it means "we cannot see"
- Live numbers keep moving after issue; the snapshot fixes the committee's record

## Built by

- [[phase-3-cycles-and-assurance#P3-07|P3-07]] compose/approve/issue + snapshot-as-evidence · [[phase-3-cycles-and-assurance#P3-10|P3-10]] chair dashboards (RMC/ARC per [[dashboard-kpi-design]]) · formats in [[phase-5-intelligence-admin-handoff#P5-08|P5-08]] ([[G-23-reporting-formats]])

## Proves

[[REQ-13-packs-as-a-view]]

## Connects

Content from every register — [[WF-5.22-issue-remediation]], [[WF-5.14-exception-register]] (renewal counts named), [[WF-5.13-risk-acceptance]], [[WF-5.11-loss-capture]], [[WF-5.21-audit-programme]], [[WF-5.24-speak-up]] (counted honestly) · snapshot via [[WF-5.06-evidence]] · assembly agent in [[WF-5.29-agentic-run]]
