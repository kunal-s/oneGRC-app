---
type: moc
domain: investigations
tags: [moc, investigations]
---

# Investigations — map of content

Speak-up and fraud: the modules that exist to protect a person and to make a case change something. Confidentiality here is **structural** — fields that do not exist, access by named person, recusal that is computed.

## Workflows

[[WF-5.24-speak-up]] · [[WF-5.23-fraud-case]] · remediation lands in [[WF-5.22-issue-remediation]] · losses in [[WF-5.11-loss-capture]]

## Requirements proven here

[[REQ-22-structural-protection]] — the four structural tests

## Rules that bite hardest

[[BR-SCP]] (05–09: person-not-role, recusal beats clearance, sealed counted, queue filtered at source) · [[BR-DAT]] (BR-DAT-02 identity not stored) · [[BR-AUD]] (BR-AUD-05 act-not-content) · [[BR-LNK]] (08 risk push, 09 reference-only conversion) · [[BR-LFC]] (BR-LFC-12 feedback owed)

## Decisions

[[ADR-010-committee-chair-authority]] — statutory access to read, no authority to close

## Build

[[phase-4-investigations-and-privacy]] — the whole phase; invariant I-7 is why the schema, not a setting, carries the protection

## Screens

Speak-up intake and casework, fraud cases, retaliation watch — [[functional-spec#8. Screens and UI Surfaces|spec §8]]; ARC oversight counts in [[dashboard-kpi-design]] (M23, sealed counted honestly)
