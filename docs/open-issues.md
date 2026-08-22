# Open issues

Conventions, severity ladder and lifecycle: [`REVIEW.md`](../REVIEW.md) §6. In brief —
**severity** `blocker` (the phase stops) · `must-fix-this-phase` · `backlog` · `won't-fix`;
**lifecycle** `open` → `fix-written (chunk)` → `closed (re-verified <date>)`, and an issue closes
only when the check that found it is re-run and passes. Ids are sequential and never reused.
Anything breaking a §19.3 floor item or contradicting a locked ADR is filed `blocker` automatically,
not as a judgement call.

Next id: **OI-013**

## Open

| ID | Found | Summary | Where | Severity | Blocks phase? | Relates to | Status |
|---|---|---|---|---|---|---|---|
| OI-004 | vault cross-link | `G-24` (mobile / small viewport) appears in no chunk. §17.4 wants the first-line task screen usable on a phone — those are the people who open the platform twice a month | `docs/build-plan.md` | must-fix-this-phase | Phase 5 | [[G-24]] | open |
| OI-005 | vault cross-link | Phase 5 claims `G-21` (search) closed, but no chunk implements it | `docs/build-plan.md` | must-fix-this-phase | Phase 5 | [[G-21]] | open |
| OI-006 | vault cross-link | ADR-005 lists four exception expiry outcomes; §5.14 and P2-13 define three. The ADR is the agreed model, so the spec should widen | spec §5.14, P2-13 | must-fix-this-phase | Phase 2 | [[ADR-005-exception-first-class]] | open |
| OI-010 | P0-16 | Segmentation finds 33 of ~40 rules in the PT Rules and 35 of ~52 sections in the Act. The misses are headings whose shape differs again (deleted sections, schedules). Coverage is honest but not complete, and there is no coverage metric surfaced to a reviewer | `packages/domain/src/ingestion/segment.ts` | must-fix-this-phase | Phase 1 | P0-16, [[G-08]] | open |
| OI-011 | P0-16 | Sub-clause refs are unique per section but not globally meaningful: PT Act `6(a)`/`6(b)`/`6(i)` come from a proviso inside sub-section (3), so the ref implies a sibling of `6(1)` when it is a child of `6(3)`. Hierarchy is one level shallower than the statute | `segment.ts`, `SourceClause.parentId` | backlog | no | P0-16 | open |
| OI-012 | P0-11 | Cycle generation is manual. Filing a cycle does not yet schedule the next one, so `WF 5.5` (the recurring cycle) is not satisfied — that is Phase 1 scheduler work | `apps/api/src/chain` | backlog | no | `WF 5.5`, [[G-05]] | open |
| OI-001 | P0-01 review | Prototype cockpit header renders "Compliance Manager · Compliance Manager" | `apps/web` (unrewired page) | backlog | no | — | open |
| OI-002 | P0-02 | Build plan names `docker/compose.yml`; the file is `docker/compose.dev.yml` | `docs/build-plan.md` P0-02 | backlog | no | P0-02 | open |
| OI-003 | P0-02 | `apps/web` typecheck has no dedicated `tsBuildInfoFile`; safe only because its tsconfig omits `incremental` | `apps/web/package.json` | backlog | no | P0-02 | open |

## Closed

| ID | Found | Summary | Severity | Closed | Re-verified by |
|---|---|---|---|---|---|
| OI-007 | P0-03 | `nest-cli deleteOutDir` and tsconfig `incremental` are incompatible: Nest deletes `dist` while tsc believes the outputs exist, so the build emits nothing and `nest start` cannot find `dist/main`. Cost two debugging cycles | must-fix-this-phase | 2026-08-22 | `incremental` removed; `pnpm build` emits `dist/main.js` |
| OI-008 | P0-06 | The sample roster contained nobody holding Compliance Manager OUTSIDE Compliance and Company Secretarial, so the department gate was untestable and its test passed for the wrong reason | must-fix-this-phase | 2026-08-23 | DPO added; `prove:governance` now fails without the gate |
| OI-009 | P0-10 | Signed out, the Source Library said "No instruments ingested yet" — a reader would conclude the register is empty. A dishonest empty state (§17.4) | must-fix-this-phase | 2026-08-23 | Distinguishes "API said empty" from "query has not succeeded"; 401 says so plainly |
