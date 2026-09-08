# Kit feedback

One line per slice. Nothing to say is a valid answer.

## SLICE-00

The work order's own file and match counts drifted from the code twice in one
document: step C2 said seven files where the plan's own screen-inventory.md
already listed eight, and step D2 said forty seven em dash matches where the
actual count, confirmed by running the check, is twenty seven. Both are
recorded as DN-028 in `docs/decisions.md` rather than corrected in the generated
work order. Worth a check in the kit itself: a count copied from one place to
another inside the same generated document should be computed once and read
everywhere else, not retyped.

## SLICE-01A

Build step 7 asked for a code change ("Add `lineOfDefence` to the `GET /whoami`
response") against a claim in section 4 that the endpoint did not return it yet.
The endpoint already did: `identity.types.ts`, `session.service.ts` and the
client's `WhoAmI` type all already carried it. Worth a check in the kit: a work
order's claim about what the current code does not do is worth generating from
a fresh read of the code, not carried forward from an earlier pass that may have
been superseded by other work in between.

## SLICE-01B

Section 2's own narrative states the two two-role people the verification
steps depend on, "Meera Krishnan is Executive and Risk Committee Chair" and
"Sunita Menon is Auditor and Audit Committee Chair", but `apps/api/src/setup/
sample-people.ts` gave Meera only `EXEC, RISK_MGR` and Sunita only `AUDITOR`,
with no committee role on either. Verification step 5 ("sign in as Meera,
confirm two entries") could not have passed on the seed as generated. Fixed
here by adding the two committee roles the work order's own prose already
named. Worth a check in the kit: a slice's sample data should be checked
against its own section 2 narrative, not only against the schema.

## SLICE-01C

Section 2 names `GET /controls` and `GET /instruments` as the two current
unscoped reads, as if either were an equally good candidate for the one read
this slice scopes. They are not: `data-model.md` DRV-20 already records that
E-14 Source instrument is the one entity whose department is not
`owner.department`, it is a stored, Compliance-assigned array that does not
exist in the schema yet and belongs to `SLICE-06`. Scoping `GET /instruments`
here would have meant building part of E-14's own data model inside a slice
whose out-of-scope section explicitly rules out touching the Source Library.
`GET /controls` had no such conflict and was scoped instead. Worth a check in
the kit: when a work order names two reads as parallel examples of the same
gap, check whether the plan's own derivation rules (data-model.md section 2)
already treat one of them as an exception before assuming either is available.

## SLICE-01D

Running the work order's own CON-034 check (pnpm --filter api verify:audit)
surfaced a real, pre-existing bug in AuditService, not something this slice's
own code introduced: hashOf() hashed the caller's raw detail object, but
Postgres's JSONB column, like JSON.stringify, silently drops an object key
whose value is undefined. A handler whose detail carries a conditionally-set
key (provisions.controller.ts's promote() is one) produced an entry whose
recorded hash could never again match what a later replay recomputes from the
stored row, since the stored row is missing a key the hash was computed with.
Fixed by hashing the same round-tripped JSON.parse(JSON.stringify(...)) shape
that actually gets persisted, in AuditService.append() itself. Worth a check in
the kit: a hash-chain verifier is only as trustworthy as the guarantee that its
input and its target are computed from the identical value, and that guarantee
is easy to lose quietly the moment a nullable, conditionally-present field
enters a hashed payload.

## SLICE-02

Section 7's own script names Deepa Iyer to perform step 16's `task.verify`
("As Deepa, verify it, so the cycle reads Filed"), but the authority matrix
requires COMPLIANCE_MGR, EXEC or AUDITOR for that action, and Deepa, nominated
as the duty's checker, holds only COMPLIANCE_ANALYST. The step as written
refuses with a 403. Worked around by using Anjali instead, who holds the role
and is not the maker. A second, smaller gap sat beside it: the dev sign-in
control's roster (`apps/web/src/api/DevIdentityBar.tsx`) listed seven of the
ten sample people, missing exactly the two this slice's own script needs to
click through as, Rohit Kulkarni the owner and Imran Sheikh the Administrator.
Fixed here by adding both. Worth a check in the kit: a work order's
verification script should be checked against the current authority matrix and
the current dev sign-in roster before being generated, not assumed from a
nominated-checker relationship or carried forward from an earlier slice's
roster.

## SLICE-03

The work order's own closing instruction reads "number your own new
enhancements from ER-015", the same instruction [[SLICE-02]]'s work order gave
it for its own two enhancements, and both slices were explicitly built in
parallel. [[SLICE-02]] reached `docs/decisions.md` first and claimed ER-015
(the bell's per-row read state) and ER-016 (an unsubstantiated escalation's
visibility). This slice's own two enhancements, the dedup notice and the
refused-upload trace, are renumbered ER-018 and ER-019 here, with ER-017
between them for a third enhancement this slice raised on its own (the ClamAV
scanner adapter, deferred for want of a reachable daemon). Worth a check in
the kit: two work orders built in parallel and told to number their own new
IDs "from" the same starting value will collide whenever both actually raise
something, which is the ordinary case rather than the exception; a kit
generating two parallel work orders should reserve disjoint ranges up front,
the way it already does for docs/decisions.md's own DN numbers here (DN-038 to
DN-042 sat cleanly next to SLICE-02's DN-033 to DN-037 with no collision at
all, because each slice was given a contiguous block rather than a shared
starting point).

## SLICE-04

This work order told the session to start at ER-019 to stay clear of either
outcome of [[SLICE-03]]'s own possible renumbering, written before either
slice had actually landed a commit. By the time this slice built, [[SLICE-03]]
had already merged and claimed ER-017, ER-018 and ER-019 for itself (see its
own entry above), so this slice's two enhancements are ER-020 and ER-021
instead, checked against the committed state of docs/decisions.md rather than
the number the work order printed. Same root cause as SLICE-03's own entry,
one slice later: a starting number handed to two parallel work orders is a
race, not a reservation. Separately: the close-out checklist asks for
traceability.md, docs/plan/modules/M-01.md and docs/plan/slices/SLICE-04.md to
be regenerated rather than hand-edited. No tool to do that exists anywhere in
this repository or under .claude/, and docs/plan/slices/SLICE-03.md still
reads "Status: not started" after SLICE-03 itself was verified and closed,
which shows this has been true, and silently skipped, since at least that
slice. This slice leaves the three generated notes exactly as it found them
for the same reason: hand-editing a file marked never hand-edit, the next
regeneration discards it, would make the drift worse, not better, wherever the
real generation step turns out to live.
