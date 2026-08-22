# OneGRC — Current System Spec (Page-by-Page)

> **Purpose of this document.** A granular, page-by-page snapshot of the OneGRC prototype **as
> currently built**, so any enhancement work starts with an accurate picture of what exists. This
> captures routes, layout, data, interactions and cross-links per screen, plus the shared
> component vocabulary and the seeded data model. It is a *description of the code*, not the
> aspirational spec — for the standing product spec see [`CLAUDE.md`](../CLAUDE.md).

**Product:** OneGRC · **Customer:** Sankalp Pension Funds Pvt. Ltd. (SPF) · **Package:** `onegrc`
**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn-style primitives + Recharts + React
Router + Zustand + date-fns + lucide-react.

---

## 1. Architecture at a glance

### Runtime shape
- **No backend.** Everything is an in-memory, deterministically-seeded "world" built once at
  module load (`src/data/world.ts`). Reloads are stable; session state (role, toasts, drawer,
  command palette) lives in a single Zustand store (`src/store/index.ts`) and resets on reload.
- **Demo "now"** is frozen at **Wed 10 Jun 2026, 05:02:18 IST** (`src/lib/time.ts`). All
  countdowns and relative timestamps derive from this anchor, chosen so the marquee CERT-In
  6-hour clock reads ~03:11:42 remaining on first paint.
- **Responsive ≥1024px only** — the shell enforces `min-w-[1024px]`.
- **All actions are mocked**: exports/uploads/approvals push a toast and/or open a drawer; no
  data mutates.

### Source layout
| Path | Contents |
|---|---|
| `src/types/index.ts` | All entity type definitions (single file) |
| `src/data/` | Seed generators: `world.ts` (the world + cross-linking + provenance pass), `sources.ts` (the Source & Provenance seed — instruments + clauses), `people.ts` (15 roster + 6 roles), `refs.ts` (framework clause pools), `rng.ts` (seeded `Rand`) |
| `src/pages/` | One file per route (+ `home/`, `risks/`, `obligations/`, `settings/` subfolders); Source Library is `Sources.tsx` / `SourceInstrumentDetail.tsx` / `SourceSectionDetail.tsx` |
| `src/components/` | The reusable A7 vocabulary + `SourceRef.tsx` (source list/chip) + `SaveClauseChooser.tsx` (save-clause modal) + `shell/` (Layout, Sidebar, TopBar, ContextStrip, DrawerHost) + `ui/` (Button, Tabs) |
| `src/lib/` | `time.ts`, `clocks.ts`, `ccm.ts`, `heatmap.ts`, `trends.ts`, `format.ts`, `entity.ts`, `sources.ts` (provenance + clause-pipeline helpers), `copilot/` (`context.ts`, `response.ts` — grounded-answer seam), `regulators.tsx`, `useInterval.ts`, `utils.ts` |
| `src/store/index.ts` | Zustand app store (session UI state + clause-pipeline overrides + session-minted controls) |
| `src/App.tsx` | Route table |

### App shell (wraps every route — `src/components/shell/Layout.tsx`)
Fixed left **Sidebar** (w-60) + main column with **TopBar** (h-14) → **ContextStrip** (h-9) →
scrollable `<main>` (content capped at `max-w-[1480px]`, `px-6 py-5`). Global **Toasts**,
**CommandSearch** and **DrawerHost** are mounted once at the shell level.

- **TopBar:** org switcher ("Sankalp Pension Funds · PFRDA NPS Pension Fund Manager" — static),
  ⌘K command-search trigger, notification bell (pushes a 3-notification toast), an "1 Critical
  incident live" button (xl+ → `/incidents/INC-2026-0411`), and the **RoleSwitcher**.
- **ContextStrip (vital signs):** five clickable stats — Open incidents `5 / 1 Critical`
  (→`/incidents`), Nearest clock (live countdown via `nearestTrack()`, →`/incidents/{id}`),
  Control coverage `96.2%` (→`/controls`), Overdue obligations `9` (→`/obligations`), Open
  findings `27` (→`/audits`). Right side: "11 spokes connected · AUM ₹3,24,718 cr · 41,86,902
  subscribers".

### Sidebar / IA (fixed order — `src/components/nav-config.ts`)
- *Pinned top:* **Home** (`/`; label shortened from "Home — Board Cockpit"), **My Queue** (`/queue`)
- **RISK & CONTROL:** Risk Register · Control Library · Continuous Control Monitoring · Policies
- **INCIDENTS & CLOCKS:** Incidents · Regulator Clocks
- **COMPLIANCE:** Obligations & Calendar · Regulatory Change · **Source Library** (`/sources`, icon `Scale`) · PFRDA Pack · DPDP / Data Governance
- **AUDIT & ASSURANCE:** Audits · Issues & Remediation · Evidence Vault
- *Pinned bottom:* Integrations · Settings

### Route table (`src/App.tsx`)
All routes nest under `<Layout>`. List + detail pairs for every major entity. `*` → `ComingSoon`
(404). Routes: `/`, `/queue`, `/risks(/:id)`, `/controls(/:id)`, `/ccm(/:id)`, `/policies(/:id)`,
`/incidents(/:id)`, `/clocks`, `/obligations(/:id)`, `/reg-change(/:id)`, `/sources`,
`/sources/section/:id` (clause detail — declared **before** `/sources/:id` so it matches first),
`/sources/:id` (act/instrument detail), `/pfrda`, `/dpdp`, `/dpdp/dsar/:id`, `/audits(/:id)`,
`/issues(/:id)`, `/evidence`, `/integrations`, `/settings`.

### Session store (`src/store/index.ts`)
Zustand, resets on reload. Holds `role` (the only "auth"), `toasts`, `drawer`, `commandOpen`, an
`artifacts` list (session-held generated templates/evidence — a design seam, no persistence), and
the **Sources pipeline session state**:
- `clauseOverrides` — per-clause overrides written by the Save / Specialist / applicability
  actions (`status`, `linkedControlId`, `reviewer`, `reviewedAt`, `rationale`, `specialistNote`,
  `applicable`). Merged over the seeded clause via `effectiveClause()` so the act→clause→control
  pipeline appears to advance live without mutating the seed.
- `sessionControls` — controls minted in-session by "create new control from this clause"
  (`CTRL-COMP-NEW-NNN`); `createControlForClause()` then saves the clause to it.
- Actions: `saveClauseToControl`, `createControlForClause`, `engageSpecialist`,
  `completeSpecialist`, `setClauseApplicability`. Save/specialist actions are gated to the
  Compliance Officer / Company Secretary roles in the UI.

---

## 2. Data model & seeded volumes

Types in `src/types/index.ts`; generated in `src/data/world.ts`; all entities cross-link by id.
A `crossLink()` pass wires bidirectional references, then `buildActivity()`, `buildQueue()` and
`METRICS` are computed.

| Entity | Volume | Key shape / notes |
|---|---|---|
| **SourceInstrument** | 22 | The parent legal instrument (act / rules / circular / direction / standard). IDs `INST-EPF-1952` style. Fields: `authority`, `regulator?`, `instrumentType`, `dateOfIssue`, `effectiveDate?`, `version?`, supersedes/supersededBy links, `sourceChannel`, `sourceLink`, optional `attachedDocument` (mocked artifact), `status` (In force / Superseded / Draft / Repealed), `summary` + `applicability`. Includes 7 framework-standard references (ISO/NIST/PCI) and 8 "recently arrived" Draft instruments. |
| **SourceProvision (clause)** | 36 | A clause/section of one instrument. IDs `SRC-DPDP-8-5` / `SRC-CERTIN-2022`. Owns the structured compliance fields (`nameOfCompliance`, `briefDescription`, `whatItMeans`, `keyParts[]`), sourced `penaltyTiers[]` → derived `severity` (severity-from-penalty), `frequency`/`nextDue`, applicability to SPF, an `aiRecommendation` (scripted `AgentAction` from "Ingestion Agent", non-round confidence), and the **pipeline status** (`Processing`/`Recommended`/`Saved`/`Specialist review`/`Not applicable`) + `linkedControlId`. 4 framework-standard clauses are reference-only (no status). |
| **Risk** | 140 | domains IT 30 / Cyber 26 / Operational 28 / Investment 22 / Compliance 20 / ThirdParty 14. `likelihood`/`impact` 1–5, `inherent`/`residual` 1–25, `treatment`, `trend`, linked controls/incidents/issues. IDs `RISK-IT-0142` style (prefixes IT/CYB/OPS/INV/CMP/TPR). |
| **Control** | 260 (+4 seeded compliance + session) | primary allocation ISO 93 / NIST 59 / PCI 44 / PFRDA 64. Each maps to 2–4 frameworks (`mappedFrameworkRefs`, each carrying an optional `sourceRef`). Result distribution enforced **220 Pass / 30 Partial / 10 Fail → coverage 96.2%**. **38 CCM-automated.** Marquee "patch ≤14 days" control forced CCM + **Failing**. New fields: `description`, `frequency`, `nextDue?`, `sourceRefs[]` (provenance). Plus **4 seeded `CTRL-COMP-*` compliance controls** (see below) and any `CTRL-COMP-NEW-*` minted in-session. |
| **Incident** | 60 | 1 live Critical marquee (`INC-2026-0411`) + 4 open High + 55 closed. `regulatorTracks[]`, `timeline[]`, `subscriberImpacting`, `personalDataInvolved`. Sources: Splunk SIEM, CrowdStrike EDR, Qualys VM, Sankalp ServiceDesk (ITSM). |
| **Obligation** | 180 | regulators PFRDA/CERT-In/DPDP/GST/Labour/Companies Act. Status plan **9 Overdue / 23 Due / 28 In review / 120 Filed**. `makerChecker {maker, checker, state}`, `evidence[]`, optional `linkedRegChange`. New provenance fields: `sourceRefs[]` (clause(s) the obligation derives from), `requirement`, `applicability`. |
| **Policy** | 45 | `version`, owner, approvedBy/On, nextReview, `mappedControls[]`, status Published/In review/Draft, category. New: `sourceRefs[]` (clause provenance, attached in the world's provenance pass by category). |
| **Issue** | 120 | source Control failure / Audit finding / Incident (+`sourceRef`), severity, owner, dueDate, ageDays, status. One is the marquee "Breached patch SLA — 3 critical vulnerabilities past the 14-day window". |
| **Evidence** | 600 | ~70% auto (`EVD-44000…44419` auto, rest manual). type, capturedAt/By, `auto`, linkedControls/Obligations, frameworkRefs, source feed. |
| **Audit** | 18 | types IS audit (CERT-In empanelled) / Internal / PFRDA. **27 open findings** distributed across the first 8 audits (`[6,5,4,3,3,2,2,2]`). Each open finding spawns a 1:1 remediation Issue. |
| **RegulatoryChange** | 90 | source TeamLease RegTech / Lexplosion Komrisk / PFRDA circular. IDs `RCM-2026-118` descending. Featured: 118 (GSTR-3B Table 4), 117 (Scheme E exposure caps). Provenance line "12,973 updates captured in 2025". |
| **DataAsset** | 120 | stores CRA / KYC DB / Fund Accounting / CRM; piiTypes, classification, retentionRule, consentStatus, record count. |
| **Dsar** | 14 open | worked erasure-vs-retention case `DSAR-2026-0047` first, then 13 generated. |
| **ActivityItem** | 15 | cross-domain stream, real IST timestamps near NOW, each with a `route`. |
| **QueueTask** | ~12–14/role × 6 roles | role-aware; kind, ref, route, due, priority. |

### Headline metrics (`METRICS`, used on Home + ContextStrip)
`enterpriseRisk 7.8/10 ▲`, `controlCoverage ≈96.2%`, `ccmAutomated 38`, `openIncidents 5`,
`criticalOpen 1`, `overdueObligations 9`, `dueSoonObligations 23`, `openFindings 27`,
`aumCrore 324718`, `subscribers 4186902`, `regUpdates2025 12973`.

### The signature cross-link chain (the thesis, made literal)
The failing **patch-SLA CCM control** → auto-spawned **Issue** ("Breached patch SLA — 3 critical
vulnerabilities…") → linked to the **marquee incident** `INC-2026-0411`, which carries three
regulator tracks. Evidence `EVD-44192/44193/44201/44215` is attached to the incident. The same
records surface in CCM, Issues, Incident detail and the Home activity stream.

### Source & Provenance model (`src/data/sources.ts`) — the Sources pipeline
THE single source model (Epic 1 seam, normalized in Epic 15): a parent **`SourceInstrument`** (the
legal instrument) holds its children **`SourceProvision`** clauses. There is deliberately no second
source model — obligations, policies and controls all cite clause ids (`SRC-…`) via `sourceRefs`,
and the same model is reused for the **act → clause → control** pipeline (Epics 14/15). Supporting
types: `AttachedDocument` (mocked artifact), `AgentAction` (scripted recommendation + provenance +
confidence — never a model call), `PenaltyTier` (sourced consequence; `severityFromPenalty()`
derives the clause severity).

The 22 instruments include focus acts broken into clauses — **DPDP Act 2023 & Rules 2025**
(`INST-DPDP-2025`, ₹250 cr penalties), **PFRDA Investment Guidelines** (`INST-PFRDA-INV-2025`
v2025.12, supersedes the 28 Mar 2025 version), **CERT-In Directions 20(3)/2022** (`INST-CERTIN-2022`
— 6h / 180-day / NTP), Companies Act 2013, CGST Act 2017, EPF Act 1952, Maharashtra Profession Tax
1975 — plus framework standards (ISO 37301/27001, NIST CSF 2.0, PCI DSS v4.0) as reference-only
instruments, and **8 "recently arrived" Draft instruments** dated Jun 2026 (revised GSTR-3B Table 4,
EPFO higher-pension ECR, DPDP commencement notice, PFRDA exposure clarification, Social Security
Code draft rules, CERT-In ransomware advisory) whose clauses sit at `Processing`/`Recommended` —
this is the in-place "compliance intake" (no separate `/intake` route).

### Compliance controls (`CTRL-COMP-*`, seeded in `world.ts`)
Four tracked controls that statutory clauses are saved to, pre-wired as the worked pipeline outcome:
- **`CTRL-COMP-DPB-01`** Personal-data-breach detection & notification (owner Priya, shared —
  satisfies **two acts**: DPDP §8(6) `SRC-DPDP-2025` + CERT-In 6-hour `SRC-CERTIN-2022`).
- **`CTRL-COMP-SEC-01`** Personal-data security safeguards (CCM; ← `SRC-DPDP-8-5`).
- **`CTRL-COMP-INV-01`** Investment universe & exposure monitoring (← `SRC-PFRDA-INV-2025` +
  `SRC-PFRDA-INV-COMMITTEE`).
- **`CTRL-COMP-LOG-01`** Log retention & NTP time-sync (CCM; ← `SRC-CERTIN-LOGS`).

### Provenance pass (`world.ts`)
After the world is built, a pass attaches real instrument sources to records: obligations get
`sourceRefs` by regulator (+ title-specific clauses), policies by category, and every control's
`mappedFrameworkRefs` gets a per-framework `sourceRef` (via `sourceForFramework`). The reverse
lookup (`citingRecords` in `lib/sources.ts`) resolves any clause back to what it produced.

### Personas & roles (`src/data/people.ts`)
15-person roster; 6 switchable roles drive My Queue + which approvals appear (the only "auth"):
**CRO** Meera Krishnan (default) · **CISO** Rajesh Iyer · **COMPLIANCE** Anjali Deshmukh ·
**COSEC** Vikram Rao · **AUDIT** Sunita Menon · **INVCOMP** Arvind Patel. Each person carries a
line-of-defence tag (1LoD/2LoD/3LoD). The Source Library **Save / Engage specialist** actions are
restricted to the Compliance Officer and Company Secretary roles.

---

## 3. Page-by-page spec

> Conventions used below: **List pages** use the shared `DataTable` (search + filter dropdowns +
> sortable columns + row-click navigation + "Export" → toast). **Detail pages** use a back link,
> `PageHeader` (eyebrow/title/description/actions) and a two-column body (~1.7fr / 1fr) with a
> `CrossRefPanel` ("where this also appears") on the right where relevant.

---

### 3.1 Home — Board Cockpit (`/`)
The board landing page. Top-to-bottom:

1. **Hero strip** (gradient): "Board Cockpit · {IST timestamp}", "**Good morning, Meera —
   OneGRC**". Right (lg+): "Export board pack" button. *(The thesis-tagline paragraph and the
   AUM / subscribers / spokes sub-stats were removed from the hero — those figures still live in
   the ContextStrip and the KPI/PFRDA tiles.)*
2. **6 KPI tiles** (xl: 6-col): Enterprise risk `7.8/10` ▲+0.3 QoQ (→`/risks`) · Control
   coverage `96.2%` + sparkline (→`/controls`) · Open incidents `5` / "1 Critical · 4 High"
   (→`/incidents`) · Nearest clock (live inline `RegulatorClock`, "6-hour incident report",
   →`/incidents/{id}`) · Overdue obligations `9` (→`/obligations`) · Open findings `27` "Across
   18 audits" (→`/audits`).
3. **Heat map + Needs Attention** (2-col):
   - **HeatMap** (`home/HeatMap.tsx`): hand-built inline-SVG **5×5 residual heat map** (62px
     cells). Y = Impact (Severe→Low), X = Likelihood (Rare→Almost certain). Cell bg by score
     band; per-domain colored dot clusters (up to 9); risk count badge. Click a populated cell →
     `/risks?likelihood={l}&impact={i}`.
   - **NeedsAttention** (`home/NeedsAttention.tsx`): left = **Live incident track** (marquee
     incident featured with its three regulator clocks, then other open incidents) →incident
     detail; right = **Overdue obligations** watchlist (regulator badge, due date, owner) →
     obligation detail.
4. **TrendCharts** (`home/TrendCharts.tsx`): three 30-day Recharts cards — Open incidents
   (AreaChart, ends 5), Control pass-rate (LineChart, ends 96.2%), Obligations on-time
   (LineChart, ends 94.6%). Data from `src/lib/trends.ts`.
5. **ActivityStream** (`home/ActivityStream.tsx`): 15-row cross-domain audit trail; per-kind
   icon badge (ccm-fail, ccm-pass, reg-change, evidence, dsar, incident, obligation, approval,
   audit, policy), ref id + actor + IST timestamp; row → `activity.route`.
6. **Footer:** centered, with "view integrations" link → `/integrations`.

### 3.2 My Queue (`/queue`) — role-aware
`PageHeader` shows the active persona + role; action badges "{n} open", "{n} overdue",
"{n} on the clock". **Filter pills** by task kind (Incident action, Approval, Control re-test,
Reg-change review, Evidence request, DSAR) — only kinds present render; resets to "All" on role
change. **Task list** rows: kind icon, title, ref (mono) + kind + maker-checker counterparty
(label varies: Checker/Tester/Responder/Requested by/Raised by/Assessor), SLA/due (red if
overdue), priority `SeverityBadge`, and a quick-action button (Approve/Re-test/Action → toast).
Row → `task.route`. Footer ties it to three-lines-of-defence + maker-checker. Queue is filtered
to the current `role`; ~12–14 tasks per role, seeded in `buildQueue()`.

### 3.3 Risk Register (`/risks`) + Risk detail (`/risks/:id`)
**Register:** description + 6 domain-count summary pills. A dismissible **heat-map filter
banner** appears when `?likelihood&impact` query params are set (deep-link from Home). Table:
Risk ID · Title · Domain (colored chip) · Owner (avatar) · **Inherent** (hollow `ScoreBadge`) ·
**Residual** (filled `ScoreBadge`) · Treatment · Status. Filters: Domain / Owner / Residual band
/ Treatment. Initial sort **residual desc**; right-slot "sorted by residual · {n} critical".
Export → toast `risk-register-jun-2026.csv`.

**Detail:** back link + header (status chip + Export). Left column: **Inherent vs residual
position** card with the `RiskPositionMap` (5×5 SVG showing hollow inherent circle → filled
residual circle + dashed mitigation arrow) and a score sidebar (likelihood/impact, inherent &
residual bands, "Mitigation effect: −{points}"); **Treatment plan** card (treatment-specific
narrative, target residual, owner/LoD/linked-control pass count/last reviewed); **History**
timeline (RCSA review, committee review, registered). Right column: `CrossRefPanel` — Controls
mitigating / Incidents that realised / Open issues — plus the "**Shared object**" thesis card.

### 3.4 Control Library (`/controls`) + Control detail (`/controls/:id`)
**Library:** "**Map once, satisfy many**" description + 4 stat pills (Avg frameworks/control ·
Mapped to ≥2 frameworks · CCM-automated · Failing). Table: Control ID · Title · **Frameworks
satisfied** (`FrameworkPills`) · **Satisfies clauses** (a "{n} clauses · {m} acts" badge, from
`clausesForControl()` over the live `clauseOverrides`) · Owner · Type · Automation (CCM/Manual
badge) · Last tested · Result chip · Evidence count. Filters: Framework / Automation / Result /
Owner. Export → toast.

**Detail:** header with result badge, optional "View CCM rule" (→`/ccm/{ruleId}`), "Re-test" →
toast. **Map-once banner** lists the framework refs this one control satisfies. **5 tabs:**
- **Overview** — control attributes grid + "Risks mitigated" (up to 6 → risk detail) + a
  **Source** card (`SourceList` over `control.sourceRefs`) + a **"Satisfies — clauses across
  acts"** card grouping the saved clauses by their act (each act + clause → Source pages). This is
  the control-side of the act→clause→control thesis: one control, many clauses across acts.
- **Mappings** — per-framework mapping cards (each with a `SourceChip` → source viewer) + "tested
  {N}× without unification" callout.
- **Test history** — 6-row synthesized table (run date, result, method, tester, note).
- **Evidence** — `EvidenceList` + "{auto} auto / {manual} manual" + "Attach evidence" → drawer
  `evidence-upload`.
- **Issues** — linked issues table → issue detail (or "operating effectively" empty state).

Footer "Export control sheet" → drawer `export-pdf`.

### 3.5 Continuous Control Monitoring (`/ccm`) + CCM rule detail (`/ccm/:id`)
CCM rules are **synthesized** from the 38 CCM-automated controls in `src/lib/ccm.ts` (seeded
populations/pass-fail counts; the patch rule gets 3 hardcoded failing CVEs).

**List:** 4 KPIs (Automated rules / Passing / Degraded / Failing). Rule rows: status icon, name
+ "auto-escalated" badge (if it spawned an issue), ruleId/feed/last-run/frequency, framework
pills, pass population stats. Row → `/ccm/{ruleId}`.

**Detail:** header status badge + optional "View control". 5-stat run strip (Population /
Passing / Failing / Last run / Cadence) + "Satisfies" framework pills. Left column: **failing
population table** (CVE · asset · age · SLA · detected) *or* a passing progress bar; the
**auto-escalation chain** visual (CCM rule failed → Evidence captured → Issue spawned → Incident
linked, the latter two clickable) with Issue + Incident cards. Right column: auto-captured
`EvidenceList`, "How this rule runs" detail list, "Export run report" → toast + drawer
`export-pdf`. **This page is where the CCM→Issue→Incident thesis chain is most explicit.**

### 3.6 Policies (`/policies`) + Policy detail (`/policies/:id`)
**List:** status summary badges (Published / In review / Review overdue). Table: Policy ID ·
Title · Category · Version · Owner · Approved by · Next review (overdue → warning) · Mapped
controls count · Status. Filters: Category / Status / Owner. Export → toast.

**Detail:** header (status chip + "Download policy" → drawer `export-pdf`). Left: policy details
grid + frameworks-covered pills; **Version history** vertical timeline; **Approval chain**
(maker-checker: Drafted → Reviewed → Approved, with checkmarks). Right: a **Source** card
(`SourceList` over `sourceRefs` → source viewer) + **Mapped controls** list (each → control detail)
+ "Policy → control → evidence" blurb.

### 3.7 Incidents (`/incidents`) + Incident detail (`/incidents/:id`) — **MARQUEE**
**List:** 5 summary stats (Open / Critical live / High open / Subscriber-impacting / Total
logged). Table: Incident ID (pulsing red dot if open) · Title · Classification `SeverityBadge` ·
Source · Detected at (IST) · Impact badges (Subscriber / PII) · Status. Filters: Classification
/ Source / Status. Initial sort detected desc.

**Detail — `INC-2026-0411` "Ransomware on fund-accounting server":**
- **Critical banner:** severity + id + status + "AUTO-CLASSIFIED · PFRDA ICS 2024" badge; title;
  detected time / source (+"ticketed in Sankalp ServiceDesk") / owner; subscriber-impacting +
  personal-data flags. Action buttons (right): **Generate CERT-In report** → drawer
  `cert-in-report`; **Notify PFRDA** → drawer `pfrda-notify`; **Open DPDP track** → drawer
  `dpdp-track`. Summary paragraph below.
- **Regulator tracks** (3 cards side-by-side): each a live `RegulatorClock` + a regulator-specific
  note + started/due timestamps + an action button. CERT-In (6h, Annexure I, Direction
  20(3)/2022, 180-day in-India log retention + NTP), PFRDA (48h subscriber-impacting + quarterly
  Annexure + annual audit), DPDP Board (~72h breach intimation).
- **Unified timeline** (`Timeline`, 12 seeded events from SIEM detect → containment → 3 clocks
  started → CERT-In draft → CRO/CISO sign-off) + **auto-classification rationale** (4 bullets).
- Right: **Affected assets** (from ServiceDesk CMDB), `CrossRefPanel` (Control failure that
  spawned this / Risk realised / Issues), **Evidence trail** (`EvidenceList`, "captured once,
  reused across CERT-In, PFRDA and DPDP"), "Export incident pack" → drawer `export-pdf`.

### 3.8 Regulator Clocks (`/clocks`)
"One calendar, one clock." Three sections:
1. **Standing CERT-In requirements** — 180-day in-India log retention (Compliant), NTP sync
   (Synced), 6-hour reporting (Armed).
2. **Live incident clocks** — grid of `RegulatorClock` cards from `activeTracks()`, each linking
   to its incident.
3. **Upcoming regulatory deadlines** — soonest 12 obligation countdown cards (`ObligationClock`),
   each → obligation detail.
Footer summary line counts incident clocks / overdue obligations / time to nearest deadline.

### 3.9 Obligations & Calendar (`/obligations`) + detail (`/obligations/:id`)
**List/Calendar toggle.** Per-regulator summary chips (total + overdue) + global "{9} overdue /
{23} due ≤30 days" badges.
- **List table:** Obligation ID · Regulator (`RegulatorChip`) · Title · Frequency · Due date
  (relative; red overdue / orange due-soon) · Owner · **Maker-checker** (`MakerChecker`) ·
  Status. Filters: Regulator / Status / Frequency / Owner.
- **Calendar** (`obligations/ObligationCalendar.tsx`): hand-built month grid (7-col, Sun–Sat),
  obligations grouped by IST date, up to 3 per cell + "+N more", regulator-colored dots, overdue
  cells tinted; month nav + Today; cell items → obligation detail.

**Detail:** due-date callout; left = `MakerCheckerChain` + attribute grid, **Evidence & filing
acknowledgements** (`EvidenceList` + "Upload ack" → drawer `evidence-upload`); right = **Source**
card (`SourceList` over `sourceRefs` → source viewer drawer) + **Source regulatory change** card (→
reg-change detail, if any) + "One calendar" info card. Header action "Submit for check" / "Approve
filing" → toast.

### 3.10 Regulatory Change (`/reg-change`) + detail (`/reg-change/:id`)
**List:** provenance banner "**12,973 updates captured in 2025** · TeamLease RegTech · Lexplosion
Komrisk · PFRDA circulars" + open/total KPIs. Two **featured cards** (`RCM-2026-118` GSTR-3B,
`RCM-2026-117` Scheme E exposure caps). Table: Change ID (✨ if featured) · Regulator · Summary ·
Source · Published · **Impact** ("{n} obl / {n} ctrl" badges) · Owner · Status. Filters:
Regulator / Source / Status.

**Detail:** "What changed" narrative; "**Owner alerted automatically**" banner (special-cased for
118/117); **Impact flow** diagram (Source → Obligations/Controls updated → Owner alerted);
**Impacted obligations** list (→ obligation detail) + **Impacted controls** list (→ control
detail). Header "Acknowledge impact" → toast.

### 3.10a Source Library (`/sources`) — the acts behind the controls
List of the 22 instruments. Description "**The acts behind the controls**"; 4 KPIs (Acts · Clauses ·
Awaiting decision · Saved to controls — the last three rolled up from `clauseOverrides`). Table:
Act / instrument (title + id) · Authority · Type · Clauses · **Awaiting** (count badge, "tracked"
tick, or —) · **Status** (act-level chip from `actStatus()`: Processing / In review / Tracked, or
"Reference" for standards) · Last updated. Filters: Authority / Type / Status. Initial sort
**awaiting desc** so newly-arrived acts needing a decision float up. Row → act detail. Export → toast.

### 3.10b Source — Act / instrument detail (`/sources/:id`)
Back link to Source Library; header (id + type + authority eyebrow, `status` chip, "Open source" →
external link). If superseded, a banner links to the newer version. Two lead cards: **What this act
covers** (`summary`) + **How it affects SPF** (`applicability`). Then a wide **Clauses** table (one
row per `SourceProvision`, merged with overrides via `effectiveClause`): Clause (title + id) · Name
of compliance · Description · What it means · Penalty (top tier `SeverityBadge` + consequence) ·
When due · Applicability (Applicable / Not applicable) · Status (clause-pipeline chip) · **Action**.
The action cell is the pipeline: a **Save** + **Specialist** affordance for applicable clauses still
awaiting a decision (Compliance / Company Secretary only — `Save` opens `SaveClauseChooser`;
`Specialist` calls `engageSpecialist` + toast), a green linked-control chip once `Saved`, else a
chevron into the clause. Row → clause detail.

### 3.10c Source — Clause / section detail (`/sources/section/:id`)
Breadcrumb (Source Library / act) + header (id + provision eyebrow, `severity` + status chips).
Two-column: **left** = What this requires (`nameOfCompliance` + `whatItMeans`), `keyParts` list,
**Clause extract** blockquote + citation; **What happens if missed** (the sourced `penaltyTiers`,
each linking to its penalty-source clause, with the derived severity); and the **Recommendation +
decision** card — the scripted `aiRecommendation` (Ingestion Agent, confidence bar), the reviewer
stamp once acted, the **mocked specialist workflow** (engage → "Mark review complete" records a
`specialistNote`), and the **Decision** buttons (Save to a control / Engage specialist, role-gated).
**Right** = Source instrument card (→ act), Applies-to-SPF card (`applicabilityBasis`), How often /
by when, and **Mapped control** (→ control detail once saved, resolving session controls too). Save
opens `SaveClauseChooser`.

### 3.11 PFRDA Pack (`/pfrda`)
Pension-specific cockpit. Mandate context tiles (AUM ₹3.25L cr / 41.87L subscribers / PFRDA
obligation count / "E/C/G/A · Tier I & II"). Four sections:
1. **Periodical & compliance returns** — first 8 PFRDA obligations → obligation detail; "View
   all" → `/obligations`.
2. **Committee cadence** — 4 hardcoded committees (Investment / Risk Management / Audit / NRC)
   with chair, last/next dates.
3. **Exposure-limit monitoring controls** — filtered investment controls (CCM badge where
   applicable) → control detail.
4. **ICS incident reporting** — featured "48-HOUR" link to the marquee incident + quarterly/annual
   ICS obligation rows + ICS taxonomy note (circular `PFRDA/2025/05/ICS/01`).

**Report templates** — 6 buttons (Quarterly Compliance Return, ICS Incident Intimation, Annual
Cyber-Security Audit, Exposure-Limit Breach Report, Investment Committee Minutes, Half-yearly ICS
Self-Assessment) → drawer `export-pdf`. "Export PFRDA pack" → drawer `export-pdf`.

### 3.12 DPDP / Data Governance (`/dpdp`) + DSAR detail (`/dpdp/dsar/:id`)
**DPDP page:** 5 KPIs (Data assets / Records governed / Open DSARs / Consent captured % /
**Breach → incident** "1, routed to INC-2026-0411"). Left = **DSAR queue** (worked case
`DSAR-2026-0047` highlighted) → DSAR detail. Right = **OneTrust integrated spoke** card,
**Consent ledger** (Captured/Partial/Legacy progress bars), **Breach signal → incident** button
(→ marquee incident). **Data inventory table:** Asset ID · Data asset · Store · PII types
(colored badges) · Classification · Retention · Consent · Records. Filters: Store / Classification
/ Consent. Export → toast.

**DSAR detail (erasure-vs-retention worked case):** subject strip (masked PRAN, handler, raised/
due). Left = **workflow steps** (Locate → Check retention → Erase what's allowed → Log immutably
→ Update register & generate audit record) + **located-data & retention-decision table** (6 rows:
CRA/KYC/Fund Accounting/Security logs = Retain (statutory); CRM = Erased; grievance = Anonymised).
Right = **audit record generated** card (`ATR-DSAR-2026-0047`), "Why erasure is overridden"
explainer, "Export DSAR response" → drawer `export-pdf`. Header "Approve decision" → toast.

### 3.13 Audits (`/audits`) + Audit detail (`/audits/:id`)
**List:** stat pills (audit count / open findings / total findings). Table: Audit ID · Title ·
Type (PFRDA/IS-audit/Internal, color-coded) · Auditor · Period · Findings "{open}/{total}" ·
Status. Filters: Type / Status. Export → toast.

**Detail:** 4 stats (auditor / period / open findings / closed findings). **Findings →
remediation issues** section: each finding shows severity + id + status, and links to its spawned
Issue (→ issue detail) or "No remediation required". "Export Report" → drawer `export-pdf`.

### 3.14 Issues & Remediation (`/issues`) + Issue detail (`/issues/:id`)
**List:** stat pills (Open / Overdue / by source). Table: Issue ID · Title · Source (icon) · From
(sourceRef) · Severity · Owner · Age (red >90d) · Due (red overdue) · Status. Filters: Source /
Severity / Status / Owner. Initial sort severity desc. **Bulk selection** bar: Assign owner /
Mark in progress / Close selected → toasts.

**Detail:** header (severity + status + "Resolve" → toast). Left = remediation card (owner /
severity / age / due + overdue alert) + **linked controls** (→ control detail). Right = **source
card** tracing back to the originating control/incident/audit (route resolved by `sourceRoute()`)
+ "One object — close the loop" blurb.

### 3.15 Evidence Vault (`/evidence`)
Stat pills ("~600 items" / "{autoPct}% auto-captured" / "Linked to obligations {n}" / "All linked
to ≥1 control"). Table (no row navigation): Evidence ID · Title (type icon) · Type · Captured by
("CCM (auto)" badge vs person) · Source · Captured (relative) · Linked to ("{n} ctrl / {m} obl")
· Frameworks (`FrameworkPills`). Filters: Type / Capture (auto vs manual) / Source / Framework.
"Attach" → drawer `evidence-upload`; "Export" → toast.

### 3.16 Integrations (`/integrations`)
The "one platform" closing view. Stat pills (spokes connected / live feeds / "Backbone:
vendor-neutral GRC/IRM"). **Hand-built inline-SVG backbone-plus-spokes diagram** (viewBox
1060×660): central **OneGRC** backbone ("Unified GRC/IRM backbone · vendor-neutral ·
J2W-architected") with 10 spokes on an ellipse, each with status dot, last-sync time, flow
direction, and a click-through route:
- Sankalp ServiceDesk *(prominent, "KEPT — not replaced")* → `/incidents`
- Splunk SIEM → `/incidents` · Qualys/Tenable → `/ccm` · CrowdStrike EDR → `/incidents` ·
  Okta/AD → `/controls` · AWS Security Hub → `/ccm` · OneTrust → `/dpdp` ·
  TeamLease+Lexplosion → `/reg-change` · ClearTax/IRIS GST → `/obligations` *(filed-via, outbound)* ·
  NPS Trust+CRA → `/pfrda`.

Below: "**One platform instead of two**" card (One taxonomy / One calendar / One evidence trail /
Every regulator, one clock) + "BFSI precedents" card (AEON Bank, IDFC First Bank, Citizens
Business Bank; "Backbone selection remains the customer's decision"). Export → toast.

### 3.17 Settings (`/settings`)
Left section-nav (9 sections) + right content; "changes route through maker-checker" note. Data
in `src/pages/settings/settingsData.ts`. Sections:
1. **Organisation** — profile fields (legal entity, PFRDA reg, CIN/PAN/GSTIN, office, FY close,
   schemes, AUM, subscribers); Edit → drawer (AUM/subscribers read-only "synced from NPS
   Trust/CRA").
2. **Users & Roles** — `DataTable` of the 15-person roster (status, last active) + platform-roles
   card (9 role defs); Invite → drawer.
3. **Frameworks & Libraries** — 5 frameworks (ISO 27001, NIST CSF, PCI DSS, PFRDA ICS, COBIT)
   with enable toggles + "map once, satisfy many" coverage note.
4. **Regulators & Clocks** — CERT-In / PFRDA / DPDP Board thresholds, retention, owner,
   escalation (read-only config); "View live clocks" → `/clocks`.
5. **Maker-Checker & Workflow** — 7 object-type rows with required toggle, default approver, SLA.
6. **Integrations** — 11 connected systems with status + last sync; "Manage"/"Open diagram" →
   `/integrations`.
7. **Data Retention & Privacy** — 5 statutory retention policy cards.
8. **Notifications** — 6 events × in-app/email toggles (per-role).
9. **Audit Log** — `DataTable` of ~23 system events (tamper-evident); row → resolved entity route.

### 3.18 ComingSoon (`*`)
404 fallback: header + centered "Page not found" card with hammer icon, resolving the attempted
page label from `NAV_ITEMS`. Also reused when an audit/issue id isn't found.

---

## 4. Shared component vocabulary (`src/components/`)

| Component | Role |
|---|---|
| **PageHeader** | eyebrow / title / description / right-aligned actions; standard page top. |
| **KpiTile** | metric card: tone accent bar, label+icon, value+unit+trend, sub, optional sparkline, optional live pulse, optional `onClick`. |
| **DataTable** | generic `<T>` table: search keys, filter dropdowns, 3-way sortable columns, row-click nav, pagination (load-more, default 40), optional bulk-select bar, `dense` default. The workhorse of every list page. |
| **CrossRefPanel** | the thesis motif "Where this also appears" — groups of entity ids resolved via `resolveEntity` to clickable cross-refs (max 6 + "+N more"). |
| **SourceList** / **SourceChip** (`SourceRef.tsx`) | provenance affordance on records — a list (title + citation rows) or a compact "Source" chip; each opens the `source-viewer` drawer for a clause id. Used on Control / Obligation / Policy details. |
| **SaveClauseChooser** | modal to save a clause to a control — attach to an existing `CTRL-COMP*` / session control, or "create a new control from this clause" (mints `CTRL-COMP-NEW-*`). Pushes a toast and navigates to the control. |
| **RegulatorClock** / **RegulatorClockInline** | live countdown card / inline label; tone from remaining fraction (ok/warn/critical/breached/filed) via `useLiveNow`. |
| **SeverityBadge** | Critical/High/Medium/Low dot+label (dense variant). |
| **StatusChip** | ~50 status strings → tone pills (`STATUS_TONE` map, neutral fallback). |
| **FrameworkPill(s)** | per-framework colored badge (+ ref text); `FrameworkPills` adds "+N more". |
| **Timeline** | vertical event timeline; per-kind colored icon, IST time + channel badge, actor resolution. |
| **Drawer** + **DrawerHost** | right side-sheet; `DrawerHost` renders 4 named kinds + generic (see below). |
| **EvidenceList** | evidence rows by id or items; type icon, captured-by (CCM auto vs person), relative time. |
| **MakerChecker** / **MakerCheckerChain** | inline maker→checker avatars / full 3-step approval flow. |
| **RiskScore** (`ScoreBadge`, `scoreBand`) | 1–25 score → banded badge (Low/Medium/High/Critical); hollow variant for inherent. |
| **Sparkline** | tiny SVG line+area chart used inside KpiTile. |
| **Avatar** / **PersonInline** | deterministic-hue initials avatar + name/title. |
| **CommandSearch** | ⌘K palette; indexes nav pages + risks/controls/incidents/obligations/policies/audits/reg-changes; arrow-key nav, grouped results. |
| **RoleSwitcher** | top-right role dropdown; switching changes My Queue + approvals (the only "auth"). |
| **Toasts** | bottom-right variant-styled toast stack (auto-dismiss ~4.2s). |
| **ui/Button** | CVA variants primary/accent/outline/ghost/critical/subtle × sm/md/lg/icon. |
| **ui/Tabs** | underline tab bar with count badges (used on Control detail). |

### Drawer kinds (`DrawerHost`)
All drawers are **mocked**: a styled preview + a primary CTA that pushes a success toast and
closes. Kinds:
- **`cert-in-report`** — CERT-In Incident Report (Annexure I draft) preview; CTA "Sign off & submit".
- **`pfrda-notify`** — PFRDA ICS 48-hour intimation; CTA "Send intimation".
- **`dpdp-track`** — DPDP breach track (PII categories, ~72h, OneTrust link); CTA "Open DPDP track".
- **`export-pdf`** — "Export ready" with filename + timestamp; CTA "Download".
- **`evidence-upload`** — attach evidence/filing-ack file picker (mocked).
- **`source-viewer`** — **read-only** quick view of a clause (snippet, citation, link) + a
  "What this source produced" reverse lookup (`citingRecords` — the obligations/policies/controls
  citing it). Opened by `SourceList`/`SourceChip`; CTA "Done".
- **`generic`** — fallback "Action recorded".

---

## 5. Lib helpers (`src/lib/`)

| Module | Provides |
|---|---|
| **time.ts** | The frozen `NOW` (Wed 10 Jun 2026 05:02:18 IST) + `NOW_MS`; IST construction/extraction; `fmtIST` / `fmtDate` / `fmtTime` / `fmtRelative`; `countdownTo` (→ HH:MM:SS + breached); `hours/mins/daysFromNow` seed helpers. **Single source of "now".** |
| **clocks.ts** | `activeTracks()` (live, non-Filed regulator tracks across open incidents, sorted by deadline), `nearestTrack()`. Powers the ContextStrip clock + `/clocks`. |
| **ccm.ts** | Synthesizes `CcmRule`s from CCM-automated controls (seeded `Rand(3838)`): feed inference, population/pass-fail counts, status, frequency, evidence, the patch rule's 3 hardcoded failing CVEs + spawned issue/incident links. `ccmRules()`, `getCcmRule()`, `ccmStats()`. |
| **heatmap.ts** | `buildHeatGrid()` 5×5 grid (impact rows desc, likelihood cols asc) bucketing risks by `residualCell()`; `heatColor`/`heatBorder` by score band; `DOMAIN_COLORS`/`DOMAIN_LABELS`. |
| **trends.ts** | Seeded 30-point `series()` generator; exports `openIncidentsTrend`, `controlPassRateTrend`, `obligationsOnTimeTrend` (each ends at its headline value). |
| **format.ts** | `inGroup` (Indian digit grouping → "3,24,718"), `inCrore` (₹ + cr), `maskPran` ("1100 7845 ••••"), `pct`. |
| **entity.ts** | `resolveEntity(id)` — id prefix → `{route, label, type}` for every entity family (RISK-, CTRL-, OBL-, INC-, POL-, ISS-, EVD-, AUD-, RCM-, DSAR-, DA-, **INST-** → `/sources/:id`, **SRC-** → `/sources/section/:id`). Backs CrossRefPanel, CommandSearch, audit-log links. |
| **sources.ts** | Sources-pipeline helpers: forward (`instrumentForRef`, `provisionsForInstrument`, `refDisplayTitle`), reverse (`citingRecords`), the `ClauseOverride`/`ClauseOverrides` types + `effectiveClause` (merge a clause with session overrides), `awaitingDecision`, `statusTone`, `instrumentSummary`/`actStatus` (per-act rollups for the list), and `clausesForControl` (the control "Satisfies" lookup). Re-exports `severityFromPenalty`. |
| **copilot/** | A grounded-answer design seam (panel not yet wired): `context.ts` `buildRecordContext(id)` serializes a record + its links + its sources into a plain `RecordContext`; `response.ts` defines the `CopilotResponder` contract + a deterministic `mockResponder` (no model call). Screens depend only on the interface. |
| **regulators.tsx** | Regulator enum, `REGULATOR_ORDER`, `REGULATOR_COLORS`, `RegulatorChip`. |
| **useInterval.ts** / **useLiveNow** | single shared ticking interval driving all live countdowns (animation only — deadlines are seeded). |

---

## 6. Cross-link map (how records reconcile — the thesis)

```
CCM patch rule (Fail)
   └─► Issue "Breached patch SLA — 3 critical vulns past 14-day window"
          └─► Incident INC-2026-0411 (Critical, ransomware)
                 ├─► CERT-In track (6h)   ── Evidence trail (EVD-44192/93/201/215)
                 ├─► PFRDA track (48h)     ──┘  (captured once, reused 3×)
                 └─► DPDP Board track (72h)
                 ├─► linkedRisks (Cyber/IT)
                 └─► linkedControls (malware/backup/patch/logging/auth)

RegChange RCM-2026-118 (GSTR-3B) ─► impacted Obligation(s) + Control(s) ─► owner alerted
Audit open finding ─► 1:1 spawned Issue
Obligation ─► Evidence (filing acks) + optional source RegChange + sourceRefs (clauses)
Policy ─► mapped Controls ─► Evidence
DSAR-2026-0047 ─► retention decision ─► audit record ATR-DSAR-2026-0047

SourceInstrument (act) ─► SourceProvision (clause) ─► [Ingestion Agent recommends]
        └─► Save → Control (CTRL-COMP-*)  ── one control satisfies clauses across acts
        ├─► Engage specialist → specialist note → Save
        └─► Not applicable
   (clause severity ◄─ derived from sourced PenaltyTiers; reverse: citingRecords resolves a
    clause back to every obligation/policy/control that cites it)
```

Everything rolls up into Home (heat map, KPIs, activity stream) and the ContextStrip — the same
underlying objects shown in IT-GRC, enterprise and board views.

---

## 7. Notes for enhancement work

- **State is ephemeral & mock.** Any feature requiring persistence, real mutation, multi-user, or
  real regulator APIs needs a new layer — there is no backend, store mutations are limited to
  UI session state (role/toast/drawer/command).
- **Data is generated, not stored.** To add/alter entities, edit the generators in
  `src/data/world.ts` (and `refs.ts`/`people.ts`); volumes and key distributions (coverage 96.2%,
  9 overdue, 27 findings, 38 CCM) are enforced in code and feed `METRICS` — changing counts ripples
  to Home/ContextStrip.
- **"Now" is frozen.** New time-sensitive content should derive from `NOW_MS`/`ist()` helpers, never
  hardcoded relative strings, to keep countdowns coherent.
- **Marquee is load-bearing.** `INC-2026-0411` and the CCM→Issue→Incident chain are referenced by
  Home, CCM, Issues, DPDP, PFRDA, Integrations and the ContextStrip; treat its ids as fixtures.
- **Detail pages are read-only.** Tabs, cross-ref panels and action buttons exist but actions are
  toasts/drawers — the natural place to wire real workflows (maker-checker approvals, evidence
  upload, regulator filings) if the prototype graduates.
- **The Sources pipeline mutates session state, not the seed.** Save / Engage specialist /
  applicability write to `clauseOverrides` + `sessionControls` in the store and are merged on read
  via `effectiveClause`; they reset on reload. The clause and instrument types are the single source
  model — a real document repository / ingestion service slots behind `SourceInstrument` /
  `SourceProvision` without changing the screens. The `copilot/` and `artifacts` seams are wired in
  data but their panels/UI are not yet built.
- **Compliance intake is in-place.** There is no `/intake` route — newly-arrived Draft instruments
  (dated Jun 2026) surface in the Source Library at `Processing`/`Recommended` and are worked
  through the same act→clause→control pipeline.
- **Responsive floor is 1024px**; nothing is built for mobile/tablet.
```
