---
type: gap
id: G-01
area: Persistence
priority: Essential
status: planned
tags: [gap, floor]
aliases: [G-01]
---

# G-01 — Persistence

Prototype: in-memory session state; a reload resets to the seed. Production: durable storage with full history and versioned records. One of the six floor items ([[functional-spec#19.3 What may legitimately stay simulated in an early release|spec §19.3]]).

- Closed by: proven on the slice in [[phase-0-proof-chain-spike|Phase 0]] ([[phase-0-proof-chain-spike#P0-02|P0-02]]–[[phase-0-proof-chain-spike#P0-04|P0-04]]); full in [[phase-1-platform-floor#P1-01|P1-01]]/[[phase-1-platform-floor#P1-02|P1-02]]
- The reload-persistence test is [[REQ-03-clause-as-the-unit]]'s "done when"
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
