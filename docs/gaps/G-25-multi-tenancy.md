---
type: gap
id: G-25
area: Multi-tenancy
priority: Depends on §21
status: deferred
tags: [gap, platform]
aliases: [G-25]
---

# G-25 — Multi-tenancy

Prototype: single organization. Production: tenant isolation, per-tenant configuration, the §15 deployment models — **deferred but deliberately not designed out**.

- Design-in without building: every table carries `org_id`; a Prisma extension scopes every query from day one, so tenancy later is a data + auth change, not a schema rewrite ([[build-plan#1. Target architecture|build-plan §1.6]])
- Locked decision: single-tenant per deployment ([[ADR-001-stack-and-repo]])
- Spec: [[functional-spec#19.2 The gap register|§19.2]], [[functional-spec#15. Deployment and Delivery Models|§15]]
