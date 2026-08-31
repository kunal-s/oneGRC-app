---
type: rule-group
prefix: BR-DRV
spec: "§6.6"
count: 18
status: normative
tags: [rules, derivation, metrics]
aliases: [BR-DRV-01, BR-DRV-02, BR-DRV-03, BR-DRV-04, BR-DRV-05, BR-DRV-06, BR-DRV-07, BR-DRV-08, BR-DRV-09, BR-DRV-10, BR-DRV-11, BR-DRV-12, BR-DRV-13, BR-DRV-14, BR-DRV-15, BR-DRV-16, BR-DRV-17, BR-DRV-18]
---

# BR-DRV — Derived values

Every value here is **computed on read, never stored** — a stored copy of a derivable fact is a future lie. The mechanism: no schema columns exist for these ([[build-plan#3. The data model (Prisma schema outline)|build-plan §3.4]] must-not-exist list, invariant I-1); pure functions in `packages/domain` serve both API and UI. Full definitions: [[functional-spec#6. Business Rules|functional-spec §6.6]] (normative; §10 restates the reporting-facing ones).

**Decision:** [[ADR-008-metric-honesty]] — added BR-DRV-17/18, made the enterprise headline derived, split "coverage", killed mean-age metrics. [[dashboard-kpi-design]] governs the board surfaces built on these.

## The rules

- **BR-DRV-01** — risk workflow stage, from the lifecycle record; register and detail read one function. → [[WF-5.12-risk-lifecycle]], [[phase-2-risk-and-events#P2-02|P2-02]]
- **BR-DRV-02** — indicator band, from reading + thresholds + **direction** (higher-is-worse: green is a ceiling; lower-is-worse: a floor). → [[WF-5.15-kri-breach]], [[phase-2-risk-and-events#P2-05|P2-05]], [[REQ-23-honest-bands]]
- **BR-DRV-03** — third-party tier, from current attributes with **every point attributed**. → [[WF-5.19-third-party-risk]], [[phase-3-cycles-and-assurance#P3-04|P3-04]], [[REQ-21-computed-third-party-tier]]
- **BR-DRV-04** — net loss = gross − recoveries, floored at zero. → [[WF-5.11-loss-capture]], [[phase-2-risk-and-events#P2-07|P2-07]]
- **BR-DRV-05** — aggregate residual per domain = mean of the **worst fifth** (min three); tail-weighted so severe risks are not averaged away. → [[phase-2-risk-and-events#P2-11|P2-11]], [[phase-2-risk-and-events#P2-14|P2-14]]
- **BR-DRV-06** — appetite status = aggregate vs the board's tolerance band; policy and measurement meet only in the derived status. → [[phase-2-risk-and-events#P2-11|P2-11]]
- **BR-DRV-07** — residual at a past instant, reconstructed from the remediation record; why the exposure trend is real, not seeded. → [[phase-2-risk-and-events#P2-14|P2-14]]
- **BR-DRV-08** — exception / acceptance / assurance expiry state (Active, Expiring soon, Expired, Closed) from expiry date + warning window. → [[WF-5.14-exception-register]], [[phase-2-risk-and-events#P2-04|P2-04]]
- **BR-DRV-09** — monitoring rule status: Passing / Failing / **Degraded when the feed is unavailable** — a blind rule never reports success. → [[WF-5.09-continuous-monitoring]], [[phase-2-risk-and-events#P2-08|P2-08]]
- **BR-DRV-10** — campaign progress and task status, from the tasks. → [[WF-5.16-rcsa-campaign]], [[phase-3-cycles-and-assurance#P3-02|P3-02]]
- **BR-DRV-11** — audit plan delivery and quarter coverage, from entries vs audits performed. → [[WF-5.21-audit-programme]], [[phase-3-cycles-and-assurance#P3-06|P3-06]]
- **BR-DRV-12** — issue age, from raise date to now or resolution; never an `ageDays` column. → [[WF-5.22-issue-remediation]]
- **BR-DRV-13** — attestation rate = responses at the policy's **current** version over the population (UI label "attestation rate", not "coverage"). → [[WF-5.17-policy-attestation]], [[phase-3-cycles-and-assurance#P3-03|P3-03]], [[REQ-20-version-bound-attestation]]
- **BR-DRV-14** — projected residual = current minus reductions still to be banked by open actions. → [[WF-5.12-risk-lifecycle]], [[phase-2-risk-and-events#P2-02|P2-02]]
- **BR-DRV-15** — proactive detection rate: share of fraud cases found by the firm's own controls. → [[WF-5.23-fraud-case]]
- **BR-DRV-16** — worst band per risk across its indicators; one amber is never averaged away. → [[WF-5.15-kri-breach]], [[phase-2-risk-and-events#P2-05|P2-05]]
- **BR-DRV-17** — *(v2.1)* **Overdue, on anything**, is date-vs-now, never a stored state — cycles, tasks, actions, reviews, diligence. → [[phase-1-platform-floor#P1-07|P1-07]] (time-travel proof), everywhere
- **BR-DRV-18** — *(v2.1)* trend points are the metric's own definition evaluated at past instants; the last point equals the live tile; no series or delta is ever stored, hand-set or synthesized. → [[phase-1-platform-floor#P1-14|P1-14]], [[phase-2-risk-and-events#P2-14|P2-14]], [[G-26-historical-data]]

## Proves

[[REQ-14-metrics-on-demand]] · [[REQ-21-computed-third-party-tier]] · [[REQ-23-honest-bands]] · every honesty guarantee in [[dashboard-kpi-design]]
