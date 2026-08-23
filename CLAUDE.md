# OneGRC — working agreement

Read this before starting work. It is the standing brief; `REVIEW.md` is the per-chunk quality
gate; `docs/index.md` is the map of everything else.

---

## 1. Do not invent new build stages

**The plan is not yours to grow.** Do not add chunks, phases or scope to `docs/build-plan.md`
unless the customer explicitly asks for them. Phase 0 has already expanded more than once, and
every addition pushes the finish line further away.

When work turns out to be needed that is not in the plan:

- If it is **required to make the current chunk correct**, do it and say so in the commit.
- If it is **separate**, write it to `docs/open-issues.md` and carry on. Do not create a chunk.
- If it looks like it deserves a chunk, **say so and wait.** The customer decides.

The customer is directing the build clause by clause and screen by screen. Follow that lead.

---

## 2. Prefer bite-size work you can finish, review and prove

One screen, one endpoint, one rule. Something you can build, verify in the browser, and hand over
with a walkthrough in a single pass. A large change that cannot be validated in one sitting is
worse than three small ones that can.

---

## 3. Validate everything you build, as a real person would

Never report work as done on the strength of a passing typecheck.

- **Sign in as a persona** who would actually do this job and step through the screen. Use the dev
  identity bar; the sample roster is in `apps/api/src/setup/sample-people.ts`.
- **Exercise the negative path.** A screen that only demonstrates the happy path proves nothing.
  Prove the refusal too: wrong role, wrong department, missing evidence, blocking review item.
- **Read the console.** Zero errors, or explain them.
- **Trace any number** you display back to the record it came from. This project has twice shipped
  figures that looked right and were constants.

Full procedure: `REVIEW.md` §2 and §5.

---

## 4. How to report back

Short, plain, and honest. Every completed piece of work is reported as:

1. **What is built** — a few lines, no ceremony, no restating the brief.
2. **A use case the customer can walk through themselves** — numbered steps, the exact route, who
   to sign in as, what they should see. Include at least one step that should FAIL, and say what
   the refusal should say.
3. **What is not done** — gaps, placeholders, and anything you could not verify. Say it plainly.
   A known gap named early is cheap; one discovered in a demo is not.

Do not pad the report with what went well. State it and stop.

---

## 5. Design comes from the prototype

The prototype at `apps/web/src/pages/*.tsx` (pre-rewire) is the visual reference: `PageHeader`,
`SeverityBadge`, `StatusChip`, `Button`, and the `card-surface` class. Reuse them rather than
inventing a second visual language.

When porting a prototype screen, port the **sections the customer names and nothing else.** The
prototype carries features this build has deliberately dropped.

Where our data does not exist yet, **say so in the section** rather than rendering an empty shell
or, worse, a plausible placeholder value. An honest "the model tier supplies this" is a design
element, not an apology.

---

## 6. The rules that are not negotiable

These are architecture, not preference. They are expensive to retrofit and cheap to keep.

- **Derive, never store.** No `overdue`, no `ageDays`, no `evidenceCount`, no `department` outside
  `Person`. A stored copy of a derivable fact is a future lie.
- **One engine per concern.** One reminder ladder, one remediation register, one evidence vault,
  one audit log, one proof-chain renderer. Never grow a second.
- **One authority check.** Every governed action goes through `GovernedMutationService`. Never
  check a role inline in a handler.
- **Every mutation is transactional with its audit entry.** A change that cannot be logged must not
  commit.
- **The client check is an affordance, never the control.** Hide the button *and* refuse the call.
- **Nothing is tracked without a person.** Classification and enrichment propose; a human disposes.
- **Verbatim means verbatim.** Never paraphrase a source extract into a field called verbatim.
- **No demo data.** See `docs/decisions/ADR-012-no-demo-data.md`.
