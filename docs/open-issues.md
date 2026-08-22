# Open issues

The working register of everything found and not yet fixed. Conventions, severity ladder and
lifecycle are defined in [`REVIEW.md`](../REVIEW.md) §6 — in brief:

- **Severity:** `blocker` (invariant/floor broken or done-when unmet — the phase stops) ·
  `must-fix-this-phase` (spec/ADR violation; the phase cannot close with one open) ·
  `backlog` (deliberately waiting; revisited each checkpoint) ·
  `won't-fix` (written reason required; contradicting the spec needs an ADR; user signs off).
- **Lifecycle:** `open` → `fix-written (chunk)` → `closed (re-verified <date>)`.
  **An issue closes only when the check that found it is re-run and passes** — never when a fix
  is merely written.
- **Prioritisation** = read top-down within severity: blockers first, then must-fix-this-phase,
  then backlog.
- Ids `OI-nnn` are sequential and never reused. Keep closed issues in the table (move to the
  Closed section) — they are the memory of what has already gone wrong once.
- **Automatic blockers, not a judgement call:** anything breaking one of the six floor items
  (§19.3) or contradicting a locked ADR is filed `blocker` regardless of how small it looks.

Next id: **OI-010**

## Open

| ID | Found | Summary | Where | Severity | Blocks phase? | Relates to | Status |
|---|---|---|---|---|---|---|---|
| OI-004 | 2026-08-22, vault cross-link | **`G-24` (mobile / small viewport) appears in no chunk of the build plan.** Spec §19.2 rates it Medium and §17.4 requires at minimum the first-line task screen to be usable on a phone — the people who open the platform twice a month | `docs/build-plan.md` | must-fix-this-phase | Phase 5 | [[G-24]], §17.4 | open — needs a Phase 5 chunk |
| OI-005 | 2026-08-22, vault cross-link | Phase 5 claims `G-21` (full-text search) is closed, but no chunk implements it | `docs/build-plan.md` Phase 5 | must-fix-this-phase | Phase 5 | [[G-21]] | open |
| OI-006 | 2026-08-22, vault cross-link | **ADR-005 lists four expiry-review outcomes** (close / acknowledge+extend / convert to accepted risk / do-not-extend→raise remediation); spec §5.14 and chunk P2-13 define three. The ADR is the user-agreed model, so the spec and P2-13 should be widened to match — not the reverse | `docs/functional-spec.md` §5.14, `build-plan.md` P2-13 | must-fix-this-phase | Phase 2 | [[ADR-005-exception-first-class]] | open |
| OI-007 | 2026-08-22, vault cross-link | `BR-ESC-01` still names the "Compliance Officer" escalation rung — a role that does not exist in §4.4. Change H-10 renamed it at §5.27 but the rule text was missed | `docs/functional-spec.md` §6.5 | backlog | no | [[BR-ESC]], change-register H-10 | open |
| OI-008 | 2026-08-22, vault cross-link | Chunk P5-07 (OIDC) cites `G-17` where §21.17 is clearly intended | `docs/build-plan.md` P5-07 | backlog | no | [[G-17]] | open |
| OI-009 | 2026-08-22, vault cross-link | Requirements 1 and 15 have no chunk that makes them demonstrable. Both may be emergent (R1 "one platform", R15 "shaped to a standard") rather than built — but that should be stated, not implied by absence | `docs/build-plan.md` | backlog | no | [[REQ-01]], [[REQ-15]] | open — decide emergent vs chunked |
| OI-001 | 2026-08-22, P0-01 review | Role label rendered twice — the page header reads "Compliance Manager · Compliance Manager" | `apps/web` cockpit header, seen as Anjali Deshmukh at `/` | backlog | no | — | open |
| OI-002 | 2026-08-22, P0-02 | Build plan names `docker/compose.yml`; the file built is `docker/compose.dev.yml` (matching REVIEW.md §3.2, and leaving room for a separate production compose in Phase 5) | `docs/build-plan.md` P0-02 | backlog | no | P0-02 | open — doc drift only |
| OI-003 | 2026-08-22, P0-02 | `apps/web` typecheck has no dedicated `tsBuildInfoFile`. Safe today because the web tsconfig does not set `incremental`, but if that changes the typecheck will silently suppress the next build's emit — exactly the failure hit in `apps/api` | `apps/web/package.json` | backlog | no | P0-02 (api fixed) | open |

## Closed

| ID | Found | Summary | Severity | Closed | Re-verified by |
|---|---|---|---|---|---|
| — | 2026-08-22, vault cross-link | Build plan Status line read v1.1 while P1-19 was marked "new in v1.2" | backlog | 2026-08-22 | Line 9 now reads v1.2; verified by re-reading the file |
