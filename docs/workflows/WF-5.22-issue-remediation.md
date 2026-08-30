---
type: workflow
id: WF 5.22
spec: "§5.22"
status: specified
phase: Phase 1
tags: [workflow, audit, remediation]
aliases: ["WF 5.22"]
---

# WF 5.22 — Issue remediation and closure

One register for every weakness, whatever produced it — control test, monitoring rule, audit finding, incident, investigation. *(v2.1)* The register is a **union view over Issues and Exceptions**: exceptions appear as themselves, with deviation fields and expiry state, not as issues wearing a costume.

**Actors:** system or raiser creates · owner works and evidences · checker verifies and resolves.
**States:** `Open → In progress → Resolved`; age always derived, never an `ageDays` column.

**Spec:** [[functional-spec#5.22 Issue remediation and closure|functional-spec §5.22]]

## Governed by

- [[BR-LNK]] — BR-LNK-06: the one register (union view) — private per-module to-do lists are how findings get lost
- [[BR-DRV]] — BR-DRV-12: issue age derived; ageing bands + oldest, never mean-age ([[ADR-008-metric-honesty]])
- [[ADR-005-exception-first-class]] — exceptions are **not** issue subtypes; the union preserves one-place-to-look
- Issue sources (v2.1): ControlFailure / MonitoringFailure / AuditFinding / Incident / Investigation — Exception and Attestation are no longer issue sources

## Built by

- [[phase-1-platform-floor#P1-01|P1-01]] schema · [[phase-2-risk-and-events#P2-04|P2-04]] union register endpoint · [[phase-3-cycles-and-assurance#P3-06|P3-06]] finding-backed issues · [[phase-3-cycles-and-assurance#P3-08|P3-08]] bulk operations ([[G-22-bulk-operations]])

## Proves

[[REQ-12-audit-flow]] (finding → tracked issue) · [[REQ-17-governed-deviations]] (exceptions visible beside issues)

## Connects

Raised by [[WF-5.08-control-testing]], [[WF-5.09-continuous-monitoring]], [[WF-5.21-audit-programme]], [[WF-5.10-incident-multi-clock]], [[WF-5.23-fraud-case]], [[WF-5.24-speak-up]] · unfixable-in-time exits to [[WF-5.14-exception-register]]
