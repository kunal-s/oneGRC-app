---
type: adr
id: ADR-011
status: accepted
date: 2026-08-22
relation: "enforces functional-spec sections 3 and 17.4"
tags: [adr, decision]
---

# ADR-011 · Colour encodes state, not category

**Status:** Accepted · **Date:** 2026-08-22 · **Enforces:** [[functional-spec]] §3, §17.4

## Context

Screens read as colourful and AI-generated — `/risks` most visibly, where Domain, Owner and Stage all
carry their own hues alongside genuine severity badges.

Investigation showed **the palette is not at fault**. `tailwind.config.js` already defines a correct
semantic token set (`critical/high/medium/low/ok/info`, each with a `soft` variant) and even carries
the comment *"color is used for state only, not decoration"*.

The defect is **application**. `DOMAIN_COLORS` in `src/lib/heatmap.ts` is a six-hue rainbow of **raw
hex** — `#2563eb` blue, `#7c3aed` violet, `#0891b2` cyan, `#d97706` amber, `#059669` emerald,
`#db2777` pink — that bypasses the token system entirely and is applied to a **categorical** attribute
inside dense tables and filter chips.

## Decision

- **Categorical colour is permitted only inside a dedicated visualisation** — the heat map, the
  appetite panel, charts. **Never** in a table row, chip, list or cross-reference, where domain, owner
  and stage render as plain text or a neutral outline chip.
- **Saturated colour is reserved for severity, status and band**, so a red on screen always means
  something is wrong.
- `DOMAIN_COLORS` moves into CSS variables so it themes and supports dark mode; **no raw hex** remains
  in `src/lib` or `src/pages`.
- **State is never conveyed by colour alone** (§17.4) — every coloured state also carries a label, so
  the screen stays legible in greyscale and to colour-blind users.

**The Home enterprise risk heat map is explicitly retained as built.** A 5×5 grid encoding domain
composition per cell is exactly where a categorical palette earns its place; this work must not change
its appearance beyond sourcing hues from tokens.

## Consequences

- Registers become calm and scannable — the governance-grade density §3 and CLAUDE.md A3 ask for.
- Accessibility improves as a by-product: colour-blind users lose nothing, because nothing was ever
  encoded in hue alone.

## Links

[[build-plan]] P1-19 · [[dashboard-kpi-design]] §3.4 · [[functional-spec]] §3, §17.4
