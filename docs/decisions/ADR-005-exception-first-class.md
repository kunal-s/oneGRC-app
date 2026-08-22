# ADR-005 · Exception is a first-class entity

**Status:** Accepted · **Date:** 2026-08-22 · **Overrides:** [[functional-spec]] §5.14, §7.1

## Context

§5.14 called it a "design decision worth preserving": an exception is **an issue with a deviation
record attached, not a parallel object**, so it inherits the remediation apparatus for free — owner,
due date, a place in the one issues register, bulk actions, audit trail, closure.

That reasoning is sound and rests on `BR-LNK-06`: *"Remediation from any source lands in the one
issues register. A private to-do list per module is how findings get lost between them."* The fear is
real — an approved deviation tracked in its own module becomes invisible to whoever reviews
outstanding weaknesses.

But an Issue and an Exception are **different things**. An issue is a weakness to fix; an exception is
a governance decision to *tolerate* one temporarily. Fusing them forces two lifecycles
(`Open/InProgress/Resolved` vs `Requested/Approved/Active/Expiring/Expired/Closed`) into one status
field, which is exactly the drift the derive-don't-store principle exists to prevent.

Note also that §5.14 step 1 raises the exception **against the failing control or the late
obligation** — not against an issue. A proactive exception was always implied; only the §7.1 summary
suggested otherwise.

## Decision

Keep the spec's **goal**, drop its **mechanism**.

- `Exception` is a first-class entity. Subject is a **control or an obligation**; `issueId` is
  **optional**, so a proactive deviation with no surfaced issue is a first-class path.
- The remediation register becomes a **union view over Issues + Exceptions**. `BR-LNK-06`'s intent
  holds completely: one place to look, nothing invisible.
- The shared apparatus comes from **shared engines, not inheritance** — the one reminder ladder, the
  one audit log, the one evidence vault, each pointed at the exception's own expiry. This is *more*
  faithful to §2's "one engine per concern" than subtyping was.
- **On expiry: a review**, with four outcomes — close (gap fixed) · acknowledge and extend (approval
  + SoD, renewal count increments) · convert to accepted risk · do not extend and raise remediation.
- **No auto-created issue on expiry.** An expired exception is *itself* the visible open exposure in
  the union register and escalates on the standard ladder. Auto-raising would produce two records for
  one exposure and inflate the open-issue count.
- **Renewal authority escalates with the count** (`BR-AUT-11`): the second renewal needs the
  Executive; beyond that the exception is named in the Audit Committee pack. §5.14 already warns that
  "an exception renewed four times is a decision the firm has made without admitting it" — extension
  stays possible, but gets progressively harder to do quietly.

## Consequences

- Requirement 17 is delivered properly: an expired exception reads as an open exposure and escalates.
- The risk state formerly called `Exception expired` is renamed **`Acceptance lapsed`** — the old name
  would have read as "a lapse auto-creates an exception", precisely what this ADR forbids.
- In practice an issue usually already exists: the exception was raised against a control the CCM
  cascade (WF 5.9) already failed. The exception governs the **tolerance**; the issue tracks the
  **fix**. Two records, two jobs, correctly separate.

## Links

[[build-plan]] P2-04, P2-13 · [[spec-change-register]] C-01, H-04 · [[functional-spec]] §5.14, §7.1,
`BR-LNK-06`, `BR-LFC-13`, `BR-AUT-11`, Requirement 17
