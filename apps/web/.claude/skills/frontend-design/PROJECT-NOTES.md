# OneGRC project notes for the `frontend-design` skill

> This file is project-local guidance. It does **not** alter the upstream `SKILL.md`
> (sourced verbatim from `anthropics/claude-code` →
> `plugins/frontend-design/skills/frontend-design/SKILL.md`). Read it alongside `SKILL.md`
> whenever the skill is applied to OneGRC.

## §A3 is the hard constraint

OneGRC's `CLAUDE.md` §A3 (Aesthetic direction & anti-patterns) **overrides** the skill's
"take a real aesthetic risk / bold signature" mandate whenever the two conflict. The
skill is for *sharpening* the existing identity, not replacing it. Treat these as fixed:

- **Calm, premium, information-dense, governance-grade, regulator-ready** — a tool, not a
  presentation.
- **Color is for state only, not decoration** (5-level severity + brand primary/accent).
- **Must NOT look like** a marketing landing page, a bright consumer SaaS app, a
  pitch-deck, or a wall of oversized gradient donut charts.
- **Light mode** is the default; high density; real tables, compact KPI tiles.
- Positive references already chosen: **Linear · ServiceNow "Next Experience" · Vanta ·
  Drata · Atlan · Snowsight.**

So when the skill says "spend your boldness in one place," in OneGRC that one place is
typography, spacing rhythm, and a restrained signature element — never loud color or
ornament.

## Where skill and §A3 already agree (good first candidate if applied)

Both the skill (avoid generic "big number + gradient accent" hero defaults) and §A3 (no
marketing/pitch-deck look, no oversized gradients) would flag the **current Home hero** —
gradient primary background + animated accent blob in `src/pages/Home.tsx` — as a generic
default worth reworking. That's the natural pilot surface if the skill is ever applied.

## Design system entry points (where global look actually lives)

- **Color / theme tokens:** CSS variables in `src/index.css` `:root`.
- **Typography & animations:** `tailwind.config.js` (`theme.extend`).
- **Shared component utilities:** `@layer components` in `src/index.css`
  (`.card-surface`, `.scrollbar-thin`, `.tnum`).
- **Reusable vocabulary (§A7):** `src/components/` — `PageHeader`, `KpiTile`,
  `SeverityBadge`, `StatusChip`, `FrameworkPill`, `RegulatorClock`, `DataTable`, etc.
