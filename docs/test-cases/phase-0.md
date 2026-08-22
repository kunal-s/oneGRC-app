# Test cases — Phase 0 · Proof-chain spike

One walkthrough per completed chunk, written for a person to perform, appended when the chunk
passes review. Format and rules: [`REVIEW.md`](../../REVIEW.md) §4 · Checkpoint procedure:
`REVIEW.md` §7 — at P0-12 (and at every later phase's checkpoint) every case below is re-run,
and the run is logged here. A case a later chunk legitimately invalidates is edited in that
same chunk with a `superseded by <chunk>` note, never silently deleted.

Ids: `TC-P0-<chunk>-<nn>`.

## Run log

| Date | Trigger | Runner | Result |
|---|---|---|---|
| 2026-08-22 | P0-02 complete | Claude | TC-P0-02-01 pass (all 6 steps, both negative checks) |

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
