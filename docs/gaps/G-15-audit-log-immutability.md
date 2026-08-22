---
type: gap
id: G-15
area: Audit log immutability
priority: Essential
status: planned
tags: [gap, floor, audit-trail]
aliases: [G-15]
---

# G-15 — Audit log immutability

Prototype: append-only within the session. Production: genuinely tamper-evident — hash-chained, retention floor enforced against everyone including the administrator. A floor item.

- Closed by: [[phase-0-proof-chain-spike#P0-06|P0-06]] hash chain + same-transaction write + verify script · [[phase-1-platform-floor#P1-06|P1-06]] Postgres INSERT/SELECT-only role, block trigger, retention floor, chain-verify in CI and backups
- Rules: [[BR-AUD]] (BR-AUD-02), [[BR-DAT]] (BR-DAT-05) · Proves [[REQ-24-self-governance]]
- Spec: [[functional-spec#19.2 The gap register|§19.2]]
