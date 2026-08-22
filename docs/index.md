---
type: index
status: current
tags: [moc, index]
---

# OneGRC — Documentation

Entry point for the build. Open this folder as an Obsidian vault:
`\wsl$\Ubuntu\app\app-oneGRC-platform\docs`

## Start here

| Document | What it is | Status |
|---|---|---|
| [[functional-spec]] | The governing functional specification — what the product does and why | **v2.1** |
| [[build-plan]] | The phased engineering plan: 6 phases, 73 chunks, each independently verifiable | **v1.2** |
| [[spec-change-register]] | Every v2.0 → v2.1 change with severity and build impact — read this instead of diffing the spec | — |
| [[dashboard-kpi-design]] | Board & committee metric catalogue, layout and honesty rules. **Governs** board surfaces (supersedes §10.1's tile list) | — |

## Navigate the vault

New here? Follow [[start-here]]. The vault exists to answer two questions from any note in one or
two hops — **"why am I building this?"** (chunk → workflow → rule → requirement) and **"what does
this touch?"** (rule/requirement → every chunk, ADR and screen that implements it).

| Layer | Where | Enter via |
|---|---|---|
| Workflows (§5, one note each) | `workflows/` | [[WF-5.01-source-to-action]] — the headline flow |
| Acceptance requirements (§20) | `requirements/` | [[traceability]] — the §20.3 matrix, linked |
| Business rules (§6, per group) | `rules/` | [[BR-DRV]] · [[BR-AUT]] · [[BR-ESC]] … (rule ids like `BR-DRV-17` resolve as aliases) |
| Gap register (§19.2) | `gaps/` | [[G-01-persistence]] … [[G-28-accessibility]] |
| Build phases (chunk anchors) | `phases/` | [[phase-0-proof-chain-spike]] → `#P0-01` … |
| Hubs | `mocs/` | [[domain-compliance]] · [[domain-risk]] · [[domain-audit-assurance]] · [[domain-investigations]] · [[domain-privacy-data]] · [[personas]] |

## Decisions

Architectural decisions, newest concerns last. Several deliberately **override** the spec — each
records why, so a future reader never mistakes a considered divergence for an oversight.

| ADR | Decision | Overrides spec? |
|---|---|---|
| [[ADR-001-stack-and-repo]] | Single monorepo; Vite+React retained, NestJS+Prisma+Postgres, Docker Compose, on-prem single-tenant | — |
| [[ADR-002-authorization-seam]] | Build the authorization seam now; federate to the client IdP later | — |
| [[ADR-003-identifier-scheme]] | Identifiers ≤11 chars, two patterns, no semantic middles; `title` + `shortTitle` + `citation` | **yes** — §7.4 |
| [[ADR-004-obligation-and-cycle]] | `Obligation` (standing duty) + `ObligationCycle` (instance) | clarifies §7.1 |
| [[ADR-005-exception-first-class]] | `Exception` is its own entity, not a subtype of `Issue`; union remediation register; no auto-issue on expiry | **yes** — §5.14, §7.1 |
| [[ADR-006-task-work-item]] | One `Task` engine with a `completionPolicy` gating transitions | resolves §7.1/§7.3 conflict |
| [[ADR-007-roles-and-authority]] | Roles first-class, Person↔Role many-to-many, department derived, authority matrix as data | clarifies §4.2, §4.10 |
| [[ADR-008-metric-honesty]] | "Coverage" split into control pass rate and duty coverage; derived-only metrics; no synthesized series | **yes** — §10.1, §10.2 |
| [[ADR-009-obligation-control-cardinality]] | Obligation ↔ Control is many-to-many | **yes** — §7.2 |
| [[ADR-010-committee-chair-authority]] | Committee chairs review; they do not close cases | **yes** — §4.10 |
| [[ADR-011-colour-discipline]] | Colour encodes state only; categorical colour confined to visualisations | enforces §3, §17.4 |

## Review discipline

How a chunk gets to "done" — the per-chunk review loop, the invariant checklist, the user test
case, phase regression and the honesty rules — is defined in [`REVIEW.md`](../REVIEW.md) at the
repo root. Its two working files live here in the vault:

| File | What it is |
|---|---|
| [[open-issues]] | The issue register: severity ladder, blocks-the-phase flag, closed-only-when-re-verified |
| `test-cases/phase-N.md` | One file per phase of user-runnable walkthroughs; re-run in full at every phase checkpoint |

## Conventions

- **Stable identifiers are link targets.** The spec's `BR-*` rules, `G-*` gaps, workflow numbers
  (`WF 5.14`) and chunk IDs (`P0-03`) are quoted verbatim so they stay greppable across documents.
- **The spec is the contract; the ADRs are the amendments.** Where they disagree, the ADR wins and
  says so explicitly.
- **Demo vs production:** spec §23 tables every demo-only construct and its production answer. If
  something looks like a product requirement but smells like demo staging, check there first.

## Build status

- **P0-01 complete** — monorepo scaffolded, prototype moved to `apps/web` unchanged, typecheck and
  build green, dev server serving.
- **Next: [[build-plan|P0-02]]** — Postgres + NestJS skeleton in Docker Compose with a real
  `/api/health` DB round-trip.
