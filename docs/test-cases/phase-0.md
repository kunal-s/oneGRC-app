# Test cases — Phase 0 · Ingestion and the proof chain

One walkthrough per completed chunk, written for a person to perform. Format and rules:
[`REVIEW.md`](../../REVIEW.md) §4 · Checkpoint procedure: `REVIEW.md` §7 — at the phase checkpoint
every case below is re-run and the run logged here.

Ids: `TC-P0-<chunk>-<nn>`.

## Run log

| Date | Trigger | Runner | Result |
|---|---|---|---|
| 2026-08-22 | P0-02 complete | Claude | TC-P0-02-01 pass |
| 2026-08-23 | Phase 0 complete | Claude | TC-P0-02-01, TC-P0-16-01, TC-P0-11-01, TC-P0-06-01 all pass |

## Start everything

```bash
cd /app/app-oneGRC-platform
pnpm db:up                       # Postgres
pnpm --filter api bootstrap -- --sample   # reference data + 9 sample people
pnpm dev:api                     # API on :3000  (leave running)
pnpm dev                         # web on :5173  (leave running, separate terminal)
```

Then open `http://localhost:5173/sources` and pick **Anjali · Head of Compliance** in the dev
identity bar at the bottom of the screen.

---
## Cases
### TC-P0-01-01 · The scaffold did not break the prototype

1. In WSL: `cd /app/app-oneGRC-platform && pnpm dev`
2. Open `http://localhost:5173` → the OneGRC cockpit loads, landed as
   **Anjali Deshmukh · Head of Compliance**.
3. Click **Risk Register** in the sidebar → a dense table of risks loads.
4. Switch persona (top right) to another person → the cockpit content changes.
5. **Negative:** open DevTools console → **no red errors**.

*Fails if:* the app does not load, the sidebar is empty, or the console shows errors.

---
### TC-P0-02-01 · The API is really talking to the database

Proves persistence groundwork (`G-01`) is genuine rather than mocked. Takes about two minutes.

**Setup** — in WSL, from `/app/app-oneGRC-platform`:

```bash
pnpm db:up                     # starts Postgres in Docker
docker ps                      # onegrc-db should read "(healthy)"
pnpm dev:api                   # starts the API on :3000 — leave it running
```

**Steps**

1. In a second terminal: `curl -s localhost:3000/api/health`
   → expect `{"status":"ok","db":"ok","dbVersion":"16.15","at":"..."}`
2. Confirm `dbVersion` shows a **real Postgres version** (16.x), not `unknown` and not absent.
   This is the field that proves the number came from the database rather than a constant.
3. Run the same curl again → the `at` timestamp **changes**. The endpoint is not cached.
4. **Negative — the health check must be able to fail.** Stop the database:
   `pnpm db:down`
   Then: `curl -s localhost:3000/api/health`
   → expect `{"status":"degraded","db":"down","at":"..."}` — and **no** `dbVersion`.
   A health endpoint that still says `ok` here is worthless.
5. Bring it back: `pnpm db:up`, wait for `(healthy)` in `docker ps`, then curl again
   → back to `{"status":"ok","db":"ok","dbVersion":"16.15"}` without restarting the API.
6. **Negative — data must actually persist.** With the database up:
   ```bash
   docker compose --env-file .env -f docker/compose.dev.yml exec db \
     psql -U onegrc -d onegrc -c "CREATE TABLE probe(id int); INSERT INTO probe VALUES (42);"
   pnpm db:down && pnpm db:up          # full stop and start
   docker compose --env-file .env -f docker/compose.dev.yml exec db \
     psql -U onegrc -d onegrc -c "SELECT * FROM probe;"
   ```
   → the row `42` is still there, proving the named volume survives a container restart.
   Clean up: `... -c "DROP TABLE probe;"`

*Fails if:* health reports `ok` while the database is stopped; `dbVersion` reads `unknown`;
the `at` timestamp is identical across calls; or the probe row is gone after a restart.

### TC-P0-16-01 · Real law is ingested, with honest confidence and review flags

1. Go to **`/sources`**. Four instruments are listed — the Maharashtra Profession Tax **Act** and
   **Rules**, the **PFRDA Act**, and a **PFRDA circular** — with real page and clause counts.
2. The Rules row is marked **OCR scan**. That is the one document we downloaded rather than were
   given, and it is a scan, so its extraction is less reliable. Nothing else is coloured — type and
   authority are plain text on purpose.
3. Click **INST-001**. The Provenance panel shows how it was obtained, its SHA-256, and links to
   both the official source and the stored PDF. Under *Related instruments* the **Rules** appear,
   because they are made under this Act.
4. Click **open the PDF** — the actual document opens.
5. In the clause table find ref **6** and its sub-clauses **6(1)** to **6(4)**. Each shows the page
   it was extracted from, and a review count.
6. **Negative:** search the table for a clause titled after a bank branch. There is none. Rule 2 of
   the *Rules* lists nine State Bank of India branches as "1." to "9."; a naive parser reads those
   as nine clauses. Ours does not.

*Fails if:* fewer than four instruments; the Rules are not marked as a scan; the Act–Rules relation
is missing; page numbers are blank; or any clause is named after a bank branch.

---

### TC-P0-11-01 · The proof chain, from a law to verified evidence

This is the spike. It takes about five minutes.

1. Open **`/sources/clause/SRC-00042`** — Profession Tax Act **section 6(1)**, the duty to file a
   return.
2. Read the **Verbatim extract**. It is the statute, unedited. Click **open the source at page 15**
   and confirm the PDF opens at that clause.
3. Read **Needs review (5)**. Each flag names the phrase that triggered it. The important one is
   **Cadence Unspecified** — the Act says the return is due *"as may be prescribed"* and never says
   when. That is a real gap in the law, found without any AI.
4. Read **Assessment**. It says *duty*, clarity **0.35**, and explicitly declines to write a
   plain-language summary. A wrong summary of a legal duty is worse than none.
5. Look at the **Proof chain** strip. It runs:
   `SRC-00042 → CTRL-0003 → OBL-0001 → OBL-0001.2026M08 → TSK-00001 → EVD-00001`,
   ending in **Verified**.
6. Click **OBL-0001**. The cycle is **Filed**, due 31 Aug 2026, with the task and the treasury
   challan beneath it. Note the frequency is **Monthly** — that came from **Rule 11**, which is what
   the Cadence Unspecified flag sent us to find. The chain closes the loop the flag opened.
7. Follow *"Why this duty exists"* back to the clause. Both directions work.

*Fails if:* the chain is broken at any link; the PDF does not open at the clause; the cycle is not
Filed; or the evidence is not Verified.

---

### TC-P0-06-01 · The governance rules actually refuse things

Four refusals, each for a different reason. This is the case worth running slowly, because a system
that only demonstrates happy paths proves nothing.

**A. The department gate.** In the identity bar switch to **Priya · DPO**. She holds the *same
Compliance Manager role* as Anjali. Open **`/sources/clause/SRC-00044`**. The Decision panel is
replaced by an explanation that the decision is reserved to Compliance and Company Secretarial.
Then run, in a terminal:

```bash
curl -s -X POST localhost:3000/api/clauses/SRC-00044/save-to-control \
  -H 'Content-Type: application/json' -d '{"newControlTitle":"x"}' \
  -b /tmp/dpo.jar
```

It returns **403**. The hidden button was a hint; the server is the control.

**B. Evidence required by the statute.** Section 6(2) says a return without proof of payment *"shall
not be deemed to have been duly filed"*. Create a duty and try to submit it with nothing attached —
the API refuses with *"the statute requires proof of payment"*. The platform is enforcing what the
law already says, not a product rule laid on top.

**C. Separation of duties.** Have one person attach evidence and submit, then try to verify their
own work while holding a role that permits verification. Refused: *"you submitted this, so you
cannot approve it."*

**D. Nothing refused is ever recorded as done.**

```bash
pnpm --filter api verify:audit
```

Reports **INTACT**. Every successful action wrote exactly one entry; every refusal wrote none.

*Fails if:* any refusal succeeds, or the audit chain is not intact.

---

### TC-P0-06-02 · The audit trail detects tampering

1. `pnpm --filter api verify:audit` → **INTACT**.
2. Edit a row directly in the database, behind the platform:
   ```bash
   docker compose --env-file .env -f docker/compose.dev.yml exec -T db \
     psql -U onegrc -d onegrc -c "UPDATE \"AuditEntry\" SET action='tampered' WHERE seq=1;"
   ```
3. `pnpm --filter api verify:audit` → **BROKEN**, naming the row: *content does not hash to its
   recorded value*.
4. Set it back and it reads INTACT again. Deleting a row instead produces **two** signals — a
   sequence gap and a broken hash link.

*Fails if:* the chain reports intact after an edit or a deletion.

---

### TC-P0-18-01 · Sample data is visible and removable

1. `pnpm --filter api bootstrap` (no flag) on a clean database loads **reference data only** —
   nine roles and the authority matrix, and **zero** sample records.
2. With `--sample`, nine sample people load. They are Person records with **no credentials**:
   authentication federates to the customer IdP, so nobody can sign in as one.
3. `pnpm --filter api bootstrap -- --purge` removes them in one action.
4. **Negative:** assign a real obligation to a sample person, then purge. It **refuses** and names
   the blocking record rather than deleting and orphaning the provenance.

*Fails if:* sample data loads in production mode, or purge silently cascades.

---

### TC-P0-20-01 · Only qualified clauses become SRC records

The defect this fixes: every extracted unit used to become a tracked clause, so
`SRC-00181` was the Definitions rule and `SRC-00206` was "Amendment of certificate".

1. Open **`/sources/INST-001`**. The triage panel reads **178 provisions extracted** with
   *Needs your decision*, *Not ours*, *Already tracked* and *Blocked by review*, then a breakdown:
   Duty 59, Machinery 42, Unclassified 23, Power Procedure 21, Definition 12, Consequence 10,
   Applicability 7, Housekeeping 4.
2. You are shown **duties**, not 178 rows. Definitions and machinery are counted but not queued.
3. **Negative — a definition can never be tracked.** Open the Rules (`/sources/INST-002`) and find
   rule 2, *Definitions*. It is classified **Definition** at 0.95 and has **no** promote action.
   Confirm none exist anywhere:
   ```bash
   curl -s -b /tmp/anj.jar 'localhost:3000/api/provisions?classification=Definition' \
     | grep -c '"promotedAs":null'
   ```
   Every definition returns `promotedAs: null`.
4. **Negative — a duty that is not ours is not promoted.** Open PFRDA Act `s.14`
   (*Duties, powers and functions of Authority*). It is classified **Duty**, but **binds us: no**,
   bearer *"the Authority"*. The PFRDA Act has 57 duty provisions and only **11** bind this firm.

*Fails if:* a definition carries an SRC id, or a provision bearing on the Authority is promotable.

---

### TC-P0-20-02 · A blocking review item prevents tracking

1. Open PT Act **s.6 Returns** in triage. It shows **2 blocking**.
2. Its review items include **Cadence Unspecified** — the Act says the return is due
   *"as may be prescribed"* and never says when.
3. **Negative:** try to promote it. Refused:
   *"cannot track this yet - resolve first: CadenceUnspecified, UnresolvedCrossReference."*
   You cannot schedule a duty you cannot date.
4. Resolve the cadence flag by naming the provision that answers it — **PT Rules r.11**, which makes
   the return monthly above the liability threshold. Enter a note; it is required.
5. Promote. It becomes **`SRC-00001`**, and the SRC number is issued *at this moment* — never before.

*Fails if:* promotion succeeds with a blocking item open, or a flag clears without a note.

---

### TC-P0-20-03 · Three duties, three complete chains

Each exercises a different shape of duty. All three end in verified evidence.

| Clause | Duty | Cadence | Evidence |
|---|---|---|---|
| `SRC-00001` PT Act s.6 | File the PT return | **Monthly** (from Rules r.11) | Treasury challan |
| `SRC-00002` PT Act s.5 | Maintain registration | **Annual** | Certificate Form I |
| `SRC-00003` PT Act s.16 | Maintain accounts | **Quarterly** | Register of salaries |

1. Open **`/sources/clause/SRC-00001`**. The Proof chain strip runs
   `SRC-00001 → CTRL-0001 → OBL-0001 → OBL-0001.2026M08 (Filed) → TSK-00001 (Done) → EVD-00001 (Verified)`.
2. Click through each node. Every link works in both directions.
3. Repeat for `SRC-00002` and `SRC-00003`.
4. **Negative — evidence is required by the statute.** PT Act s.6(2) says a return without proof of
   payment *"shall not be deemed to have been duly filed"*. Submitting a task with nothing attached
   is refused.
5. **Negative — separation of duties.** Deepa attaches the evidence and submits; she cannot verify
   her own work. Anjali verifies, and the cycle files.
6. `pnpm --filter api verify:audit` reports **INTACT**.

*Fails if:* any chain is broken, a cycle is not Filed, evidence is not Verified, or the audit chain
is not intact.
