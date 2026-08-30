---
type: moc
domain: risk
tags: [moc, risk]
---

# Risk — map of content

Exposure as something that moves and cannot lie: the risk lifecycle, acceptances and exceptions that always expire, indicators with honest bands, events with regulator clocks, losses in one book, third parties with computed tiers.

## Workflows

- **Lifecycle:** [[WF-5.12-risk-lifecycle]] · [[WF-5.13-risk-acceptance]] · [[WF-5.14-exception-register]] · [[WF-5.15-kri-breach]]
- **Events:** [[WF-5.10-incident-multi-clock]] · [[WF-5.11-loss-capture]]
- **Cycles:** [[WF-5.16-rcsa-campaign]]
- **Third parties:** [[WF-5.19-third-party-risk]] · [[WF-5.20-vendor-dd-campaign]]
- **Controls (shared with compliance):** [[WF-5.08-control-testing]] · [[WF-5.09-continuous-monitoring]]

## Requirements proven here

[[REQ-06-risk-from-consequence]] · [[REQ-10-multi-regulator-incident]] · [[REQ-17-governed-deviations]] · [[REQ-18-acceptance-expires]] · [[REQ-19-cycles-move-the-register]] · [[REQ-21-computed-third-party-tier]] · [[REQ-23-honest-bands]]

## Rules that bite hardest

[[BR-DRV]] (stage, band, tier, net, appetite — all derived) · [[BR-LFC]] (action gate, expiry bites) · [[BR-SCH]] (clocks) · [[BR-ESC]] (expiry windows)

## Decisions

[[ADR-005-exception-first-class]] · [[ADR-008-metric-honesty]] · [[ADR-011-colour-discipline]] (the heat map is where categorical colour earns its place)

## Build

[[phase-2-risk-and-events]] (the whole phase) · third parties and RCSA in [[phase-3-cycles-and-assurance]]

## Screens

Risk register/detail, heat map, appetite panel, indicators, incidents + clocks, exception register (union view), third-party register — [[functional-spec#8. Screens and UI Surfaces|spec §8]]; board surfaces per [[dashboard-kpi-design]]
