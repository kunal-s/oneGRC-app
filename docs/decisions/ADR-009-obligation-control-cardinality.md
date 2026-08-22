# ADR-009 · Obligation ↔ Control is many-to-many

**Status:** Accepted · **Date:** 2026-08-22 · **Overrides:** [[functional-spec]] §7.2

## Context

§7.2 fixed **Control → obligation as 1:many**, which means each obligation is satisfied by exactly
**one** control. The clause side was already many-to-many ("map once, satisfy many"), so the model was
asymmetric without a stated reason.

In real estates a single duty is frequently satisfied by several controls acting together — a breach
notification duty may need a detection control, an assessment control and a filing control before it
is discharged.

## Decision

**Obligation ↔ Control is many-to-many.** A join table from the first migration.

## Consequences

- Costs one join table now. Widening it after seed data, screenshots and a live register exist is a
  **data migration**, not an edit — so the asymmetric version is the expensive choice, not the cheap one.
- Duty coverage ([[ADR-008-metric-honesty]]) becomes "duties with **at least one** mapped control",
  which is the honest formulation anyway.
- The proof chain renderer must handle a duty resolving to several controls without implying
  precedence between them.

## Links

[[build-plan]] P0-03 · [[functional-spec]] §7.2, §3 "map once, satisfy many"
