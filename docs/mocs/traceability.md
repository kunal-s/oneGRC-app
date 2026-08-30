---
type: moc
tags: [moc, traceability]
aliases: [Traceability, traceability-matrix]
---

# Traceability — the §20.3 matrix as a graph

The spec's traceability matrix ([[functional-spec#20.3 Traceability matrix|§20.3]]), every cell linked. Each requirement note carries the fuller picture — including the **chunks** that make it pass, which the spec's matrix does not track. Rules link to their group note; the specific rule ids are named in each requirement note.

| Requirement | Workflows | Key rules | Primary screens |
|---|---|---|---|
| [[REQ-01-one-platform\|1 One platform]] | [[WF-5.01-source-to-action\|5.1]] · [[WF-5.04-obligation-and-tasks\|5.4]] · [[WF-5.10-incident-multi-clock\|5.10]] | [[BR-LNK\|BR-LNK-01, -05]] | Cockpit, obligations, controls |
| [[REQ-02-policy-driven-duties\|2 Policy-driven duties]] | [[WF-5.04-obligation-and-tasks\|5.4]] · [[WF-5.18-policy-lifecycle\|5.18]] | [[BR-EVD\|BR-EVD-01]] | Obligations, policies, task detail |
| [[REQ-03-clause-as-the-unit\|3 Clause as the unit]] | [[WF-5.01-source-to-action\|5.1]] · [[WF-5.02-instrument-ingestion\|5.2]] | [[BR-AUT\|BR-AUT-02]] | Source library, clause detail |
| [[REQ-04-source-to-action\|4 Source to action]] | [[WF-5.01-source-to-action\|5.1]] | [[BR-LNK\|BR-LNK-01, -02, -03]] | Clause detail, obligation detail |
| [[REQ-05-map-once-satisfy-many\|5 Map once, satisfy many]] | [[WF-5.01-source-to-action\|5.1]] · [[WF-5.08-control-testing\|5.8]] | [[BR-LNK\|BR-LNK-04]] | Control detail |
| [[REQ-06-risk-from-consequence\|6 Risk from consequence]] | [[WF-5.01-source-to-action\|5.1]] · [[WF-5.12-risk-lifecycle\|5.12]] | — | Clause detail, risk detail |
| [[REQ-07-connected-demonstration\|7 Connected demonstration]] | [[WF-5.01-source-to-action\|5.1]] · [[WF-5.04-obligation-and-tasks\|5.4]] · [[WF-5.06-evidence\|5.6]] · [[WF-5.12-risk-lifecycle\|5.12]] | [[BR-LNK\|BR-LNK-03, -05]] | Every detail screen |
| [[REQ-08-role-based-views\|8 Role-based views]] | [[WF-5.28-personal-queue\|5.28]] | [[BR-SCP\|BR-SCP-01..04]] | Queue, cockpit, registers |
| [[REQ-09-regulatory-change\|9 Regulatory change]] | [[WF-5.03-regulatory-change\|5.3]] | [[BR-LFC\|BR-LFC-08]] | Reg change |
| [[REQ-10-multi-regulator-incident\|10 Multi-regulator incident]] | [[WF-5.10-incident-multi-clock\|5.10]] · [[WF-5.06-evidence\|5.6]] | [[BR-SCH\|BR-SCH-06, -08]] · [[BR-LFC\|BR-LFC-05]] | Incident detail, clocks |
| [[REQ-11-recurring-duties\|11 Recurring duties]] | [[WF-5.04-obligation-and-tasks\|5.4]] · [[WF-5.05-recurring-cycle\|5.5]] | [[BR-SCH\|BR-SCH-02..05]] | Obligation detail, calendar |
| [[REQ-12-audit-flow\|12 Audit flow]] | [[WF-5.21-audit-programme\|5.21]] · [[WF-5.22-issue-remediation\|5.22]] | [[BR-LFC\|BR-LFC-07]] · [[BR-LNK\|BR-LNK-06]] | Audits, issues |
| [[REQ-13-packs-as-a-view\|13 Packs as a view]] | [[WF-5.26-committee-packs\|5.26]] | [[BR-AUT\|BR-AUT-06]] | Pack generator |
| [[REQ-14-metrics-on-demand\|14 Metrics on demand]] | [[WF-5.28-personal-queue\|5.28]] · [[functional-spec#10. Metrics, Reporting and Pack Catalogue\|§10]] | [[BR-DRV\|BR-DRV-*]] | Cockpit |
| [[REQ-15-shaped-to-a-standard\|15 Shaped to a standard]] | [[functional-spec#16. Security, Compliance and Platform Governance\|§16]] | — | — |
| [[REQ-16-nothing-waits\|16 Nothing waits]] | [[WF-5.27-reminders-escalation\|5.27]] | [[BR-ESC\|BR-ESC-01..07]] | Obligation detail, audit log |
| [[REQ-17-governed-deviations\|17 Governed deviations]] | [[WF-5.14-exception-register\|5.14]] | [[BR-DRV\|BR-DRV-08]] | Exception register |
| [[REQ-18-acceptance-expires\|18 Acceptance expires]] | [[WF-5.13-risk-acceptance\|5.13]] | [[BR-LFC\|BR-LFC-04]] · [[BR-AUT\|BR-AUT-07]] | Risk detail |
| [[REQ-19-cycles-move-the-register\|19 Cycles move the register]] | [[WF-5.16-rcsa-campaign\|5.16]] | [[BR-DRV\|BR-DRV-10]] | Campaigns, risk detail |
| [[REQ-20-version-bound-attestation\|20 Version-bound attestation]] | [[WF-5.17-policy-attestation\|5.17]] | [[BR-LFC\|BR-LFC-06]] · [[BR-DRV\|BR-DRV-13]] | Campaigns, policy detail |
| [[REQ-21-computed-third-party-tier\|21 Computed third-party tier]] | [[WF-5.19-third-party-risk\|5.19]] · [[WF-5.20-vendor-dd-campaign\|5.20]] | [[BR-DRV\|BR-DRV-03]] | Third-party register |
| [[REQ-22-structural-protection\|22 Structural protection]] | [[WF-5.24-speak-up\|5.24]] | [[BR-SCP\|BR-SCP-05..09]] · [[BR-DAT\|BR-DAT-02]] · [[BR-AUD\|BR-AUD-05]] | Speak-up |
| [[REQ-23-honest-bands\|23 Honest bands]] | [[WF-5.15-kri-breach\|5.15]] | [[BR-DRV\|BR-DRV-02]] | Indicators, risk register |
| [[REQ-24-self-governance\|24 Self-governance]] | [[WF-5.30-admin-config-change\|5.30]] | [[BR-AUT\|BR-AUT-08]] · [[BR-AUD\|BR-AUD-02]] | Settings, audit log |

## The dimension the spec's matrix lacks: chunks

Requirement → chunk lives in each requirement note; chunk → requirement lives in each phase note. The per-phase requirement targets:

- [[phase-0-proof-chain-spike|Phase 0]] → 3, 4, 5, 7 (slice) · [[phase-1-platform-floor|Phase 1]] → 1, 2, 3, 4, 5, 7, 8, 11, 16
- [[phase-2-risk-and-events|Phase 2]] → 6, 9, 10, 14, 17, 18, 23 · [[phase-3-cycles-and-assurance|Phase 3]] → 12, 13, 19, 20, 21
- [[phase-4-investigations-and-privacy|Phase 4]] → 22 · [[phase-5-intelligence-admin-handoff|Phase 5]] → 9 (agentic), 15, 24
