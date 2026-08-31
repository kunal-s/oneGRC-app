---
type: gap
id: G-03
area: Authorization enforcement
priority: Essential
status: planned
tags: [gap, floor]
aliases: [G-03]
---

# G-03 — Authorization enforcement

Prototype: authority checked in the client. Production: the same central model enforced **server-side**; the client check degrades to an affordance. A floor item, and invariant I-8: retrofitting later means re-auditing every endpoint.

- Decision: [[ADR-002-authorization-seam]] · matrix as data per [[ADR-007-roles-and-authority]]
- Rules: [[BR-AUT]] (BR-AUT-01/03)
- Closed by: [[phase-0-proof-chain-spike#P0-06|P0-06]] guard + runner + backstop · [[phase-1-platform-floor#P1-03|P1-03]] full matrix + contract test · [[phase-1-platform-floor#P1-16|P1-16]] capabilities sweep
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
