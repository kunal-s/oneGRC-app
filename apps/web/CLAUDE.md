# OneGRC — Standing Spec (Source of Truth)

> This is the permanent source of truth for the **OneGRC** prototype. Every prompt/build
> inherits the narrative spine, realism anchors (A4), IA (A5), data model (A6) and guardrails
> (A10). **Re-read this file before starting each new section.**

**App package name:** `onegrc` · **Product name on screen:** OneGRC · **Customer:** Sankalp Pension Funds Pvt. Ltd.

---

## A1 · Narrative spine & thesis

A PFRDA-regulated pension fund manager runs governance, risk and compliance across two
disconnected tools and a sprawl of spreadsheets — IT/security risk lives in one place,
enterprise/regulatory compliance in another, and the board never sees one picture. OneGRC is
the single platform where every risk, control, obligation, incident, policy and piece of
evidence is one shared record — so a control failure, a security incident, a regulatory change
and a board report all reconcile to the same underlying objects, on one regulatory clock.

- **Product name + one-liner:** OneGRC — Sankalp's unified GRC platform: IT-GRC and
  enterprise/regulatory GRC on one data model, on a J2W-architected unified GRC/IRM backbone
  (vendor-neutral).
- **Customer problem (their words):** "We run two tools and a lot of spreadsheets. IT risk and
  enterprise compliance never meet. Has anyone in BFSI actually put both on one platform?"
- **Single claim / thesis sentence:** One platform instead of two. One taxonomy of risks,
  controls, issues, obligations and evidence. Every regulator, one calendar, one evidence trail.
- **Thesis motif (pervasive, not the slogan):** every risk, control, incident and obligation
  carries a shared-object treatment — the same record is shown to surface in IT and enterprise
  views, with linked evidence and a "where this also appears" cross-reference. The motif sells
  the thesis; the slogan appears only on the Home hero and the Integrations/"one platform" view.

## A2 · Customer world & personas

- **Org + structure:** Sankalp Pension Funds Pvt. Ltd. (SPF) — PFRDA-registered NPS Pension
  Fund Manager, wholly-owned subsidiary of Sankalp Bank. Category I Regulated Entity under
  PFRDA ICS. Manages NPS Scheme E / C / G / A across Tier I & II, plus Central Government,
  State Government, Corporate and APY mandates. AUM ₹3,24,718 crore; 41,86,902 subscribers.
  Three lines of defence (business owners → risk/compliance → internal audit).
- **Primary logged-in persona:** Meera Krishnan — Chief Risk Officer (platform owner; sees the
  enterprise heat map and board cockpit).
- **Role switcher (top-right):** Meera Krishnan (CRO) · Rajesh Iyer (CISO) · Anjali Deshmukh
  (Head of Compliance) · Vikram Rao (Company Secretary) · Sunita Menon (Head of Internal Audit)
  · Arvind Patel (Head of Investment Compliance). Changes "My Queue" contents and which
  approvals appear — it is the only "auth".
- **Named roster (15):** Meera Krishnan, Rajesh Iyer, Anjali Deshmukh, Vikram Rao, Sunita Menon,
  Arvind Patel, Karthik Nair (SecOps lead), Priya Sharma (DPO / Privacy lead), Rohan Gupta (IT
  Controls), Deepa Iyer (GST/Tax), Farhan Ali (Labour & Secretarial), Neha Joshi (SOC analyst),
  Sanjay Verma (Investment Risk), Lakshmi Rao (Internal Auditor), Imran Sheikh (Vendor/TPRM).
- **Operational pain:** (1) evidence collection is manual & point-in-time; (2) the same control
  (e.g. MFA) is re-tested against ISO, NIST, PCI and PFRDA ICS separately; (3) India's
  multi-clock breach problem — one incident can trip CERT-In (6 hrs), PFRDA (48 hrs + quarterly
  + annual) and DPDP Board (~72 hrs) at once; (4) India's statutory landscape changes ~8,000
  times/year and global GRC tools have weak native Indian content; (5) PFRDA returns, committee
  cadence and exposure limits are tracked by hand.
- **Customer language to adopt:** PFRDA ICS 2024 control & incident taxonomy
  (Critical/High/Medium/Low per the Sept-2025 circular); three lines of defence; "map once,
  satisfy many"; "backbone-plus-spokes".

## A3 · Aesthetic direction & anti-patterns

- **Positive references:** Linear · ServiceNow "Next Experience" / Now Platform · Vanta · Drata
  · Atlan · Snowsight. Calm, premium, information-dense, trustworthy, governance-grade.
- **Must NOT look like:** a marketing landing page; a bright consumer SaaS app; an obvious
  demo/mockup; a wall of oversized gradient donut charts; anything "pitch-deck-y". It is a tool,
  not a presentation.
- **Default:** light mode (single dark-mode toggle optional, not required).
- **Density:** high. Real tables with many rows, compact KPI tiles, persistent context strip.
- **Style adjectives:** precise, calm, dense, auditable, regulator-ready.
- **Color rule:** color is used for *state* only, not decoration.

## A4 · Realism anchors (non-negotiable)

- **Person names:** Indian (see roster). Subscribers shown by masked PRAN, never full PII.
- **Identifier formats:**
  - PRAN: 12 digits e.g. `110078451293`, displayed masked `1100 7845 ••••`.
  - Risk: `RISK-IT-0142`, `RISK-OPS-0087`, `RISK-INV-0031`.
  - Control: `CTRL-ISO-A.8.9`, `CTRL-NIST-PR.AC-01`, `CTRL-PFRDA-ICS-14`.
  - Incident: `INC-2026-0411`; Issue: `ISS-2026-0233`; Obligation: `OBL-PFRDA-Q1-07`,
    `OBL-GST-3B-FEB26`; Evidence: `EVD-44192`; Audit: `AUD-IS-2026-02`; Reg-change: `RCM-2026-118`.
- **Frameworks / regs:** ISO/IEC 27001:2022, NIST CSF 2.0, PCI DSS 4.0, COBIT, PFRDA ICS
  Guidelines 2024 + circular `PFRDA/2025/05/ICS/01`, CERT-In Direction 20(3)/2022 (6-hour clock,
  180-day in-India log retention, NTP sync), DPDP Act 2023 / DPDP Rules 2025, Companies Act 2013,
  GST (GSTR-1/3B/9C), labour codes.
- **Source systems / spokes (named on screen):** **Sankalp ServiceDesk** — the customer's
  existing in-house ITSM + CMDB, kept and **integrated as a spoke, not replaced** (feeds
  incidents, change records and asset/CI data); the **OneGRC unified GRC/IRM backbone** itself
  (vendor-neutral — **never branded as ServiceNow or any single vendor**); Splunk SIEM,
  Qualys/Tenable VM scanner, CrowdStrike EDR, Okta/AD IAM, AWS Security Hub (CCM feed), OneTrust
  (DPDP/consent spoke), TeamLease RegTech & Lexplosion Komrisk (Indian obligation engine),
  ClearTax / IRIS GST (GST filing), NPS Trust & CRA (Protean/KFintech) feeds.
- **Number & currency style:** ₹ crore / lakh; non-round everywhere — AUM ₹3,24,718 cr, control
  coverage 96.2%, "14-day patch SLA breached by 3 items", "evidence auto-captured 41 min ago".
  Never 1000/5000/100%.
- **Hard rules:** no lorem ipsum; no round numbers; no empty tables/states; real clock
  timestamps ("Wed 10 Jun 2026, 02:14 IST", "09:47 AM") not "X min ago" placeholders; every list
  seeded ≥ its A6 volume.

## A5 · Information architecture

**Sidebar (order is fixed — only the active item highlights; no stray dots):**

- *Pinned top (no header):* Home — Board Cockpit · My Queue
- **RISK & CONTROL:** Risk Register · Control Library · Continuous Control Monitoring · Policies
- **INCIDENTS & CLOCKS:** Incidents · Regulator Clocks
- **COMPLIANCE:** Obligations & Calendar · Regulatory Change · PFRDA Pack · DPDP / Data Governance
- **AUDIT & ASSURANCE:** Audits · Issues & Remediation · Evidence Vault
- *Pinned bottom:* Integrations · Settings

**Persistent chrome:** top bar with ⌘K command search, org switcher ("Sankalp Pension Funds"),
role switcher, notifications. Context strip under the top bar with vital signs: Open incidents ·
Nearest regulator clock (live countdown) · Control coverage % · Overdue obligations · Open
audit findings.

**Route map:**

| Route | Screen |
|---|---|
| `/` | Home — Board Cockpit |
| `/queue` | My Queue (role-aware) |
| `/risks` · `/risks/:id` | Risk Register · Risk detail |
| `/controls` · `/controls/:id` | Control Library · Control detail (tabs: Overview / Mappings / Test history / Evidence / Issues) |
| `/ccm` · `/ccm/:id` | Continuous Control Monitoring · CCM rule detail |
| `/policies` · `/policies/:id` | Policies · Policy detail |
| `/incidents` · `/incidents/:id` | Incidents · Incident detail (MARQUEE INC-2026-0411) |
| `/clocks` | Regulator Clocks |
| `/obligations` · `/obligations/:id` | Obligations & Calendar · Obligation detail |
| `/reg-change` · `/reg-change/:id` | Regulatory Change · Reg-change detail |
| `/pfrda` | PFRDA Pack |
| `/dpdp` · `/dpdp/dsar/:id` | DPDP / Data Governance · DSAR detail |
| `/audits` · `/audits/:id` | Audits · Audit detail |
| `/issues` · `/issues/:id` | Issues & Remediation · Issue detail |
| `/evidence` | Evidence Vault |
| `/integrations` | Integrations (backbone + spokes, "one platform" view) |
| `/settings` | Settings |

## A6 · Data model & volumes

Types in `src/types/`; deterministic seed generators in `src/data/`. All entities cross-link by id.

- **Risk** `{ id 'RISK-IT-0142'; title; domain 'IT'|'Cyber'|'Operational'|'Investment'|'Compliance'|'ThirdParty'; owner; likelihood 1-5; impact 1-5; inherent; residual; treatment 'Mitigate'|'Accept'|'Transfer'|'Avoid'; linkedControls[]; linkedIncidents[]; status }` → **~140**
- **Control** `{ id 'CTRL-ISO-A.8.9'; title; frameworks ('ISO 27001'|'NIST CSF'|'PCI DSS'|'PFRDA ICS')[]; owner; type 'Preventive'|'Detective'; automation 'CCM'|'Manual'; lastTested; result 'Pass'|'Fail'|'Partial'; evidenceCount; mappedFrameworkRefs }` → **~260**; each maps to **2–4 frameworks**; **38 CCM-automated**.
- **Obligation** `{ id 'OBL-PFRDA-Q1-07'; regulator 'PFRDA'|'CERT-In'|'DPDP'|'GST'|'Labour'|'Companies Act'; title; frequency; dueDate; owner; status 'Filed'|'Due'|'Overdue'|'In review'; makerChecker; evidence[] }` → **~180**; 9 overdue, 23 due ≤30 days.
- **Incident** `{ id 'INC-2026-0411'; title; classification 'Critical'|'High'|'Medium'|'Low'; detectedAt; source 'Sankalp ServiceDesk (ITSM)'|'Splunk SIEM'|'CrowdStrike EDR'; assets[]; regulatorTracks {regulator, deadline, clockStartedAt, status}[]; timeline[]; subscriberImpacting; personalDataInvolved }` → **~60**; 1 live Critical (marquee), 4 open High.
- **Policy** `{ id; title; version 'v3.2'; owner; approvedBy; nextReview; mappedControls[] }` → **~45**
- **Issue** `{ id 'ISS-2026-0233'; source 'Control failure'|'Audit finding'|'Incident'; severity; owner; dueDate; ageDays; status }` → **~120**
- **Evidence** `{ id 'EVD-44192'; type 'Screenshot'|'Log'|'Config export'|'Attestation'|'Filing ack'; capturedAt; capturedBy 'CCM (auto)'|person; linkedControls[]; linkedObligations[]; frameworkRefs }` → **~600**; ~70% auto-captured.
- **Audit** `{ id 'AUD-IS-2026-02'; type 'IS audit (CERT-In empanelled)'|'Internal'|'PFRDA'; auditor; period; findings[]; status }` → **~18**
- **RegulatoryChange** `{ id 'RCM-2026-118'; source 'TeamLease RegTech'|'Lexplosion Komrisk'|'PFRDA circular'; summary; publishedAt; impactedObligations[]; impactedControls[]; owner; status 'Assessed'|'In progress'|'Closed' }` → **~90**; feed shows "12,973 updates captured in 2025" provenance.
- **DataAsset** `{ id; store 'CRA'|'KYC DB'|'Fund Accounting'|'CRM'; piiTypes ('PRAN'|'KYC'|'Nominee'|'Bank'|'Financial')[]; classification; retentionRule; consentStatus }` → **~120**; DSARs ~14 open.

**Relationships:** Incident → Risk(s) + Control(s) + regulator tracks + Evidence. Control →
Frameworks + Evidence + Issues + Risk(s). Obligation → RegulatoryChange + Evidence + owner.
Everything rolls into the Home heat map and board view (the thesis made literal).

## A7 · Per-screen specifications

**Reusable component vocabulary (defined once, reused everywhere):** PageHeader, KpiTile,
SeverityBadge (Critical/High/Med/Low), StatusChip, FrameworkPill, RegulatorClock (live
countdown), DataTable (sortable, filterable, **no empty state**), CrossRefPanel ("where this
also appears"), EvidenceList, Drawer, Timeline, RoleSwitcher, CommandSearch.

- **Home — Board Cockpit (`/`):** hero "Good morning, Meera — OneGRC" + thesis; 6 KPI tiles
  (Enterprise risk 7.8/10 ▲, Control coverage 96.2%, Open incidents 5 / 1 Critical, Nearest
  clock CERT-In ~03:11:42, Overdue obligations 9, Open findings 27); 5×5 inline-SVG enterprise
  risk heat map (IT/Ops/Investment/Compliance dots, cells → filtered Risk Register); "Needs
  attention" two-column (live incident track + overdue obligations); 15-row cross-domain
  activity stream with real IST timestamps; three 30-day Recharts trends (open incidents,
  control pass-rate, obligations on-time). Nearest-clock tile → `/incidents/INC-2026-0411`.
- **My Queue (`/queue`):** role-aware task list (12–18 rows for CRO; different per role).
- **Risk Register:** filterable table (domain/owner/residual); detail with 5×5 position,
  CrossRefPanel, treatment plan, history.
- **Control Library + CCM:** FrameworkPills show "map once, satisfy many"; detail tabs
  Overview/Mappings/Test history/Evidence/Issues. CCM: live rules, pass/fail population,
  auto-evidence, a FAILING rule that auto-spawned an issue + incident.
- **Incidents + Regulator Clocks (MARQUEE):** INC-2026-0411 "Ransomware on fund-accounting
  server", detected 02:14 IST, auto-Critical, three live tracks side by side — CERT-In (6h,
  Annexure I draft), PFRDA (48h subscriber-impacting + quarterly), DPDP Board (~72h). One
  timeline, one evidence trail, three regulator outputs. Buttons mock to toast + drawer.
- **Policies:** versioned, mapped controls, approval chain.
- **Obligations & Calendar + Reg-Change + PFRDA Pack:** one calendar across all regulators;
  reg-change feed auto-updates an obligation + control; PFRDA pack with committee cadence
  (Investment, Risk, Audit, NRC) + exposure-limit controls.
- **DPDP / Data Governance:** data inventory, consent ledger, DSAR queue (~14 open) with a
  worked erasure-vs-retention case feeding the incident module. OneTrust shown as spoke.
- **Audits + Issues + Evidence Vault:** audits → findings → issues; issues by source/severity/
  age; evidence vault ~600 items ~70% auto, each linked to controls+obligations+frameworks.
- **Integrations:** backbone-plus-spokes inline-SVG diagram; spokes show live status + last
  sync. Earns the slogan. Closing shot.

## A10 · Scope guardrails & build phasing

- **Demo build:** hardcoded/seeded data; in-memory Zustand session state (resets on reload); no
  backend/auth/persistence; responsive only ≥1024px; file pickers & exports mocked (toast +
  drawer); compose/approve actions show optimistic UI + toast.
- **What this is NOT:** not a real GRC/ITSM vendor instance, **not branded as ServiceNow or any
  single vendor**, not multi-tenant, not a marketing site, not mobile, no real regulator API
  calls, no real PII.
- **Phase 1 (demo-critical, high polish):** Shell + Home + Incidents/Clocks (marquee) + CCM +
  Control detail + Integrations.
- **Phase 2:** Risk Register, Obligations/Reg-change/PFRDA, DPDP, Audits/Issues/Evidence, My Queue.
- **Phase 3 (nice-to-have):** dark mode, saved views, bulk actions, fuzzy command search, guided tour.

## A11 · Stack & implementation notes

- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn-style primitives + Recharts +
  React Router + Zustand + date-fns + lucide-react.
- **Conventions:** `src/types/` (entities), `src/data/` (deterministic seed generators —
  seeded so reloads are stable), `src/pages/` (one per route), `src/components/` (the A7
  vocabulary), `src/lib/` (clocks, formatting, cross-ref helpers), `src/store/` (Zustand).
- **Charts:** Recharts. **Heat map & backbone-plus-spokes diagram:** hand-built inline SVG with
  animated entry. **Live clocks:** a single `useInterval` ticking shared countdowns (animation
  only — deadlines are seeded).
- **Quality bar:** `npm run dev` clean, no console errors, `tsc` passes, no empty tables anywhere.

---

### Demo "now" anchor

The seeded world is frozen at a demo "now" of **Wed 10 Jun 2026, 05:02:18 IST**. Chosen so the
marquee CERT-In 6-hour clock (incident INC-2026-0411 detected Wed 10 Jun 02:14 IST → 08:14
deadline) reads ~03:11:42 remaining on first paint. Live countdowns animate from seeded
deadlines relative to this anchor; all relative phrasing ("41 min ago") derives from absolute IST
timestamps, never hardcoded strings.
