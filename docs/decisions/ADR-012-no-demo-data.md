# ADR-012 · No demo data; ingest real instruments instead

**Status:** Accepted · **Date:** 2026-08-23 · **Supersedes:** build-plan P0-04

## Context

The repository began as a clone of the OneGRC prototype, whose `src/data` holds a complete demo
world: 23 named people, 273 controls, 217 obligations, 649 evidence items, all internally consistent
and all fictional. The original plan (P0-04) was to extract that world into `packages/seed-world`
and load it into Postgres as the spike fixture.

That was wrong for a product being built to deploy at a customer site, for a reason stronger than
data hygiene: **seeded records are internally consistent because someone made them consistent.**
They prove nothing about whether the workflows produce a coherent chain, and they quietly bend the
model to fit data that was authored to fit the model. Real law is messy — amended text, deferred
cadences, OCR noise, cross-references to instruments you have not ingested — and a schema that has
only ever met clean fixtures will not survive it.

The prototype remains available in its own repository for demonstrations. This instance is a clean
install intended for onboarding a real client.

## Decision

**No demo data, ever, in this repository.** `packages/seed-world` is never created. Data comes from
exactly three places, and they are kept distinct:

| Tier | What | Ships to a customer? |
|---|---|---|
| **Reference** | Frameworks, regulator definitions, the nine roles, the eight departments, the authority matrix | **Yes** — the platform does not function without it |
| **Sample** | 6-8 `origin: sample` people with no credentials, so department scope and maker-checker are exercisable | Dev and onboarding only; purgeable in one action |
| **Earned** | Controls, obligations, cycles, tasks, evidence | Never seeded — produced by running the workflows on ingested clauses |

The third tier is the substance of this decision. Nothing downstream of a clause is fixture data:
it comes into existence by using the product. That removes the leak risk by construction, because
there is nothing to leave behind, and it is a far harder test — if the chain cannot be built by
using the product, the product does not work.

Every record carries an `origin` enum (`ingested` | `user` | `sample`) from the first migration, so
sample data is identifiable and purgeable as a set rather than hunted for later.

## Consequences

- **Phase 0 is restructured around ingestion** (plan v1.3): P0-04 deleted; P0-14 document store,
  P0-15 acquisition, P0-16 parse and flag, P0-17 enrichment seam, P0-18 reference and sample data
  added. See [[phase-0]].
- **The second half of P0-13 is deleted** — the old-to-new identifier migration map existed only to
  carry the demo world across.
- **The app will look empty for a while.** Designed empty states (spec 17.4, change H-02) move from
  a nicety to near-term work.
- **We start with the hardest part.** The original plan deliberately began with the chain — CRUD
  plus authority, both well understood — and left ingestion to Phase 5 behind a seam, because
  extraction accuracy is the least deterministic thing in the product. Leading with it is slower and
  messier. It is still right, because ingestion is what makes the data real.
- `apps/web/src/data` (330 KB of Sankalp) becomes dead weight, excised page by page as screens are
  rewired (P0-10, P0-11, P2-12).
- **Purge must refuse rather than orphan.** If a real record comes to reference a sample person,
  purge is blocked and must name the blocking record (`BR-LNK-10`).

## The first instruments

Four, committed under `fixtures/instruments/` with a checksummed manifest. They are development
fixtures, not seed data: no customer deployment loads them.

- **Maharashtra PT Act 1975** — the anchor. Section 6 carries a duty, a statutory evidence
  requirement (a treasury challan, which is `BR-EVD-01` written into law), escalating late fees,
  sub-clause hierarchy and amendment markers.
- **Maharashtra PT Rules 1975** — supplies the cadence section 6 defers to, and it is *conditional*
  on the liability of the employer. An OCR scan, so extraction confidence matters.
- **PFRDA Act 2013** and a **PFRDA circular of 18 Aug 2026** — a two-page circular that supersedes
  an earlier one and cites its parent Act, exercising the instrument relation graph.

## Links

[[build-plan]] Phase 0 · [[ADR-003-identifier-scheme]] · [[ADR-007-roles-and-authority]] ·
[[functional-spec]] 5.1, 5.2, 18, 23 · [[G-08]], [[G-27]]
