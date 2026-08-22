---
type: adr
id: ADR-008
status: accepted
date: 2026-08-22
relation: "overrides functional-spec sections 10.1 and 10.2 (v2.0); v2.1 incorporates"
tags: [adr, decision]
---

# ADR-008 · Metric honesty and the coverage split

**Status:** Accepted · **Date:** 2026-08-22 · **Overrides:** [[functional-spec]] §10.1, §10.2

## Context

§10.1 admitted "control coverage" carried two incompatible meanings. An audit of the cockpit found
worse, verified in code:

- **The headline is a constant.** `enterpriseRisk: 7.8` is hard-coded (`src/data/world.ts:3080`) and
  the trend arrow is a **string literal** — `trendLabel="+0.3 QoQ"` (`src/pages/Home.tsx:107`). The
  most prominent number on a derive-don't-store platform is derived from nothing.
- **All three trend charts are fabricated** from a seeded RNG — `series(311, 9, 5, 1.4)`
  (`src/lib/trends.ts:31`) — while §10.2 already required them computed from records.
- **The on-time filing rate was gameable**: it divided by cycles *filed*, so a firm that simply does
  not file improves the number.
- **Both mean-age metrics reward doing less work** — mean age of open issues improves when you close
  young ones.

## Decision

- **Split coverage** into **"Control pass rate"** (of controls tested in cadence, how many pass) and
  **"Duty coverage"** (of duties owed, how many have any control mapped). The bare word **"coverage"
  is banned from the UI**. Duty coverage is the headline, because it answers the question actually
  asked.
- **Enterprise risk becomes derived** — the tail-weighted aggregate (`BR-DRV-05`/`07`), never stored.
- **`BR-DRV-18`: no synthesized series, ever.** A trend point is the metric's own definition evaluated
  at a past instant from dated records; the final point equals the live value.
- **On-time rate divides by cycles that fell due**, so unfiled counts against.
- **Mean-age metrics deleted**, replaced with ageing bands, oldest item, and percent within SLA.
- Every number must be **drillable** to the records behind it, carry a denominator, and never be
  improvable by doing less work.
- [[dashboard-kpi-design]] **governs** board and committee surfaces; §10.1 defers to it rather than
  duplicating a tile list.

## Consequences

- 26 defined metrics; no persona sees more than 10 tiles. 8 kept, 7 redefined, 7 added, 6 deleted.
- **Evidence-backed completions** is added — §1 names "operating but never documented" as the founding
  nightmare, yet v2.0 had no metric measuring it.
- The seed must synthesize historical **records**, not curves, so day-one trends derive honestly.

## Links

[[dashboard-kpi-design]] · [[build-plan]] P1-14, P2-11, P2-14, P3-10 ·
[[spec-change-register]] C-06, C-07, H-06 · [[functional-spec]] §10, §19.2 G-19/G-20, §21.11
