# ADR-004 · Obligation and ObligationCycle

**Status:** Accepted · **Date:** 2026-08-22 · **Clarifies:** [[functional-spec]] §7.1 vs WF 5.5

## Context

The spec pulled both ways. §7.4 said cycles "derive from the base identifier so that the series is
visibly one duty over time"; the §7.1 example `OBL-PFRDA-Q1-07` baked the period into the id,
implying one record per quarter; WF 5.5 said on filing, "create the next instance: same duty, same
owner".

Plainly: is "file GSTR-3B monthly" **one thing that happens twelve times**, or **twelve things**?

## Decision

Two entities.

- **`Obligation`** — the standing duty. Owner, **frequency**, provenance, evidence requirement.
- **`ObligationCycle`** — one occurrence. Its own due date, status, maker, checker, evidence.

Cycle id = duty id plus a period suffix, never rendered inline (see [[ADR-003-identifier-scheme]]).

"Frequency" is an **attribute of the parent**, not a name for the child — the child is a *cycle*,
already the domain word (WF 5.5 "cycle history", §10.1 "over cycles filed").

## Consequences

- The per-period ledger WF 5.5 promises becomes computable, and Requirement 11 demonstrable.
- Regulatory change updates the **duty**; future cycles inherit it while history keeps the cadence it
  was performed under.
- A missed cycle stays open and escalating while the next is generated — a firm cannot outrun its own
  failures by rolling the record forward.

## Links

[[build-plan]] P0-03, P0-04 · [[spec-change-register]] C-03 · [[functional-spec]] §7.1, §7.3, WF 5.5
