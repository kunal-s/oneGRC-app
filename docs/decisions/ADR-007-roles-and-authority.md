---
type: adr
id: ADR-007
status: accepted
date: 2026-08-22
relation: "clarifies functional-spec sections 4.2 and 4.10"
tags: [adr, decision]
---

# ADR-007 · Roles, department scope and the authority matrix

**Status:** Accepted · **Date:** 2026-08-22 · **Clarifies:** [[functional-spec]] §4.2, §4.10

## Context

The seed roster carried contradictions — Imran Sheikh is "Platform Administrator" in spec §4.2 and
"Vendor/TPRM" in the prototype's CLAUDE.md (§21.16). These exist because **nothing validates them**.
The roster's single Role column also read as a 1:1 model, though §4.3 expects a real user to hold
several roles, and the two committee chairs already prove it.

The subtler danger: department scope (`BR-SCP-01`) derives visibility from a record's owner, and the
Administrator sees everything. Making a TPRM lead the administrator silently grants global visibility
across all eight departments.

## Decision

- **Roles are first-class**; Person↔Role is **many-to-many**. The roster's Role column is the
  *primary* role, not the only one.
- **Department is derived from the record's owner** and never stored on the record, so it cannot
  disagree with the org chart.
- **The §4.10 authority matrix is data, not code** — a table of action → permitted roles → SoD flag,
  seed-loaded and editable through governed configuration, within §14.2's floor (SoD can never be
  disabled). Authority hard-coded per screen is `BR-AUT-01`'s named failure mode.
- **Imran Sheikh stays a pure Administrator**; a separate named person owns Vendor/TPRM.
- **A seed/data validator runs in CI** and fails the build on structural violations:
  - every record has a valid owner, and every owner sits in one of the eight departments;
  - **every governed action has at least one person able to perform it** (else the workflow is dead);
  - **every maker-checker record has an eligible checker who is not the maker** (else approval is
    impossible);
  - nobody holds a contradictory combination (e.g. Administrator plus ethics-office membership).

## Consequences

- The last two validator rules catch bugs invisible to anyone reading the roster — they would
  otherwise surface as a stuck demo mid-presentation.
- Fixing a roster row was never the fix; making the error class impossible is.

## Links

[[build-plan]] P0-06, P1-03 · [[spec-change-register]] H-05 · [[functional-spec]] §4.2, §4.5, §4.10,
`BR-AUT-01`, `BR-SCP-01`, §21.16
