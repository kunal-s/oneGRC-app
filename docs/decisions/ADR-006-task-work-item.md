# ADR-006 · Task is one general work-item engine

**Status:** Accepted · **Date:** 2026-08-22 · **Resolves:** [[functional-spec]] §7.1 vs §7.3 conflict

## Context

v2.0 carried two overlapping state vocabularies for the same thing. §7.1 gave Task
`Open · Evidence attached · Submitted · Verified`; §7.3 gave a generic maker-checker machine for *any*
record, `Drafted → Submitted → Approved` plus `Submitted → Returned → Drafted`. Is a finished task
"Verified" or "Approved"? Is "Open" the same as "Drafted"? **"Returned" was missing from the task
list entirely**, so there was no defined state for "the checker sent it back".

Worse, "Evidence attached" is not a state — it is a fact computable from whether evidence rows exist.
Storing it violates derive-don't-store and creates a field that can lie.

Tasks are also needed well beyond obligation filings: remediation steps, campaign responses, DSAR
stages, attestations. Those have different completion semantics — some need a checker, some need
evidence, some just need acknowledging.

## Decision

**One `Task` entity everywhere**, with a `completionPolicy` gating which transitions are legal:

| Policy | Path | Used by |
|---|---|---|
| `simple` | Open → InProgress → Done | remediation steps, general work |
| `acknowledge` | Open → Done *(labelled "Acknowledged")* | attestations, reg-change acknowledgement |
| `evidence` | Open → InProgress → Done, blocked without ≥1 evidence | obligation filings |
| `maker-checker` | Open → InProgress → Submitted → Done, or Returned → InProgress | anything needing a second pair of eyes |

Stored states: `Open · InProgress · Submitted · Returned · Done · Cancelled`.
**`Overdue` is derived** (past due, not terminal) — never stored (`BR-DRV-17`).

Display labels vary by policy over one underlying state machine, so the UI reads naturally
("Acknowledged", "Verified", "Done") without a second status field that can drift.

## Consequences

- Campaign tasks and DSAR stages ride the same table instead of growing private copies — "one engine
  per concern" applied to work items.
- The maker-checker states of §7.3 become **projections** of this machine, not a parallel model.
- "Evidence attached" becomes a derived badge, not a state.

## Links

[[build-plan]] P0-08, P1-04 · [[spec-change-register]] C-05 · [[functional-spec]] §5.4, §5.7, §7.1, §7.3
