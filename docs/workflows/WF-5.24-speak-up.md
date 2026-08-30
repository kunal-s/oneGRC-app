---
type: workflow
id: WF 5.24
spec: "§5.24"
status: specified
phase: Phase 4
tags: [workflow, investigations, confidentiality]
aliases: ["WF 5.24"]
---

# WF 5.24 — Speak-up (whistleblower)

The statutory vigil mechanism, designed around one fact: **this module exists to protect a person.** Identity is never stored (reference code + sealed custody note only); access is by named person, recusal is computed, and the reporter is owed acknowledgement and substantive feedback on running clocks.

**Actors:** Ethics office (a named list, not a role) · Audit Committee Chair (statutory direct access) · Investigator.
**States:** `Received → Acknowledged → Under triage → Investigation → Awaiting outcome → Remediation → Closed`, `Rejected` terminal from triage.

**Spec:** [[functional-spec#5.24 Speak-up (whistleblower)|functional-spec §5.24]]

## Governed by

- [[BR-DAT]] — BR-DAT-02: identity **not stored**, structurally (invariant I-7: the column does not exist)
- [[BR-SCP]] — BR-SCP-05..09: person-not-role access, computed recusal, sealed cases counted, queue filtered at source
- [[BR-AUD]] — BR-AUD-05: the log records the act, never the content
- [[BR-LFC]] — BR-LFC-12: closure requires an outcome and feedback owed to the reporter
- [[BR-LNK]] — BR-LNK-09: conversion to fraud carries the reference code only
- [[ADR-010-committee-chair-authority]] — the chair reads and oversees; **closure authority removed** (overrides the v2.0 §4.10 matrix)

## Built by

- [[phase-4-investigations-and-privacy#P4-02|P4-02]] intake: reference codes, no identity column, anonymous portal, clocks targeting the ethics office · [[phase-4-investigations-and-privacy#P4-03|P4-03]] casework: triage, reporter messaging, unseal (SoD, logged), retaliation watch

## Proves

[[REQ-22-structural-protection]] — all four of its acceptance tests live here

## Connects

Converts to [[WF-5.23-fraud-case]] · remediation via [[WF-5.22-issue-remediation]] · outcome pushes into [[WF-5.12-risk-lifecycle]] (BR-LNK-08) · counts and SLAs in the ARC pack ([[WF-5.26-committee-packs]])
