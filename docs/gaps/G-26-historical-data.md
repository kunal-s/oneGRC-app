---
type: gap
id: G-26
area: Historical data
priority: Essential
status: planned
tags: [gap, metrics]
aliases: [G-26]
---

# G-26 — Historical data

Prototype: the world is staged around a single demo anchor; every "past" record and every curve is relative to it. Production: real history, metrics over real periods, windows reading "since go-live (n months)" until real history exists (BR-DRV-18).

- Closed honestly by seeding **records, not curves**: historical obligation cycles synthesized from `filedAt`/frequency at load ([[phase-0-proof-chain-spike#P0-04|P0-04]], [[phase-1-platform-floor#P1-02|P1-02]], [[phase-2-risk-and-events#P2-01|P2-01]]) so day-one trends derive from real rows
- The demo anchor's production answer: `ClockService` frozen/real/offset modes ([[build-plan#4. Migrating the seed world|build-plan §4]], spec §23 D-01..D-03)
- Rules: [[BR-DRV]] (BR-DRV-18) · Decision: [[ADR-008-metric-honesty]]
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
