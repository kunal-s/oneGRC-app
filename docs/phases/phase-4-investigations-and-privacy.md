---
type: phase
id: Phase 4
status: planned
chunks: 6
tags: [phase]
aliases: [Phase 4, P4-01, P4-02, P4-03, P4-04, P4-05, P4-06]
---

# Phase 4 — Investigations & privacy

Speak-up and fraud with **structural** confidentiality, DSAR and data governance, masking by default. No gap-register item is investigation-specific; this phase closes the §4.12 requirements and proves invariant I-7 against Requirement 22's four tests.

- Plan detail: [[build-plan#Phase 4 — investigations & privacy|build-plan §6 Phase 4]]
- Makes demonstrable: [[REQ-22-structural-protection]]
- Decisions in play: [[ADR-010-committee-chair-authority]]

## Chunks

### P4-01
**Confidentiality core** *(L)*. CaseAccess/CaseRecusal tables, computed recusal, person-not-role checks in the runner, sealed counting in serializers, queue + notification filtering at source. → [[BR-SCP]] 05–09, [[WF-5.28-personal-queue]], [[REQ-22-structural-protection]]

### P4-02
**Speak-up schema + intake** *(L)*. Reference codes, **no identity column anywhere**, sealed custody note, anonymous rate-limited portal, ack/feedback clocks targeting the ethics office. → [[WF-5.24-speak-up]], [[BR-DAT]] 02

### P4-03
**Speak-up casework** *(L)*. Triage, investigate, reporter messaging by code, remediation via issues, close with outcome + feedback, unseal (SoD, logged), retaliation watch, act-not-content redaction. → [[WF-5.24-speak-up]], [[BR-LFC]] 12, [[BR-AUD]] 05, [[REQ-22-structural-protection]]

### P4-04
**Fraud cases** *(L)*. Stages, shape-determined regulator tracks, loss via the one engine, risk push, conversion carrying reference-only, close (SoD). → [[WF-5.23-fraud-case]], [[BR-LNK]] 08/09, [[WF-5.11-loss-capture]]

### P4-05
**Data governance** *(L)*. DataAsset inventory, stepwise DSAR with retention-rule refusals cited, breach routing into incidents, masking by default. → [[WF-5.25-dsar]], [[BR-DAT]] 01/03

### P4-06
**Rewire whistleblower, fraud, DPDP pages** *(M)*. Phase demo script with two personas and one recusal. → phase exit, [[REQ-22-structural-protection]]
