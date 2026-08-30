---
type: workflow
id: WF 5.30
spec: "§5.30"
status: specified
phase: Phase 5
tags: [workflow, machinery, governance]
aliases: ["WF 5.30"]
---

# WF 5.30 — Administrative configuration change

The platform governs itself, because the fastest way to make a red number go green is to change what red means: every configuration change is maker-checked and logged with before and after values.

**Actors:** Administrator changes · a checker approves (SoD) · system logs.
**States:** `Submitted → Applied`, logged with before/after, actor, timestamp.

**Spec:** [[functional-spec#5.30 Administrative configuration change|functional-spec §5.30]]

## Governed by

- [[BR-AUT]] — BR-AUT-08: config changes are maker-checked; BR-AUT-09: admin breadth of sight is not breadth of authority
- [[BR-DAT]] — BR-DAT-05: the audit log's retention floor cannot be shortened by anyone
- §14.2's never-configurable list is enforced in code — SoD cannot be disabled ([[ADR-007-roles-and-authority]])

## Built by

- [[phase-5-intelligence-admin-handoff#P5-01|P5-01]] config engine (catalogue, maker-checker, before/after) · [[phase-5-intelligence-admin-handoff#P5-02|P5-02]] settings screens · retention floor early in [[phase-1-platform-floor#P1-06|P1-06]]

## Proves

[[REQ-24-self-governance]]

## Connects

Governs the thresholds of [[WF-5.15-kri-breach]], clock-start rules of [[WF-5.10-incident-multi-clock]] ([[G-18-clock-start-config]]), ladder intervals of [[WF-5.27-reminders-escalation]], monitoring populations of [[WF-5.09-continuous-monitoring]]
