# ADR-003 · Identifier scheme

**Status:** Accepted · **Date:** 2026-08-22 · **Overrides:** [[functional-spec]] §7.4

## Context

Identifiers in the seed world ran 5–23 characters with inconsistent grammar:
`SRC-PFRDA-INV-COMMITTEE` (23), `INST-PFRDA-INV-2025-MAR` (23), `OBL-INT-INVRES-W1-S9` (20) beside
`SRC-DPDP-9` (10). Prefix width varied from 2 (`WB`, `AP`, `DA`) to 4 (`RISK`, `CTRL`). Titles ran to
**130 characters** (median 37, p90 62).

Measured across the codebase, ids are rendered in **179 ad-hoc places with no shared component**.
`CrossRefPanel` lets the id take natural width, so every extra character is stolen from the title
beside it; `ProofChain` truncates ids across five side-by-side nodes — and that is the spike's core
component.

Root cause: §7.4 asked for "meaningful middle segments", so identifiers were made to carry system
key, legal citation and description all at once.

## Decision

Split those three jobs into three fields — `id`, `citation`, `shortTitle` — and cap the id.

**Max 11 characters, two patterns, no semantic middle segments:**

- **Catalogue records** `TYPE-NNNNN` — `SRC-00231`, `CTRL-0273`, `OBL-0142`, `TSK-01847`,
  `EVD-00649`, `RISK-0140`, `POL-046`, `VND-024`, `INST-024`, `KRI-027`, `ACT-0312`, `CMP-008`
- **Event records** `TYPE-YY-NNNN` — `INC-26-0411`, `ISS-26-0233`, `EXC-26-041`, `AUD-26-004`,
  `FND-26-027`, `RCM-26-118`, `FRD-26-005`, `WBR-26-008`, `DSR-26-014`

Two-character prefixes promoted to three (`WB` to `WBR`, `AP` to `APE`, `DA` to `DAS`, `WP` to `WPR`,
`DSAR` to `DSR`) so every id column aligns. Recurring cycle ids are composite and **never rendered
inline** — the UI shows the duty id plus a period chip.

Every record carries `title` (full) and **`shortTitle` (≤60 chars, required)**. Lists, tables and
chips render `shortTitle`, single-line, truncated with a tooltip. **No list view ever renders the
full title.**

## Consequences

- Max identifier width drops 23 to 11; the id column becomes fixed and never reflows.
- You can no longer read the regulator off the id. Mitigated by an `<EntityRef>` component pairing id,
  type icon and regulator pill — built once, replacing all 179 ad-hoc renderings.
- `INC-2026-0411` (the marquee incident) becomes `INC-26-0411`, invalidating existing screenshots.
  Accepted knowingly.
- The seed validator rejects a missing or over-length `shortTitle`, so a 130-character title is caught
  at build time rather than in a demo.

## Links

[[build-plan]] P0-13, P1-18 · [[spec-change-register]] C-02 · [[functional-spec]] §7.4, §23 D-11
