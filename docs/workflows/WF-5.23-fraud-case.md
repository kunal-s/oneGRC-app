---
type: workflow
id: WF 5.23
spec: "§5.23"
status: specified
phase: Phase 4
tags: [workflow, investigations]
aliases: ["WF 5.23"]
---

# WF 5.23 — Fraud case management

Fraud earns its own module for intake, investigation discipline and regulatory duties — but **never its own copy of the shared machinery**: regulator tracks are determined by the case's shape, losses book into the one loss engine, remediation lands in the one register, and outcomes push into the risk register.

**Actors:** Investigator (usually Internal Audit or Compliance) · Compliance Manager holds regulatory duties · Executive or Risk closes (SoD).
**States:** `Reported → Triage → Investigation → Recovery & action → Closed`; investigation targets 45 days (critical) / 90, chased on the ladder.

**Spec:** [[functional-spec#5.23 Fraud case management|functional-spec §5.23]]

## Governed by

- [[BR-LNK]] — BR-LNK-08: a substantiated case pushes into the risk register (a case that changes nothing is noise) · BR-LNK-09: conversion from speak-up carries the reference code and nothing else
- [[BR-DRV]] — BR-DRV-15: proactive detection rate (share found by the firm's own controls)
- [[BR-SCP]] — case access by person, computed recusal for senior subjects
- Regulator tracks by shape: sector 48h + quarterly, cyber 6h, data-protection intimation, police referral and audit-committee reporting above thresholds

## Built by

- [[phase-4-investigations-and-privacy#P4-04|P4-04]] — stages, shape-determined tracks, loss via the one engine, risk push, reference-only conversion

## Proves

Investigations half of [[REQ-22-structural-protection]]'s ecosystem · feeds [[REQ-14-metrics-on-demand]] fraud metrics

## Connects

Converted from [[WF-5.24-speak-up]] · losses via [[WF-5.11-loss-capture]] · remediation via [[WF-5.22-issue-remediation]] · tracks share the clock semantics of [[WF-5.10-incident-multi-clock]]
