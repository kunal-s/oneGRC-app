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
