---
type: design
status: governing
tags: [design, metrics]
---

# OneGRC — Board & Executive Dashboard: Metric and KPI Design

**Status:** Design proposal for review · **Date:** 22 Aug 2026
**Scope:** The Executive cockpit (`/`), the Risk Committee Chair view, the Audit Committee Chair view, and the metric definitions that feed all three and the packs (§5.26, §10).
**Inputs:** Functional spec v2 (§1–§4, §5.26, §10, §11, §17, §19.2, §20, §21) and the prototype as built (`src/pages/Home.tsx`, `src/pages/home/*`, `src/lib/{metrics,trends,appetite,heatmap,kri}.ts`).

**Standing decisions this design assumes (already made):**

- "Control coverage" is split into two metrics, both built: **Control pass rate** (control health) and **Duty coverage** (mapping completeness). The bare word "coverage" is banned from the UI (§10.1, §19.2 G-19, §21-11). Compound labels that need the word ("Duty coverage") are permitted; every other legacy use ("Attestation coverage", "coverage view") is renamed.
- Every number is derived from live records (`BR-DRV`), every number is drillable (§10.1), and materialization is only ever a write-invalidated cache (§17.2, G-20).

**The design stance in one line:** a board dashboard is not a wall of telemetry; it is the written answers to the seven questions the board is legally obliged to ask, each answer being one number with a denominator, a direction, and a drill path to the records that prove it.

---

## 1. What the board actually asks

The spec grounds the product in five pains (§1) and in persona fears (§4.6): the inspection that finds an undocumented control, the personal liability of a missed filing, the risk picture disconnected from what compliance is doing, the stale snapshot assembled over weeks. Translated into the language a board, a risk committee and an audit committee of a PFRDA-regulated fund manager actually use, there are **seven questions**. Every metric in §2 traces to exactly one of them; a tile that traces to none of them does not belong on a board surface.

| # | The question, in the board's words | Whose question | Spec grounding |
|---|---|---|---|
| **Q1** | "Are we compliant right now — everything we are obliged to do — and can we **prove** it, not just assert it?" | Board, all committees | §1 problem statement ("the deceptively simple question"); Anjali's fear (§4.6); Req 14 |
| **Q2** | "If PFRDA walked in tomorrow, **what would the inspection find?** What is failing, what is undocumented, what has been open too long?" | Board, Audit Committee | §1 pain 2 (inspection and personal exposure; "operating but never documented"); Req 12, Req 14 |
| **Q3** | "Where are we **outside the appetite we set**, and is the movement toward or away from tolerance?" | Risk Committee, Board | Meera's want (§4.6); §4.7 RMC remit; `BR-DRV-05/06` |
| **Q4** | "What is **getting worse** — what will hurt us next quarter that has not hurt us yet?" | Risk Committee, Board | §4.6 executive fear of the stale snapshot; §5.15 KRI breach; the leading-indicator duty of a board that is supposed to *prevent* |
| **Q5** | "What has non-compliance and risk **actually cost us** this year, and did we find the problems ourselves or did someone else?" | Risk Committee (loss), Audit Committee (detection) | §5.11 loss capture, §5.23 fraud; `BR-DRV-15` |
| **Q6** | "Is our own **assurance machinery working** — is audit delivering its plan, are findings closing, or are the same ones rotting?" | Audit Committee | §4.6 Sunita; §4.7 ARC remit ("findings and their ageing") |
| **Q7** | "What **deviations have we ourselves approved** — exceptions, risk acceptances — and which have quietly expired into open exposure?" | Audit Committee (exceptions), Risk Committee (acceptances) | §5.13, §5.14; Req 17, Req 18 ("accepted can never mean forgotten") |

Two properties of this list matter for the design:

- **Q1 and Q2 are different questions.** Q1 is about the duties (are they done, on time, with proof); Q2 is about the *machinery* (are the controls that do them healthy, mapped, tested, and is nothing rotting in the finding register). The current cockpit blurs them into one "readiness" band.
- **Q4 is the only forward-looking question, and it must not be answered with lagging numbers.** A cockpit made entirely of counts of things that already went wrong (overdue, failed, open) can describe a disaster but never prevent one. The prototype already gestures at this (the two KRI tiles are explicitly commented as "the leading half"); this design makes leading indicators a first-class band, not a footnote.

### Current cockpit content that answers no board question

These are deletion or demotion candidates (the concrete diff is §6):

| Current element | Why it answers no board question |
|---|---|
| **Hero strip** — "Good morning, Meera — OneGRC", gradient panel, blurred accent orb | Marketing chrome. Answers nothing; violates §3/A3 ("not a presentation", colour for state only). The one useful atom in it — the as-at timestamp — survives into a plain header line. |
| **"CCM-automated: 38" sub-line** on the pass-rate tile | *How* controls are tested is an operations fact (Control Owner altitude, §4.6), not a board question. Automation share belongs on the Control Library and the Control Owner dashboard. |
| **Activity stream** (15-row cross-domain feed) | Operational noise at board altitude. The board asks Q1–Q7; it does not ask "what happened at 09:47". Right surface: working personas' dashboards. |
| **"view integrations" footer link** | Administrator surface (§4.9 visibility matrix). Platform health is the administrator's question (§17.6), not the board's. |
| **"Time to remediate: avg age of open issues"** | Not a question anyone asks, and actively dishonest as framed — see §4 (a mean age of *open* issues punishes closing young issues and hides the tail). The board's actual question is Q6, answered by ageing bands and an oldest-item number. |
| **"Reminders and escalations fired"** (in §10.1's catalogue, not currently a tile) | Keep it out of the cockpit. It is the *proof* behind Req 16, consumed at drill level on an overdue item and in the audit log — a count of nags is not a posture measure, and as a headline it rewards a noisy ladder. |
| **AUM / subscribers / reg-updates-captured** (seeded in `METRICS`, rendered on Settings and Reg-Change) | Context, not posture. Correct where they are; they must never migrate onto the cockpit as tiles. "12,973 updates captured" is a vendor-feed vanity number — it measures the feed, not the firm. |

---

## 2. The metric catalogue

Twenty metrics, grouped by the question they answer. This replaces the §10.1 table for board surfaces (the §10.1 operational measures that survive unchanged — campaign completion, monitored-rules pass share, tier distribution — remain defined there and appear only on working-persona surfaces or as drill content).

Conventions used below:

- **Type** — *rate* (numerator/denominator, always shown with its denominator), *count* (of records, always drillable to exactly those records), *level* (a scale position, e.g. residual on 1–25), *age* (elapsed time), *money* (₹, period-bounded).
- **Polarity** — the direction that is good. Every tile renders its delta glyph against polarity, so "▲" is never ambiguous.
- **L/L** — *Leading* (moves before harm; predicts) vs *Lagging* (records harm or work already done). The Executive cockpit must carry at least one leading metric per question band; a dashboard of pure lagging indicators is a rear-view mirror.
- All rates are computed over **live populations** (retired/superseded records excluded from both sides) and all "as at" semantics are per §5.

### Q1 — Are we compliant right now, and can we prove it?

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M1 | **Overdue duties** | Q1 | Count of live obligation cycles whose due date has passed and whose state is not Filed/Complete. Sub-line: *of N live duties* — the denominator is mandatory. | Count | Down | Lagging | Obligations register filtered to overdue, sorted oldest-first |
| M2 | **Due in 30 days** | Q1 | Count of live obligation cycles due within the next 30 calendar days, not yet filed. Companion to M1 on the same tile. | Count | — (workload, not badness) | **Leading** | Obligations filtered to due, soonest-first |
| M3 | **Filed on time (12 mo)** | Q1 | Cycles filed on or before their due date ÷ cycles that fell due, over the trailing 12 months, from the per-cycle ledger (§10.1). Late-but-filed and unfiled both count against. | Rate | Up | Lagging | The per-cycle ledger, late cycles first |
| M4 | **Evidence-backed completions** | Q1 (the "prove it" half) | Completed/filed cycles in the trailing 12 months whose task carries ≥1 verified evidence item ÷ all completed/filed cycles in the period. **This is the "done but not documented" number** (§1 pain 2, §3): a filing with no proof attached is precisely the inspection finding the product exists to prevent. | Rate | Up | Lagging, but preventive — every gap it finds is fixable *before* an inspection | Completed cycles lacking evidence, oldest first |

> **M4 is new.** §10.1 has no metric for the evidence gap, despite §1 naming it the recurring nightmare and Req 2 requiring the gap to be *visible*. The catalogue cannot omit the number that measures the product's founding fear. Marked as a spec addition.

### Q2 — What would an inspection find?

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M5 | **Control pass rate** | Q2 | Controls whose latest completed test is a clean Pass ÷ controls **with a current test on record** (tested within their own cadence). Partials are not passes: they display as a separate band on the drill, never in the numerator. Controls with no current test are excluded from both sides and counted in M6 instead. | Rate | Up | Lagging | Control library grouped Pass / Partial / Fail |
| M6 | **Tests lapsed or never run** | Q2 | Count of live controls with no completed test inside their test cadence (including never tested). These are controls whose health is *unknown* — and unknown is not green. | Count | Down | **Leading** | Control library filtered to lapsed/never, by owner |
| M7 | **Failing controls** | Q2 | Count of live controls whose latest test result is Fail. Sub-line: how many have an open remediation issue (the failure cascade, §5.9 — a fail without an issue is a process breach, surfaced as such). | Count | Down | Lagging | Controls filtered to failing, each showing its issue or its absence |
| M8 | **Duty coverage** | Q2 | Live obligations with ≥1 **active** control mapped ÷ all live obligations. Sub-line: *key risks with no mitigating control: N* (key risk = residual in the board-red band of its domain). This is §10.1 sense (b) — "where is the mapping thin" — and is unrelated to M5. | Rate | Up | **Leading** | Unmapped obligations by regulator; unmitigated key risks |
| M9 | **Oldest open finding** | Q2 | Age in days of the oldest audit finding not closed (a finding closes only when its remediation issue resolves, §5.22). Paired with M16's ageing bands. An inspector reads the oldest item first; so does this tile. | Age | Down | Lagging | That finding, then the full ageing view |

> **The pass-rate/duty-coverage split, stated once and precisely.** M5 says *"of the controls we test, how many work"*. M8 says *"of the duties we owe, how many have a control at all"*. The prototype's single "Control coverage 96.2%" (computed in `metrics.ts` as `result !== 'Fail'` over all controls) conflated them and was generous on both axes: it counted Partial as healthy and it counted never-tested as healthy. Under this design the same seed world reads roughly: pass rate lower than 96%, lapsed-tests a nonzero count, duty coverage a separate number entirely — three honest numbers replacing one flattering one.

### Q3 — Where are we outside appetite?

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M10 | **Enterprise residual exposure** | Q3 | Tail-weighted aggregate residual over the whole live register: mean residual of the worst 20 % of risks, minimum three, on the 1–25 scale (`BR-DRV-05` applied enterprise-wide — the same `aggregateResidual()` already used per-domain in `appetite.ts`). Shown with its reconstructed quarter-over-quarter delta (`BR-DRV-07`, `residualAt()`), never a stored trend arrow. | Level (1–25) | Down | Lagging | Heat map + top residual risks |
| M11 | **Domains outside appetite** | Q3 | Count of risk domains whose aggregate (per `BR-DRV-05`) sits at or above the board's red tolerance for that domain; sub-line: *N at tolerance* (`BR-DRV-06`, `statusFor()`). | Count | Down | Lagging | Appetite panel → register filtered to the domain |
| M12 | **Treatment actions overdue** | Q3 | Count of treatment-plan actions past due on risks currently outside appetite or at tolerance. This is the committee's "and what is being done about it" — exposure without a moving plan is the finding. | Count | Down | **Leading** | Those actions, by risk and owner |

> **M10 replaces the prototype's "Enterprise risk 7.8/10".** That number is `METRICS.enterpriseRisk` — a frozen seed constant with a hard-coded `trendLabel="+0.3 QoQ"` — i.e. a stored, underivable headline on a platform whose first principle is derive-don't-store. It is the largest honesty defect on the current cockpit (§6). The /10 scale also matches nothing else in the product; 1–25 residual is the scale the register, the heat map and the appetite bands already speak.

### Q4 — What is getting worse?

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M13 | **Indicators in breach** | Q4 | Count of KRIs whose derived band (from thresholds + direction, `kriBand()`, Req 23) is Amber or Red; sub-line: *N red · of T total*. **Stale indicators (unrefreshed for 2× their period, `isStale()`) are reported in the sub-line as stale, and a stale indicator can never be counted green** — it is counted as "unknown", excluded from the green count and flagged. | Count | Down | **Leading** | Indicators worst-first (`byBreachSeverity`), each with its risk |
| M14 | **Indicators worsening** | Q4 | Count of KRIs whose latest movement is against their direction of goodness (`isWorsening()`), regardless of band — green-but-deteriorating is exactly what a board should see early. | Count | Down | **Leading** | The worsening indicators with their deltas |
| M15 | **Trend triptych** (open incidents · control pass rate · filed on time) | Q4 | Three 90-day series computed from dated records per §5 (never seeded — §10.2 is explicit, and the prototype violates it today with `Rand`-generated curves). Headline value on each chart **is the same derived value as the corresponding tile**, one source. | Series | Per underlying metric | Both (the *slope* is the leading signal) | The underlying register at any point's date |

### Q5 — What has it cost us, and who found it?

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M16 | **Net operational loss (12 mo)** | Q5 | Σ gross − Σ recoveries over incidents and confirmed frauds booked to the one loss engine in the trailing 12 months, by category (₹ lakh/crore, locale per §17.7). Gross and recovered shown beside net — net alone hides a large gross offset by a lucky recovery. | Money | Down | Lagging | The loss book by category and event |
| M17 | **Found by our own controls** | Q5 | Fraud/loss events detected by the firm's own controls ÷ all events in the period (`BR-DRV-15`). The one number that distinguishes "we have controls" from "our controls see things". | Rate | Up | Lagging | Events by detection source |

### Q6 — Is the assurance machinery working? (Audit Committee's spine)

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M18 | **Audit plan delivered** | Q6 | Plan entries complete ÷ plan entries due to date (not full-year total — a Q1 committee must not be shown a denominator of Q4 work), with deferred count named. | Rate | Up | Lagging | Plan vs actual by quarter |
| M19 | **Findings by age** | Q6 | Open findings bucketed 0–30 / 31–90 / 91–180 / >180 days, plus M9 (oldest). **Replaces both "average remediation days" and "finding age (mean)"** — see §4 for why the means are banned. | Count (banded) | Down (esp. right bands) | Lagging | Issues in each band |
| M20 | **Issues closed within SLA** | Q6 | Issues resolved within their severity SLA ÷ issues resolved in the period; sub-line: open issues currently past SLA. SLAs are internal policy (§4: Critical 30d / High 60d / Medium 90d / Low 180d — a call to confirm with the customer). | Rate | Up | Lagging | Breaching issues, by owner |
| M21 | **Repeat findings** | Q6 | Findings raised in the period on a control or theme that had a finding closed within the prior 24 months. A closure that does not hold is the audit committee's most expensive false comfort. *(Spec addition; needs a finding→predecessor link in the schema, §7.)* | Count | Down | Lagging | The pairs, side by side |
| M22 | **Attestation rate (current version)** | Q6 | Acknowledgements against the policy's **current** version ÷ population in scope (`BR-DRV-13`, Req 20). Republishing a policy correctly collapses this number — that collapse is the feature. *(Renamed from "attestation coverage" — banned word.)* | Rate | Up | **Leading** | Unattested people by policy |
| M23 | **Speak-up service levels** | Q6 | Open reports; acknowledgement and substantive-feedback windows met/breached/due; longest current wait in days. **Counts include sealed and restricted cases for every viewer** (§4.12, Req 22) — the chair sees honest totals even where the underlying case is not openable. ARC surface only; the Executive role has no speak-up surface at all (§4.12). | Count + age | Windows: met good; wait: down | Lagging | The reports the viewer may lawfully open; sealed items enumerated, not hidden |

### Q7 — What deviations have we approved, and what has expired?

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M24 | **Live exceptions** | Q7 | Active + expiring-soon exceptions; sub-line: **expired: N · renewals: N**. An expired exception is rendered as open exposure in the danger tone (Req 17), and the renewal count is always visible — a thrice-renewed exception is a decision being avoided. | Count | Down | **Leading** (each is a known, dated hole) | Exception register by expiry |
| M25 | **Acceptances expiring (30 d)** | Q7 | Risk acceptances within 30 days of expiry or already lapsed (a lapsed acceptance auto-converts to an open exception, Req 18). | Count | Down | **Leading** | The acceptances, with approver and basis |

### Third-party exposure (Risk Committee remit, feeds Q2/Q4)

| # | UI label | Answers | Definition (normative) | Type | Polarity | L/L | Drills into |
|---|---|---|---|---|---|---|---|
| M26 | **Material third parties with lapsed assurance** | Q2/Q4 | Count of arrangements whose derived tier is material **and** whose independent assurance has expired, diligence is overdue, or a material service lacks a tested exit plan (§10.1 tier distribution's numerator, promoted; tier itself is derived, Req 21). Sub-line: single-provider concentration (largest provider's share of material services). | Count | Down | **Leading** | The third-party register, attributed tier factors |

**Catalogue discipline.** Twenty-six labels are defined; **no persona sees more than ten as tiles** (§3). Everything else in the old §10.1 list either survives as drill-level content (monitored-rules pass share, campaign completion, tier distribution, reminders fired) or on working-persona dashboards — it is defined once, but it is not board furniture.

---

## 3. The dashboard layout

Three surfaces, one metric engine. The Executive sees breadth at low depth; each chair sees their remit at full depth and **nothing outside it** (§4.4: "offering a non-executive an operational screen invites exactly the involvement the three-lines model is designed to prevent"). The aesthetic rules are §3/A3 and §17.4: calm, dense, light, colour for state only, no gradients, no oversized donuts, numbers in tabular figures, every severity accompanied by a word or glyph.

### 3.1 The Executive cockpit (`/`, Executive role — CRO/board audience)

```
┌─ Vital signs strip (global chrome, all screens) ──────────────────────────────┐
│ Nearest regulator clock ⏱ · Critical incidents · Overdue duties · Approvals   │
├─ Header line (replaces the hero) ─────────────────────────────────────────────┤
│ Board Cockpit · as at Wed 10 Jun 2026, 05:02 IST · [Compose board pack]       │
├─ ROW 1 · POSTURE — "are we compliant, are we in control" (Q1 + Q2) ──────────┤
│ M1/M2 Overdue duties (+due 30d) │ M3 Filed on time │ M4 Evidence-backed       │
│ M5 Control pass rate (+M6 lapsed sub) │ M8 Duty coverage │ M9 Oldest finding  │
├─ ROW 2 · EXPOSURE — "where are we outside appetite" (Q3) ────────────────────┤
│ Appetite panel: per-domain policy vs measured aggregate, QoQ spark, status    │
│ (M10 enterprise level + M11 outside count as the panel's headline)            │
│ Heat map (residual 5×5) beside it — the same register, positional             │
├─ ROW 3 · LIVE — "is anything on a clock" (Q1/Q2 now-tense) ──────────────────┤
│ Open incidents + critical (M-incident) · live regulator tracks of the marquee │
│ M24 Live exceptions (+expired) · M25 Acceptances expiring                     │
├─ ROW 4 · DIRECTION — "what is getting worse" (Q4) ───────────────────────────┤
│ M13 Indicators in breach · M14 worsening · M15 trend triptych (90 d)          │
├─ ROW 5 · GOVERNANCE CADENCE (below the fold) ────────────────────────────────┤
│ Committee prep (next sittings, pack status) · M16 net loss (12 mo, compact)   │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Above the fold:** Rows 1–3 — ten tiles plus the appetite/heat-map pair. That is the whole answer to "are we in control right now": posture, exposure, live items. Rows 4–5 scroll.

**What the Executive does *not* see here:** the activity stream, CCM run detail, the clause pipeline, campaign operations, integration health, speak-up anything (§4.12 — the Executive role is absent from that module entirely; the count lives on the ARC surface). The queue chip in the chrome carries their approvals of last resort; the cockpit itself stays read-and-drill.

**Tile anatomy (every tile, no exceptions):** label · value · denominator or basis sub-line · delta vs prior period with polarity-aware glyph · state tone + state word · click-through to the exact filtered register. A tile that cannot state its denominator or its drill target does not ship.

### 3.2 The Risk Committee Chair view (RMC role)

Remit: exposure (§4.7). The chair reviews; nothing here mutates.

- **Summary band (7 stats):** M11 outside appetite · M10 enterprise level · M13/M14 indicators · M16 net loss · M25 acceptances expiring · M12 treatment actions overdue · register-assessed rate (RCSA currency, kept from the current build).
- **Panels:** Appetite panel (full width, the centrepiece) → heat map → top-10 residual risks with owner and treatment progress → losses by category with 8-quarter trend → **M26 third-party card (new — §4.7 names third-party concentration in the remit; the current `RiskCommitteeDashboard` omits it)** → incidents that realized risks this quarter.
- **Not offered:** obligations register, audit plan and findings (ARC's remit), exceptions register (ARC's), speak-up, any working screen. The current build already routes RMC to its own dashboard; this design trims it to remit and adds the missing third-party view.

### 3.3 The Audit Committee Chair view (ARC role)

Remit: the assurance chain (§4.7), plus statutory direct access to speak-up.

- **Summary band (6 stats):** M18 plan delivered · M19 open findings (+M9 oldest) · M20 closed within SLA · M24 exceptions (+expired) · M21 repeat findings · M4 evidence-backed completions (the committee that faces the auditors owns the evidence-gap number).
- **Panels:** findings ageing bands → overdue remediations list → exception register by expiry with renewal counts → audit plan vs actual by quarter (with the "failed test steps with no finding raised" honesty line the build already has — keep it, it is exactly right) → external auditor status → M22 attestation rate → M17 found-by-our-own-controls → **M23 speak-up service levels, with sealed cases counted, never enumerable-but-hidden**.
- **Not offered:** appetite, heat map, risk register, third parties, incident operations, any working screen.

### 3.4 Shared rendering rules

- One `KpiTile`/stat component renders every number on all three surfaces from the **same metric functions** — the committee chair's "open findings" and the Executive's are the same call. Divergence between surfaces is a defect class, not a styling choice (the §2-spine lesson applied to metrics).
- Packs (§5.26, §10.3) compose from these same functions. The pack section for "appetite" is the appetite panel's query, snapshotted at issue. Management and board therefore read the same numbers by construction (§10.3's last rule).
- Density per §17.4: tiles ~72 px tall, tabular numerals, sub-lines in the muted tone; no chart taller than 160 px; the heat map stays the calm inline-SVG it is.

---

## 4. Thresholds, banding and honesty rules

### 4.1 Where a band may come from — a strict hierarchy

A number turns amber or red only on a **named basis**, displayed on the tile's drill. Four legitimate bases, in precedence order:

1. **Regulatory deadline (binary, never banded).** A regulator clock is on-time or breached; a breached clock stays breached (`BR-SCH-08`). Amber does not exist here — the "final quarter of the window" prominence rule (§11.3) is urgency display, not a band. Applies to: nearest clock, overdue duties (each overdue item is red by definition of the law that dates it).
2. **Board-approved tolerance.** Appetite bands per domain (`appetite.ts` `ToleranceBand`) and KRI thresholds — both are *policy*, set through governed configuration (maker-checked, §5.30), and the derived band cannot be overridden (Req 23). Applies to: M10/M11, M13/M14. The appetite implementation is the model: policy half configured, measurement half derived, status only where they meet.
3. **Internal SLA (a call this design makes; confirm with the customer).** Issue remediation SLAs by severity — Critical 30 d, High 60 d, Medium 90 d, Low 180 d; findings ageing bands at 30/90/180; exception expiry warning at 7 d, acceptance at 30 d (§11.3 already fixes these two). Applies to: M19, M20, M24, M25.
4. **Design defaults for rates (marked as defaults on screen until the board adopts them).** Filed on time: red < 95 %, amber < 98 % — a regulated fund manager missing 1-in-20 statutory deadlines is not amber territory, hence the deliberately tight red line. Control pass rate: red < 90 %, amber < 97 %. Evidence-backed: red < 95 %, amber < 99 % (the target is 100 %; every un-evidenced completion is an inspection finding by definition). Duty coverage: red < 90 %, amber < 98 %, and **any** key risk without a mitigating control renders the tile's sub-line in the danger tone regardless of the headline rate.

Where none of the four applies (net loss, oldest finding, enterprise level), the tile carries **no band at all** — value, delta and drill only. Inventing a threshold to get a colour is the vanity failure in reverse. Delta direction still renders against polarity.

### 4.2 The anti-vanity rules (hard requirements, testable)

1. **No number without a denominator or basis.** "96.2 %" is banned; "96.2 % of 254 tested controls" ships. Counts state their population ("9 of 178 live duties"). Rates never render without their base visible on the tile or its first hover.
2. **Everything drills to records.** Every tile click lands on the register filtered to *exactly* the counted set (§10.1). The drill query and the tile query are the same function — if they can disagree, the build is wrong (this also makes the materialization cache self-auditing, §7).
3. **No metric improvable by doing less work.** The test applied to every catalogue entry:
   - *Mean age of open issues* fails it — closing young issues raises the mean, so the metric punishes work; leaving easy items open flatters it. Banned; replaced by banded counts + oldest + %-within-SLA (M19/M20/M9).
   - *Pass rate over all controls* fails it — not testing is rewarded. Fixed by the tested-denominator + M6.
   - *Duty coverage* could be gamed by retiring obligations; therefore retirements in the period are shown on the drill, and a coverage rise coinciding with a denominator fall is annotated on the tile's delta ("+1.2 pt, of which +0.9 from retired duties").
   - *Attestation rate* is version-bound (Req 20) so republishing honestly resets it.
   - *On-time rate* counts unfiled cycles against, so ceasing to file cannot flatter it.
4. **State never by colour alone** (§17.4). Every band renders tone + word ("Outside appetite", "Breached", "Expired") or glyph; the polarity glyph is computed from polarity, not from sign.
5. **Sealed and restricted items are counted honestly** (§4.12, Req 22). Speak-up totals, restricted investigations and sealed cases appear in every count they belong to, for every viewer entitled to the count; the drill shows "3 items you cannot open (sealed)" as rows, not silence. A dashboard that undercounts for some viewers is lying to exactly the people oversight exists for.
6. **Unknown is never green.** Stale KRIs (M13), never-tested controls (M6), lapsed assessments, and a broken connector feeding any of them (§17.6) all render as *unknown/stale* — a distinct neutral-warning state — and are excluded from healthy numerators. Silence must look like silence, not like health.
7. **Empty is not zero.** A metric whose inputs are absent (module not deployed, no cycles in period) renders "no data — [reason]", and its pack section is absent, not an empty table reading "nothing to report" (§5.26).
8. **Movement is honest.** Deltas compare like-for-like periods (§5); a delta whose baseline was itself restated links to the restatement. No hard-coded trend arrows — the current `trendLabel="+0.3 QoQ"` string is precisely the anti-pattern.

---

## 5. Trends and time

### 5.1 What "as at" means for a derived metric

**Definition:** *metric(t) is the metric's normative definition evaluated over the records as they stood at instant t, in the organization's time zone (§11.2/`BR-SCH-09`).* Because nothing derived is stored, a historical point is a **reconstruction from dated facts**, not a remembered number. Three reconstruction classes, in order of preference:

1. **Reconstructible from the records' own dates** (no snapshots needed): open incidents at t (detected ≤ t < closed); on-time rate to t (per-cycle ledger has due/filed dates); pass rate at t (latest test dated ≤ t per control); findings age at t; loss to t; plan delivery to t. These are queries with a time parameter.
2. **Reconstructible from event history:** residuals via `BR-DRV-07` — replay treatment actions backwards, exactly as `residualAt()` in `appetite.ts` does today. This is the defensible answer when a committee asks *why* the line moved: the line is the register's own remediation history. Production needs the action-completion facts to be immutable dated events for this to keep holding (a backdated edit restates the trend — allowed, but logged and annotated per honesty rule 8).
3. **Snapshot-only (accepted, minimal):** where an input is itself external and mutable-in-place (a connector-fed KRI reading), the reading history table *is* the trend; the platform stores readings (facts), never bands (derivations).

**Rule:** a trend line and its tile's headline come from the same function evaluated at different t; the last point of every series **is** the live value. The prototype violates this doubly — series are RNG-fabricated (`series(311, 9, 5, …)`) and the chart headlines are string literals (`current="96.2"`) that will silently diverge the moment a session action moves the real metric.

### 5.2 Which measures get a series, and over what window

| Series | Window / grain | Comparison | Why this window |
|---|---|---|---|
| Open incidents | 90 d / daily | vs prior 90 d | Operational tempo; 30 d (current build) is too short to show a season |
| Control pass rate | 90 d / weekly points | QoQ | Tests run on cadences of weeks; daily points fabricate precision |
| Filed on time | 12 mo / monthly | vs same month prior year | Filing cycles are monthly/quarterly; YoY kills seasonality lies |
| Evidence-backed completions | 12 mo / monthly | QoQ | Moves slowly; the direction is the message |
| Enterprise + per-domain aggregate residual | 8 quarters / quarter-end | QoQ (`BR-DRV-07` reconstruction) | The board meets quarterly; 8 gives two years of story |
| Net operational loss | 8 quarters / quarterly | vs same quarter prior year | Loss is lumpy; quarterly + YoY resists one-event narratives |
| KRIs | Per-indicator reading history, its own frequency | last reading | Sparkline on the drill, not the tile |
| Duty coverage, attestation rate, plan delivery | No chart — current value + delta since last committee sitting | sitting-over-sitting | A slow-moving rate as a line is chartjunk; the delta is the content |

### 5.3 Period-over-period when the frozen anchor becomes real time

The demo world is frozen at Wed 10 Jun 2026 05:02 IST (`NOW_MS`) and every seeded curve lands on it. In production:

- **"Now" is the clock; "as at" is stamped on every surface and every pack.** The cockpit header carries the evaluation instant; a pack snapshots it (§5.26 — the live view moves on, the issued pack is fixed evidence).
- **Committee deltas pin to sittings, not rolling windows.** The RMC chair's "since last time" means since the last Risk Committee sitting (the committees' cadence is already modelled, §4.7); rolling 30-day deltas are for the working personas.
- **Quarter boundaries are the organization's fiscal quarters** in the organization's zone — `quarterEnds()` already computes calendar quarters; production parameterizes fiscal-year start (Indian FY, April–March: a call, but an obvious one for SPF).
- **History begins at go-live, honestly.** Until 12 months of real records exist, windows render with "since go-live (n months)" denominators rather than back-filled synthesis; migrated historical cycles (§18) extend the ledger only where the migration carried real dates. G-26 makes this Essential; nothing on a board surface may ever again be a synthesized series.

---

## 6. What must change from the prototype

Referenced files: `src/pages/Home.tsx` (Executive), `src/pages/home/dashboards.tsx` (RMC/ARC), `src/lib/metrics.ts`, `src/lib/trends.ts`, `src/lib/appetite.ts`, `src/lib/kri.ts`, `src/lib/heatmap.ts`, `src/pages/home/{TrendCharts,NeedsAttention,AppetitePanel,HeatMap}.tsx`.

### KEEP (8)

| Element | Why |
|---|---|
| Appetite panel + `appetite.ts` | The best-designed surface in the build: policy/measurement split, tail-weighted aggregate, reconstructed trend. It becomes the pattern the rest follows. |
| KRI tiles + `kri.ts` | Direction-aware derived bands, staleness, worsening — already the leading-indicator half; promote from readiness-band footnote to its own Row 4. |
| Nearest regulator clock tile + vital-signs presence | §11.2 requires the nearest clock everywhere; live client-side countdown from fixed deadline is correct. |
| Overdue duties / due-soon tile | M1/M2 as built (relabel "obligations" → "duties" for the board's own vocabulary; keep the term "obligations" on working registers). |
| Open incidents + critical tile | M-incident as built, minus the hard-coded sub (below). |
| Committee prep card + `PackGenerator` | Req 13 made visible; packs compose from live sections under maker-checker. |
| Heat map as a calm inline-SVG with cell → filtered-register deep-links | Right altitude, right restraint. (But see REDEFINE on its math.) |
| ARC dashboard's "N failed test steps have no finding raised" line | A genuinely honest self-incriminating metric; exactly the product's voice. |

### REDEFINE (7)

| Element | Change and justification |
|---|---|
| "Control coverage 96.2 %" tile (`Home.tsx:108`, `metrics.ts:44`) | Split per the standing decision: **Control pass rate** (clean passes ÷ tested-in-cadence; Partial out of the numerator, untested out of the denominator — current code counts `result !== 'Fail'` over everything) + new **M6 lapsed-tests count** + separate **M8 Duty coverage** tile. The word "coverage" leaves every label except "Duty coverage". |
| "Enterprise risk 7.8/10" tile (`Home.tsx:107`) | Currently `METRICS.enterpriseRisk` — a frozen seed with a hard-coded `trendLabel="+0.3 QoQ"`. Redefine as M10: tail-weighted aggregate over the live register on the 1–25 scale, QoQ reconstructed via `residualAt()`. The cockpit's headline number must obey the product's own first principle. |
| Trend charts (`trends.ts`, `TrendCharts.tsx`) | Series are RNG-fabricated (`Rand(311…)`) and headlines are string literals ("5", "96.2", "94.6") that ignore `useEffectiveMetrics`. Recompute per §5.1 from dated records; bind headlines to the same functions as the tiles. §10.2 states this as a requirement today. |
| Hard-coded tile subs (`Home.tsx:109` "4 High", `Home.tsx:112` "Across 18 audits") | Derive both; a seeded string beside a derived number is where drift starts. |
| `NeedsAttention.tsx` reading raw `WORLD` | It filters `WORLD.incidents/obligations` directly while the tiles read effective (override-aware) state — the tile can say 8 overdue while the list shows 9. All board surfaces read the effective layer, one source. |
| Heat-map placement math (`heatmap.ts:34` `residualCell`) | Likelihood/impact are *invented* by dividing residual — deriving assessed inputs from a derived output. Production stores assessed residual L×I per risk (the RCSA already captures them, §5.16) and derives residual = L×I, never the reverse. |
| Readiness band (`Home.tsx:127–149`) | Becomes Row 1 posture band with the Q2 set (M4–M9). "Time to remediate (avg)" and "avg finding age" leave the Executive surface (means banned, §4.2 rule 3); ageing lives with ARC as bands + oldest. |

### ADD (7)

| Element | Why |
|---|---|
| M4 Evidence-backed completions tile (Exec + ARC) | The founding fear (§1 pain 2) has no number anywhere in the build or in §10.1. |
| M8 Duty coverage tile (Exec) + unmapped-duty / unmitigated-key-risk drills | G-19 sense (b); the "where is it thin" question currently unanswerable. |
| M6 Tests lapsed/never tested (Exec Row 1 sub-tile) | Unknown-is-not-green (§4.2 rule 6); silently untested controls currently inflate health. |
| M24/M25 exceptions + acceptances tiles on the Executive cockpit | Req 17/18 exposure exists only on the ARC/RMC views today; approved deviations are a board-level fact. |
| M26 third-party card on the RMC view | §4.7 names third-party concentration in the chair's remit; `RiskCommitteeDashboard` has no third-party content. |
| M21 Repeat findings (ARC) | The costliest assurance failure — closure that does not hold — is invisible today; needs the finding-predecessor link (§7). |
| M3 Filed on time as a tile (Exec Row 1) | Exists only as a fabricated trend today; it is the board's single best compliance rate and must be a real, drillable number. |

### REMOVE (6)

| Element | Why |
|---|---|
| Hero gradient strip ("Good morning, Meera", accent orb) (`Home.tsx:77–99`) | A3: not a marketing page; gradient decoration breaks colour-for-state. The as-at timestamp and pack button move to a plain header line. |
| "CCM-automated" sub on the pass-rate tile | Ops fact at the wrong altitude; lives on Control Library / Control Owner dashboard. |
| Activity stream from the Executive cockpit | Board asks Q1–Q7, not "what just happened"; keep on working-persona dashboards. |
| "view integrations" footer link (Executive) | §4.9: integrations are not offered to the Executive; platform health is the administrator's (§17.6). |
| "Time to remediate: Xd (avg age, open issues)" tile | Fails the do-less-work test (§4.2 rule 3): closing young issues worsens it, stalling flatters it. |
| Mean finding age everywhere it appears (`avgFindingAgeDays` as display) | Same failure; means hide the >180 d tail an inspector reads first. `metrics.ts` keeps the ageing computation; the display becomes bands + oldest. |

Net on the Executive surface: the current 6 headline + 8 readiness tiles (14 numbers, two of them frozen seeds, two duplicated) become **10 tiles + 2 panels + 1 triptych**, every number derived, denominated, drillable.

---

## 7. Data implications

### 7.1 What the schema must be able to answer, per metric

Volumes per §17.1: controls/obligations/risks in the low thousands; several tasks per obligation-cycle across years of cycles; **evidence in the hundreds of thousands and append-only; audit log in the millions**. The two big stores are exactly the two some metrics must join against.

| Metric(s) | The schema must answer | Structures implied | Cost on read at §17.1 volume |
|---|---|---|---|
| M1/M2 overdue, due soon | "cycles with due_date past/within-30d and state ≠ filed" | Cycle table with due_date, state, filed_at; index (state, due_date) | **Cheap** — indexed scan over low-thousands |
| M3 filed on time | Per-cycle ledger: due_at vs filed_at per cycle per period | Same table; filed_at set transactionally at approval | **Cheap** — the ledger *is* the schema; no evidence join |
| M4 evidence-backed | "completed cycles in period with ≥ 1 verified evidence link" | Evidence-link table (evidence_id → task/cycle); the join is cycles → links, semi-join EXISTS | **Expensive** — the one metric joining the hundreds-of-thousands store. Prime materialization candidate: maintain `evidence_count` on the cycle, incremented/decremented transactionally with the evidence-link write. This is a counter cache invalidated by its own write — the derivation rule survives because the count is recomputable from links and reconciled (7.3). |
| M5/M6/M7 pass rate, lapsed, failing | "latest completed test per control" + control cadence | Test-run table (control_id, completed_at, result); either a window query or a `latest_test_id` pointer on control maintained in the same transaction as test completion | **Moderate** — window-over-thousands is fine; the pointer makes it trivial and is the recommended write-maintained materialization |
| M8 duty coverage | "live obligations with ≥ 1 active control mapping"; "key risks with ≥ 1 active mitigating control" | Mapping tables (obligation↔control, risk↔control) with status; EXISTS semi-joins | **Cheap** — thousands × thousands with EXISTS short-circuit |
| M9/M19/M20 findings age, bands, SLA | Finding open/close timestamps; issue severity, due, resolved_at; SLA policy table | Findings and issues already carry these; SLA policy is configuration (§14.1) | **Cheap** |
| M10/M11 aggregates + QoQ | Residual per risk now; residual per risk *at prior quarter-end* | Immutable treatment-action events (completed_at, residual_contribution) for `BR-DRV-07` replay; assessed L×I stored per assessment (§6 heat-map fix) | Now: **cheap**. Reconstruction at t: **moderate-to-expensive** (replay per risk per point) — materialize quarter-end aggregate snapshots, invalidated by any backdated action edit touching that quarter (rare, logged, honesty rule 8) |
| M12 treatment overdue | Actions with due dates on risks in given appetite states | Action table + derived domain status | **Cheap** |
| M13/M14 KRIs | Latest + previous reading, thresholds, direction, refresh timestamps | Reading history table (facts only; bands always derived) | **Cheap** — hundreds of indicators |
| M15 trend series | metric(t) at daily/weekly/monthly points (§5.1 class 1–2) | Time-parameterized queries over dated records | **Expensive as a 90-point live recompute** — materialize the series: append today's point on the day's first read (idempotent), recompute a historical point only when a write backdates into its window (write-invalidated, G-20) |
| M16/M17 loss, detection | Loss events with gross, recovery, category, detection source, booked_at | The one loss engine (§2); detection_source enum on the event | **Cheap** |
| M18 plan delivery | Plan entries with due-quarter and completion state | Audit-plan table | **Cheap** |
| M21 repeat findings | "finding on a control/theme with a predecessor closed < 24 mo" | **New:** predecessor link (finding_id → prior finding) set at raise-time by the auditor, plus control_id/theme on findings for the candidate search | **Cheap** once the link exists; impossible without it |
| M22 attestation | Acknowledgements keyed to policy **version**; population in scope | Acknowledgement (person, policy_id, version, at); version bump leaves old rows intact (Req 20) | **Cheap** |
| M23 speak-up SLAs | Window deadlines vs acknowledgement/feedback events; counts including sealed | Case table with structural identity absence (§4.12); counts computed server-side under the case-access rules — **never** by filtering client-side, or the honest-count guarantee dies | **Cheap**, but access-scoping is the design constraint, not cost |
| M24/M25 exceptions, acceptances | Expiry dates, renewal counts, approver, state | Exception/acceptance records already model this (§5.13/5.14); renewal_count maintained on renewal write | **Cheap** |
| M26 third-party | Derived tier factors: assurance expiry, diligence dates, exit-test flag, materiality; concentration by provider | Arrangement table with dated assurance/diligence child records; tier always derived with attributed factors (Req 21) | **Cheap** — hundreds of arrangements |
| Reminders fired (drill/pack only) | "escalation events for object X" and period counts | Audit log (millions): index (object_id, event_type, at) + pre-aggregated period counters maintained on write | Point lookups **cheap**; period counts **expensive unaggregated** — counter cache, same pattern as M4 |

### 7.2 The write-invalidated materialization contract (G-20, §17.2)

One pattern for every expensive derivation, preserving derive-don't-store:

1. **The derivation function is the only definition.** The cache stores its output plus the identifiers/version of its inputs; the function remains callable directly, and drill-downs always run live against the records.
2. **Invalidation rides the mutating transaction.** The write that changes an input marks the dependent materialization dirty *in the same transaction* (a change that is not logged must not commit, §17.5 — the same discipline). No TTLs, no cron-freshness: staleness-by-time is exactly the drift `BR-DRV` exists to prevent.
3. **Dirty reads recompute, then repair.** A cockpit read hitting a dirty entry recomputes from records, serves, and rewrites the cache. Landing-screen latency (§17.2) is met because invalidations are per-metric and per-scope, not global.
4. **The cache is self-auditing.** Because tile and drill share one function, a nightly reconciler re-derives every materialized value and alarms on mismatch; a mismatch is a defect, never silently overwritten. The three counter caches (evidence_count, `latest_test_id`, escalation counters) are covered by the same reconciler.
5. **Snapshots are evidence, not caches.** A pack's issued numbers are frozen deliberately as evidence (§5.26) and are exempt from invalidation — they are records of what was reported, with their as-at instant on their face.

### 7.3 Summary of new schema obligations introduced by this design

- `evidence_count` (and verified flag) transactional counter on cycle/task — for M4 at volume.
- `latest_test_id` pointer on control, written with test completion — for M5–M7.
- Assessed likelihood × impact stored per risk assessment; residual derived, never the inverse — fixes the heat map and grounds M10.
- Immutable, dated treatment-action completion events — makes `BR-DRV-07` reconstruction production-grade.
- Finding predecessor link + control/theme key on findings — enables M21.
- Metric-series store (metric_id, scope, t, value, input_version) under the §7.2 contract — for M15 and quarter-end aggregates.
- Escalation/period counter aggregates over the audit log — for pack sections and Req 16 drills.
- SLA policy table (severity → days) as governed configuration (§14.1), so M19/M20 bands cite a basis, not a constant in code.

---

*End of design. Open calls made in this document and flagged for confirmation: internal SLA values (§4.1-3), default rate bands (§4.1-4), fiscal-quarter anchoring (§5.3), the "duties" label on board surfaces (§6 KEEP), and the two spec additions M4 and M21 (§2).*

---

## Related in this vault

This document **governs** board and committee surfaces (spec §10.1 defers to it) — the reasoning is [[ADR-008-metric-honesty]]. Built by: [[phase-1-platform-floor#P1-14|P1-14]] (subset) · [[phase-2-risk-and-events#P2-11|P2-11]] (pass rate, heat map, appetite) · [[phase-2-risk-and-events#P2-14|P2-14]] (the honest cockpit) · [[phase-3-cycles-and-assurance#P3-10|P3-10]] (RMC/ARC chair views). Proves [[REQ-13-packs-as-a-view]] and [[REQ-14-metrics-on-demand]]; every derivation rule it leans on is in [[BR-DRV]].
