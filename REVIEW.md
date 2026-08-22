# REVIEW — how a chunk becomes "done"

**Status:** v1.0 · 2026-08-22 · Companion files: `docs/open-issues.md` (the register), `docs/test-cases/` (the regression suite) · Governing docs: `docs/build-plan.md` (chunks + "done when"), `docs/functional-spec.md` v2.1, `docs/decisions/ADR-001..011`, `docs/design/dashboard-kpi-design.md`.

**Right now:**
- Finished building a chunk → run **§2**, top to bottom. Nothing ships without it.
- Found something broken you are not fixing in this chunk → **§6** (register it, keep moving).
- About to report → **§8** (the honesty rules and the report template).
- Phase closing → **§7** (regression run).
- New session → skim **§1**, `docs/open-issues.md`, and the build status in `docs/index.md`.

Claude re-reads this file every session. If a command or path in it goes stale, fix it in the same chunk that made it stale.

---

## 1. The working agreement

The user's own words, which this whole document operationalizes:

> For the initial stages I want you to walk with me. Keep the changes **incremental**. **You review them in the desktop** — be the eyes, open the app, step through it, and test that what was built actually works. Then **give me a test use case I can walk through myself** to verify the build is working. **Track the open issues** so we can prioritise what must be fixed immediately versus what can wait. At key phase checkpoints, **run the accumulated test cases** so we can be sure that what has been built still works and new changes have not broken it.

What that means Claude does, always:

1. **Incremental.** One chunk from `docs/build-plan.md` at a time. The app runs at the end of every chunk. No chunk is bundled with another to "save time".
2. **Claude is the eyes.** After building, Claude opens the running app in the browser, steps through the changed flow as the named personas, and watches the console and the network. Reading the code is not reviewing the work.
3. **The user gets a test case.** Every completed chunk ends with a short numbered walkthrough the user performs themselves (§4). Claude's review is the rehearsal; the user's walkthrough is the acceptance.
4. **Issues are tracked, not remembered.** Anything found and not fixed on the spot goes into `docs/open-issues.md` with a severity that says whether it blocks the phase (§6).
5. **Checkpoints re-run everything.** At each phase boundary the accumulated test cases are re-run as a regression suite; the phase is not complete while any earlier case fails (§7).
6. **Reports are honest.** "Verified" means exercised. "Typechecks" is not "works". A number on screen is not done until it is traced to the records behind it (§8).

---

## 2. The review loop — run after every chunk, before saying "done"

Ordered. Do not reorder, do not skip silently (a skipped step is reported as skipped, §8).

1. **Re-read the chunk.** Open `docs/build-plan.md`, find the chunk id, re-read its goal, refs and — above all — its **"done when"**. That sentence is the exit test. Nothing substitutes for it, and nothing beyond it is required to close the chunk (extra findings go to the register).
2. **Static gates.** All green before touching the browser:
   ```bash
   pnpm typecheck        # every workspace
   pnpm build            # tsc -b + vite build (and api build once it exists)
   pnpm check:access     # the access-control checker (becomes the API contract test at P1-03)
   # once they exist (P0-06+): pnpm --filter api test · pnpm lint · chain verify
   ```
3. **Start the stack and drive the flow** (§3). Open `http://localhost:5173`, become the persona the chunk names, and walk the exact flow the chunk changed — clicking, not imagining. Read the page content, check the console after every navigation, watch the `/api/` calls once an API exists.
4. **Prove persistence and refusal.**
   - After every mutation: **reload the page.** The change must still be there. (Meaningful from P0-10 — before the API, state deliberately lives client-side. From P0-10 on, a change that reverts on reload means it never reached the server: the chunk fails.)
   - Then attempt the same flow as a persona who must **not** be able to do it: the affordance must be absent in the UI **and** the direct API call must be refused (4xx) — the client check is an affordance, the server check is the control (ADR-002).
5. **Run the invariant checklist** (§5) — every line marked applicable at the current chunk.
6. **Verify the "done when" literally.** Each clause of it, exercised as written. A clause that cannot be exercised yet is reported as unmet or blocked — never reinterpreted into something passable.
7. **Re-verify any issue this chunk claims to fix.** Re-run the check that originally found it; only then mark it closed in `docs/open-issues.md` (§6).
8. **Write the user test case** (§4) and append it to the current phase's file in `docs/test-cases/`.
9. **Register open findings** (§6), update the build status line in `docs/index.md`, **report** (§8), and stop the stack cleanly if the session is ending (§3.4).

---

## 3. Driving the app

### 3.1 The WSL wrinkle

The repo and both servers live **inside WSL Ubuntu** at `/app/app-oneGRC-platform`. WSL2 forwards localhost, so the browser (Windows side) reaches the dev server at **`http://localhost:5173`** directly.

- Session shell inside WSL (normal case): run commands as written below from the repo root.
- Session shell on Windows: prefix them — `wsl -d Ubuntu -- bash -lc 'cd /app/app-oneGRC-platform && <command>'` — and run servers in the background, never foreground-blocking the session.
- If `localhost:5173` refuses while the server log says it is up: the localhost forward is broken. Get the WSL address with `wsl -d Ubuntu hostname -I` and browse to `http://<that-ip>:5173`. Note it in the report as an environment condition, not an app issue.

### 3.2 Start

```bash
# Web (exists now)
pnpm dev                                   # Vite → http://localhost:5173 — background it

# Database + API (from P0-02)
docker compose -f docker/compose.dev.yml up -d db
pnpm --filter api dev                      # → http://localhost:3000 — background it
curl -s localhost:3000/api/health          # expect {"db":"ok"} BEFORE opening the browser

# Seed (from P0-04)
pnpm seed --profile=demo
```

Preferred: let the browser-preview tool manage the web server via `.claude/launch.json` at the repo root (create it on first need; the tool reuses a running server):

```json
{ "version": "0.0.1", "configurations": [
  { "name": "web", "runtimeExecutable": "pnpm", "runtimeArgs": ["dev"], "port": 5173 }
] }
```

**Port already bound at start** = an orphaned server from an earlier session. Kill it and restart. Never let Vite auto-hop to 5174 — you would spend the review driving a stale build. Check the port Vite actually reports in its startup log.

### 3.3 Step through

- **Navigate to the routes the chunk touched** (see `apps/web/src/App.tsx` for the route table: `/`, `/queue`, `/sources`, `/obligations`, `/controls`, `/risks`, `/issues`, `/incidents`, `/evidence`, `/settings`, …).
- **Read the page as text/accessibility tree**, not only as pixels — it is the reliable way to assert that a state, label or number is actually rendered. Take a screenshot only when the claim is visual: layout overflow, density, colour discipline.
- **Console after every navigation.** The bar is **zero errors**. New warnings are triaged once: fixed now, or registered (§6) — never silently tolerated.
- **Network, once the API exists (P0-07+).** Filter to `/api/`. The chunk's reads return 200 with the expected shape; a mutation returns 2xx **and is followed by a refetch that shows the change**. A UI that updates without a corresponding API call is showing you client state — that is a finding, not a pass.
- **Persona switches are server-verified from P0-09.** A switch must produce `POST /api/dev/impersonate` and a changed `GET /api/whoami` in the network log. Do not trust the chip in the header; trust the wire.
- **Time travel (from P1-07):** `POST /api/dev/clock` to jump, run the reconciler if the chunk involves the scheduler, and put the clock back (or state the offset left behind) before finishing.
- **Editing while the server runs:** Vite hot-reloads, but after non-trivial changes do a hard reload before judging — HMR state can mask a broken cold load.

### 3.4 Stop cleanly

```bash
# Stop background dev servers (or stop via the preview tool if it launched them)
pkill -f vite            # inside WSL, last resort
pkill -f "nest"          # api, once it exists
docker compose -f docker/compose.dev.yml down     # db — WITHOUT -v
```

**Never `down -v` casually.** `-v` destroys `pgdata` — the audit chain and any state the user built while walking test cases. Reset the database only when a chunk requires it, and say so in the report before doing it.

---

## 4. The user-facing test case — required deliverable, every chunk

Every completed chunk ships one walkthrough the **user** performs, appended to the current phase file in `docs/test-cases/` (§7) under a stable id `TC-<chunk>-<nn>`.

**Format rules:**

1. Written for a person, in plain language. No tool names, no curl, no file paths, no jargon.
2. Numbered steps. Each action step says **where** (the route or menu item), **what to do**, and — on an indented `→` line — **what you should see**.
3. Name the persona at the top and at every switch.
4. **At least one negative check**: something that must be refused, absent or hidden for the wrong persona or the wrong state. A walkthrough of happy paths proves a demo, not a system.
5. Include a **reload step** after any mutation (from P0-10): the change must survive it.
6. At most ~10 steps, doable in under 5 minutes, self-contained on a fresh seed.
7. End with: *"Pass: every → line matches what you saw. Fail: tell Claude the step number and what you saw instead."*
8. If a later chunk legitimately changes what a step asserts (an id scheme, a label, a number now derived), **edit the case in that same chunk** with a `superseded by <chunk>` note. A test case that silently stopped being runnable is itself a regression.

**Worked example** (illustrative — the real one is written when P0-10 lands):

> ### TC-P0-10-01 · Save a clause to a control; the wrong department cannot
>
> Persona: **Anjali Deshmukh — Head of Compliance**
>
> 1. Open `http://localhost:5173` and pick **Anjali Deshmukh** in the persona switcher (top right).
> 2. Open **Sources** in the sidebar and click **Employees' Provident Funds and Miscellaneous Provisions Act, 1952**.
> 3. Open any clause marked **Recommended**.
> 4. Click **Save to control** and accept the recommended control.
>    → The clause now reads **Saved**, naming the control and you as reviewer.
> 5. Reload the browser (Ctrl+R).
>    → The clause still reads **Saved**. If it went back to Recommended, the change never reached the server — the build fails this test.
> 6. Switch persona to **Rajesh Iyer — CISO** (IT and Information Security) and open another **Recommended** clause of the same Act.
>    → There is **no Save action** for him — clause decisions on this instrument belong to Compliance. Absent, not greyed out.
> 7. Still as Rajesh, look at the clause Anjali saved in step 4.
>    → It reads **Saved** with *her* name. He can see the decision; he cannot make one.
>
> Pass: every → line matches what you saw. Fail: tell Claude the step number and what you saw instead.

Claude's own review additionally proves the server half of step 6 — a direct API call as Rajesh returns 403 (§5 line 9). The user checks the affordance; Claude checks the enforcement.

---

## 5. The invariant checklist — after every chunk, whatever it touched

Run every line whose **From** has been reached. Lines marked **cmd n** have a copy-pasteable command in the block below the table; the rest are named observations made during §3. A failed line is a **blocker** in the register unless the user rules otherwise.

| # | Invariant | Source | Check | From |
|---|---|---|---|---|
| 1 | Typecheck passes | — | cmd 1 | now |
| 2 | App builds | — | cmd 2 | now |
| 3 | Access-control checker passes | §4.10, BR-AUT-01 | cmd 3 (reborn as the API contract test at P1-03) | now |
| 4 | Zero console errors on the touched routes + Home | §17.6 | Read the console after each navigation (§3.3) | now |
| 5 | No raw hex colour in `src/lib` or `src/pages` | ADR-011, P1-19 | cmd 5 — **baseline today: 27 matching lines in 5 files** (heatmap.ts, regulators.tsx, Dpdp.tsx, Integrations.tsx, Audits.tsx). Must never grow; **must output nothing from P1-19 on** | now |
| 6 | Identifiers ≤ 11 chars, two patterns, no semantic middles | ADR-003, §7.4 | `core/ids` unit suite green (cmd 6); after seeding, the SQL probe (cmd 6b) returns 0 rows per table; no `INST-EPF-…`-style semantic id survives the transform | P0-13 |
| 7 | No derived value stored (§3.4 build-plan list) | BR-DRV-01..18, I-1 | cmd 7 outputs **nothing**; then review by eye: no `tier` on Vendor, no `band` on Kri, no `stage`/`status`/`trend` on Risk, no `severity` on SourceClause, no `department` on anything but Person | P0-03 |
| 8 | Every mutation writes exactly one audit entry, same transaction | BR-AUD-01/02, §17.5, I-4 | Governed-mutation test suite green; chain verify passes (cmd 8); spot probe: perform one mutation in the browser, confirm exactly one new `audit_entry` row for it | P0-06 |
| 9 | Authority enforced server-side; client check is an affordance | ADR-002, BR-AUT-03, I-3 | For each mutation the chunk added/changed: replay it via curl with an unauthorised persona's session → 4xx. And cmd 9 shows no hits in **rewired** pages (repo-wide zero at P1-16) | P0-08 |
| 10 | No full titles in list views; lists render id + shortTitle via `<EntityRef>` | ADR-003, P1-18 | Observation on rewired registers at 1280px (no overflow, no full titles); mechanical DOM test from P1-18 | P0-10 |
| 11 | State never conveyed by colour alone | §17.4, ADR-011 | Read the touched screens as text (§3.3): every state a colour encodes must also be present as a word or glyph in the text tree. If a state exists only as a hue, it fails | now |
| 12 | No fabricated numbers: metrics derive from records, trends from the same function at past instants | ADR-008, BR-DRV-17/18 | For any number the chunk renders: trace it (§8.3). cmd 12: no rewired page imports the prototype's `trends.ts`; no literal trend strings (`+0.3 QoQ` style) in rewired code | P1-14 |
| 13 | All time flows through ClockService | BR-SCH-09, build-plan §4 | cmd 13 — only `core/clock` may hit (the P1-07 lint rule makes this CI-mechanical) | P0-06 |
| 14 | Seed remains idempotent and honest | build-plan §4 | Re-run seed → same counts; verify matches Appendix A volumes (cmd 14) | P0-04 |

```bash
# cmd 1
pnpm typecheck
# cmd 2
pnpm build
# cmd 3
pnpm check:access
# cmd 5  — 27 matching lines today; must never grow; empty from P1-19
grep -rE '#[0-9a-fA-F]{6}' apps/web/src/lib apps/web/src/pages
# cmd 6  — the core/ids unit suite (part of the api test run)
pnpm --filter api test
# cmd 6b — per user-facing table, creds/service per docker/compose.dev.yml; expect 0 rows
docker compose -f docker/compose.dev.yml exec db psql -U postgres -d onegrc \
  -c 'SELECT id FROM "SourceClause" WHERE length(id) > 11;'
# cmd 7  — hard-banned column names; must output nothing
grep -inE 'overdue|age_?days|net_?loss|current_?value|last_?tested|evidence_?count' apps/api/prisma/schema.prisma
# cmd 8
pnpm tsx scripts/verify-audit-chain.ts
# cmd 9  — client-side role comparisons; no hits in rewired pages
grep -rn 'role ===' apps/web/src/pages
# cmd 12 — prototype trend fabrication must have no importers in rewired code
grep -rln "lib/trends" apps/web/src
grep -rn "QoQ" apps/web/src/pages
# cmd 13 — bare clocks outside core/clock
grep -rnE 'Date\.now\(\)|new Date\(\)' apps/api/src packages/domain
# cmd 14
pnpm seed --profile=demo && pnpm seed --verify
```

Not yet mechanically checkable (honest gaps — observation only until their chunk lands): line 10 until the P1-18 DOM test, line 11 until the P5-11 axe/greyscale pass, and the "exactly one audit entry" claim for *bulk* operations until P3-08 adds its per-item assertion.

---

## 6. The issue register — `docs/open-issues.md`

Everything found and not fixed inside the current chunk goes in the register, at the moment it is found. Memory is not a tracking system.

**Each issue records:** id (`OI-nnn`, sequential, never reused) · date found · one-line summary · where (route/file/chunk under review) · severity · whether it blocks the current phase · what it relates to (chunk id, ADR, `BR-*` rule, or TC id) · status.

**The severity ladder:**

| Severity | Meaning | Consequence |
|---|---|---|
| **blocker** | Wrong data shown or stored, an invariant (§5) broken, one of the six §19.3 floor items compromised (persistence, auth, server-side authorization, scheduler, evidence storage, audit immutability), or a chunk's done-when unmet | The phase stops. Fix before starting the next chunk. |
| **must-fix-this-phase** | Violates the spec or an ADR without corrupting data — a missing refusal message, a label that lies, a flow that dead-ends | Fix before the phase checkpoint; the phase cannot close with one open. |
| **backlog** | Polish, deferred scope, a nice-to-have — deliberately waiting | Scheduled to a phase, revisited at every checkpoint. Not forgotten, not gating. |
| **won't-fix** | A deliberate divergence | Requires a written reason in the register — and a new ADR if it contradicts the spec. The user signs off. |

**Lifecycle:** `open` → `fix-written (chunk)` → `closed (re-verified <date>)`. **An issue closes only when the check that found it has been re-run and passes** — never when a fix is merely written. If the finder was a browser observation, the closure is the same observation repeated; if a command, the command. `won't-fix` closes only with the user's assent.

Prioritisation at any moment = read the register top-down: blockers, then must-fix-this-phase, then everything else. That ordering is the answer to "what must be fixed immediately versus what can wait".

---

## 7. Phase checkpoints and regression

### 7.1 Where test cases live

`docs/test-cases/`, **one file per phase**: `phase-0.md`, `phase-1.md`, … Each file holds that phase's TCs (format §4) plus a run log at the top.

Why one file per phase, not one growing file: the re-run unit **is** the phase — "run the regression" means "walk the files in order"; each file stays at a length walkable in one sitting (Phase 1 alone will hold ~19 cases; a single file would grow to hundreds of steps and stop being runnable); and a closed phase's file becomes effectively frozen, so any later edit to it is visible and must carry its `superseded by <chunk>` justification (§4.8). It also mirrors the build plan's own per-phase demo scripts.

### 7.2 The checkpoint procedure

Triggered by each phase's closing chunk (P0-12, then the phase's exit-checklist moment: end of P1-19, P2-12/P2-14, P3-09/P3-10, P4-06, P5-11):

1. Claude re-runs **every TC in every phase file, oldest phase first**, in the browser, as the named personas (§3). No sampling.
2. Each file's run log gets a row: date, trigger (which checkpoint), per-TC pass/fail.
3. **Any failing TC from an earlier phase is a regression** → register it as a **blocker** naming the TC and the chunk that likely broke it.
4. **The phase is not complete while any TC in any file fails**, or any blocker / must-fix-this-phase issue is open — unless the user waives it in writing (which becomes a `won't-fix` entry or a re-scheduled issue).
5. The user then walks, at minimum, the current phase's new TCs plus any TC that regressed and was re-fixed. Claude's run is the rehearsal; the user's run is the acceptance. Both are recorded in the run log.

### 7.3 Manual first, automated later — deliberately

For Phases 0–2 the walkthroughs are intentionally manual: the user is learning the system by driving it, and the TCs double as the shared vocabulary for what the platform does. Automation replaces **breadth**, not the walk:

- authority matrix walkthroughs → the P1-03 API contract test (every action × role × maker) — the TC keeps one worked example, the matrix moves to the test;
- audit-chain and seed verification → CI at P1-17 (`verify-audit-chain`, `seed --verify`);
- derived-value honesty → the seed transformer's derivation-parity asserts (P0-04, P1-02);
- shortTitle / no-full-titles-in-lists → the P1-18 DOM test;
- colour and accessibility observations → the P5-11 axe pass.

When a check is automated, its TC is **not deleted** — it is annotated `automated: <test name>` and drops out of the manual re-run while remaining the human-readable record of what the test covers.

---

## 8. Reporting honestly

### 8.1 The vocabulary ladder

**typechecks** < **builds** < **runs** (server up, page renders) < **works**. "Works" is reserved for a flow actually exercised in the browser: action performed → 2xx on the wire → reload persists → the refusal case refused. Only "works" closes a chunk, and only for the flows actually driven. One verified flow says nothing about its siblings — never extrapolate.

### 8.2 The rules

1. **Never claim something works without having exercised it.** If the browser wasn't opened, the honest verb is "builds".
2. **State verified vs assumed, explicitly and separately.** "Verified: saved a clause as Anjali, reloaded, persisted; refused as Rajesh via curl (403). Assumed: the other 66 clauses behave like this one."
3. **A skipped check is declared**: `SKIPPED: <check> — <why>`. If it gates the chunk, it goes in the register; a silent skip is a false report.
4. **Distinguish present state from intended state.** Never "this will work once X lands" as if it were done — report what is true now.
5. **Do not mark the chunk complete** in `docs/index.md` (or a `feat(<chunk-id>): …` commit) until §2 has run to the end.

### 8.3 The fabricated-number rule — this project's own scar, twice

This codebase has already shipped numbers that were nothing: the cockpit headline `enterpriseRisk: 7.8` was a hard-coded constant with a `trendLabel="+0.3 QoQ"` string literal beside it, and all three cockpit trend charts were drawn from a seeded RNG in `trends.ts` — discovered in the ADR-008 audit after surviving multiple reviews **because they looked right**. Plausible is the failure mode, not the defence.

Therefore, **any number or chart a chunk renders is unverified until traced**:

1. **Trace the code path** from the rendered figure to the stored records (or the derivation function over them). A constant, a literal, or an RNG anywhere on that path fails the chunk.
2. **Move it.** Change an underlying record and watch the figure change (time-travel counts). If it cannot move yet, say exactly why and what will make it move — and it is not "done".
3. **Drill equals headline.** Click through: the filtered register the number lands on must contain exactly the counted set (dashboard-kpi-design §4.2).
4. A metric whose inputs don't exist yet renders **"no data — [reason]"** or an explicit *simulated* label — never a plausible placeholder value (§17.4 v2.1).
5. A trend point is the tile's own function evaluated at a past instant from dated records (`BR-DRV-18`); if you cannot name the records behind a point, the chart is fabricated.

### 8.4 The end-of-chunk report template

```
## <chunk-id> review — <date>
Status: done | done-with-issues | not done (blocked on …)

Done-when, literally:
- "<clause 1 of the chunk's done-when>" — ✓/✗ — how it was exercised
- "<clause 2>" — ✓/✗ — …

Verified: routes driven, personas used, mutations performed (with reloads),
          refusals attempted, invariant lines run (§5: 1,2,3,4,5,11 …)
Not verified / assumed: …, because …
Skipped: … — why
Issues: raised OI-nnn (severity), closed OI-mmm (re-verified how)
Your test case: TC-<chunk>-<nn> → docs/test-cases/phase-<n>.md
Stack state: left running on :5173 / stopped clean / db reset (told you above)
```

---

*End. The chunk's "done when" is the atom; this document is how it is honoured.*
