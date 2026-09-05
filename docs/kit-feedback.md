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
