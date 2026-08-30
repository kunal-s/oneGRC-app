---
type: design
status: governing
date: 2026-08-23
governs: [P0-19, P0-20, P0-21]
relates: [ADR-012-no-demo-data, ADR-003-identifier-scheme, ADR-007-roles-and-authority]
tags: [design, ingestion, classification]
---

# The source extraction layer — provisions, classification, promotion

**Status:** governing for the extraction rework · verification checklist in §7 is the review
contract · every clause citation below was read verbatim from `fixtures/instruments/*.pdf`
(pdftotext) before being asserted.

## 0. The problem this fixes, in numbers

Extraction and tracking were conflated: every segmented unit became a `SourceClause` with an
`SRC-` id in the decision pipeline. The PT Act produced 178 rows, the PFRDA Act 303. Most are
noise for a compliance register: definitions, appeal procedure, constitution of authorities,
commencement. Two records the customer flagged make the failure concrete:

- `SRC-00181` — PT Rules **r.2, Definitions** (the rule whose "treasury" definition carries the
  State Bank of India branch list). Interpretation, not a duty.
- `SRC-00206` — PT Rules **r.5, Amendment of certificate of registration** ("Where the holder of
  a certificate of registration … *desires* the certificate to be amended, he shall submit an
  application…") — the "shall" is real, but the trigger is elective: a procedure the firm may
  invoke, not a standing duty to track.

A seasoned officer tracks perhaps 15–25 duty-bearing clauses across these four instruments.
Everything else is context they consult while deciding, never rows they chase.

**Decided by the customer, built on here, not re-litigated:** two tables (`SourceProvision` holds
everything extracted; `SourceClause` is created *only* by promotion and holds only tracked,
duty-bearing clauses); promotion is an explicit governed action; deterministic classification now
with a model tier later behind the existing `EnrichmentProvider` seam, with every model-enabling
decision (shared output contract, one feature extractor, context envelope, provider/version/
ruleset provenance, shared confidence scale, unit of inference, labelled evaluation set,
deterministic fallback) taken NOW; Phase 0 stays minimal.

---

## 1. The classification taxonomy

Nine classes — eight substantive plus `Unclassified`. The test for the set: a compliance officer
reading any provision of the four fixtures can place it in exactly one class without debate, and
the placement decides what the platform does with it. Classes match the `ProvisionClass` enum
already migrated (`20260823000000_p0_20_provision_clause_split`).

**Only `Duty` is ever promoted.** Every other class is context that attaches to a duty or to the
instrument. This is the whole point of the split: the register holds duties; the library holds law.

### 1.1 Precedence rules (how the classes interact)

1. **The heading is the draftsman's own classification and wins where it is hard.** A
   `Definitions` or `Short title / commencement / repeal / savings` heading is conclusive:
   definitions say "shall" constantly ("'employer' … *means* the person … responsible for
   disbursement", PT Act s.2(c)) without creating one duty.
2. **Liability-creating language is not conduct language.** "shall be **liable to pay**" (PT Act
   s.3(2), s.9(2), s.9(3)) creates or quantifies an exposure; "shall **furnish / pay / obtain /
   deduct / maintain / preserve**" commands conduct. Only conduct-mandatory text can make a
   provision a `Duty`. This single distinction is what keeps the charging section (s.3) and the
   interest section (s.9) out of the register while s.6 (returns) goes in.
3. **Prohibitions are duties.** "**No** pension fund **shall** … invest outside India" (PFRDA
   s.25) and "**No** intermediary … **shall** commence any activity … except under … a
   certificate of registration" (PFRDA s.27(1)) bind the firm exactly as a positive command does.
   Modality must therefore distinguish `mandatory`, `prohibitive`, `discretionary`, `none`.
4. **A duty that is not ours is still a `Duty`** — classification records what the provision *is*;
   `bindsUs` records whose problem it is. PFRDA s.14(1) ("the **Authority** shall have the duty,
   to regulate, promote and ensure orderly growth of the National Pension System") is a genuine
   duty clause with `bindsUs: no`. It is never promoted, and it is never mislabelled Machinery
   just to keep it out — the bearer, not the class, keeps it out.

### 1.2 The classes

**1 · Duty** — an operative provision requiring an identified bearer to do, or refrain from
doing, something. The only promotable class; promoted only when `bindsUs: yes` and no blocking
flag is open (§2).
*Worked examples:*
- PT Act **s.6(1)**: "Every employer registered under this Act shall furnish to the prescribed
  authority [a return in such form, for such period and by such dates as may be prescribed]" —
  conduct-mandatory, bearer "every employer registered under this Act". The deferral phrase
  raises `CadenceUnspecified` (blocking) until PT Rules r.11 resolves it.
- PT Act **s.6(2)**: "Every such return shall be accompanied by a treasury challan in proof to
  payment [sic] of full amount of tax due … a return without such proof of payment shall not be
  deemed to have been duly filed" — the statutory evidence requirement (`BR-EVD-01` written into
  law); the [sic] is the consolidated PDF's own wording, kept because verbatim means verbatim.
  promoted as part of the s.6 duty, it defines what completing the task requires.
- PT Act **s.4**: employer shall deduct tax from salary and pay on behalf of employees.
- PT Act **s.5(1)/(2)**: obtain certificate of registration / enrolment; s.5(3) gives the
  thirty-day window — an event duty, not a recurring one.
- PT Act **s.8(2)**: "The amount of tax due from an enrolled person … shall be paid for each
  year on or before the 31st March of the said year" — annual cadence *in the statute*.
- PT Rules **r.11(1)** (OCR text reads "Every employee employer registered under the Act, shall
  pay the amount of tax due from him according to the return on or before the date prescribed" —
  the scan noise is why `LowExtractionConfidence` exists), **r.11(3)(a)** (liability < ₹1,00,000:
  annual return by 31 March), **r.11(3)(c)** (liability ≥ ₹1,00,000: monthly return by month
  end), **r.11A** (first-year monthly regardless), **r.19** (maintain the salary/deduction
  register), **r.19A** (preserve books "for a period of not less than six years").
- PFRDA Act **s.23(4)** ("The pension fund shall manage the schemes in accordance with the
  regulations"), **s.25** (prohibition on investing subscriber funds outside India), **s.26**
  (CRA, points of presence and pension funds "shall satisfy the eligibility norms as may be
  specified by the regulations"), **s.27(1)** (no activity except under a certificate of
  registration — the standing condition s.28(1)(a)/(b) punishes).
*Counter-examples (Duty, `bindsUs: no`, never promoted):* PFRDA **s.14(1)** binds the Authority;
PT Rules **r.10** binds the Commissioner (April public notice); PT Rules **r.17(1)** binds the
drawing and disbursing officer / Treasury Officer for *government* servants; PFRDA circular
**para 2–3** bind PFRDA ("PFRDA shall provide an incentive of upto ₹100 per new account").

**2 · Applicability** — who and when the instrument bites: charge/levy, extent, thresholds,
exemptions. Not promoted. Attaches to the duties it gates: recorded as the promoted clause's
`applicabilityBasis` and, where a distinct provision, a `ClauseLink`/flag resolution target.
*Worked examples:* PT Act **s.3(2)** ("Every person … shall be **liable to pay** … the tax at
the rate mentioned … in Schedule I" — the charging section; liability-creating, not conduct;
tracking it as an obligation would double-count s.6/s.8); PT Act **s.27A** (exemption: armed
forces members); PT Act **s.4A** (registration on/after 1-4-2017 limits back-liability to four
years); PT Rules **r.11(3)** opening words ("Every registered employer whose tax liability
during the previous year …" — the condition inside the duty, raised as `ConditionalApplicability`
and answered by the organisation profile); PFRDA Act **s.12** (extent and application).

**3 · Consequence** — penalty, interest, late fee, prosecution, forfeiture, disqualification.
Not promoted. Attaches to the duty it punishes: at promotion the deciding officer captures the
relevant tiers as `PenaltyTier` rows on the promoted clause, each carrying `sourceRef` to the
consequence provision; clause severity is *derived* from tiers (build plan §3.4), never typed.
*Worked examples:* PT Act **s.6(3)** (late fee ₹200 if filed within thirty days of the due date,
₹1,000 otherwise — two tiers, and the exemption proviso is a proviso on the consequence, not on
the duty); PT Act **s.9** ("shall be **liable** to pay by way of simple interest … at the
prescribed rate" — liability-creating, attaches to s.4/s.8); PT Act **s.10** (penalty "equal to
ten per cent. of the amount of tax due", discretionary — "the prescribed authority **may** …
impose", after hearing); PFRDA Act **s.28(1)(a)–(d)** (₹1 lakh/day capped at ₹1 crore for
unregistered activity or breach of registration conditions; up to ₹1 crore or 5× profits for
failure to furnish information); **s.29** (penalties credited to the Subscriber Education and
Protection Fund — machinery of the consequence, still Consequence context, not a duty).

**4 · Definition** — interpretation of terms. Never promoted, never chased; surfaced as context
wherever a duty's bearer or terms need reading. Definitions decide `bindsUs`: PT Act **s.2(c)**
("'employer' … means the person or the officer who is responsible for disbursement of such
salary or wages") is why s.4 and s.6 are ours; PFRDA **s.2(1)(g)** ("'intermediary' includes
pension fund, central recordkeeping agency … point of presence") is why s.27(1) is ours; PT
Rules **r.2** carries the "treasury" definition whose SBI branch list (items 1–9, lower-case
list items) is the canonical segmentation trap from P0-16.

**5 · PowerProcedure** — a power of an authority, or a process available to (not required of)
the firm: assessment, appeal, revision, rectification, inspection, registration mechanics.
Not promoted; kept as instrument context. Exercising a power can *create* an event duty (a
notice of demand under PT Act s.8(4)(b) starts a fifteen-day payment clock) — that arrival is
regulatory-change/event intake (Phase 2 territory), not a standing clause in the register.
*Worked examples:* PT Act **s.7** (Commissioner assesses; provisos let him assess part-years),
**s.13** (appeal), **s.14** (revision — note the deliberate near-collision: *PT Act* s.14 is
procedure while *PFRDA Act* s.14 is an Authority duty), **s.15**, **s.17**, **s.18**; PT Rules
**r.5** ("Amendment of certificate of registration" — the customer's `SRC-00206`; an employer
*may* apply, the authority amends), **r.7** (cancellation), **r.25** (appeal and revision),
**r.28** (service of notices); PFRDA Act **s.15** (power to issue directions), **s.16**
(investigation), **s.17** (search and seizure), **s.27(2)–(4)** (application, grant, suspension
of registration), **s.30** (adjudication), **s.36** (appeal to SAT).

**6 · Machinery** — constitution and administration of the regime: authorities, funds,
delegation, staffing. Not promoted.
*Worked examples:* PT Act **s.12** (authorities for implementation), **s.11A** (special recovery
powers), **s.29** (grants to local authorities), **s.30** (payments into the employment
guarantee fund); PT Rules **r.22–r.23** (recovery/collecting agents and their accounts); PFRDA
Act **ss.3–11** (establishment, composition, meetings, officers), **s.13** (transfer from the
interim authority), **s.20** (NPS architecture), **s.21** (CRA appointment by the Authority),
**ss.39–41** (grants and funds), **ss.43–45**, **ss.47–49**.

**7 · RateSchedule** — amounts, slabs, schedules. Not promoted; attaches as context to the duty
that uses the number.
*Worked examples:* PT Act **Schedule I** (rates per class of person; the ₹2,500 annual ceiling
sits in the s.3(2) proviso), **Schedule II**; the segmentation of schedule entries is known
incomplete (OI-010) and that is acceptable *because* schedules are context, not duties. The
PFRDA circular's "₹100 per new account" is a rate inside an instrument that binds the Authority.

**8 · Housekeeping** — short title, extent, commencement, duration, repeal, savings, validation,
amendment of other enactments, issuance recitals. Not promoted.
*Worked examples:* PT Act **s.1**, **s.28** ("Amendment of certain enactments" — the test pair:
PT Act s.28 is Housekeeping while PFRDA Act s.28 is Consequence, so heading text, not section
number, must drive the class), the "Validation and savings" blocks inside the amendment
schedules; PFRDA Act **s.1**, **s.56**; circular **para 1** (reference recital) and **para 4**
("issued in exercise of the powers conferred under Section 14 of the …Act, 2013" — carries the
cross-instrument reference that must resolve to the ingested Act, and nothing to track).

**9 · Unclassified** — the classifier could not decide. Never auto-promoted; always lands in the
human triage queue. The deterministic tier is built to *prefer* Unclassified over a confident
wrong answer: a wrong promotion is noise in the register, a wrong demotion hides a duty, and
both are corrected only if a human looks.

### 1.3 Corrections the worked examples force on the drafted classifier

Reading the fixtures against `packages/domain/src/ingestion/{features,classify}.ts` (uncommitted
draft at the time of writing) yields five required changes; the eval set in §5 pins them:

1. **`modality` gains `prohibitive`**, and the bearer window must accept "No <bearer> shall"
   and bare plurals — otherwise PFRDA **s.25** and **s.27(1)**, two of the three duties that are
   actually ours in that Act, extract no bearer and fall out of `Duty`.
2. **"shall be liable to pay" moves out of `mandatory`** into a distinct `liabilityCreating`
   feature — otherwise PT Act **s.3(2)** (heading "Levy and charge of tax", class Applicability)
   is overridden to Duty by the current rule 2, and s.9 reads as a duty instead of a consequence.
   Conduct-mandatory means a conduct verb governs the modal: furnish, pay, deduct, obtain,
   maintain, preserve, keep, file, submit, satisfy, function, manage, comply.
3. **An `applicability` heading is never overridden to `Duty` by liability language alone** —
   rule 2's current `cls === 'Applicability'` escape hatch admits the charging section. It may
   be overridden by *conduct*-mandatory language (r.11's heading would not class as
   applicability, but a "Liability to…" heading with a real conduct duty inside must still win
   through — PT Act s.4B(1) commands notified persons to deduct and pay).
4. **`Consequence` needs the penalty lexicon to run even when a heading matched weakly**, and
   PFRDA s.28's heading ("Penalty for failure by an intermediary…") must not be trumped by the
   mandatory "shall be liable to a penalty" inside it — same liability-creating rule as (2).
5. **An elective trigger defeats the modal.** PT Rules **r.5(1)**: "Where the holder of a
   certificate of registration … *desires* the certificate to be amended, **he shall submit an
   application**…" — mandatory language, a bearer the pattern list matches ("holder of a
   certificate"), no hard heading class: the draft classifier promotes it, which is precisely
   how `SRC-00206` returns from the dead. The fix is an `electiveTrigger` feature —
   `Where/If <bearer> desires|wishes|intends`, `on application`, `may apply for` governing the
   shall — routing to `PowerProcedure`. Same pattern: r.6(2) ("An application for a revised
   certificate of enrolment shall be made in Form II") and PT Act s.13's appeal mechanics. The
   eval labels for r.5 and r.6 pin this permanently (checklist item 8).

---

## 2. The promotion rule

### 2.1 The rule

A provision may be promoted to a `SourceClause` when **all four** hold:

```
P1  classification = Duty          (system-proposed and human-confirmed, or human-corrected
                                    via governed provision.reclassify with a recorded basis)
P2  bindsUs = yes                  (bearer phrase resolves to a capacity the organisation
                                    holds in its profile — §2.2)
P3  no open blocking flag          (every ProvisionFlag with blocking=true is Resolved or
                                    Accepted — §4)
P4  the actor holds clause authority   (BR-AUT-02: Compliance & Company Secretarial
                                    department gate, via the one authority matrix)
```

Promotion (`provision.promote`) is a governed mutation through the runner: one transaction that
allocates the `SRC-` id (ADR-003 — an identifier is issued only when the thing it names is
tracked), snapshots `verbatimText` onto the clause, stamps `promotedAt`/`promotedById` on the
provision, copies the citation (`clauseRef`), captures the officer's `PenaltyTier` rows with
`sourceRef` to the Consequence provisions, and writes one audit entry. The clause is born at
state **`Recommended`** — a mapping decision is owed (spec 5.1 step 5); `Processing` now lives
at the provision tier. *(Spec deviation to register: §7.3's clause machine keeps `Processing`
as its entry state; propose a spec-change-register entry mapping Processing → the provision
triage tier rather than editing §7.3 mid-phase.)*

**Refusals are mechanical, not advisory.** `provision.promote` returns 422 naming the failed
premise: a Definition (P1), a duty binding the Authority (P2), an open `CadenceUnspecified`
(P3), or a DPO holding Compliance Manager outside the department (P4 → 403). There is no
force-promote. The correction path for a misclassification is `provision.reclassify`
(governed, `basis` required, audited) *then* promote — so the invariant "every SourceClause's
provision reads `Duty`/`bindsUs: yes` at its `promotedAt` instant" is checkable forever.

**Demotion does not exist.** A promoted clause that turns out not to apply follows spec 5.1:
`clause.notApplicable` with a basis. The SRC id is never reused (ADR-003); the provision keeps
its lineage. Re-ingestion (`ingest` re-run) deletes and re-creates only unpromoted provisions;
promoted ones — and their clauses — survive verbatim, because a human decision must not be
erased by re-reading the document.

**The drift tripwire (required).** The clause snapshots the words the decision was taken on;
the provision tier keeps following the document (better OCR, an amending version). Store
nothing new: compare. `scripts/verify-audit-chain.ts` gains a sibling check (or `pnpm verify`
grows one step): for every SourceClause, `sha256(clause.verbatimText)` must equal
`sha256(provision.verbatimText)`; a mismatch raises a person-facing `AmendedText` flag on the
provision naming the clause — never an automatic rewrite (BR-LFC-02: a decision made about
different words is not a decision about these words).

### 2.2 The organisation profile — the minimum that answers "is this ours?"

`OrganisationProfile` (already migrated) needs exactly five facts to decide the fixture set
correctly. Anything beyond this list is Phase-1+ until an ingested instrument demands it:

| Field | Value for the dev/sample org | What it decides in the fixtures |
|---|---|---|
| `legalForm` | `company` | PT Act s.3(2) includes us (excludes firms and HUF) |
| `capacities` | `["employer", "enrolledPerson", "pensionFundManager"]` | employer → PT Act ss.4–6, PT Rules r.11/r.17(2)/r.19/r.19A; enrolledPerson → s.5(2), s.8(2), r.20; pensionFundManager → PFRDA s.23(4), s.25, s.26, s.27(1) |
| `jurisdictions` | `["IN", "IN-MH"]` | Maharashtra instruments bite; another state's PT Act would not |
| `thresholds` | `{"pt-mh.previousYearTaxLiabilityINR": 2400000}` | r.11(3): ≥ ₹1,00,000 → **monthly** return, resolving the `ConditionalApplicability` flag |
| `registrations` | `{"pt-mh.rc": "…", "pt-mh.ec": "…", "pfrda.certificate": "PFM/…"}` | s.5's "already registered", s.27(1)'s standing condition — the duty is *hold and comply with* the certificate, not obtain it again |

The capacity vocabulary is **data, not an enum** — a new sector adds a string, not a migration.
Bearer→capacity mapping lives beside the classifier ruleset and is versioned with it (the
`classifierRuleset` hash covers both), because "who is an intermediary" changing must be as
auditable as the class rules changing. The profile is customer data: in dev it loads with the
P0-18 sample loader (`origin: sample`, purgeable); production installs start empty and the
first governed act of onboarding is filling it in. **A missing profile never blocks ingestion**
— classification still runs, every Duty lands `bindsUs: undetermined`, and promotion is simply
impossible until the profile exists (deterministic fallback, ingestion never blocks on it).

---

## 3. The feature set — one extractor, two consumers

`extractFeatures` is the single source of signals. The rules classify from these features today;
the model provider receives the same features as structured hints beside the text tomorrow. A
feature that only one tier could use does not belong here.

**Unit of inference (fixed now):** one provision — its heading, its verbatim body, its parent
heading chain if a sub-clause — plus the instrument identity and the organisation capacities.
Never the whole document; never less than the full provision. Sub-clauses classify in their
section's context (parent heading passed in; parent class available as a feature), which is what
keeps s.6(2) and s.6(3) attached to the s.6 story instead of free-floating.

**Context envelope (fixed now, serialized by both tiers):**

```
{ instrument: { id, shortTitle, type, jurisdiction, citation },
  clauseRef, headingChain: ["6. Returns", "(3)"],
  text, isSubClause,
  org: { capacities, jurisdictions },
  features: ProvisionFeatures }        // below; the model gets them as hints
```

### 3.1 The features

| Feature | Definition (implementable as stated) | Rule use | Prompt hint it becomes |
|---|---|---|---|
| `modality` | `prohibitive` if `\bNo\b … \bshall\b` or `shall not` governs the operative verb; `mandatory` if shall/must + conduct verb; `discretionary` if `may` governs; else `none` | Duty gate | "The provision prohibits/commands/permits…" |
| `conductVerb` | the verb the modal governs, from the conduct lexicon (furnish, pay, deduct, obtain, maintain, preserve, keep, file, submit, satisfy, function, manage, comply, invest) | separates Duty from liability/consequence | "the commanded act is to ___" |
| `liabilityCreating` | `shall be liable to (pay/a penalty)`, `liable to pay` | routes to Applicability (charge) or Consequence (penalty/interest), never Duty | "creates a liability rather than commanding conduct" |
| `dutyBearerPhrase` | noun phrase governing the modal, window ±160 chars; determiners every/each/any/a/the/**no**; bare plurals accepted | `bindsUs` input | "the duty falls on ___" |
| `headingClass` | first match of the heading lexicons (definitions, housekeeping, penalty, appealOrRevision, power, machinery, rateOrSchedule, applicability) | precedence rule 1 | "the draftsman titled this ___" |
| `penaltyTerms[]` | penalt*, punishable, prosecut*, late fee, interest at, forfeit*, fine — kept verbatim | Consequence evidence | shown as the tier candidates |
| `applicabilityTerms[]` | shall (not) apply, applies to, exempt*, notwithstanding, whose … exceeds, threshold amounts | Applicability + `ConditionalApplicability` flag | "applies only where ___" |
| `procedureTerms[]` | appeal, revision, aggrieved, may apply to, application in Form | PowerProcedure evidence | — |
| `definitionMarkers[]` | means, includes, shall be construed, unless the context otherwise requires | Definition evidence | — |
| `deferralPhrase` | as may be prescribed / notified / specified by (the) regulations | `CadenceUnspecified` flag; Duty stays Duty but blocked | "the cadence/detail is deferred to ___" |
| `electiveTrigger` | `Where/If <bearer> desires / wishes / intends`, `on application`, `may apply for` governing the modal | routes r.5-shaped "shall" to PowerProcedure (§1.3 no.5) | "the obligation arises only if the firm elects to ___" |
| `formReference[]` | `Form [IVXLC0-9A-Z-]+`, `challan`, `MTR-6` | statutory-evidence signal; seeds task evidence guidance (BR-EVD-06) at promotion | "statutory proof named: ___" |
| `hasCrossReference` | under/referred to in/as defined in + (sub-)section/rule/regulation N, or an instrument title + year | `UnresolvedCrossReference` flag; deterministic resolution against the ingested corpus first | "cites ___, which is/is not in the library" |
| `hasProviso` / `hasAmendmentMarker` / `hasMonetaryAmount` | as drafted today | informational flags / RateSchedule + tier hints | — |
| `isSubClause`, `wordCount`, `parentClass` | structural | tie-breaks; sub-clauses inherit section context | — |

Every classification writes `classifierName`, `classifierVersion`, `classifierRuleset` (hash of
the ruleset **plus** the bearer→capacity map), `classifiedAt`, and the features JSON onto the
provision row — the deterministic tier and the model tier identically, so "why is this in my
register" is answerable in either world (spec 13.4 pulled forward to now, because retrofitting
provenance costs a migration and trust).

### 3.2 The shared output contract and confidence scale

Both tiers return the `Classification` shape already drafted in `classify.ts` (class, confidence
0..1, dutyBearer, bindsUs, dutyStatement, rationale[], provider, providerVersion, ruleset,
features). The deterministic tier leaves `dutyStatement` empty — a wrong plain-language statement
of a legal duty is worse than none; the model tier fills it and it renders as a proposal
(BR-AI-05), never as the clause text. Calibration is fixed so swapping providers cannot silently
move the triage line: ≥0.9 heading-conclusive; 0.7–0.89 heading+lexicon agree; 0.5–0.69 single
signal; <0.5 conflict → `Unclassified`. A Duty whose bearer cannot be mapped caps at 0.5.
Thresholds live in config, not code: `classification.triageThreshold` (default **0.7** — below
it the provision surfaces prominently in triage regardless of class) and
`classification.promotionRequiresHuman` (**true**, constant in Phase 0 — auto-promotion is not
built, only proposed-for-promotion ordering). The inference policy per source class stays on the
`EnrichmentProvider` (`allowedSourceClasses`): public statute may go to a hosted model later;
customer-origin documents stay on-prem or manual (P0-17, unchanged).

**Deterministic fallback:** classification runs at ingest inside the same pass that segments;
if the classifier throws, the provision still lands as `Unclassified`/0.0 with the error in the
rationale. When a model tier exists, its failure or timeout falls back to the rules tier's
verdict — ingestion never blocks on inference, and a fallback verdict is labelled as the
fallback provider (BR-AI attribution, honest on-screen).

---

## 4. The flag lifecycle — review with an owner, a deadline and a consequence

"NEEDS REVIEW" decoration becomes a record: every `ProvisionFlag` has a state, an owner, a due
date, and one concrete consequence — **an open blocking flag prevents promotion of that
provision** (§2.1 P3). Nothing else in the platform waits on a flag, so flag volume on
never-promoted classes (a cross-reference inside a Definition) costs nobody anything: it renders
as context and is never chased.

### 4.1 States

```
Open ──► Resolved   (the question was answered; resolvedByProvisionId links the provision that
        │            answered it where one does — r.11(3)(c) resolving s.6(1)'s cadence)
        └► Accepted  (deliberately tolerated, basis required — "the SEBI-side regulations are
                      held offline; norms confirmed by compliance on <date>")
```

Both are terminal, both are governed (`flag.resolve` / `flag.accept`, audited, `BR-LFC-09`: a
negative decision is still a decision). Re-ingestion regenerates flags on unpromoted provisions
(they are re-derived facts); flags on promoted provisions persist, and the drift tripwire (§2.1)
raises new ones. `blocking` is set from the kind by the system, never by the raiser — it cannot
be argued away, only resolved or accepted.

### 4.2 Blocking or informational, per kind

| Flag | Blocks? | Reasoning, grounded |
|---|---|---|
| `CadenceUnspecified` | **Blocks** | You cannot schedule a duty you cannot date. s.6(1)'s "as may be prescribed" is unschedulable until r.11(3) answers; resolution records `resolvedByProvisionId` → the r.11(3) limb, and the obligation created from the clause takes its cadence from the resolving provision, provenance intact. |
| `ConditionalApplicability` | **Blocks** | You do not yet know the duty is yours in this shape. r.11(3)'s ₹1,00,000 threshold flips annual↔monthly; resolution names the profile fact and value band consulted (`pt-mh.previousYearTaxLiabilityINR` ≥ threshold → r.11(3)(c)). The profile *answers* it; a person still *accepts* the answer — the profile could be stale (BR-AI-03 in spirit). |
| `UnresolvedCrossReference` | **Blocks** | The duty leans on words that are not in the library. Deterministic first: if the cited instrument+provision is ingested (circular para 4 → PFRDA Act s.14), auto-resolve with the link at ingest. Else it blocks until the target is ingested (Resolved) or the officer records why proceeding is safe (Accepted — the PFRDA s.26 path when the regulations stay un-ingested in Phase 0). |
| `LowExtractionConfidence` | **Blocks** | The text may not be what the law says (r.11(1)'s OCR reads "Every employee employer…"). Resolution is *verification against the source*: the promotion screen opens the PDF at the provision's page and the officer confirms or corrects the verbatim text — that confirmation IS the flag resolution, folded into the promote flow as one action, not a second ceremony (BR-AI-03 literally). |
| `AmendedText` | Informational | Square brackets are how consolidated Indian statute shows its history; the consolidated text *is* current law (s.6 itself carries five substitutions). A reviewer should see it; nothing about it stops scheduling. The §2.1 drift tripwire re-raises it as a *new* fact when a promoted clause's source moves — that instance warrants attention, and gets it by being fresh and linked, still not by blocking an already-taken decision. |
| `ProvisoPresent` | Informational | A proviso qualifies; the officer reads it at promotion (s.6(1)'s provisos move newly-registered employers and consolidated-return employers onto different footings). Blocking on every "Provided that" would block most of Indian statute. |
| `DiscretionaryLanguage` | Informational | On a Duty it marks an embedded discretion (the Commissioner *may* permit consolidated returns — s.6(1) second proviso); the duty itself stands. A provision that is *wholly* discretionary is not a Duty, so promotion never arises. |

### 4.3 Ownership and the one ladder

Default owner: the compliance owner of the instrument's routing department — in the Phase-0
sample world, the Compliance & Company Secretarial holders (Anjali Deshmukh / Vikram Rao per
`sample-people.ts`); `flag.assign` may hand one to an analyst (Deepa Iyer prepares, the manager
decides — spec 5.1 actors). `dueBy` defaults to `now + flags.reviewWindowDays` (config,
default 14) **only for blocking flags on Duty-classed provisions** — the set someone must
actually clear; informational flags and flags on context classes carry no date and are never
chased. That single scoping rule is what keeps the OCR instrument (every provision flagged
`LowExtractionConfidence`) from generating forty deadlines nobody owes: across the four
fixtures, dated flags land only on the handful of duty candidates.

**P1-08 wiring — no second ladder.** A dated flag registers the standard `Deadline`
(`itemType: 'provisionFlag'`, `itemRef`, `dueDate: dueBy`, `ownerId`) with the one scheduler;
the 7/3/1 ladder chases it exactly as it chases a task, escalating through the department-head
map (`BR-ESC-01..04`). Phase 0 stores owner and `dueBy` and surfaces open blocking flags in
the triage UI; nothing fires until P1-08 turns the reconciler on — the same posture as cycles
(OI-012). The reminder engine learns nothing about flags beyond the registration row; the flag
module never sends anything itself (`BR-ESC-02`).

---

## 5. Scope fence for Phase 0

The customer's constraint is explicit: prove the extraction layer and the proof chain, and stop.

### 5.1 In (the minimum that proves the layer)

1. The two-table schema and migration (`p0_20_provision_clause_split`) with the drift tripwire
   check in the verify script.
2. Deterministic classifier v1 **with the five §1.3 corrections** — without them the fixture
   set itself misclassifies, so they are floor, not polish.
3. The minimum organisation profile (§2.2) loaded by the P0-18 sample loader.
4. Governed actions: `provision.promote`, `provision.reclassify`, `flag.resolve`, `flag.accept`,
   `flag.assign` — through the runner, in the authority matrix, audited.
5. Triage UI on the Source Library: provisions grouped by class with counts, flag chips with
   owner/due, promote flow (which folds in text verification for OCR provisions), and the
   tracked register showing only promoted clauses.
6. `PenaltyTier` capture at promotion — officer-entered from the linked Consequence provisions,
   `sourceRef` mandatory. (Parsing "rupees one thousand" into `amountMinor` mechanically is a
   rabbit hole; a human types two tiers in under a minute.)
7. The labelled evaluation set and `pnpm eval:classifier` in CI (§5.3).
8. Three chains end-to-end (§5.4), and the circular as the deliberate zero-promotion proof.

### 5.2 Out (deliberately deferred, with what deferral costs)

- **Model provider** — the seam, contract, envelope and eval set make it a drop-in; building it
  now proves nothing the deterministic tier does not (Phase 5, P5-03).
- **Term-level definition linking** (s.2(c) "employer" → every clause using the word) — high
  polish, zero promotion-correctness value; definitions surface at instrument level for now.
- **Automatic PenaltyTier extraction** — see 5.1(6).
- **Flag reminders firing** — P1-08 owns the reconciler; Phase 0 records the registration shape.
- **Supersession re-classification flows** — BR-LFC-02 is already honoured at clause level;
  a new instrument version re-runs ingestion as a new provision set (Phase 1 with 5.2's UI).
- **Event-duty intake from exercised powers** (notice of demand → 15-day clock) — Phase 2
  regulatory-change/event territory.
- **Multi-jurisdiction applicability routing** beyond the `jurisdictions` list equality check.
- **Bulk promotion** — promotion is deliberately one-at-a-time in Phase 0; the register is
  meant to be small. If a customer needs fifty promotions a day, that is Phase-1 evidence, not
  a Phase-0 guess.

Anything on this list creeping into Phase 0 should be challenged by name in review.

### 5.3 The labelled evaluation set

`fixtures/instruments/labels/<key>.labels.json`: every **top-level** provision of all four
instruments (~52 PT Act + ~33 PT Rules segmented + ~56 PFRDA + 4 circular ≈ 145 rows), plus the
sub-clauses of the three anchor sections (s.6, r.11, s.27), each labelled
`{clauseRef, class, bindsUs, note}` by a human reading the PDF. Cost: roughly half a session of
careful reading; what it buys: the only regression net that lets a model tier land without
re-arguing every class by anecdote, and the honest measurement §13.4 will demand anyway.
`pnpm eval:classifier` prints per-class precision/recall and **fails** when: (a) recall of
labelled `Duty`+`bindsUs:yes` rows into {Duty, Unclassified} < **1.0** — a real duty of ours may
be sent to triage, never silently filed as context; (b) any labelled Definition or Housekeeping
row classifies as Duty; (c) overall class accuracy < **0.8**. Floors are committed with the
first measured run and only ratcheted, never loosened silently.

### 5.4 The three end-to-end chains (the recommendation, and why these three)

| # | Clause | Why this one |
|---|---|---|
| A | **PT Act s.6(1)+(2) — monthly PT return** (employer) | The anchor. Exercises: Duty; `CadenceUnspecified` resolved **cross-instrument** by PT Rules r.11(3)(c); `ConditionalApplicability` answered by the profile threshold; `LowExtractionConfidence` cleared by verify-at-promotion on the OCR Rules; `PenaltyTier` from s.6(3) (₹200/₹1,000); statutory evidence named in law (challan — `formReference`); monthly cycle → task → challan+Form III-B evidence → verify → Filed. |
| B | **PT Act s.8(2) — annual payment by an enrolled person** | Same instrument, different capacity (`enrolledPerson`), different cadence source (annual **in the statute** — no cadence flag at all, the contrast case), consequence from *different* sections (s.10 penalty 10%, s.9(3) interest), evidence = receipted MTR-6 challan per r.20(1). Proves the profile's capacity list is doing real work: drop `enrolledPerson` and this duty must read `bindsUs: no`. |
| C | **PFRDA Act s.27(1) — standing registration condition** (pension fund manager) | Prohibitive modality (the §1.3 correction, proven live); definitions as context (s.2(1)(g)/(l)); `UnresolvedCrossReference` to un-ingested regulations closed by **Accepted**-with-basis (the tolerated path, exercised once); PenaltyTiers from s.28(1)(a)/(b) (₹1 lakh/day capped ₹1 crore); a **continuous** duty carried by an annual conditions-review obligation whose cadence is chosen by the owner with basis (BR-SCH-03: never auto-scheduled from the statute). |

Beside them, the **circular proves the negative**: four provisions triaged, relations recorded
(supersedes its 2025 predecessor; para 4 reference resolved to the ingested Act's s.14), and
**zero promotions** — an instrument fully worked through that adds nothing to the register is
the two-table design doing exactly its job. Duty rows that remain unpromoted on purpose (s.25,
s.23(4), r.19A…) stay visible in triage as `Duty / bindsUs: yes / unpromoted` — promotion is
selective, and the review asserts some qualified rows were deliberately left.

---

## 6. Plan reconciliation

### 6.1 New Phase-0 chunks (appended; nothing renumbered)

**P0-20 · Extraction layer: provision store, deterministic classification, governed promotion**
— *L* · deps: P0-16, P0-17, P0-18
The §1 taxonomy as `ProvisionClass`; the two-table split (migration
`20260823000000_p0_20_provision_clause_split` — the chunk id matches the migration already
named); `extractFeatures`/`classifyProvision` with ruleset hash and features JSON persisted;
the §2.2 organisation profile in the sample loader; governed `provision.promote` /
`provision.reclassify` / `flag.resolve` / `flag.accept` / `flag.assign`; PenaltyTier capture at
promotion; the drift tripwire in the verify script. **Done when:** §7 items 1–24 pass.

**P0-19 · Source Library triage UI** — *M* · deps: P0-20, P0-10
The Source Library and instrument detail read provisions: class-grouped counts, triage list with
flag chips (owner, due), promote flow folding in verify-against-page for OCR provisions, and the
tracked register listing only promoted clauses. Provisions are addressed by
`(instrumentId, clauseRef)` in URLs — the cuid never crosses the API boundary (I-6's spirit:
internal surrogates stay internal; only `SRC-` ids are citable). **Done when:** §7 items 25–31
pass. *(Id out of dependency order; ids are labels, order is deps — plan §6 rules.)*

**P0-21 · Three chains end-to-end + the labelled evaluation set** — *M* · deps: P0-19, P0-08, P0-11
Chains A/B/C of §5.4 driven through control → obligation → cycle → task → evidence → Filed in
the browser; the labels fixture and `pnpm eval:classifier` in CI with committed floors; the
circular's zero-promotion state demonstrated. **Done when:** §7 items 32–40 pass.

P0-12 (go/no-go) adds one line to its checklist: "extraction honest about classification
provenance; register contains only promoted duty clauses."

### 6.2 Phase-0 chunks affected

| Chunk | Status | Change |
|---|---|---|
| P0-16 | **Amended** | Segmentation output now lands in `SourceProvision`, not `SourceClause`; its "done when" (s.6 sub-clauses, SBI list, flags fire, page numbers) holds verbatim at the provision tier. |
| P0-17 | **Amended** | The `EnrichmentProvider` seam gains the classification contract (§3.2) as its primary consumer; `ClauseEnrichment`'s `disposition` folds into `ProvisionClass` — one output contract, not two parallel ones. |
| P0-08 | **Amended** | `clause.save`/`clause.specialist`/`clause.notApplicable` now operate on *promoted* clauses only; `clause.resolveFlag` is superseded by the provision-tier `flag.resolve`/`flag.accept`. |
| P0-10 | **Partly replaced** | The clause-list rewiring is superseded by P0-19's triage view; document viewer and instrument detail survive. |
| P0-03, P0-14, P0-15, P0-05, P0-06, P0-18, P0-07, P0-09, P0-11, P0-13 | Unaffected | (P0-18 gains the §2.2 profile rows in its sample loader.) |

### 6.3 Stale references in the governing plan (`docs/build-plan.md`), with corrected text

`ADR-012` deleted the demo world; these passages still assume it. **P1-02 is confirmed dead as
written** — "all 217 obligations… 46 policies… 649 evidence rows… `seed --verify` matches
Appendix A counts" is the world P0-04's deletion removed: there are no generators, no
transformer, no Appendix A targets. Corrections below; the sweep should land as build-plan
v1.4 in one commit.

| # | Where | Stale text | Corrected text |
|---|---|---|---|
| 1 | §1.1 tree | `packages/seed-world` + `apps/api/src/seed` ("world loader") | Delete both lines; add `apps/api/src/setup` (reference + sample loaders, ADR-012) and `apps/api/src/ingestion`. |
| 2 | §2 I-6 | "The seed transformer carries an old-id → new-id migration map… P0-13" | Delete the sentence — v1.3 deleted that half of P0-13. |
| 3 | §4 entire section "Migrating the seed world" | generators, transformer, `seed --profile=demo`, Appendix A recount, marquee rebase | Mark the section *(superseded by ADR-012)* and replace with three lines: data enters by ingestion (P0-15/16/20), reference+sample loads (P0-18), and the clock-mode paragraph (which survives) — time-travel is now exercised against earned records. |
| 4 | §5 Phase-0 row | "seed-transform feasibility" as key risk | "extraction accuracy honest at the provision tier; promotion discipline". |
| 5 | §5 Phase-1 row | "full core seed" in the goal | "working corpus ingested and promoted through the UI". |
| 6 | **P1-02** | Whole chunk (transformer to 217/46/649/131; Appendix A; derived-parity with generators) | **Replace:** "P1-02 · Ingest the working corpus — *L* · deps P1-01. Through the 5.2 UI: register and ingest the organisation's applicable instruments beyond the four fixtures (target: 3–5 more real instruments across two regulators), triage and promote their duties, capture tiers. Done when: every promoted clause traces to a verbatim provision and an audit entry; the register count equals the promotion count; zero SourceClause rows exist for non-Duty provisions; the org's obligation register is populated entirely through the product." |
| 7 | P1-04, P1-05, P1-08, P1-12, P1-14, P1-18 deps | "deps: P1-02" (the dead seeding chunk) | Re-point at the corrected P1-02 (corpus via ingestion) — the dependency *edge* survives, its meaning changes: these chunks need earned records to exist, not a seeded world. |
| 8 | P1-08 done-when | "time-travel a **seeded** duty from D-8 to D+8" | "time-travel a *promoted duty's cycle* from D-8 to D+8" (the ladder additionally chases dated provision flags — §4.3 — through the same Deadline table; no new mechanism). |
| 9 | P1-11 done-when | "the internal investment-policy duty and the statutory GST duty" | "an internal policy-derived duty created in the product and the statutory PT return duty (chain A)" — no GST instrument exists in the corpus; internal duties are earned via a policy, not seeded. |
| 10 | P1-14 | "over the seeded historical *records*" | "over earned records — series are honestly short at first; a metric with no history renders its designed empty state, never a synthesized curve (`BR-DRV-18`)". G-26 closes by accumulation, not backfill. |
| 11 | P1-17 | "`seed --verify`" in CI list | "`pnpm verify` (manifest checksums, audit chain, clause/provision drift, eval:classifier floors)". |
| 12 | P1-18 | "the seed transformer derives a shortTitle for every record" | "ingestion and promotion derive `shortTitle` at creation (truncate-at-word from heading/title)". |
| 13 | P2-01 | "Vendor family (**seed only**), remaining Appendix A volumes"; done-when "seed --verify matches full Appendix A" | Vendors and all Phase-2 records are **earned or sample-tier** (ADR-012): schema lands here; records are created through the phase's own UIs and demo scripts. Done-when: migrations + must-not-exist pass; each workflow's demo script creates its own records. |
| 14 | P2-06 | "The **marquee incident** shows three live countdowns" | "an incident *raised in the browser* with personal-data involvement and subscriber impact shows its regulator tracks' live countdowns" — the three-clock shape is now enacted, not shipped. |
| 15 | P2-08 | "the load-bearing cascade wired to the marquee incident" | "the cascade demonstrated live: a simulated feed fails 3 items → issue → incident raised from it → shared evidence across tracks (§19.1 chain), all earned during the demo script". |
| 16 | P2-12 | "No page in these groups imports `packages/seed-world`" | "No page in these groups imports `@/data` (the prototype's in-repo demo dataset — `packages/seed-world` never existed)". |
| 17 | P2-14 | "replaces the **seeded** 7.8/10 constant" | "replaces the *hard-coded* 7.8/10 constant in the prototype's `src/data`" — the excision itself survives unchanged. |
| 18 | §8 row 2 | "Seed the **full** Appendix A world (the generators make breadth free)" | "Breadth = the customer's applicable corpus, ingested (P1-02 as corrected); build breadth follows the phases." |
| 19 | §8 row 3 | "Lead anchor · Blocks **P0-04**" | Blocks P0-15/P0-20 (P0-04 no longer exists). |
| 20 | §8 row 16 | "assign each vendor a named first-line owner **in the seed**" | "…at vendor creation (P3-04's form requires an owner)". |
| 21 | P5-03 | "deterministic provider ported (**extractor**, clause→control recommendations…)"; done-when "Create-instrument-from-URL runs the scripted extractor" | Extraction shipped in P0-15/16/20. P5-03 narrows to: recommendations with confidence + rejected-stays, scoped Q&A, narrative draft, and the **model-backed classification provider** behind the §3.2 contract, measured against the P0-21 eval set before it is trusted (spec 13.4). |
| 22 | P5-09 | "Registers stay <500ms at 10× **seed** volume" | "…at 10× a *generated synthetic load fixture* sized to §17.1 NFR volumes (load-test data, clearly not customer data, never shipped)". |
| 23 | P5-11 | "goes from tarballs to a running **seeded** stack" | "…to a running stack with reference data and an empty, ingestion-ready register". |

Echoes of the same dead text live in the vault mirrors and must move with the plan (same
commit): `docs/phases/phase-0-proof-chain-spike.md` line 31 still carries deleted P0-04
("Extract seed-world + load the spike slice"); `docs/phases/phase-1-platform-floor.md` ("full
core seed", "seed verify"); `docs/phases/phase-2-risk-and-events.md` (marquee-incident cascade
line); `docs/index.md` and gap notes `G-01`/`G-26`/`G-27` where they cite Appendix-A seeding as
the mechanism. The spec itself (`functional-spec.md` §15 "a demo on seeded data", Appendix A) is
*descriptive of the prototype*, stays as history, and needs no edit — with one exception worth a
spec-change-register entry: §7.2's "An instrument with no clauses is not yet worked through"
becomes "no *triaged provisions*" in the split world (the circular is fully worked through with
zero clauses), alongside the Processing-state mapping note from §2.1.

**Unaffected after checking:** P1-03, P1-06, P1-07, P1-09, P1-10, P1-13 (Deepa/Anjali survive —
the sample roster deliberately reuses those names), P1-15, P1-16, P1-19, P2-02..05, P2-07,
P2-09..11, P2-13, P3-01..10 (P3-04's vendor register is earned-data per #13), P4-01..06,
P5-01..02, P5-04..08, P5-10.

---

## 7. Verification checklist — the review contract

Every item is pass/fail. SQL runs as `docker exec -i onegrc-db psql -U onegrc -d onegrc`;
API calls via curl with a dev-impersonated session; UI items name what is on screen. Items
1–24 close P0-20, 25–31 close P0-19, 32–40 close P0-21.

**Schema and data invariants (SQL)**

1. `SourceClause.provisionId` is NOT NULL and UNIQUE (`information_schema.columns` /
   `pg_indexes`); `SourceProvision` and `ProvisionFlag` tables exist.
2. Zero orphans: `SELECT count(*) FROM "SourceClause" c LEFT JOIN "SourceProvision" p ON
   p.id=c."provisionId" WHERE p.id IS NULL` → 0.
3. Promotion is a bijection: count of provisions with `promotedAt IS NOT NULL` = count of
   `SourceClause` rows, and every such provision's `promotedClause` resolves.
4. Volumes prove the split: `SourceProvision` ≥ 400 across the four fixtures;
   `SourceClause` ≤ 30; the ratio is the noise the register no longer carries.
5. **Negative:** zero `SourceClause` whose provision `classification <> 'Duty'`.
6. **Negative:** zero `SourceClause` whose provision `bindsUs <> 'yes'`.
7. **Negative (the customer's exhibit A):** PT Rules `clauseRef='2'` (Definitions) reads
   `classification='Definition'` and has no promoted clause — no SRC id exists for it.
8. **Negative (exhibit B):** PT Rules `clauseRef='5'` (Amendment of certificate of
   registration) reads `PowerProcedure`, no promoted clause.
9. **Negative (the duty-bearer test):** PFRDA Act `clauseRef='14'` reads
   `classification='Duty'`, `bindsUs='no'`, `dutyBearer` naming the Authority, no clause.
10. PT Act `clauseRef='3'` reads `Applicability` (liability-creating language did not make the
    charging section a Duty).
11. PFRDA `clauseRef='25'` and `'27'` (or its `(1)` sub-clause) read `Duty`/`bindsUs='yes'`
    with a non-null `dutyBearer` — the prohibitive-modality fix, proven in data.
12. Heading beats section number: PT Act `clauseRef='28'` → `Housekeeping`; PFRDA
    `clauseRef='28'` → `Consequence`.
13. Every provision carries `classifierName`, `classifierVersion`, `classifierRuleset`,
    `classifiedAt` NOT NULL, and `features` JSON containing keys `modality`,
    `dutyBearerPhrase`, `headingClass` (jsonb `?` probes).
14. Determinism: run ingest twice; the per-instrument digest
    `md5(string_agg(clauseRef||classification||"bindsUs"||coalesce("classifierConfidence"::text,''), ',' ORDER BY ordinal))`
    is unchanged.
15. Re-ingestion preserves decisions: after a re-run, promoted provisions' ids and their
    `SourceClause` rows are unchanged (same ids, same `createdAt`, same count); unpromoted
    provisions may be recreated.
16. Flags on their real instances: PT Act s.6(1) has open `CadenceUnspecified` (blocking)
    before resolution; every PT Rules provision carries `LowExtractionConfidence`; the
    circular's para 4 `UnresolvedCrossReference` is Resolved with its target (the ingested
    Act) recorded.
17. `blocking` matches kind exactly: no blocking `AmendedText`/`ProvisoPresent`/
    `DiscretionaryLanguage` row; no informational row of the four blocking kinds.
18. `dueBy` is set only on blocking flags of Duty-classed provisions; NULL everywhere else
    (the no-forty-deadlines rule, §4.3).
19. No SRC ids burned by extraction: `IdSequence` for prefix `SRC` shows
    `next = count("SourceClause") + 1`.
20. Every `SourceClause` has exactly one `provision.promote` audit entry linking actor,
    provision and clause; `scripts/verify-audit-chain.ts` passes.

**Governed behaviour (API)**

21. **Negative, all four premises:** `provision.promote` returns 422 naming the failed premise
    for (a) a Definition (P1), (b) PFRDA s.14 (P2 — a duty binding the Authority), (c) PT Act
    s.6(1) while `CadenceUnspecified` is open (P3 — the response names the flag), and 403 for
    (d) the DPO persona (Compliance Manager role, wrong department — P4/BR-AUT-02).
22. Resolve-then-promote: `flag.resolve` on s.6(1)'s cadence flag with
    `resolvedByProvisionId` = PT Rules r.11(3)(c), then `provision.promote` succeeds; the
    clause is born `Recommended`; both actions have audit entries.
23. `provision.reclassify` without a `basis` → 422; with one, class changes and the audit
    entry carries before/after.
24. Drift tripwire: corrupt one promoted provision's `verbatimText` in dev SQL; the verify
    step fails naming the SRC id (and the flow raises a person-facing flag, not a rewrite).
    Restore afterwards.

**Triage UI (P0-19)**

25. The Source Library shows per-instrument triage counts by class; their sum equals the
    provision count from SQL.
26. Filtering triage to `Duty` + `bindsUs: yes` lists the candidate set, each row showing the
    classifier's rationale and confidence — a proposal, labelled as one (BR-AI-05).
27. **Negative:** a Definition provision's page offers no promote affordance, *and* the direct
    API call is refused — hidden button is not the control (BR-AUT-03).
28. Promoting the OCR provision r.11(1) opens the PDF at its page and demands text
    confirmation; one confirmation both resolves `LowExtractionConfidence` and promotes.
29. The tracked register lists only promoted clauses; its count matches item 3; a row opens
    clause detail with verbatim text, citation, and open-PDF-at-page.
30. Provision URLs address `(instrument, clauseRef)` — the address bar reads
    `/instruments/INST-…/provisions/6`, never a cuid.
31. Flag chips show owner and due date on dated flags; informational flags render undated.

**End to end (P0-21)**

32. **Chain A** (PT s.6(1)+(2), monthly): profile threshold answers r.11(3) →
    `ConditionalApplicability` resolved; cadence resolved per item 22; promote; control and
    monthly obligation created; cycle → task → Form III-B + challan evidence → second-persona
    verify → cycle Filed. `GET /api/proof-chain?anchor=<EVD-…>` resolves to `SRC-…`/s.6(1)
    with provision lineage, and the chain JSON is identical from any anchor (BR-LNK-03).
33. **Chain B** (PT s.8(2), annual, `enrolledPerson`): no cadence flag existed (statutory
    date); `PenaltyTier` rows cite s.10 (10%) and s.9(3) (interest) as `sourceRef`; chain
    resolves end to end.
34. **Chain C** (PFRDA s.27(1)): the regulations cross-reference is `Accepted` with a recorded
    basis; annual review obligation with owner-chosen cadence and basis; tiers cite
    s.28(1)(a)/(b); chain resolves end to end.
35. The circular ends fully triaged with **zero** promoted clauses; its `references` relation
    to the PFRDA Act resolves both ways; its un-ingested 2025 predecessor is visible as an
    open/Accepted reference, honestly labelled — not silently dropped.
36. Capacity flip (dev): remove `pensionFundManager` from the profile and re-classify — PFRDA
    duty rows flip to `bindsUs: no` while every promoted clause and PT row is untouched;
    restore, flip back.
37. `pnpm eval:classifier` prints per-class precision/recall over the committed labels and
    passes its floors (§5.3); it runs in CI.
38. Selectivity: `SELECT count(*) FROM "SourceProvision" WHERE classification='Duty' AND
    "bindsUs"='yes' AND "promotedAt" IS NULL` > 0 — qualified rows were deliberately left.
39. Authority is data: `ActionAuthority` has rows for `provision.promote`,
    `provision.reclassify`, `flag.resolve`, `flag.accept`, `flag.assign`; a wrong-role persona
    gets 403 on each via curl (spot-check two).
40. After the full walkthrough, `verify-audit-chain` still passes and every promote/resolve/
    reclassify entry is navigable to its records (BR-AUD-04).

---

## 8. Risks worth naming

- **Two-table text drift is the design's one structural trap.** The register clause freezes the
  words a decision was taken on; the provision tier keeps following the document. Without the
  §2.1 hash tripwire, a re-ingested correction (the OCR Rules *will* be re-read better one day)
  leaves the firm quoting text the library no longer contains — two "verbatim" texts and no
  signal which one the auditor gets. The tripwire is therefore floor, not polish (items 24, 15).
- **Bearer resolution is the classifier's soft spot.** Heading classes are near-deterministic;
  "who does this bind" is prose. The mitigations are structural: undetermined caps confidence
  at 0.5, undetermined never auto-proposes, promotion is human, and the eval set measures it.
- **Scope pressure points** (§5.2): tier parsing, term-level definition links, bulk promotion,
  auto cross-reference resolution beyond the ingested corpus. Each is a Phase-1+ conversation.

## Links

[[build-plan]] Phase 0 · [[ADR-012-no-demo-data]] · [[ADR-003-identifier-scheme]] ·
[[ADR-007-roles-and-authority]] · [[functional-spec]] §5.1, §5.2, §6, §7, §13 · [[open-issues]]
OI-010/OI-011 (segmentation coverage and hierarchy — unchanged by this design, still open)
