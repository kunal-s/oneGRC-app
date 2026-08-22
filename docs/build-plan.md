---
type: plan
status: governing
tags: [plan]
---

# OneGRC — Prototype to Production Build Plan

**Status:** v1.2 · Governing spec: `onegrc-functional-product-spec.md` (**v2.1** — the demo-to-production audit; see `onegrc-spec-change-register.md`) · Board/committee surfaces and metrics: `onegrc-dashboard-kpi-design.md` (governing per spec §10.1) · Prototype baseline: the React app in `%TEMP%\onegrc-clone` as described in spec Appendix B (demo reference).

**Locked decisions this plan builds on (not re-litigated):** on-prem, Docker Compose over PostgreSQL, single-tenant per deployment (multi-tenancy G-25 deferred but not designed out); authorization seam now, real OIDC/SAML federation later; monorepo (pnpm workspaces); frontend stays Vite + React + React Router, rewired to an API; backend NestJS (Fastify) + Prisma + PostgreSQL; Phase 0 is a technical spike on the Compliance proof chain (Source clause → Control → Obligation → Task → Evidence, Risk as consequence).

**v1.1 spec-alignment deltas (spec v2.1):** identifiers per the new §7.4 scheme (two patterns, ≤11 chars, no semantic middles, `title`+`shortTitle`+`citation`) — I-6 and P0-13/P1-18; **Exception is first-class** (subject control/obligation, optional issueId, union remediation register, expiry review, escalating renewal authority `BR-AUT-11`/`BR-LFC-13`) — §3.2 and P2-13; **Task is one engine** with `completionPolicy` (spec §7.3) — §3.2, resolves the old §8(c) default; `Overdue` is never a stored state anywhere (`BR-DRV-17`); trends are never synthesized (`BR-DRV-18`) and the cockpit is built to the dashboard design doc — P2-14; risk state `Exception expired` is now `Acceptance lapsed`. Chunk ids are stable; new work is appended (P0-13, P1-18, P2-13, P2-14, P3-10), nothing renumbered.

---

## 1. Target architecture

### 1.1 Monorepo layout

```
onegrc/
├── package.json                  # pnpm workspaces root; scripts: dev, build, test, lint, db:*
├── pnpm-workspace.yaml
├── docker/
│   ├── compose.yml               # base: db
│   ├── compose.dev.yml           # dev: db only (api + web run via pnpm)
│   ├── compose.prod.yml          # prod: db + api + web(nginx) + volumes
│   ├── api.Dockerfile
│   ├── web.Dockerfile            # multi-stage: vite build → nginx, /api proxied to api
│   └── init/                     # Postgres init SQL: roles, audit-log grants + block trigger
├── apps/
│   ├── web/                      # the EXISTING Vite app, moved here intact, then rewired
│   │   └── src/{pages,components,lib,store,api}   # api/ = typed client + TanStack Query hooks
│   └── api/                      # NestJS (Fastify adapter)
│       ├── prisma/               # schema.prisma + migrations
│       └── src/
│           ├── core/             # the cross-cutting engines (see 1.2)
│           │   ├── identity/     # session, dev impersonation, later OIDC adapter
│           │   ├── authority/    # the ONE authority check (§4.10 matrix + SoD + case access)
│           │   ├── governed/     # GovernedMutation runner: authority + tx + audit, one path
│           │   ├── audit/        # append-only hash-chained log (read API; writes only via governed/)
│           │   ├── clock/        # ClockService: real | frozen | offset (time-travel)
│           │   ├── scheduler/    # THE reminder/escalation engine (5.27) — reconciler worker
│           │   ├── notifications/
│           │   ├── evidence/     # THE evidence vault: metadata + ArtifactStore (fs volume now)
│           │   ├── issues/       # THE remediation register: Issues + first-class Exceptions, one union view (5.14/5.22 v2.1)
│           │   ├── loss/         # THE loss engine (5.11)
│           │   ├── ids/          # §7.4 identifier allocation (per-prefix sequences, never reused)
│           │   └── access/       # department scope + confidentiality/recusal read filters
│           ├── modules/          # one feature module per spec concern
│           │   ├── sources/  controls/  monitoring/  obligations/  policies/
│           │   ├── risks/  indicators/  incidents/  regchange/
│           │   ├── campaigns/  vendors/  audits/  investigations/  datagov/
│           │   ├── packs/  metrics/  queue/  proofchain/  admin-config/  connectors/
│           │   └── intelligence/ # the §13.3 seam: provider token, deterministic impl first
│           └── seed/             # world loader (imports packages/seed-world, writes via Prisma)
├── packages/
│   ├── contracts/                # zod schemas + TS types for every endpoint; shared FE/BE
│   ├── domain/                   # PURE functions, no I/O: all BR-DRV derivations, ladder math,
│   │                             #   recurrence, state machines, §4.10 matrix as data
│   ├── seed-world/               # the prototype's deterministic generators (src/data), extracted
│   │                             #   and parameterized by anchor timestamp
│   └── intelligence/             # IntelligenceProvider interface + deterministic implementation
└── scripts/                      # backup/restore, audit-chain verify, install runbook assets
```

Why this shape:

- **`packages/domain` is the anti-drift move.** Every derived value (`BR-DRV-01..16`), the ladder math, recurrence, and the legal state transitions live as pure functions used by *both* the API (authoritatively) and the web app (for optimistic display). One implementation, per "one engine per concern" — and it is largely a port of the prototype's already-extracted `src/lib` (`kriBand`, `netLoss`, `exceptionState`, `deriveRiskStage`, `recurrence`, `reminders`, `proofChain` resolution logic). Access decisions, queue assembly and authority are **server-only** (`apps/api/src/core`) — the client never gets to be the enforcement point (G-03).
- **The Zustand store (~103KB, ~90 mutation actions) is the behaviour catalogue.** Each store action (`saveClauseToControl`, `approveObligation`, `fileIncidentTrack`, `closeFraudCase`, …) becomes a governed API endpoint. The store shrinks to UI-only state (persona, toasts, drawers, command palette); server state moves to TanStack Query.

### 1.2 One engine per concern → NestJS module boundaries

The spec's rule (§2) maps to a hard import rule enforced by ESLint boundaries:

| Concern | The one engine | Everyone else does |
|---|---|---|
| Chasing | `core/scheduler` (the 7/3/1 ladder, 5.27) | registers a `Deadline` (type, id, date, owner, warning window) — nothing more |
| Remediation | `core/issues` — Issues and first-class Exceptions behind one union register (5.22 + 5.14 v2.1) | calls `issues.raise({source, sourceRef, …})` for weaknesses; `issues.raiseException({subjectRef, issueId?, …})` for deviations; reads the union view, never a private list |
| Loss | `core/loss` (5.11, Basel categories, net derived) | books gross/recovery; never computes net |
| Evidence | `core/evidence` (vault + ArtifactStore) | links to evidence ids; never stores payloads |
| Audit trail | `core/audit`, written only by `core/governed` | nothing writes audit rows directly |
| Authority | `core/authority` | no module compares roles (`BR-AUT-01`) |
| Proof chain | `modules/proofchain` (one resolver endpoint) | one shared FE component renders it (`BR-LNK-03`) |

### 1.3 Where the central authority check lives

Two layers, both driven by **one declarative table** (`packages/domain/authority.ts`, the §4.10 matrix encoded as data: action → permitted roles | department gate | SoD flag):

1. **`GovernedGuard`** (NestJS guard) + `@Governed('obligation.approve')` decorator on every mutating handler. It resolves the `ActorContext` (person, roles, department, line-of-defence) from the session and refuses on the coarse matrix — role and department gates, including the clause-authority-by-department rule (`BR-AUT-02`). Refusal is a 403, not a hidden button (`BR-AUT-03`).
2. **`GovernedMutation.run(ctx, action, recordRef, fn)`** — the single execution path for every mutation. The guard cannot check SoD or case access because those need the record; the runner loads it and enforces: maker ≠ checker (`BR-AUT-05/06`), nominated-checker (`BR-AUT-04`), state-machine legality (`BR-LFC-01` via `packages/domain` transition tables), case access + computed recusal (`BR-SCP-05..07`), then opens **one Prisma transaction** in which the domain change and its audit entry commit or fail together.

A NestJS **interceptor is the backstop, not the mechanism**: it rejects any response from a POST/PUT/PATCH/DELETE handler that did not pass through the runner (the runner stamps the request context). This makes "someone added a mutation that skips the audit log" a runtime error in dev and CI, not a silent hole.

The client never re-implements the matrix: detail endpoints return a `capabilities` array (`["obligation.approve", …]`) computed by the same authority code, and the UI shows/hides affordances from that — presentation only, enforcement stays server-side.

### 1.4 Where the audit trail is enforced (§17.5)

- `audit_entry` table: `seq` (bigserial), `at`, `actor`, `action`, `entity_refs` (jsonb), `before`/`after` (jsonb, omitted for confidential modules per `BR-AUD-05`), `prev_hash`, `hash = sha256(prev_hash ‖ canonical(row))`. Hash-chained = tamper-evident (G-15).
- **Same-transaction rule:** the runner writes the entry inside the same transaction as the mutation. A change that is not logged cannot commit.
- **Postgres-level immutability:** the application's DB role has `INSERT, SELECT` only on `audit_entry`; a trigger raises on UPDATE/DELETE for every role. Retention floor (`BR-DAT-05`) enforced in the config engine — it refuses any retention change below the floor. `scripts/verify-audit-chain.ts` re-walks the chain; run it in CI and in the backup job.
- System-originated events (fired rungs, monitoring runs, agent runs) log with actor `system` (`BR-AUD-03`) through the same writer.

### 1.5 Where the AI seam sits (§13.3)

`packages/intelligence` defines `IntelligenceProvider`: `extractInstrument`, `recommendControlsForClause`, `answerScoped`, `draftPackNarrative`, `runAgent(kind, input)`. The NestJS `intelligence` module binds a provider token from config: `deterministic` (a port of the prototype's scripted extractor, recommendations and agent runs — same inputs, same outputs) now; an `anthropic` provider later, behind the identical contract. Agent runs persist as `agent_run` + `agent_proposal` rows; **a run never mutates** (`BR-AI-01`); approving a proposal invokes the *existing* governed action with the run id stamped into the audit entry (`BR-AI-02`, `BR-AUD-06`). Extracted figures carry `verified: false` until a person confirms; an unverified clause cannot be saved (`BR-AI-03`).

### 1.6 Docker Compose shape for on-prem hand-off

- **Services (prod):** `db` (postgres:16, volume `pgdata`), `api` (Node dist; entrypoint runs `prisma migrate deploy` then boots; in-process scheduler worker enabled by `WORKER=1` — one container, no Redis, no queue broker; pg-boss over Postgres only if a real job queue is ever needed), `web` (nginx serving the built SPA, proxying `/api` → api). Volumes: `pgdata`, `evidence` (content-addressed artifact files). No managed services anywhere.
- **Per-client repeatability:** everything environment-specific in one `.env` (org name, timezone, base URL, SMTP, OIDC issuer, retention floors). `docker save`-produced image tarballs + `install.md` for air-gapped installs. `scripts/backup.sh` = `pg_dump` + evidence volume tar + current audit head hash (the head hash printed and stored outside the box is the cheap external anchor for tamper-evidence).
- **Multi-tenancy not designed out (G-25):** every table carries `org_id` → `organization` (one row today). A Prisma client extension scopes every query by `org_id` from day one, so tenancy later is a data + auth change, not a schema rewrite.

### 1.7 Identity: seam now, OIDC later (G-02)

`core/identity` exposes `IdentityProvider`. Dev implementation: `POST /api/dev/impersonate {personId}` (enabled only when `AUTH_MODE=dev`) sets a signed, server-side session (Postgres-backed) whose `ActorContext` is the impersonated person — so **the server's identity context changes, exactly as the brief requires**, and the persona switcher in the web app calls this endpoint instead of flipping a Zustand field. Production implementation: `openid-client` OIDC code flow against the client's IdP, mapping `email` claim → `person` row; the switcher degrades to a view selector (altitude only, never identity). SAML, if a client demands it, slots behind the same provider interface. Sessions, not JWTs: on-prem, single origin, and sessions are revocable — simpler and safer for this learner-maintained system.

---

## 2. Cross-cutting invariants that must be right from chunk one

Each of these is ruinous to retrofit. State → why → enforcing mechanism.

**I-1. Derive, don't store (`BR-DRV-01..16`).**
*Why unretrofittable:* once a stored copy exists, every screen, report and export grows a dependency on it; removing it later means auditing every read site, and in the meantime the stored copy silently lies (the exact failure §2 names).
*Mechanism:* the Prisma schema simply **has no columns** for derived values (the "must-not-exist" list is in §3.4 below). Derivations are pure functions in `packages/domain`, called by API serializers; a schema-review checklist item in every migration PR: "does any new column duplicate a derivable fact?" Caching, when Phase 5 needs it (G-20), is write-invalidated materialization of those same functions — never a hand-maintained column.

**I-2. One engine per concern.**
*Why:* the second reminder mechanism or the second issue tracker is always born as a "quick local copy" in a feature module; by the time it disagrees with the first, both have callers.
*Mechanism:* the engines live in `apps/api/src/core/*`; feature modules may import core, never each other's internals; ESLint `import/no-restricted-paths` boundaries enforce it mechanically. The scheduler consumes a single `Deadline` registration interface — a module that needs chasing has no other API to call.

**I-3. Single central authority check (`BR-AUT-01`).**
*Why:* authority scattered across screens/handlers is how the one endpoint that lets a maker approve their own filing ships; finding it later means auditing every handler.
*Mechanism:* §1.3 — the declarative matrix in `packages/domain`, `GovernedGuard` + `GovernedMutation` runner, backstop interceptor that fails any mutation not passing through the runner, and the `capabilities` endpoint so the client never embeds a role comparison. The prototype's `scripts/check-access-control.tsx` is reborn as an API contract test: for every action × role, assert allow/deny against the matrix.

**I-4. Append-only, tamper-evident audit log; every mutation transactional with its entry (`BR-AUD-01/02`, §17.5).**
*Why:* an audit trail added after the fact has holes exactly where the early bugs were, and "we can't prove what happened before month three" is disqualifying for this product category.
*Mechanism:* §1.4 — hash chain, same-transaction write inside the runner, DB grants + block trigger, chain-verify script in CI and backups. Because *all* mutations already flow through the runner (I-3), the audit guarantee costs nothing per feature.

**I-5. The intelligence seam (§13.3, `BR-AI-01..07`).**
*Why:* if screens or services call "the extractor" concretely, replacing scripted behaviour with a model later reworks every call site; and if agents get their own mutation path, `BR-AI-02` is unenforceable forever.
*Mechanism:* one provider interface in `packages/intelligence`; proposals persisted, applied only via existing governed actions; `verified` flags on extracted figures gate downstream transitions in the domain state machines.

**I-6. Identifier conventions (§7.4, v2.1 scheme).**
*Why:* identifiers are user-facing and quoted to regulators; changing the scheme after data exists breaks every external reference, and DB auto-increment ids leak into URLs on day one if not designed out.
*Mechanism:* `core/ids` allocates from per-prefix sequence rows **inside the mutation transaction**, per the v2.1 two-pattern scheme: catalogue records `TYPE-NNNNN` with no year (`OBL-0142`, `CTRL-0273`, `TSK-01847`), event records `TYPE-YY-NNNN` (`INC-26-0411`, `EXC-26-041`), max 11 chars, **no semantic middle segments** — meaning lives in `title`/`shortTitle`/`citation`, which every model carries (§3.1). Never reused; obligation cycles are `<dutyId>.<period>` (`OBL-0142.2026-06`), never rendered inline. Public ids are the primary keys the API speaks; no numeric surrogate ever crosses the API boundary. The seed transformer carries an **old-id → new-id migration map** (the prototype's semantic ids die at the boundary; cross-links are rewritten during load — P0-13).

**I-7. Confidentiality by construction for speak-up (§4.12, `BR-DAT-02`, `BR-SCP-05..09`, `BR-AUD-05`).**
*Why:* this is a property of the schema, not of code: if an identity column ever exists, every backup, log and export from that era holds it — you cannot un-store a field.
*Mechanism:* the `speakup_report` table **has no identity column**, only a reference code and an optional `sealed_custody_note` (custodian, unsealable-by, reason — never the identity); case access is a person-id list checked in the runner (person, not role, so impersonation/persona switching cannot open it); recusal computed in `core/access` (named-in-allegation + department-head-of-target) and applied before role checks; sealed cases counted-not-shown by the list serializers; queue and notifications filter at source; audit entries for these modules record act-not-content via a per-action redaction flag.

**I-8. Authorization is server-side from the first endpoint (G-03) and identity is a seam (G-02).**
*Why:* a client-checked build "works" in every demo and is a rewrite to fix; and auth bolted on later means every endpoint was written assuming a trusted caller.
*Mechanism:* §1.7 — no endpoint exists without a session-derived `ActorContext`; dev impersonation is itself a server-side act (and is logged), gated by `AUTH_MODE=dev`.

---

## 3. The data model (Prisma schema outline)

Sources: spec §7.1/§7.2/§7.3 (authoritative for lifecycle, cardinality, identity) + prototype `src/types/index.ts` (authoritative for field richness — it encodes a year of domain learning the spec deliberately omits). Where they disagree, §3.3 says who wins.

### 3.1 Conventions

- Every model: `id` (public §7.4 v2.1 identifier, PK, string), `orgId` FK, `createdAt`, `version` (int, optimistic locking for §17.5 concurrency), owner as `personId` FK.
- Every user-facing record: `title` (full) + **`shortTitle` (≤60 chars, NOT NULL)** — lists/chips render shortTitle only, details render title (§7.4); records with a legal basis carry `citation`. One shared `<EntityRef>` component renders id + shortTitle everywhere (P1-18); no list view renders the full title.
- **Department is never a column on records** (`BR-SCP-01`) — derived from the owner. It *is* a column on `Person` (that's the fact, not a copy).
- State machine states = Prisma enums; legal transitions live in `packages/domain/stateMachines.ts`, enforced by the runner (`BR-LFC-01`).
- Arrays-of-ids in the prototype (`linkedControls: string[]` etc.) become join tables — referential integrity is what makes `BR-LNK-10` (no orphaned provenance) enforceable. Soft-delete only (`archivedAt`); no cascading deletes anywhere.

### 3.2 Model catalogue (outline, grouped)

**People and org.** `Organization` (name, timezone, financial calendar). `Person` (name, title, email, department enum, lod enum, status: Active/Away/Invited/Suspended). `PersonRole` (person ↔ role enum; spec: one identity, possibly several roles). `DepartmentHead` (department → personId; the escalation map, admin-configurable and audited).

**Source spine.** `SourceInstrument` (authority, instrumentType, referenceNumber, dateOfIssue, effectiveDate, version, `supersedesId` self-FK, sourceChannel, sourceLink, status enum: InForce/Superseded/Draft/Repealed, summary, applicability; `InstrumentDepartment` join for routing). `SourceClause` (instrumentId, provision, title, citation, extract, whatItMeans, keyParts jsonb, frequency, applicable?, applicabilityBasis, status enum: Processing/Recommended/Saved/SpecialistReview/NotApplicable, reviewer, reviewedAt, rationale, specialistNote, `verified` bool per `BR-AI-03`). `PenaltyTier` (clauseId, trigger, consequence, severity, sourceRef) — clause severity **derived** from tiers, not stored.

**Controls.** `Control` (title, type, automation, frequency, description, ownerId). `ControlClause` (m:n — the heart of map-once-satisfy-many, `BR-LNK-04`). `ControlFrameworkRef` (framework, ref, sourceRef?). `ControlTest` (controlId, at, result: Pass/Partial/Fail, method, tester, note) — "latest result" and coverage **derived** from test rows (prototype stores `result`/`lastTested`/`evidenceCount` on the control: dropped). `MonitoringRule` (controlId, feedRef, populationDef, passCondition, cadence) + `MonitoringRun` (at, passCount, failCount, failingItems jsonb, feedAvailable) — rule status Passing/Failing/**Degraded** derived (`BR-DRV-09`).

**Policies.** `Policy` (title, category, ownerId, status: Draft/InReview/Published). `PolicyVersion` (version, approvedBy, approvedOn, nextReview) — versions are rows, not a string field, because attestation is version-bound (`BR-LFC-06`). `PolicyClause`, `PolicyControl` joins.

**The duty cycle — the spec's model wins over the prototype's here (see §3.3):**
- `Obligation` — the *duty*: base id, title, regulator?, origin External/Internal, policyId?, frequency, ownerId, checkerId (nominated, `BR-AUT-04`), requirement, applicability. `ObligationClause` join.
- `ObligationCycle` — the *instance*: obligationId, cycleId = `<dutyId>.<period>` per §7.4 v2.1 (`OBL-0142.2026-06`, never rendered inline), dueDate, status enum: Due/InReview/Filed (**Overdue is derived** per `BR-DRV-17`, not stored), filedAt, onTime? recorded at filing (`BR-SCH-04`).
- `Task` — **the one work-item engine** (spec §7.1/§7.3 v2.1): parentRef (cycle | issue | campaign | dsar | attestation), seq, title, shortTitle, makerId, checkerId?, dueDate, **completionPolicy enum: Simple/Acknowledge/Evidence/MakerChecker**, status: Open/InProgress/Submitted/Returned/Done/Cancelled (Overdue derived; display labels vary by policy), returnReason (`BR-LFC-10`), dependsOnSeq, `ClauseRef` join. Transition legality is gated by the policy in `packages/domain/stateMachines.ts` (Evidence: Done needs ≥1 evidence, `BR-EVD-01`; MakerChecker: Submitted→Done by the nominated checker only, `BR-AUT-05`). Single-action duties get exactly one task (uniform model, 5.4); campaign tasks and DSAR stages are Tasks with the appropriate policy.
- `Evidence` (title, type, capturedAt, capturedById | feedRef, auto bool, verification: Submitted/Verified + verifiedBy/At, onBehalfOf per `BR-EVD-05`) + `EvidenceFile` (sha256, size, mime, storagePath — the vault payload, G-14) + explicit joins `EvidenceTask`, `EvidenceControl`, `EvidenceObligation`, `EvidenceFrameworkRef` (`BR-EVD-04`).

**Risk.** `Risk` (title, domain, ownerId, likelihood, impact, description; identification fields: sourceKind, sourceRef, identifiedOn/By; ownership: reviewFrequency, nextReviewOn; treatment: decision, rationale, targetResidual, targetDate; review outcome; approval maker/checker/state) — **no stored stage** (`BR-DRV-01`), no stored `status`, no `trend` (derived per `BR-DRV-07`). `RiskAction` (ownerId, reviewerId, dueDate, status: NotStarted/InProgress/Done, residualContribution, milestones jsonb, issueId?). `RiskAcceptance` (acceptedBy/On, rationale, compensatingControlId, expiresOn — expiry state derived, `BR-DRV-08`). `RiskControl`, `RiskIncident` joins. `Kri` (riskId, name, source, unit, direction, thresholds green/amber/red, ownerId, frequency, `KriControl` join) + `KriReading` (period, value, at) — **band and currentValue derived** from readings + thresholds + direction (`BR-DRV-02`).

**Events.** `Incident` (title, classification, detectedAt, source, ownerId, status: Open/Contained/Closed — prototype's `Eradicated` becomes a timeline entry, spec wins; subscriberImpacting, personalDataInvolved, summary; `IncidentAsset`, `IncidentRisk`, `IncidentControl` joins). `RegulatorTrack` (incidentId | fraudCaseId, regulator, windowHours, clockStartedAt + startBasis: detection/discovery + divergence note (`BR-SCH-07`), status: Pending/Drafted/Filed + `breachedAt` sticky (`BR-SCH-08`), filedRef). `TimelineEvent` (parentRef, at, actor, channel, kind, text). `LossEvent` (parentRef, category enum ×7, grossLoss, `LossRecovery` child rows with accountingRef — **net never stored**, `BR-DRV-04`; recovery ≤ gross enforced in domain).

**Issues and exceptions** *(v1.1 — spec v2.1 §5.14 supersedes the old exception-as-issue shape)*. `Issue` (title, source enum: ControlFailure/MonitoringFailure/AuditFinding/Incident/Investigation, sourceRef, severity, ownerId, dueDate, status: Open/InProgress/Resolved) — **no `ageDays`** (`BR-DRV-12`), no stored Overdue; the Exception/Attestation source values are gone — exceptions are no longer issues, and an attestation cannot-comply creates an Exception. `Exception` — **first-class, own table and id (`EXC-YY-NNN`)**: subjectControlId | subjectObligationId (exactly one, the deviation's subject), **issueId? (optional — a proactive exception has none)**, reason, compensatingControlId, requestedBy, approvedBy, approvalState, expiresOn, **renewalCount**, convertedAcceptanceId?, closedOn — Active/ExpiringSoon/Expired derived (`BR-DRV-08`); expiry review outcomes close/renew/convert (`BR-LFC-13`, no auto-issue on expiry); renewal authority escalates with count (`BR-AUT-11`: 2nd renewal Executive-only, >2nd named in the ARC pack). **The register endpoint serves the union** of both tables (`BR-LNK-06`) with a shared shape (ref, kind, severity, owner, date, state); the exception register is the union filtered to exceptions.

**Assurance.** `Audit` (type, auditor, period, scope, status: Planned/InProgress/Reporting/Closed). `AuditPlanEntry` (auditableEntity, quarter, fy, priority, status incl. Deferred, linkedAuditId, `PlanRisk` join) — delivery derived (`BR-DRV-11`). `WorkingPaper` (auditId, reference, controlTested, objective, procedure, population/sample, result, tester, conclusion, findingId?) — a failed paper with no finding is surfaced, not stored as a flag. `Finding` (auditId, workingPaperId, severity, status: Open/InRemediation/Closed, issueId **1:1**, closure requires auditor verification `BR-LFC-07`).

**Reg change.** `RegulatoryChange` (source, regulator, publishedAt, summary, detail, ownerId, status: Assessed/InProgress/Closed, instrumentId?) + `RegChangeImpact` (targetRef: obligation/control/policy, acknowledgedBy/At) — closure gated on acknowledgements (`BR-LFC-08`).

**Third parties.** `Vendor` (prototype's rich model carries over nearly verbatim: category, criticality, status, ownerId, contract fields, jurisdiction, dataAccess, subOutsourcing, exitPlan fields, rightToAudit, dataProcessingAgreement, dueDiligenceFrequency, lastDueDiligenceOn) + `VendorService`, `VendorAssurance` children — **tier has no column** (`BR-DRV-03`; the derivation returns attributed driver points).

**Campaigns.** `Campaign` (type enum: RCSA/Attestation/VendorDD, title, scope jsonb, period, launchedBy/On, dueOn, status: Open/InReview/Closed, obligationId?, evidenceId?). *(v1.1)* Campaign tasks are **Tasks** (§3.2 duty cycle) with parentRef = campaign, objectRef, the campaign type's completionPolicy (MakerChecker for RCSA/DD, Acknowledge for attestation), and a response **jsonb payload** the container never reads — the §14.3 extensibility shape, a fourth cycle type is a payload. Display labels (Assigned/Approved) are the Task states' campaign projections (spec §7.3).

**Investigations.** `SpeakupReport` (reference code, anonymous, channel, category, severity, receivedAt, summary, allegationAgainst — role/team, never a name at intake, stage enum ×8, outcome, acknowledgeBy/feedbackBy clocks, retaliationWatch fields, linkedFraudCaseId) + `SealedCustodyNote` (custodian, unsealableBy[], unsealedOn/By/Reason) + `CaseAccess` (caseRef, personId) + `CaseRecusal` (recorded; computed recusal adds to it at read) + `WbMessage`. `FraudCase` (scheme, detection, sourceRef, stage ×5, outcome, severity, investigator, sponsor, estimated/confirmed loss via `core/loss`, `FraudSubject`/`FraudIndicator` children, whistleblowerRef — reference code only, `BR-LNK-09`).

**Data governance.** `DataAsset` (store, piiTypes, classification, retentionRule, consentStatus, records). `Dsar` (maskedPrincipalRef, type, raisedAt, dueDate, ownerId) — *(v1.1)* the stages (5 erasure / 3 otherwise) are **Tasks** with policy Simple, parentRef = dsar, ordered by dependsOnSeq; completion is derived from the tasks, per the one-engine rule.

**Governance.** `Committee` (name, cadence, quorum, `CommitteeMember` join). `Pack` (audience, period, basis, status: Composed/NarrativeDrafted/Approved/Issued, narrative, preparerId, approverId) + `PackSnapshot` (the issued pack's frozen content, filed as evidence per 5.26).

**Platform.** `AuditEntry` (§1.4). `Deadline`/`ReminderDispatch` (itemType, itemRef, rung, firedAt, targetPersonId — the dedupe record of the ladder). `Notification` (personId, at, title, severity, entityRef, read). `AgentRun` + `AgentProposal` (kind, input, findings jsonb, status, appliedActionRef). `ConfigItem` + `ConfigChange` (before/after, maker, checker, state — 5.30). `IdSequence` (prefix, next). `Session` (personId, actsAsPersonId? for logged dev impersonation, expiresAt).

### 3.3 Where prototype and spec diverge — who wins

| Divergence | Winner | Why |
|---|---|---|
| Tasks: prototype derives them from `Obligation.subSteps` + session overlay; spec makes Task a first-class object with its own id | **Spec** | Tasks carry maker-checker, evidence and their own ladder (`BR-ESC-06`); they must be durable rows, not projections |
| Cycles: prototype patches one Obligation row per duty; spec 5.5 schedules a next *instance* with a per-cycle ledger | **Spec** | Requirement 11 and the on-time metric need instance rows; hence the Obligation/ObligationCycle split |
| `Issue.ageDays`, `Issue.status='Overdue'`, `Control.result/lastTested/evidenceCount`, `KRI.currentValue`, `Risk.status/trend` stored | **Spec** | All violate `BR-DRV-*`; the prototype stored them for render convenience — serializers now compute them |
| Incident status includes `Eradicated` | **Spec** (Open/Contained/Closed) | `BR-LFC-01`; eradication is a timeline `kind`, which the prototype already has |
| `Issue.source` enum has 4 values | **Prototype extended** to the spec's v2.1 trigger list (5.22): ControlFailure/MonitoringFailure/AuditFinding/Incident/Investigation | Spec enumerates more sources than the prototype enum admits; Exception and Attestation are not issue sources in v2.1 — exceptions are first-class and cannot-comply creates one |
| Speak-up/fraud `Confidential {restricted, accessList, recusals}` embedded on the record | **Prototype shape, normalized** into `CaseAccess`/`CaseRecusal` tables | Same semantics; tables let the queue/notification filters and the runner share one check |
| Prototype `RoleKey` has 9 personas incl. committee chairs | **Prototype** (matches §4.4 exactly) | Keep; add Company Secretary as switchable pending §21.15 |
| Rich narrative fields (`whatItMeans`, `keyParts`, penalty tiers, vendor detail, KRI rationale) absent from spec §7 | **Prototype** | §7 is deliberately not a data dictionary; the prototype's fields are the worked answer |

### 3.4 Columns that must NOT exist (the derive-don't-store contract)

No column, ever, for: risk workflow stage · risk status/trend · KRI band or current value · third-party tier · net loss · exception/acceptance/assurance expiry state · issue age · obligation/task/campaign-task "Overdue" · campaign progress · attestation coverage · appetite status · aggregate residual · monitoring rule status · control latest-result/coverage · audit plan delivery · proactive detection rate · department on any record · the personal queue (assembled per request, 5.28) · clause severity (derived from penalty tiers). Each has a pure function in `packages/domain` and a line in the schema-review checklist.

---

## 4. Migrating the seed world

The deterministic generators in `src/data/` (`world.ts` ~200KB, `sources.ts` ~130KB, plus `people/campaigns/vendors/speakup/kris/auditProgramme/committees`) are an asset worth more than any hand-written fixture: they produce a coherent, cross-linked world at Appendix A volumes (23 people, 22 instruments, 67 clauses, 273 controls, 140 risks, 27 KRIs, 217 obligations, 46 policies, 649 evidence items, 131 issues, 60 incidents, 18 audits, 124 working papers, 90 reg changes, 120 data assets, 24 vendors, 8 campaigns, 8 speak-up reports, 5 fraud cases) with one load-bearing scenario chain (the patch-SLA → issue → incident → three-clock cascade). The strategy: **keep the generators, move them, transform their output.**

1. **Extract, don't rewrite.** Move `src/data/*` into `packages/seed-world` with two changes only: (a) the anchor in `lib/time.ts` becomes a parameter (`generateWorld(anchor: Date)`) — note the prototype has already moved from the frozen 10-Jun-2026 instant to an **evergreen** `NOW = new Date()` at module load, with every seed date an offset; parameterizing replaces that module-load side effect with an explicit argument; (b) React-free (it already is — pure TS + the seeded RNG in `rng.ts`). The web app keeps importing it during the transition so both stacks share one world until each page group is rewired.
2. **Transform at the boundary.** `apps/api/src/seed/load.ts` walks the generated `WORLD` and maps it to the §3 schema: arrays-of-ids → join rows; **all ids re-allocated to the §7.4 v2.1 scheme through the old→new migration map (P0-13), cross-links rewritten**; `subSteps` → `Task` rows (synthesizing the single task for single-action duties, policy per duty type); one prototype Obligation → `Obligation` + current `ObligationCycle` (+ historical cycles synthesized from `filedAt`/frequency so the on-time ledger and 30-day trends have real rows to derive from — this is what closes G-26 honestly); derived-stored fields **dropped** (the transformer asserts that recomputing them via `packages/domain` reproduces the generator's values — a free regression suite for the derivation functions).
3. **Provenance of seed data.** Every seeded row gets one audit entry (`actor: system, action: seed.import`) so the chain starts complete, and a `seededAt` marker per §18.2 principle 3 (migrated records carry their origin). Evidence items get small placeholder artifact files (generated PDFs/text with the right titles and hashes) so the vault, upload/download and integrity checks are exercised for real.
4. **Idempotent + verifiable.** `pnpm seed --profile=demo` wipes and reloads (dev only; refuses when `AUTH_MODE=oidc`); a `seed --verify` mode recounts against Appendix A volumes.

**Handling the demo anchor once time is real** (spec §23 D-01/D-02/D-03 — the anchor and everything staged around it is the demo's load-bearing fiction). All time flows through `core/clock` (`ClockService.now()`), with three modes:
- `frozen` — returns the anchor (+ manual offset). Used for demos and for **time-travel tests**: advance the clock 8 days, run the scheduler reconciler once, assert exactly the 7/3/1-day rungs fired and were logged. This preserves G-05's requirement that the ladder stays derivable/reconstructible while now actually firing.
- `real` — wall clock in the org timezone (`BR-SCH-09`). Seed profile `dev` rebases every generated timestamp by (`realNow − anchor`) at load, so the world is live-fresh (the marquee incident's 6-hour clock again reads ~3h11m on first paint, today).
- `offset` — real clock shifted by a stored delta; what `frozen` becomes after someone presses "resume time" in a demo.

The scheduler, recurrence, expiry derivations and countdown endpoints all take the clock from this service — never `new Date()` (a lint rule bans bare `Date.now()` in `apps/api` and `packages/domain`).

---

## 5. The phased roadmap

Six phases. Every phase ends with the app running end-to-end (web + api + db via compose), demoable, and strictly more real than the phase before.

| Phase | Goal (one line) | Gap register closed | §20 Requirements made demonstrable (server-enforced) | Key risks retired |
|---|---|---|---|---|
| **0 — Proof-chain spike** | The Compliance spine (clause→control→obligation→task→evidence, risk attached) persisted, server-authorized, audit-logged, rendered by the existing UI | Proves the mechanisms for G-01, G-03, G-15 on a slice | 3, 4, 5, 7 (on the slice) | Stack risk (Nest+Prisma+monorepo learnability); the governed-mutation pattern; FE rewiring cost; seed-transform feasibility |
| **1 — Platform floor** | The six §19.3 floor items real for the duty cycle; full core seed; queue, calendar, cockpit subset live from the API | G-01, G-03, G-04, G-05, G-13, G-14, G-15 (full); G-26 (core); G-06 partial (in-app persisted) | 1, 2, 3, 4, 5, 7, 8, 11, 16 | Scheduler correctness; evidence handling; concurrency; department scoping at the API |
| **2 — Risk & events** | Risk lifecycle, acceptance, exceptions, KRIs, incidents + regulator clocks, loss, CCM behind the connector seam, reg change, policies | G-18 (config’d clock starts), G-19 (both coverage senses), parts of G-07 (seam) | 6, 9, 10, 14, 17, 18, 23 | Multi-clock semantics; derived-stage risk model at scale; the failure cascade |
| **3 — Cycles & assurance** | Campaigns (RCSA/attestation/DD) with write-back, vendor tiering, audit programme, committee packs with snapshot-as-evidence | G-22 partial (bulk), G-23 partial (snapshot; formats in P5) | 12, 13, 19, 20, 21 | Campaign container extensibility; pack snapshotting |
| **4 — Investigations & privacy** | Speak-up + fraud with structural confidentiality; DSAR/data governance; masking | — (closes the §4.12 requirements; no G-item is investigation-specific) | 22 | The confidentiality model (I-7) proven against Requirement 22's four tests |
| **5 — Intelligence, admin, hand-off** | Agent runs + ingestion behind the seam; admin config maker-checked (5.30); email delivery; OIDC; one real connector; reports/exports; packaging, backup, docs; performance + accessibility passes | G-02, G-06 (full), G-07 (framework + 1 real), G-08/09/10 (seam, deterministic provider honestly labelled), G-12 (governed manual filing), G-16 (delegation, minimal), G-17, G-20, G-21, G-23, G-28; G-27 tooling deferred to first real client | 9 (agentic arrival), 15, 24 | On-prem operability; auth federation; performance at NFR volumes |

**Entry/exit criteria.** Entry to each phase = previous phase's exit checklist green + its open decisions (§8) resolved or defaulted. Exit checklists are the union of the "done when" tests of the phase's chunks plus one phase-level demo script (a written click-path a non-developer can follow); Phase 0's exit additionally requires the go/no-go review (chunk P0-12). Deferred indefinitely per §19.3: real regulator filing channels (G-12 beyond governed-manual), external specialist workflow (G-11), real model intelligence — provided the seams hold and are labelled.

---

## 6. Bite-size work packages

Rules of engagement: each chunk fits one focused Claude Code session; the app runs at the end of every chunk; every chunk's "done when" is something **you** can verify by clicking or running a command; sizes S (≤ half a session), M (one session), L (a full session, at the limit — split further if it fights back). Dependencies name chunk IDs; unlisted chunks in the same phase are order-flexible.

### Phase 0 — the proof-chain spike (exhaustive)

**P0-01 · Monorepo scaffold** — *S* · deps: none
Create pnpm workspaces; move the Vite app unchanged into `apps/web`; root scripts (`pnpm dev`, `pnpm typecheck`). Touches: repo root, `apps/web` (move only).
Refs: locked stack decision. **Done when:** `pnpm --filter web dev` serves the prototype exactly as before (persona switch, marquee incident, all pages) and `pnpm typecheck` passes.

**P0-02 · Postgres + NestJS skeleton in Compose** — *M* · deps: P0-01
`docker/compose.yml` with `db`; `apps/api` NestJS (Fastify) with `/api/health` doing a DB round-trip; `.env` wiring. Touches: `docker/`, `apps/api`.
Refs: on-prem decision, G-01 groundwork. **Done when:** `docker compose up db` + `pnpm --filter api dev`, then `curl localhost:3000/api/health` returns `{db: "ok"}`.

**P0-03 · Spike schema + first migration** — *M* · deps: P0-02, P0-13
Prisma models for the slice only: Organization, Person, PersonRole, SourceInstrument, SourceClause, PenaltyTier, Control, ControlClause, ControlFrameworkRef, Obligation, ObligationCycle, Task (with completionPolicy), Evidence (+ joins), Risk (minimal) + RiskControl, AuditEntry, IdSequence, Session. Enums per §7.3 v2.1; every user-facing model carries `title` + `shortTitle` (NOT NULL) and, where legal, `citation` (§3.1).
Refs: §7.1–7.4 (v2.1), §3 above. **Done when:** `prisma migrate dev` succeeds; `prisma studio` shows the tables; the §3.4 must-not-exist check passes (no derived columns); a CHECK/exhaustive test shows no id longer than 11 chars can be allocated.

**P0-04 · Extract seed-world + load the spike slice** — *L* · deps: P0-03
Move `src/data` → `packages/seed-world` (anchor parameterized); web keeps importing it. `seed/load.ts` inserts: all 23 people, the instruments/clauses of **one** worked chain (recommend the EPF/PT statutory chain plus the investment-policy internal duty so internal+external are both present from day one), their controls, obligations+cycles, tasks, evidence (metadata only), linked risk.
Refs: §4 above, Appendix A, Requirement 2. **Done when:** `pnpm seed --profile=demo` loads; a SQL query (provided in the chunk) walks clause → control → obligation → task → evidence for the worked chain; re-running seed is idempotent.

**P0-05 · Identity seam: sessions + dev impersonation** — *M* · deps: P0-03
`core/identity`: Postgres-backed signed-cookie sessions; `POST /api/dev/impersonate {personId}` (only when `AUTH_MODE=dev`); `GET /api/whoami` returning person, roles, department, lod; `ActorContext` request decorator.
Refs: G-02, locked auth decision, §1.7. **Done when:** `curl -c jar -X POST …/dev/impersonate` as Anjali then `curl -b jar …/whoami` names her; without a cookie, `/whoami` is 401.

**P0-06 · Authority matrix + GovernedMutation runner + audit chain** — *L* · deps: P0-05
`packages/domain/authority.ts` (full §4.10 matrix as data, spike actions active); `GovernedGuard`; `GovernedMutation.run` (authority → SoD → transition legality → tx → audit entry with hash chain); backstop interceptor; `scripts/verify-audit-chain.ts`.
Refs: `BR-AUT-01..09`, `BR-AUD-01/02`, §17.5, I-3/I-4. **Done when:** a test suite shows (a) maker approving own submission → 403; (b) wrong role → 403; (c) success writes exactly one chained audit row; (d) a deliberately failing mutation leaves neither record change nor audit row; (e) chain-verify passes, and fails after a manual UPDATE attempt is blocked by the trigger.

**P0-07 · Read API + proof-chain resolver** — *M* · deps: P0-04
GET endpoints (contracts in `packages/contracts`): instruments, instrument detail w/ clauses, clause, control (with clauses-grouped-by-act), obligation (with cycles/tasks), task, evidence, and `GET /api/proof-chain?anchor=<id>` porting `lib/proofChain.ts` resolution server-side.
Refs: `BR-LNK-01..05`, 5.1 acceptance. **Done when:** the chain JSON for the worked chain is byte-identical whichever of the five anchors you query from.

**P0-08 · Write API: the spike's governed actions** — *L* · deps: P0-06, P0-07
Through the runner: `clause.save` (to existing control | create control from clause), `clause.specialist`, `clause.notApplicable` (with basis, `BR-LFC-09`), `task.attachEvidence` (metadata; blocks submit without evidence, `BR-EVD-01`), `task.submit`, `task.verify`/`return` (SoD), `obligation.approve` → cycle Filed. Id allocation via `core/ids`.
Refs: WF 5.1, 5.4, 5.6, 5.7; `BR-AUT-02/04/05`, `BR-EVD-01/02`, `BR-LFC-01/10`. **Done when:** a scripted curl sequence runs the whole flow: clause Recommended → Saved → obligation cycle Due → task evidence → submit → verify (by the checker) → Filed; each step visible in `GET /api/audit-log`; every illegal shortcut (skip evidence, self-verify, illegal transition, wrong department saving a clause) returns 4xx.

**P0-09 · Frontend API plumbing + persona → server identity** — *M* · deps: P0-05
`apps/web/src/api`: typed fetch client from `packages/contracts`, TanStack Query provider, error toast wiring; persona switcher now calls `/dev/impersonate` and re-queries; a "signed in as" chip reads `/whoami`.
Refs: G-02/G-03, I-8. **Done when:** switching persona in the UI changes `/whoami` (verify in devtools network tab) and a hard reload keeps the persona (session cookie).

**P0-10 · Rewire Source Library, instrument detail, clause detail** — *L* · deps: P0-08, P0-09
These three pages read from the API (Query hooks) and their actions call the write API; other pages keep using the local seed world untouched. Capabilities drive button state.
Refs: 5.1 steps 1–7, Requirement 3. **Done when:** as Anjali you save a clause to a control in the browser, **reload, and it is still Saved**; as Rajesh (wrong department) the Save action is absent and the direct API call fails.

**P0-11 · Rewire control / obligation / task / evidence details + shared chain component** — *L* · deps: P0-10
Same treatment for the four remaining spike screens; the ProofChain component consumes the resolver endpoint; add a minimal read-only Audit Log list in Settings backed by `GET /api/audit-log`.
Refs: `BR-LNK-03/04`, Requirements 4, 5, 7; `BR-AUD-07`. **Done when:** you can click the full chain in both directions in the browser, attach evidence to a task, have the checker persona verify it, see the obligation file — all reload-persistent — and find every action in the Settings audit log.

**P0-12 · Spike review: go/no-go checklist** — *S* · deps: P0-11
Walk a written checklist: all eight §2 invariants demonstrably in place on the slice; chunk-size calibration (were L chunks too big?); decisions to carry into Phase 1 recorded in this document.
Refs: §19.3, I-1..I-8. **Done when:** the checklist is committed with every item ticked or converted into a Phase 1 chunk. Include the spec-§23 sweep: no demo construct (stored derivable, synthesized series, client-side authority, semantic id) is present on the slice.

**P0-13 · Identifier scheme v2.1 + old→new migration map** *(new in v1.1)* — *M* · deps: P0-02
Implement `core/ids` to the §7.4 v2.1 scheme: per-prefix `IdSequence` rows, catalogue `TYPE-NNNNN` / event `TYPE-YY-NNNN` formats, 11-char cap, allocation inside the mutation transaction; the prefix registry (incl. the promotions `WBR/APE/DAS/WPR/DSR`); cycle-id derivation `<dutyId>.<period>`. Build the **migration map** the seed transformer uses: every prototype id (`OBL-PFRDA-Q1-07`, `CTRL-ISO-A.8.9`, `SRC-…` semantic ids) → a newly allocated v2.1 id, with cross-link rewriting and a collision/uniqueness assertion. Runs before P0-03 consumes the id shapes and P0-04 loads the world.
Refs: spec §7.4 (v2.1), §23 D-11, I-6. **Done when:** unit tests cover format, cap, no-reuse and cycle derivation for every prefix; the map converts the full seed world with zero unresolved references; grepping the transformed world finds no semantic id.

*(Phase 0 total: 13 chunks.)*

### Phase 1 — the platform floor (exhaustive)

**P1-01 · Core schema completion** — *M* · deps: P0-12
Migrations for: Policy/PolicyVersion + joins, Issue + **Exception (first-class per §3.2 v1.1)**, Committee, Deadline/ReminderDispatch, Notification, ConfigItem, EvidenceFile, DepartmentHead. **Done when:** migrate + studio + must-not-exist check pass; app still runs.

**P1-02 · Seed the full compliance core** — *L* · deps: P1-01
Extend the transformer to all 217 obligations (+ synthesized historical cycles), all tasks, 46 policies (+versions), 649 evidence rows **with generated placeholder artifact files**, 131 issues + exceptions, committees, department heads. Transformer asserts derived-value parity with the generators.
Refs: §4, Appendix A, G-26. **Done when:** `seed --verify` matches Appendix A counts; spot-check three known records in the UI.

**P1-03 · Full authority matrix + nominated checkers everywhere** — *M* · deps: P1-01
Activate every §4.10 row in the matrix data; enforce `BR-AUT-04` (checker nominated at creation) and `BR-AUT-06` verbs; port `scripts/check-access-control.tsx` as an API contract test iterating action × role × (maker==actor?).
Refs: §4.10, §4.11, `BR-AUT-*`. **Done when:** the contract test enumerates the whole matrix and passes; three hand-picked negative cases fail correctly via curl.

**P1-04 · Department scope on discovery surfaces** — *M* · deps: P1-02
`core/access` applies `BR-SCP-01..04` to list/register/calendar/queue endpoints (scoped by owner's department; Compliance & Admin see all; detail endpoints unscoped); scope metadata in list responses feeds the existing scope banner/selector UI.
Refs: §4.5, `BR-SCP-01..04`. **Done when:** as Deepa (Finance and Tax) the obligations list shows only her department but a direct link to an IT obligation still opens; as Anjali the list shows all.

**P1-05 · Evidence files for real** — *L* · deps: P1-02
`ArtifactStore` (fs volume): upload (multipart, size/type limits, sha256 on write), download (auth'd, streamed), integrity re-verify command; virus-scan **seam** (no-op impl now, interface fixed); `BR-EVD-05` on-behalf-of; `BR-EVD-06` guidance endpoint porting `evidenceGuidance.ts`.
Refs: G-13, G-14, 5.6. **Done when:** you upload a PDF to a task in the browser, download it back byte-identical, see its hash on the evidence detail, and a corrupted file on disk is reported by the verify command.

**P1-06 · Audit log hardening + retention floor** — *M* · deps: P0-06
Postgres init SQL: dedicated app role with INSERT/SELECT-only on `audit_entry`, block trigger for UPDATE/DELETE; retention floor as protected config (`BR-DAT-05`); chain-verify wired into CI and `backup.sh`.
Refs: G-15, `BR-AUD-02`, `BR-DAT-05`. **Done when:** `psql` as the app role cannot UPDATE an audit row (error), and an attempt to set retention below the floor via the config API is refused with the rule cited.

**P1-07 · ClockService + time-travel** — *S* · deps: P0-12
`core/clock` with frozen/real/offset modes; dev-only `POST /api/dev/clock` to jump time; lint rule banning bare `Date.now()`; org-timezone formatting helpers (`BR-SCH-09`).
Refs: §4 above, G-05. **Done when:** jumping the clock forward in dev makes an obligation's derived Overdue flip in the UI without any data change.

**P1-08 · The reminder/escalation engine** — *L* · deps: P1-07, P1-02
Ladder math in `packages/domain` (pure: deadlines + now → rungs due); `core/scheduler` reconciler (interval job): compares due rungs vs `ReminderDispatch`, fires missing ones — each firing = notification rows to resolved named people (department-head map, `BR-ESC-04`) + audit entry (`BR-ESC-03`); only active items chased (`BR-ESC-05`); per-task chasing (`BR-ESC-06`); expiry windows 7/30/60 (`BR-ESC-07`). Intervals read from config (`BR-ESC-01`).
Refs: WF 5.27, `BR-ESC-01..07`, G-05, Requirement 16. **Done when:** time-travel a seeded duty from D-8 to D+8, run the reconciler, and the obligation detail shows exactly the 7/3/1-before and 1/3/7-after rungs fired, to the right named people, with matching audit entries — and running the reconciler again fires nothing (idempotent).

**P1-09 · Notifications API + bell** — *S* · deps: P1-08
Persisted per-person notifications; unread counts; the existing bell UI rewired; restricted-case filtering left as a hook for Phase 4.
Refs: §11.3, G-06 (in-app half). **Done when:** the rung fired in P1-08 appears in the owner's bell and not in anyone else's.

**P1-10 · Recurrence: cycles that schedule themselves** — *M* · deps: P1-08
On cycle approval: record on-time/late (`BR-SCH-04`), compute next due (later of due date and today + cadence, `BR-SCH-02`), create next cycle + tasks (evidence cleared, maker-checker reset); event/continuous/daily duties excluded (`BR-SCH-03`); missed cycles never closed by generation (`BR-SCH-05`).
Refs: WF 5.5, Requirement 11. **Done when:** approving a monthly duty in the browser makes next month's cycle appear immediately with the ledger row recorded; time-traveling past a missed cycle leaves it Overdue and escalating while the next one exists.

**P1-11 · Duty-cycle flows complete** — *M* · deps: P1-05, P1-03
Checker return-with-reason (`BR-LFC-10`), multi-step duties chasing per step, on-behalf-of attachment, submission blocked without evidence — the full 5.4 alternate paths, browser-side polish on ObligationDetail/TaskDetail.
Refs: WF 5.4, `BR-EVD-01`, Requirement 2. **Done when:** the internal investment-policy duty and the statutory GST duty each run the identical full cycle in the browser, including one rejection round-trip.

**P1-12 · The personal queue, server-derived** — *M* · deps: P1-04, P1-08
`modules/queue` assembles from live state per 5.28 (approvals waiting, owned duties due/overdue, fired escalations reaching the persona); scope + (later) case filters at source; MyQueue page rewired.
Refs: WF 5.28, `BR-SCP-09` hook, Requirement 8. **Done when:** switching among three personas shows three genuinely different queues, and approving an item clears it from the queue without a manual refresh.

**P1-13 · One calendar** — *S* · deps: P1-10
`GET /api/calendar` aggregating every dated thing built so far (cycles, policy reviews, committee meetings, exception expiries); Obligations calendar view rewired; person and regulator filters.
Refs: `BR-SCH-01`, §11.1. **Done when:** a date on the calendar shows both an internal and an external duty, and filtering to "mine" as Deepa shows only hers.

**P1-14 · Cockpit metrics, server-derived (subset)** — *M* · deps: P1-02
`modules/metrics` built to the **dashboard design doc's definitions**: M1/M2 overdue + due-soon (with denominators), M3 filed-on-time (from real cycle ledgers, denominator = cycles fallen due), M4 evidence-backed completions, open findings placeholder, both Control-pass-rate/Duty-coverage functions computed (full control data lands in P2). Trend endpoints per `BR-DRV-18`: series = the same metric functions evaluated at past instants over the seeded historical *records* — **the RNG series in `trends.ts` and the hard-coded chart headlines are not ported; nothing reads them** (full cockpit replacement lands in P2-14). Home KPI tiles rewired; every number drills into a filtered register.
Refs: §10.1/10.2 (v2.1), dashboard doc §2/§5, `BR-DRV-17/18`, Requirement 14 (partial). **Done when:** filing an obligation in the browser moves the cockpit's on-time rate on next load; clicking the overdue tile lands on the filtered register; `grep` finds no import of the prototype's `trends.ts` and no literal trend headline in rewired code.

**P1-15 · Concurrency: optimistic versioning** — *M* · deps: P1-11
`version` checks in the runner; 409 with a "what changed" payload; a slim conflict banner in the web app's mutation hooks ("someone else changed this — review and retry").
Refs: §17.5, G-04. **Done when:** two browser tabs as two personas editing the same record produce a visible conflict message in the second, never a silent overwrite.

**P1-16 · Dev login screen + capabilities-driven UI sweep** — *S* · deps: P1-03
A simple persona-picker login page (dev mode); sweep the rewired pages replacing any residual client role checks with server capabilities.
Refs: G-02, `BR-AUT-03`, I-3. **Done when:** `grep` finds no `role ===` comparisons in rewired pages; a persona without an action gets neither the button nor (via curl) the action.

**P1-17 · CI, tests, backup/restore** — *M* · deps: P1-06
GitHub Actions (or local script): typecheck, lint, domain unit tests, API contract tests, chain verify, `seed --verify`; `scripts/backup.sh` / `restore.sh` (pg_dump + evidence volume + audit head hash) with a documented restore drill.
Refs: §17.3, hand-off repeatability. **Done when:** you run backup, drop the compose stack, restore into a fresh stack, and the app comes back with the same data and a passing chain verify.

**P1-18 · `<EntityRef>` component + shortTitle sweep** *(new in v1.1)* — *M* · deps: P1-02
One shared `<EntityRef>` component rendering id + shortTitle (single-line, truncated) with the deep link — used by every table cell, chip, cross-reference panel and queue row that names a record; detail-page headers render the full title with the citation beside it where one exists. Sweep the rewired pages onto it; the seed transformer derives a shortTitle for every record (truncate-at-word from the title where the generator has no better one) so the NOT NULL constraint holds.
Refs: spec §7.4 (v2.1), §8 preamble, §23 D-11. **Done when:** no rewired list renders a full title (assert via a DOM test on the three widest registers); the obligations register renders `OBL-0142` + shortTitle + period column with no layout overflow at 1280px; every EntityRef navigates to its record.

**P1-19 · Colour discipline + enterprise design pass** *(new in v1.2)* — *M* · deps: P1-18
The palette is not the problem — `tailwind.config.js` already defines a correct semantic token set
(`critical/high/medium/low/ok/info`, each with a `soft` variant) and carries the comment *"color is
used for state only, not decoration"*. The defect is **application**: `DOMAIN_COLORS` in
`src/lib/heatmap.ts` is a six-hue rainbow of **raw hex** (`#2563eb` blue, `#7c3aed` violet,
`#0891b2` cyan, `#d97706` amber, `#059669` emerald, `#db2777` pink) that bypasses the token system
and is applied to a **categorical** attribute (risk domain) inside dense tables and filter chips —
on `/risks` and `/risks/:id` most visibly. Colouring domain, owner and stage alongside genuine state
badges is what makes a governance screen read as consumer SaaS or AI-generated.
Work: (a) promote `DOMAIN_COLORS` into CSS variables so it themes and supports dark mode instead of
hard-coding hex; (b) establish the rule **categorical colour is permitted only inside a dedicated
visualisation — the heat map, the appetite panel and charts — and never in a table row, chip,
list or cross-reference**, where domain/owner/stage render as plain text or a neutral outline chip;
(c) sweep every page for colour applied to non-state dimensions; (d) reserve saturated colour for
severity, status and band only, so a red on screen always means something is wrong.
**The Home enterprise risk heat map is explicitly retained as built** — a 5×5 grid encoding domain
composition per cell is exactly where a categorical palette earns its place. This chunk must not
change it beyond sourcing its hues from tokens.
Touches: `tailwind.config.js`, `src/index.css`, `src/lib/heatmap.ts`, `src/components/kit/*`,
`EntityRef`, the register pages.
Refs: §3 (colour for state only), §17.4 (**state never conveyed by colour alone** — every state
needs text or shape, not just hue), prototype `CLAUDE.md` A3 (calm, dense, governance-grade; must
not look like a bright consumer app), dashboard design doc §3.4 shared rendering rules.
**Done when:** a reviewer can open `/risks`, `/controls`, `/obligations` and `/issues` and find
saturated colour **only** on severity/status/band; domain and owner read as text; the Home heat map
and appetite panel are unchanged in appearance; no raw hex remains in `src/lib` or `src/pages`
(`grep -rE "#[0-9a-fA-F]{6}" src/lib src/pages` returns nothing); and every state that carries a
colour also carries a label, so the screen is legible in greyscale.

*(Phase 1 total: 19 chunks.)*

### Phase 2 — risk & events (coarser; split any L on contact)

| ID | Goal | Deps | Touches / Spec refs | Done when | Size |
|---|---|---|---|---|---|
| P2-01 | Schema + seed: Risk/RiskAction/RiskAcceptance/Kri/KriReading, Incident/RegulatorTrack/TimelineEvent/LossEvent, MonitoringRule/Run, RegulatoryChange+impacts, Vendor family (seed only), remaining Appendix A volumes | P1-17 | §3.2; WF 5.10–5.15; G-26 | `seed --verify` matches full Appendix A; derived-parity asserts pass for risk stage, KRI band, net loss, exception state | L |
| P2-02 | Risk lifecycle API: assess, treatment, actions advance, submit/approve/return with `BR-LFC-03` gate; derived stage + projected residual serialized | P2-01 | WF 5.12; `BR-DRV-01/14`; gating.ts port | Browser: approval refused while an action is open; approved once actions land; register and detail always agree (derived) | L |
| P2-03 | Risk acceptance + expiry: accept (SoD, `BR-AUT-07`), 30-day ladder registration, lapse to open exposure | P2-02 | WF 5.13; `BR-LFC-04`, `BR-ESC-07` | Time-travel past expiry → risk reads Exception expired, escalates, appetite counts it as exposure (Requirement 18) | M |
| P2-04 | *(amended v1.1)* Exception as **first-class entity**: schema (subject control/obligation, optional issueId, renewalCount), raise (incl. **proactive** with no issue) / approve (SoD) / close; the **union register endpoint** over Issues + Exceptions (`BR-LNK-06`); derived Active/ExpiringSoon/Expired (`BR-DRV-08`). Expiry *review* lands in P2-13 | P2-01 | WF 5.14 (v2.1); Requirement 17 | A proactive exception raised with no issue appears in the one register beside issues; time-travel past expiry → it reads Expired and escalates; no `ExceptionRecord`-on-Issue shape anywhere in the schema | M |
| P2-05 | KRIs: readings API, derived band both directions, breach → ladder + risk badge (worst band, `BR-DRV-16`); staleness chased | P2-01 | WF 5.15; `BR-DRV-02`; Requirement 23 | Enter a breaching reading for one higher-is-worse and one lower-is-worse KRI; both band correctly; the risk badges; no band column exists to override | M |
| P2-06 | Incidents + multi-clock tracks: track determination from incident shape, clocks from detection (`BR-SCH-06/07` with per-regulator config table — G-18), draft/file (SoD), sticky breach, close gated on tracks (`BR-LFC-05`) | P2-01 | WF 5.10; Requirement 10 | The marquee incident shows three live countdowns; filing all tracks then closing works; closing early is refused; a breached clock stays visibly breached after closure | L |
| P2-07 | Loss engine: gross/recoveries, net derived, categories; incident + (later) fraud book into it | P2-06 | WF 5.11; `BR-DRV-04`, `BR-LNK-07` | A recovery exceeding gross is refused; list, detail and roll-up show the same derived net | S |
| P2-08 | CCM behind the connector seam: `FeedProvider` interface with simulated impl; runs capture auto-evidence, Failing raises the issue naming items, Degraded on feed loss; the load-bearing cascade wired to the marquee incident | P2-06 | WF 5.9; `BR-DRV-09`, `BR-LFC-11`; G-07 seam | The patch-SLA rule fails on 3 items → issue exists without human action → linked incident → same evidence cited by all three tracks (the §19.1 chain, live) | L |
| P2-09 | Regulatory change end-to-end: capture, impact set, auto owner alerts, acknowledge, patch, promote-to-pipeline, close gated (`BR-LFC-08`) | P2-01 | WF 5.3; Requirement 9 | A change acknowledged and worked in the browser leaves the documented trail; close refused while an impact is unacknowledged | M |
| P2-10 | Policy lifecycle: draft→review→publish new version (SoD), review-date chasing, provenance to clauses | P2-01 | WF 5.18 | Publishing v(n+1) in the browser increments the version row and schedules review chasing; duties derived from it stay live | M |
| P2-11 | Control testing + heat map + appetite: retest API with history rows, fail→issue (`BR-LFC-11`); heat map/appetite/aggregate residual/exposure trend endpoints (`BR-DRV-05/06/07`); **Control pass rate** (tested-in-cadence denominator, Partial excluded) and **Duty coverage** as two labelled metrics — the bare word "coverage" in no UI label (G-19 decided) | P2-02 | WF 5.8; §10 (v2.1); dashboard doc M5/M6/M8 | Re-test a control to Fail: issue appears, pass-rate tile moves, the mitigated risk's assurance reflects it; "Duty coverage" and "Control pass rate" are two labelled numbers and a never-tested control inflates neither | L |
| P2-12 | Rewire remaining P2 pages (Risks, Ccm, Incidents, RegChange, Issues, Policies, Clocks) to the API; delete their seed-world reads (Home's full replacement is P2-14) | P2-02..11 | Appendix B routes (sector-neutral naming per spec App-B note) | No page in these groups imports `packages/seed-world`; full click-through demo script for Requirements 6/9/10/17/18/23 passes | L |
| P2-13 | *(new v1.1)* **Exception expiry review + escalating renewal authority**: the Expired-state review with outcomes close / renew-extend (SoD, count++) / **convert to accepted risk** (creates the 5.13 acceptance, closes the exception as Converted); **no auto-issue on expiry** (`BR-LFC-13`); renewal escalation per `BR-AUT-11` (2nd renewal Executive-only; >2nd named in the ARC pack data); attestation cannot-comply creates an exception (5.17) | P2-04, P2-03 | WF 5.14 (v2.1); `BR-LFC-13`, `BR-AUT-11` | Renewing twice in the browser demands the Executive on the second; a third renewal appears by name in the pack section data; converting creates a linked risk acceptance and closes the exception; expiry creates **no** issue row anywhere | M |
| P2-14 | *(new v1.1)* **The honest cockpit** — kill the fabricated numbers and build the Executive surface to the dashboard design doc: M10 enterprise residual exposure (tail-weighted `BR-DRV-05` enterprise-wide + `BR-DRV-07` QoQ) **replaces the seeded 7.8/10 constant and its "+0.3 QoQ" string**; M5/M6 pass-rate with tested-in-cadence denominator + lapsed-tests count; M8 duty coverage; trend triptych per `BR-DRV-18` (series function = tile function, last point = live value); tile anatomy (label/value/denominator/delta/drill); designed empty states ("no data — reason") | P2-11, P1-14 | dashboard doc §2–§5; spec §10 (v2.1), §23 D-04/D-05; G-26 | `METRICS.enterpriseRisk` and `trends.ts` have no importers (grep); the cockpit headline moves when a treatment action completes (derived, drillable); each chart's headline equals its tile's value after any mutation; a metric with no inputs renders "no data — [reason]", never a fabricated value | L |

### Phase 3 — cycles & assurance

| ID | Goal | Deps | Refs | Done when | Size |
|---|---|---|---|---|---|
| P3-01 | Campaign container: schema, open/fan-out/submit/review(SoD)/close + completion certificate as evidence; payloads opaque jsonb | P2-12 | WF 5.16–5.20 pattern; §14.3 | A campaign fans one task per in-scope object into assignees' queues and chases on the ladder | M |
| P3-02 | RCSA payload + write-back on approval (score patch + timeline entry) | P3-01 | WF 5.16; `BR-DRV-10`; Req 19 | An approved re-score visibly moves the risk register, traceably | M |
| P3-03 | Attestation payload: version-bound coverage, declarations; cannot-comply routes to the exception register | P3-01, P2-10 | WF 5.17; `BR-LFC-06`, `BR-DRV-13`; Req 20 | Republish the policy → coverage falls correctly; a cannot-comply declaration exists as a time-boxed exception | M |
| P3-04 | Vendor register + derived attributed tier + diligence/assurance chasing (60-day window) | P2-01 | WF 5.19; `BR-DRV-03`; Req 21 | Time-travel an assurance report past expiry → tier rises with the driver attributed; no tier field exists to type over | L |
| P3-05 | Vendor DD payload + write-back; concentration view | P3-01, P3-04 | WF 5.20 | An approved DD re-rates criticality and resets the diligence clock | M |
| P3-06 | Audit programme: plan entries, audits, working papers, findings 1:1 issues, auditor-verified closure, unescalated-failure surfacing, derived plan delivery | P2-12 | WF 5.21/5.22; `BR-LFC-07`, `BR-DRV-11`; Req 12 | Raise a finding from a failed paper in the browser → issue with owner/date; closing on owner say-so refused; plan-vs-actual is a derived number | L |
| P3-07 | Committee packs: compose from live queries, named basis, narrative maker-check (SoD), issue → snapshot filed as evidence against the meeting obligation; absent-not-empty sections | P2-12 | WF 5.26; §10.3; Req 13 | Produce, approve (second persona), issue a pack; find the snapshot in the vault against the committee obligation; live numbers keep moving after issue | L |
| P3-08 | Bulk operations on issues/campaigns + saved views server-side | P3-01 | G-22 | Bulk-resolve three issues; each records its own resolution and audit entry | S |
| P3-09 | Rewire Campaigns, Vendors, Audits, Sector Pack, pack generator pages; phase demo script | P3-01..08 | Appendix B | Requirements 12/13/19/20/21 click-through passes | M |
| P3-10 | *(new v1.1)* **Committee-chair dashboards + repeat findings**: RMC and ARC surfaces per the dashboard design doc (each trimmed to remit; M16–M26 set; sealed cases counted honestly in M23); schema addition — **finding→predecessor link** set at raise time + control/theme on findings, powering M21 repeat findings; findings ageing bands + oldest replace every mean-age display | P3-06, P3-07, P2-14 | dashboard doc §2/§3.2/§3.3/§7 (M21); spec §10.1 (v2.1) | The ARC view shows plan-delivered, ageing bands + oldest, SLA rate, exceptions with renewal counts, repeat findings from the new link; no mean-of-open-ages renders anywhere; the RMC view carries the third-party concentration card | L |

### Phase 4 — investigations & privacy

| ID | Goal | Deps | Refs | Done when | Size |
|---|---|---|---|---|---|
| P4-01 | Confidentiality core: CaseAccess/CaseRecusal tables, computed recusal, person-not-role checks in the runner, sealed counting in list serializers, queue + notification filtering at source | P3-09 | §4.12; `BR-SCP-05..09`; I-7 | Automated tests: persona switch never opens a sealed case; a recused Compliance Manager is refused; counts are honest for every viewer | L |
| P4-02 | Speak-up schema + intake: reference codes, no identity column, sealed custody note, anonymous portal endpoint (unauthenticated, rate-limited), ack/feedback clocks on the ladder targeting the ethics office | P4-01 | WF 5.24; `BR-DAT-02` | Schema inspection shows no identity field anywhere; an intake issues a reference code; clocks chase the ethics office only | L |
| P4-03 | Speak-up casework: triage, investigate, reporter messaging via code, remediation via issues, close with outcome+feedback (`BR-LFC-12`), unseal (SoD, logged), retaliation watch; act-not-content audit redaction (`BR-AUD-05`) | P4-02 | WF 5.24; Req 22 | The four Requirement-22 acceptance tests pass in the browser | L |
| P4-04 | Fraud cases: stages, shape-determined regulator tracks, loss via the one engine, risk push (`BR-LNK-08`), conversion from speak-up carrying reference-only (`BR-LNK-09`), close (SoD) | P4-01, P2-07 | WF 5.23 | Convert a report → the case carries the code and nothing else; a confirmed loss appears in the same loss book as incidents | L |
| P4-05 | Data governance: DataAsset inventory, DSAR stepwise workflows (5-stage erasure with retention-rule refusals cited, `BR-DAT-03`), breach routing into incidents, masking by default (`BR-DAT-01`) | P3-09 | WF 5.25; Req covered by 1/14 | The worked erasure case completes with a partial-refusal audit record citing the retention rule; PRANs render masked everywhere with unmask a logged action | L |
| P4-06 | Rewire Whistleblower, Fraud, Dpdp pages; phase demo script incl. Requirement 22 | P4-02..05 | Appendix B | Demo script passes with two personas and one recusal | M |

### Phase 5 — intelligence, admin, hand-off

| ID | Goal | Deps | Refs | Done when | Size |
|---|---|---|---|---|---|
| P5-01 | Admin config engine: ConfigItem catalogue (§14.1), maker-checker on every change (5.30), before/after logged, §14.2 never-configurable list enforced in code | P4-06 | `BR-AUT-08`; Req 24 | A threshold change by the admin requires a second approver and shows before/after in the log; disabling SoD is not possible anywhere | L |
| P5-02 | Settings screens rewired (9 sections, read-only for non-admins, audit log for 2nd/3rd lines) | P5-01 | §4.8, `BR-AUD-07` | Requirement 24 click-through passes | M |
| P5-03 | Intelligence seam live: deterministic provider ported (extractor, clause→control recommendations w/ confidence + rejected-stays, scoped Q&A, narrative draft), unverified-figure gating | P4-06 | §13; `BR-AI-03/05/06`; G-08/09 | Create-instrument-from-URL runs the scripted extractor; an unverified figure blocks clause save until confirmed | L |
| P5-04 | Agent runs: persisted propose-then-approve, applied via existing governed actions, run named in audit (source-scan, mapping-proposal, chase-watch, pack-assembly) | P5-03 | WF 5.29; `BR-AI-01/02`, `BR-AUD-06`; G-10 | A run mutates nothing; approving one proposal produces exactly the audit entry the manual action would, plus the run id | L |
| P5-05 | Email transport + preferences + digests + delivery confirmation on escalation rungs (SMTP; provider seam) | P5-01 | §11.3; G-06 | An escalation rung sends a real email (MailHog in dev) and records delivery against the rung | M |
| P5-06 | Connector framework + one real read-only connector (recommend: directory/HR CSV/SCIM import for people/departments — cheapest real one with real value) + integrations status page honest about simulated vs real | P5-01 | §12; G-07 | The people list updates from a dropped CSV via the connector path with sync history and attributed source; simulated spokes are labelled simulated | L |
| P5-07 | OIDC adapter + prod auth mode: openid-client flow, email→person mapping, switcher → view selector, dev impersonation disabled | P5-01 | G-02, G-17; §21.17 | Against a test IdP (Keycloak in compose-dev), login lands you as your mapped person; `/dev/impersonate` returns 404 in prod mode | L |
| P5-08 | Exports & report formats: register exports under the caller's scope (`BR-DAT-06`), pack PDF/XLSX generation, filters-on-the-face; governed manual regulator filing (record + acknowledgement attach) | P5-02 | §10.4; G-12, G-23 | An export as Deepa contains only her scope; an issued pack downloads as a PDF naming its basis and filters | L |
| P5-09 | Performance & scale pass: server-side pagination/filtering on all registers, cockpit materialization with write-tied invalidation (keeping I-1), NFR load test at §17.1 volumes ×2 | P5-08 | §17.1/17.2; G-20 | Registers stay <500ms at 10× seed volume; a mutation visibly invalidates the affected cockpit number | L |
| P5-10 | Delegation (minimal per §21.13): time-boxed stand-in inherits queue + maker rights, never approval rights, trail names both | P5-01 | §4.13; G-16 | A delegate can attach evidence "as" the owner but cannot approve; both names appear in the audit entry | M |
| P5-11 | Accessibility + hand-off package: keyboard/contrast/labels pass, state-never-colour-alone audit; `install.md`, image tarballs, restore drill, ops runbook (health, chain verify, backup cadence) | P5-09 | §17.4; G-28; hand-off | A fresh machine goes from tarballs to a running seeded stack following only `install.md`; axe scan has no critical violations on the ten main screens | L |

*(Phase 0: 13 · Phase 1: 19 · Phase 2: 14 · Phase 3: 10 · Phase 4: 6 · Phase 5: 11. Grand total: **73 chunks** — 67 from v1.0, plus the five v1.1 spec-alignment chunks (P0-13, P1-18, P2-13, P2-14, P3-10), plus the v1.2 colour-discipline chunk P1-19. Nothing renumbered.)*

---

## 7. Learning track

Named concepts per phase — what you need to *understand* to review the work, one sentence each on why it matters here. Learn each just before its phase, not up front.

**Phase 0.**
- *Database migration* — a versioned, replayable script that changes the schema; it is why every client deployment can be upgraded identically and why schema changes are reviewable diffs.
- *Database transaction (ACID)* — a group of writes that commits or fails as one; it is the entire mechanism behind "a change that is not logged must not commit".
- *NestJS guard / interceptor / provider* — the request pipeline hooks where authority is checked and the backstop lives; knowing which runs when tells you where a check can and cannot be enforced.
- *HTTP sessions and cookies* — how the server knows who is calling; the reason the persona switcher can become a real server-side identity change.

**Phase 1.**
- *Hash chaining* — each log row includes the previous row's hash, so any past edit breaks every later hash; this is the whole of "tamper-evident", verify it once by hand.
- *Idempotency* — an operation safe to run twice with the same result; the scheduler reconciler depends on it so a restart never double-chases anyone.
- *Optimistic locking* — writes carry the version they read and fail if it moved; it is how two users don't silently overwrite each other (§17.5).
- *Content hashing (sha256) of files* — a fingerprint proving an evidence artifact is byte-identical to what was captured; it is what makes the vault defensible.

**Phase 2.**
- *State machines* — the enumerated legal transitions of §7.3; reviewing a workflow PR mostly means checking transitions against the table, not reading the code.
- *Derivation vs. materialization* — computing on read vs. caching a computation with invalidation; the difference decides whether a cockpit number can lie.
- *Feed/provider seams (dependency inversion)* — code depending on an interface, with implementations swapped by config; it is how CCM ships simulated now and becomes real without rework.

**Phase 3.**
- *Payload polymorphism (the campaign container)* — one engine, opaque per-type payloads; the review question is always "did the container stay ignorant of the payload?".
- *Snapshot vs. live view* — the issued pack is frozen as evidence while the queries move on; both are correct, for different questions.
- *Write-back on approval* — campaign results patch the register only at the approval gate; this is what makes an assessment cycle move the register instead of being theatre.

**Phase 4.**
- *Structural vs. configured security* — a field that doesn't exist cannot leak; review the schema, not the settings, to verify Requirement 22.
- *Row-level access by person* — access lists checked per record, overriding role; the one place the ordinary model is deliberately not enough.
- *Data minimization* — collect and hold only what the purpose needs; the design stance behind reference codes, masked PRANs and act-not-content logging.

**Phase 5.**
- *OIDC in one sentence* — the app redirects to the IdP, the user authenticates there, the app gets back a signed token naming them, and maps that name to a Person; the platform never sees a password.
- *SMTP and delivery confirmation* — email is fire-and-forget unless you record acceptance per message; "we escalated" needs that record.
- *Caching and invalidation* — the only hard part of performance work here; a cache invalidated by the writes that affect it preserves derive-don't-store, any other cache breaks it.
- *Docker images, volumes and backups* — code is disposable and rebuilt from images; the data (pgdata + evidence) is the deployment, and the restore drill is the proof you can say that to a client.

---

## 8. Open decisions that block work

Each mapped to §21, tagged with the first chunk it blocks, with a recommended default so nothing stalls. Defaults apply automatically unless you overrule before the blocking chunk starts.

| §21 | Decision | Blocks | Recommended default |
|---|---|---|---|
| 2 | Scope breadth of first release | P1-02 | Seed the **full** Appendix A world (the generators make breadth free); *build* breadth follows the phases |
| 3 | Lead anchor | P0-04 | The source-to-action pipeline — already locked as the spike |
| 4, 5 | How real the intelligence is | P5-03 | Deterministic provider in v1, honestly labelled on-screen ("scripted assistant"); real model behind the same seam post-v1 |
| 6 | Pilot integration depth | P5-06 | One real read-only connector (directory/HR import); everything else simulated-and-labelled |
| 8, 9 | Evidence/history migration & incumbent parallel-run | deferred | Nothing until a real client signs; §18 tooling is client-project work, not product work |
| 10 | Deployment / residency model | P0-02 | Single-box Compose, customer-hosted; split-plane only if a client's residency demands it |
| 11 | "Control coverage" definition | P1-14, P2-11 | **Decided (spec v2.1 §21.11, no longer a default):** both built, labelled "Control pass rate" and "Duty coverage"; bare "coverage" banned from the UI; definitions per the dashboard doc (M5/M6/M8) |
| 12 | Line-of-defence constraints on maker-checker | P1-03 (schema), P5-01 (config) | Enforce "not the same person" only in v1; carry lod on Person + a config flag so the constraint is a Phase-5 config, not a migration |
| 13 | Delegation model | P5-10 | Time-boxed stand-in; inherits queue + maker rights, **never** approval rights (per spec's own recommendation) |
| 14 | Clock-start rules per regulator | P2-06 | Per-regulator config rows: default start = detection; discovery-based start recorded with explicit divergence (`BR-SCH-07`); customer-editable via P5-01 |
| 15 | Company Secretary as switchable persona | P1-16 | **Yes** — he holds clause authority and a distinct calendar; add to the dev persona picker |
| 16 | TPRM ownership (roster inconsistency: Imran Sheikh is Administrator in spec §4.2 but "Vendor/TPRM" in the prototype's CLAUDE.md) | P2-01 seed, P3-04 | Follow spec §4.2 (Imran = Administrator); assign each vendor a named first-line owner in the seed; flag the org-design question to the customer |
| 17 | Persona switcher after real auth | P5-07 | Dev impersonation exists only in `AUTH_MODE=dev`; **no** production impersonation in v1; support access is a later, separately-audited decision |
| 18 | Retention floors | P1-06 | Configurable with hard floors: audit log 10 years, evidence 8 years, closed investigations 8 years — placeholders to confirm against PFRDA/Companies Act/DPDP counsel before any real deployment |
| 19 | Purging closed investigations | P4-02 | Never purge in v1; revisit with 18 |
| 20 | Sector-pack extension model | P3-09 | Registry-driven sections (config lists which sections/committees/templates a pack takes) — cheap now, makes a second sector mostly configuration |

**Spec inconsistencies formerly listed here — all resolved by spec v2.1 (no ruling pending):** (a) obligation identity across cycles — **ruled**: `Obligation` + `ObligationCycle`, cycle id `<dutyId>.<period>`, never rendered inline (spec §7.1/§7.4). (b) Exception vs host-Issue state machines — **ruled**: Exception is first-class with its own machine; the register is a union view; no host issue exists (spec §5.14, `BR-LFC-13`). (c) Task states vs the maker-checker pattern — **ruled**: one task machine (`Open·InProgress·Submitted·Returned·Done·Cancelled`) gated by `completionPolicy`; the maker-checker states are projections of it (spec §5.7/§7.3). (d) Incident `Eradicated` (prototype) vs spec's three states — spec wins, eradication is a timeline event (unchanged).

---

*End of plan. Chunk IDs are stable — reference them in commits (`feat(P1-08): reminder engine reconciler`) so progress is traceable against this document.*


---

## Related in this vault

Each phase has a note carrying every chunk as a stable link anchor: [[phase-0-proof-chain-spike]] · [[phase-1-platform-floor]] · [[phase-2-risk-and-events]] · [[phase-3-cycles-and-assurance]] · [[phase-4-investigations-and-privacy]] · [[phase-5-intelligence-admin-handoff]]. From any chunk anchor: the workflows it builds, the rules it enforces, the gaps it closes, the requirements it proves. Start at [[start-here]]; the requirement-to-chunk map is in [[traceability]].
