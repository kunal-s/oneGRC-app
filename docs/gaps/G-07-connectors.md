---
type: gap
id: G-07
area: Connectors
priority: Essential
status: planned
tags: [gap, integrations]
aliases: [G-07]
---

# G-07 — Connectors

Prototype: feeds simulated, statuses and last-sync times seeded. Production: real connectors with credentials, mapping, retry, idempotency and sync history (spec §12).

- Closed by: [[phase-2-risk-and-events#P2-08|P2-08]] the `FeedProvider` seam with a simulated implementation (CCM runs against it) · [[phase-5-intelligence-admin-handoff#P5-06|P5-06]] the framework + **one real read-only connector** (directory/HR import), with simulated spokes honestly labelled
- Workflow: [[WF-5.09-continuous-monitoring]]
- Spec: [[functional-spec#19.2 The gap register|§19.2]], [[functional-spec#12. Integrations and Connectors|§12]]
