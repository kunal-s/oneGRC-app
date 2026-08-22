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

Next id: **OI-004**

## Open

| ID | Found | Summary | Where | Severity | Blocks phase? | Relates to | Status |
|---|---|---|---|---|---|---|---|
| OI-001 | 2026-08-22, P0-01 review | Role label rendered twice — the page header reads "Compliance Manager · Compliance Manager" | `apps/web` cockpit header, seen as Anjali Deshmukh at `/` | backlog | no | — | open |
| OI-002 | 2026-08-22, P0-02 | Build plan names `docker/compose.yml`; the file built is `docker/compose.dev.yml` (matching REVIEW.md §3.2 and leaving room for a separate production compose in Phase 5) | `docs/build-plan.md` P0-02 | backlog | no | P0-02, REVIEW.md §3.2 | open — doc drift only, fix when build-plan is next edited |
| OI-003 | 2026-08-22, P0-02 | `apps/web` typecheck (`tsc --noEmit`) has no dedicated `tsBuildInfoFile`. It is safe today because the web tsconfig does not set `incremental`, but if that changes the typecheck will silently suppress the next build's emit — exactly the failure hit in `apps/api` this chunk | `apps/web/package.json` | backlog | no | P0-02 (api fixed) | open |

## Closed

| ID | Found | Summary | Severity | Closed | Re-verified by |
|---|---|---|---|---|---|
