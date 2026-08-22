---
type: phase
id: Phase 2
status: planned
chunks: 14
tags: [phase]
aliases: [Phase 2, P2-01, P2-02, P2-03, P2-04, P2-05, P2-06, P2-07, P2-08, P2-09, P2-10, P2-11, P2-12, P2-13, P2-14]
---

# Phase 2 — Risk & events

Risk lifecycle, acceptance, first-class exceptions, KRIs, incidents with regulator clocks, loss, CCM behind the connector seam, reg change, policies — and the honest cockpit that kills the fabricated numbers.

- Plan detail: [[build-plan#Phase 2 — risk & events (coarser; split any L on contact)|build-plan §6 Phase 2]]
- Closes: [[G-18-clock-start-config]], [[G-19-duty-coverage-metric]], parts of [[G-07-connectors]] (seam)
- Makes demonstrable: [[REQ-06-risk-from-consequence]], [[REQ-09-regulatory-change]], [[REQ-10-multi-regulator-incident]], [[REQ-14-metrics-on-demand]], [[REQ-17-governed-deviations]], [[REQ-18-acceptance-expires]], [[REQ-23-honest-bands]]
- Decisions in play: [[ADR-005-exception-first-class]], [[ADR-008-metric-honesty]]

## Chunks

### P2-01
**Schema + seed: risk & events** *(L)*. Risk family, KRIs with readings, incidents/tracks/timeline/loss, monitoring, reg change, vendor family (seed only); derived-parity asserts for stage, band, net loss, exception state. → [[G-26-historical-data]]

### P2-02
**Risk lifecycle API** *(L)*. Assess, treat, actions advance, submit/approve/return with the action gate; derived stage + projected residual serialized. → [[WF-5.12-risk-lifecycle]], [[BR-LFC]] 03, [[BR-DRV]] 01/14

### P2-03
**Risk acceptance + expiry** *(M)*. Accept (SoD), 30-day ladder, lapse to open exposure counted by appetite. → [[WF-5.13-risk-acceptance]], [[BR-LFC]] 04, [[BR-AUT]] 07, [[BR-ESC]] 07, [[REQ-18-acceptance-expires]]

### P2-04
**Exception as first-class entity** *(M — amended v1.1)*. Own table, subject control/obligation, optional issueId, proactive path; the **union register endpoint**; derived expiry states. → [[WF-5.14-exception-register]], [[ADR-005-exception-first-class]], [[BR-LNK]] 06, [[BR-DRV]] 08, [[REQ-17-governed-deviations]]

### P2-05
**KRIs** *(M)*. Readings API, direction-aware bands, breach → ladder + worst-band risk badge, staleness chased. → [[WF-5.15-kri-breach]], [[BR-DRV]] 02/16, [[REQ-23-honest-bands]]

### P2-06
**Incidents + multi-clock tracks** *(L)*. Track determination from incident shape, per-regulator clock config, draft/file (SoD), sticky breach, close gated. → [[WF-5.10-incident-multi-clock]], [[BR-SCH]] 06/07/08, [[BR-LFC]] 05, [[G-18-clock-start-config]], [[REQ-10-multi-regulator-incident]]

### P2-07
**Loss engine** *(S)*. Gross/recoveries/net derived; recovery over gross refused. → [[WF-5.11-loss-capture]], [[BR-DRV]] 04, [[BR-LNK]] 07

### P2-08
**CCM behind the connector seam** *(L)*. `FeedProvider` with simulated impl; runs as auto-evidence; Failing raises the issue; Degraded on feed loss; the load-bearing cascade wired to the marquee incident. → [[WF-5.09-continuous-monitoring]], [[BR-DRV]] 09, [[BR-LFC]] 11, [[G-07-connectors]] (seam)

### P2-09
**Regulatory change end-to-end** *(M)*. Capture, impact set, auto alerts, acknowledge, patch, promote, gated close. → [[WF-5.03-regulatory-change]], [[BR-LFC]] 08, [[REQ-09-regulatory-change]]

### P2-10
**Policy lifecycle** *(M)*. Draft→review→publish (SoD), review chasing, provenance to clauses. → [[WF-5.18-policy-lifecycle]]

### P2-11
**Control testing + heat map + appetite** *(L)*. Retest with history, fail→issue, heat map / appetite / aggregate residual endpoints; "Control pass rate" and "Duty coverage" as two labelled numbers. → [[WF-5.08-control-testing]], [[BR-DRV]] 05/06/07, [[BR-LFC]] 11, [[G-19-duty-coverage-metric]], [[ADR-008-metric-honesty]]

### P2-12
**Rewire remaining P2 pages** *(L)*. Risks, CCM, incidents, reg change, issues, policies, clocks off the seed world; the phase demo script for Requirements 6/9/10/17/18/23. → [[REQ-06-risk-from-consequence]] et al.

### P2-13
**Exception expiry review + escalating renewal authority** *(M — new v1.1)*. Close / renew (count++, 2nd renewal Executive-only) / convert to accepted risk; no auto-issue on expiry; attestation cannot-comply creates an exception. → [[WF-5.14-exception-register]], [[BR-LFC]] 13, [[BR-AUT]] 11, [[ADR-005-exception-first-class]]

### P2-14
**The honest cockpit** *(L — new v1.1)*. Kills `enterpriseRisk: 7.8` and the RNG trends; M10 derived headline, trend triptych where series function = tile function, designed empty states. → [[dashboard-kpi-design]], [[ADR-008-metric-honesty]], [[BR-DRV]] 18, [[REQ-14-metrics-on-demand]]
