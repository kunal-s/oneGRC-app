# OneGRC — Functional Product Specification

**A unified Governance, Risk, Compliance and Audit platform for regulated enterprises.**

---

## 0. Document control

| | |
|---|---|
| **Document** | OneGRC Functional Product Specification |
| **Version** | 2.1 |
| **Status** | Issued for development hand-over |
| **Supersedes** | v2.0 (which superseded v1.0, the functional narrative) |
| **Product** | OneGRC · package `onegrc` |
| **Worked customer** | Sankalp Pension Funds Pvt. Ltd. (SPF) — fictional |
| **Primary audience** | The engineering team that will build the full system; secondarily the product, delivery and customer-facing leads |
| **Companion documents** | `onegrc-dashboard-kpi-design.md` (**governing** for board/committee surfaces and the metric catalogue — see §10) · `onegrc-build-plan.md` (the phased build) · `onegrc-spec-change-register.md` (every v2.1 change, with severity) · `CLAUDE.md` (the prototype's standing narrative spec — describes the demo, not the target) · `docs/SYSTEM-SPEC.md` (page-by-page description of the prototype as built) |
| **Prototype baseline** | The running React prototype, at the state described in Appendix B (demo reference only) |

### What changed in v2.0

v1.0 was a functional narrative. It described the product well but stopped short of what a
development team needs to build it: it named no lifecycle states, no authority matrix, no rule that
could be turned into a test, and it predated roughly a third of the surfaces the prototype now
carries.

v2.0 keeps the whole of v1.0's narrative and adds five things:

1. **§4** grows from persona sketches into a full authority model — roles, departments, the
   action-authority matrix, and the separation-of-duties constraints.
2. **§5** grows from ten narrated flows into thirty workflows on one uniform template, each
   with a state machine, alternate paths, side effects and acceptance criteria.
3. **§6** is new: a numbered, testable catalogue of business rules.
4. **§7**, **§10**, **§11**, **§13**, **§14**, **§17**, **§18** and **§19** are new — the object and
   state models, metric definitions, the notification matrix, the intelligence scope, the
   configuration model, the non-functional requirements, migration, and an explicit register of what
   the prototype fakes versus what production must do for real.
5. Every section is reconciled against the prototype as it stands, including the modules that
   arrived after v1.0 was written: third-party risk, campaigns, fraud, speak-up, key risk
   indicators, the exception register, the audit programme, committee packs and the risk lifecycle.

### What changed in v2.1

v2.0 was reconciled against the prototype — and in a handful of places it inherited the
prototype's demo thinking as if it were the target. v2.1 is the audit that separates the two,
before the production build commits. The full change list, with severity, is in the companion
change register; the substance:

1. **Demo constructs are quarantined.** A new **§23** tables every demo artifact — the staged
   "now" anchor, the fabricated trend curves, the hardcoded headline metrics, the persona
   switcher as authentication, the demo-data aesthetics — and states what production must do
   instead. Appendix A is relabelled as the seeded demonstration world, demo only.
2. **The exception model is corrected.** An exception is a first-class entity (subject: a control
   or an obligation), no longer a subtype of issue; the remediation register becomes a union view;
   expiry enters a review with no auto-created issue (§5.14, `BR-LFC-13`, `BR-AUT-11`).
3. **Identifiers are redesigned** (§7.4): short, meaning-free, ≤11 characters, with `title` and a
   required `shortTitle` carrying the meaning and a `citation` field carrying the legal reference.
4. **Dishonest metrics are removed.** The stored enterprise-risk headline, the mean-age measures
   that improve when you do less work, and the on-time rate a firm could game by not filing are
   replaced; §10 now defers board surfaces to the dashboard KPI design document. New rules
   `BR-DRV-17` (Overdue is derived) and `BR-DRV-18` (no synthesized trend, ever).
5. **The task model is unified**: one work-item engine with a `completionPolicy`, used by
   obligations, remediation, campaigns, DSAR stages and attestations (§5.4, §7.3).
6. **Obligation and cycle are split** explicitly (`Obligation` the standing duty,
   `ObligationCycle` the instance) with the cycle-id convention pinned (§7.1, §7.4).

Every rule id, gap id and workflow number from v2.0 remains valid; new rules take new numbers.

---

## How to read this document

This is a functional specification. It describes **what** the product does, **why** it does it, and
**who** it does it for.

**On the line between functional and technical.** v1.0 promised to contain no schema, no field names
and no interface contracts. v2.0 relaxes that promise deliberately, because a document that a team
is expected to build from has to be unambiguous about a few things that sit just below the
narrative: the states a record can be in and the transitions between them, how many of one thing may
attach to another, what a metric is exactly computed from, and which rules are load-bearing. So this
document now carries lifecycle state models, cardinality, numbered business rules and exact metric
definitions.

It still contains **no technical design**: no database schema, no field-level data dictionary, no API
or interface contracts, no file or module layout, no technology mandates, and no effort estimates.
Where it touches architecture it stays at the level of ideas (for example, distinguishing a "control
plane" from a "data plane"). The job of turning this into a build belongs to the engineering team
that receives it, and every technical choice remains theirs.

**On the two voices.** The primary voice describes the **target product** — the system to be built.
Where the running prototype already implements something, or implements it differently, a short
note marked *As built* records that. §19 consolidates every one of those notes into a single gap
register, so nothing is lost between "what we showed" and "what we must build".

**It is written to stand on its own.** A developer who has never heard of this product, and who
knows nothing about the compliance industry, should be able to open any single section and
understand who is using the feature, what the flow is, what appears on screen, and what difference
it makes. To make that possible, the document carries one continuous worked example throughout, and
ends with a glossary of every domain term it uses.

**The worked example.** Wherever a concrete illustration helps, the document uses a single fictional
customer: **Sankalp Pension Funds Pvt. Ltd. (SPF)**, a mid-size, heavily regulated financial firm
that manages retirement savings for several million subscribers. Its named (and entirely fictional)
staff recur across the scenarios so that the same people reappear in different flows:

- **Meera Krishnan**, Chief Risk Officer, who also chairs the Risk Management Committee.
- **Anjali Deshmukh**, Head of Compliance, who holds the ethics channel.
- **Vikram Rao**, Company Secretary (in a firm this size, the compliance and secretarial roles sit
  close together, and one person often wears both hats).
- **Rajesh Iyer**, Chief Information Security Officer.
- **Arvind Patel**, Head of Investment Compliance.
- **Sunita Menon**, Head of Internal Audit, who also chairs the Audit Committee.
- **Priya Sharma**, Data Protection Officer.
- **Deepa Iyer**, Finance and Tax lead.
- **Farhan Ali**, HR and Labour lead.
- **Imran Sheikh**, platform administrator.

The full roster is in §4.2. SPF is a stand-in. The product is built for any regulated enterprise
that has to obey a mix of sector rules and general statutes, prove it on demand, and survive an
inspection. The pension-fund details are the most demanding example, not the only target.

**Cross-referencing.** Business rules carry stable identifiers (`BR-AUT-01`) and workflows carry
section numbers (`WF 5.9`). §20.3 is a traceability matrix that ties each customer requirement to
the workflows, rules and screens that satisfy it, so a reviewer can check coverage rather than take
it on trust.

---

## 1. Product Overview

### What it is

OneGRC is one platform that unifies an organization's **governance, risk, compliance and audit**
work. Today most organizations run these as separate islands: cyber and IT compliance in one tool,
financial and statutory compliance in spreadsheets and email, risk in another register, audit in its
own tracker, third-party oversight in a shared drive, and a legacy "regulatory content" service that
lists what the law says but connects to none of the firm's actual controls or evidence. OneGRC
replaces that fragmentation with a single connected model in which a law or an internal policy
produces a duty, the duty has an owner and a deadline, a control satisfies it, evidence proves the
control ran, a risk rating expresses how serious it is if the duty is missed, audit independently
tests it, and any change in the law flows back through the whole chain. The same underlying records
are presented differently to a board member, a compliance officer, and a junior analyst, so that one
fine-grained system serves very different readers.

### Who it is for

The primary buyer and owner is the compliance function of a regulated mid-size enterprise, often the
same person who serves as Company Secretary. But the platform is bought and judged jointly by three
constituencies that historically each had their own tool: **Compliance, Information Security or IT,
and Risk**, with **Internal Audit** as an independent user and the **board and its committees** as
the oversight audience. The reason these groups buy together is the reason the product exists: the
work genuinely connects, and a tool that serves only one of them leaves the others stranded. §4
describes each persona in full.

### The problem it solves

A firm like SPF cannot, today, answer one deceptively simple question on demand and with proof:
*"Are we compliant, across everything we are obliged to do, right now, and can we show it?"* The
pieces of the answer live in different systems, different inboxes, and different people's heads.
Five specific pains follow from that:

1. **Fragmentation.** IT compliance, statutory and secretarial compliance, tax, labour, third-party
   oversight and sector-specific duties are tracked separately, so there is no single, current
   picture.
2. **Inspection and personal exposure.** A regulator can inspect, and senior officers carry personal
   liability. The recurring nightmare is the finding that a control was operating but was never
   documented, so it cannot be proven. That is an evidence gap, and it is precisely what a
   connected, evidence-backed system is built to prevent.
3. **The periodic scramble.** Preparing for a board or committee meeting, or for an audit, takes
   weeks of manual collation, and the resulting snapshot is stale by the time it is presented.
   Compliance is reactive and event-triggered rather than continuous.
4. **Tool sprawl and a disconnected incumbent.** Firms accumulate point tools, and the legacy
   regulatory-content product tells them what the rules are and when filings fall due, but it does
   not connect a rule to the firm's own controls, evidence, or risk.
5. **Nothing chases anything.** Deadlines slip because reminders live in individual calendars,
   escalation depends on someone noticing, and there is no trail proving that the firm chased its
   own people. When a regulator asks why a duty was late, "we sent emails" is not an answer.

### The core idea, in one line

A law or a policy creates a duty; the duty is owned and scheduled; a control satisfies it; evidence
proves it; a risk rates the cost of missing it; audit tests it; the platform chases it; and change
management keeps the whole chain current. OneGRC makes that chain **visible, operable and provable**,
and surfaces it to each person at the level they need.

---

## 2. Architecture Overview (conceptual)

This section describes the shape of the system as ideas, not as components. Nothing here mandates a
technology.

### Two planes

It is useful to picture OneGRC as two layers.

- **The control plane** is the brain. It holds the connected model of sources, obligations, controls,
  risks, policies, evidence, incidents, audits, findings, third parties, campaigns and cases, and it
  runs the workflows and governance that operate on them: the maker-and-checker approvals, the
  role-based views, the clocks and escalations, the recommendations. This is where the product's
  value lives, and it is largely the same regardless of which customer systems sit underneath.
- **The data plane** is the senses. It is the set of feeds and systems of record the platform
  connects to in order to populate and prove the model: security monitoring, the IT service desk,
  identity systems, privacy tooling, tax-filing systems, regulatory-intelligence feeds, and sector
  systems. The control plane reads from these where it can, so that evidence and signals flow in
  rather than being keyed by hand.

Keeping these conceptually separate matters for two reasons. First, it lets a customer adopt the
brain without ripping out their existing systems of record. Second, it allows sensitive data to stay
close to the customer while the reasoning happens in the control plane, which is relevant where data
residency is a legal requirement (§15 and §16).

### The connected model (the spine)

At the heart of the control plane is a single connected model that reads as one continuous line from
**source to action**:

```
[ Source clause | Policy ]  →  Control  →  Obligation  →  Task  →  Evidence
                                   ↑                                  │
                                 Risk  ←──────── consequence ─────────┘
```

A legal instrument is broken into its individual clauses; an applicable clause becomes a tracked
obligation; the obligation has an owner, a cadence and an evidence requirement; a control satisfies
it; one or more tasks perform the work; evidence proves the task was done; a risk rating expresses
the consequence of failure; and an audit can independently test any link in the chain.

The first slot is conditional provenance: a statutory duty traces to a **source clause**; an
internal, policy-mandated duty traces to a **policy**, which itself derives from a source. Every
record carries its provenance both ways: forward, so you can see what a clause produced, and
backward, so you can see why an obligation exists. The same objects roll up into a board view, a
compliance view, and an individual's task list, each at a different altitude.

*As built.* The prototype renders this chain from a single shared component, resolving the same
spine from whichever record the screen is about, so the chain is identical on a clause page, a
control page, an obligation page, a task page and an evidence page. That property — one chain, one
renderer, no per-screen drift — is a requirement, not an implementation detail.

### Derivation over storage

A principle that shapes the whole system, and that the build should preserve: **anything that can be
computed from the record is computed, not stored.**

A key risk indicator's band is derived from its reading and its thresholds, so an indicator cannot
read green while its number sits in the red zone. A third party's risk tier is derived from what is
true about the arrangement right now, so nobody can type "Low" next to a material outsourcing whose
independent assurance lapsed. A risk's workflow stage is derived from its lifecycle record, so the
register and the detail page cannot disagree. Net loss is derived from gross minus recovery. Control
pass rates, on-time filing rates, appetite status, campaign progress and audit plan delivery are all
derived from the records they claim to summarize.

The rule this protects against is simple and common: a stored status drifts from the facts it
describes, and the summary lies. §6 (`BR-DRV-*`) states each derived value precisely.

The rule extends to time: **"overdue" is a relationship between a date and now, not a state
anyone sets** (`BR-DRV-17`), and **a trend is the same derivation evaluated at past instants,
never a stored or synthesized series** (`BR-DRV-18`).

### Modes of operation

OneGRC operates in two modes, both of which keep a human in control.

- **Assistive mode** sits inside the screens. It reads a record and its links and helps a person do
  the next step faster: drafting a plain-language description of a clause, suggesting which existing
  control already covers it, answering a scoped question like "what do I owe this month," drafting a
  committee narrative, or flagging an obligation that is missing evidence.
- **Agentic mode** runs multi-step work and returns a result for a person to approve: scanning
  regulatory sources for changes, proposing how a new clause maps to controls, extracting clauses
  from an uploaded instrument, watching control status and chasing owners, or assembling a board pack
  as a living view.

In both modes the rule is the same: **the system proposes, a human disposes.** Nothing the assistant
produces becomes a tracked obligation, a filed return, or a piece of evidence without a person
accepting it. §13 sets out the full scope and its governance.

### How it sits alongside other tools

OneGRC is **vendor-neutral** and is positioned as a backbone that integrates rather than replaces.
The customer's existing systems of record — for example, their IT service desk — are explicitly kept
and connected, not displaced. The platform's role is to be the one place where the obligations,
controls, risks and evidence reconcile, drawing signals and proof from whatever systems the customer
already runs. Which backbone or systems a customer keeps is the customer's decision; the product
does not force a stack.

### Default posture

Detail screens are **read-by-default with explicit, governed actions**. A user reads the connected
picture freely, but any change that matters — approving a filing, signing off an incident report,
accepting a clause as a tracked obligation, approving a risk acceptance, unsealing a reporter's
identity — is an explicit action that runs through maker-and-checker control and is written to a
tamper-evident log.

### One engine per concern

A structural rule that the build should hold to, because the prototype's coherence depends on it:
**where two modules need the same behaviour, they share one engine rather than each growing a
private copy.**

There is one reminder-and-escalation ladder, and obligations, tasks, risk actions, exceptions,
indicator breaches, third-party diligence, campaigns and investigations all point it at their own
deadline. There is one remediation register — a union view over issues and
exceptions (5.22) — where control failures, audit findings, incidents and investigation outcomes
land as issues, and approved deviations (including those raised by attestation declarations) appear
as exceptions. There is
one loss engine, and both operational incidents and confirmed frauds book into it on the same
categories. There is one evidence vault. There is one audit log.

The failure this avoids is a platform with six alerting mechanisms that disagree, five definitions
of "overdue", and a finding that is tracked in one module and invisible in another.

---

## 3. Design Principles and Product Philosophy

These are the non-negotiable beliefs that should shape every screen and every flow. If a design
decision conflicts with one of these, the principle wins.

**The clause is the atomic unit.** The smallest thing the system manages is not an act or a
regulation but an individual **clause or provision** within it. This is deliberate: a clause is the
level at which four things line up at once. The work is done per clause, the proof is captured per
clause, accountability is assigned per clause, and the consequence (and therefore the risk) is
defined per clause. Coarser than that and a user cannot act or evidence; finer than that and there
is nothing to manage. Everything else in the model hangs off the clause.

**From source to action, as one line.** Every obligation should read as a single continuous
statement: this exact provision requires this, it applies to us because of that, this person owns
it, it is due then, this control satisfies it, this task performs it, here is the evidence, here is
the risk if it slips, here is the next action. A citation on its own is not enough; the value is the
unbroken line from the law to the work to the proof.

**Internal and external obligations are one fabric.** A duty the firm owes the world (a statutory
filing) and a duty the firm has set itself (a policy-driven review) are handled identically: same
register, same calendar, same ownership, same evidence, same approval, same chasing. The system does
not privilege the statute over the policy. A formal definition of compliance, which the product
follows, is "meeting obligations," and obligations are both external and internal.

**Map once, satisfy many.** A control is the thing that actually satisfies a duty, and one control
can satisfy many clauses across many different laws. The model is many-to-many on purpose, so the
firm does the underlying work once and points many obligations at it, rather than rebuilding the
same control for each rule.

**Evidence is first-class, and "done but not documented" is the failure to prevent.** Proof is not an
afterthought; it is a required part of completing a duty. The system's structure should make it
impossible to mark a duty complete with nowhere for its evidence to live, because the single most
painful real-world finding is a control that operated but was never documented.

**Risk derives from consequence.** A risk rating is the combination of how likely a failure is and
how bad it would be, and the "how bad" should be grounded in the actual sourced penalty. A duty whose
breach escalates from a fixed fine to a per-day charge to personal disqualification of officers is a
high-consequence item, and the system should rate it that way from the penalty itself rather than
from unaided judgment.

**One calendar, one clock.** Every deadline, from a quarterly filing to a six-hour incident-reporting
window, lives on one timeline. A user should never have to assemble the firm's obligations from
several calendars.

**Derive, do not store.** Any value that can be computed from the record is computed. A stored status
that duplicates a derivable fact is a future lie. (See §2, "Derivation over storage".)

**One engine per concern.** Chasing, remediation, loss, evidence and the audit trail each have
exactly one implementation that every module points at. (See §2, "One engine per concern".)

**Role-based simplified views (altitude per persona).** The data underneath is fine-grained, but each
person is shown it at the altitude appropriate to them: the board sees a roll-up and the exceptions;
the compliance officer sees the full register and where the control mapping is thin; an individual owner sees
only their own handful of tasks and the single action each one needs. Simplified views are not
cosmetic; they are the mechanism that lets one fine-grained system serve everyone.

**Continuous, not periodic.** The platform's natural state is always-on monitoring with a live
posture, so that a board pack is a view rather than a project and an inspection finds the firm ready
rather than scrambling.

**Nothing waits on someone noticing.** Every deadline the platform knows about is chased on a fixed
ladder, and every reminder and escalation is written to the audit trail. The firm can prove it
chased, not merely assert it.

**Provenance and traceability everywhere.** Every record can be traced forward (what did this clause
produce) and backward (why does this obligation exist), so that the firm can always show its working.

**Governance is built in.** Maker-and-checker approval, the three-lines-of-defence model, role-based
access and role-gated authority are part of the fabric, not an add-on.

**Confidentiality is designed, not configured.** Where a record can harm a person — a speak-up report
above all — the protection is structural. The reporter's identity is not a field the platform holds,
so no screen, export, search index or log can leak it. Recusal beats clearance: someone conflicted
out of a case cannot open it whatever their role.

**Integrate, do not replace.** The platform is vendor-neutral and keeps the customer's existing
systems of record, connecting to them rather than supplanting them.

**Trust through human-in-the-loop.** Intelligent features assist and propose; people decide and sign.
The platform's authority comes from the human-approved record.

**Generated text is never evidence.** An assistant may help capture, check or summarize proof, but
the evidence is always the real artifact — a filing acknowledgement, a committee minute, a
system-captured record — because an auditor tests the artifact, not the system's assertion.

**Shaped to a recognized standard, not sold as a certificate.** The product is designed to fit the
structure of a certifiable compliance-management standard and to accelerate a firm's path to
certification, but it does not claim to be that certificate itself.
---

## 4. Personas, Roles and Authority

This section defines who uses the platform, what each of them may do, and how the system decides.
It has grown from a set of persona sketches into the full authority model because authority is
where a GRC platform earns or loses its credibility: a system that lets the wrong person approve
the wrong thing is not a compliance system, it is a spreadsheet with better fonts.

Four ideas do most of the work here, and they are deliberately distinct:

| Concept | What it is | What it governs |
|---|---|---|
| **Person** | A named individual with a job title, a department and a line of defence | Who is accountable; who gets chased |
| **Role** | A platform capability set | What actions are permitted |
| **Persona** | The switchable point of view the user adopts | What the screens show and what lands in the queue |
| **Department** | The function a person belongs to | Which records are visible at all |

One practical note shapes the whole design: **in a firm this size the roles blend**, so the system
must serve the **role**, not assume one person per role. Vikram Rao, for example, is both a
first-line doer of secretarial filings and a second-line compliance owner. Sunita Menon is Head of
Internal Audit and also chairs the Audit Committee — two very different altitudes for the same
person, which is exactly why persona and person are separated.

### 4.1 The organization and the three lines of defence

SPF is a PFRDA-registered pension fund manager, a Category I Regulated Entity, and a wholly-owned
subsidiary of a bank. It runs the standard **three lines of defence** model, and the platform
expresses it directly: every person carries a line-of-defence tag, and the tag is what makes a
challenge meaningful rather than decorative.

- **First line** owns and manages the risk in its daily work: the analysts who do the filings, the
  control owners who run the controls, the SOC analysts who triage alerts, the research analysts who
  evidence the investment reviews.
- **Second line** oversees and challenges: compliance, risk, information security, data protection,
  investment compliance.
- **Third line** provides independent assurance: internal audit.
- **The board and its committees** sit above all three and consume the roll-up.

The practical consequence for the build: a maker-and-checker pair should not sit in the same line
where the review is meant to be a challenge, and an assurance activity (audit, working paper,
finding) is never performed by the person who owns the control being tested.

### 4.2 The roster

The platform's demonstration world carries 23 named people across 8 departments. **The roster is
seed data, not a product constant** — a real deployment loads its own people from the directory
(§12). What *is* the requirement is the mechanism the roster exercises: escalation resolves to real
named people, and the department a person belongs to determines what they can see.

**A person may hold several roles.** Person↔Role is many-to-many; the Role column below shows the
primary role, and the parentheticals show the pattern (Meera Krishnan is Executive *and* Risk
Committee Chair; Sunita Menon is Auditor *and* Audit Committee Chair). The build must not assume
one role per person, and a person's queue and navigation are the union of their roles at the
altitude they select (§8.3).

| Person | Title | Department | Line | Role |
|---|---|---|---|---|
| Meera Krishnan | Chief Risk Officer | Risk | 2nd | Executive (also Risk Committee Chair) |
| Rajesh Iyer | Chief Information Security Officer | IT and Information Security | 2nd | Control Owner |
| Anjali Deshmukh | Head of Compliance | Compliance and Company Secretarial | 2nd | Compliance Manager |
| Vikram Rao | Company Secretary | Compliance and Company Secretarial | 2nd | Compliance Manager |
| Sunita Menon | Head of Internal Audit | Internal Audit | 3rd | Auditor (also Audit Committee Chair) |
| Arvind Patel | Head of Investment Compliance | Investment Compliance | 2nd | Compliance Manager |
| Karthik Nair | SecOps Lead | IT and Information Security | 1st | Control Owner |
| Priya Sharma | DPO / Privacy Lead | Data Protection | 2nd | Compliance Manager |
| Rohan Gupta | IT Controls | IT and Information Security | 1st | Control Owner |
| Deepa Iyer | GST / Tax | Finance and Tax | 1st | Compliance Analyst |
| Farhan Ali | Labour and Secretarial | HR and Labour | 1st | Compliance Analyst |
| Neha Joshi | SOC Analyst | IT and Information Security | 1st | Control Owner |
| Sanjay Verma | Investment Risk | Risk | 1st | Risk Manager |
| Lakshmi Rao | Internal Auditor | Internal Audit | 3rd | Auditor |
| Imran Sheikh | Platform Administrator | Risk | 2nd | Administrator |
| Aditya Kulkarni | Research Analyst — Banking & Financials | Investment Compliance | 1st | Compliance Analyst |
| Sneha Reddy | Research Analyst — IT & Technology | Investment Compliance | 1st | Compliance Analyst |
| Vivek Menon | Research Analyst — Energy & Utilities | Investment Compliance | 1st | Compliance Analyst |
| Pooja Bhatt | Research Analyst — FMCG & Consumer | Investment Compliance | 1st | Compliance Analyst |
| Rahul Saxena | Research Analyst — Pharma & Healthcare | Investment Compliance | 1st | Compliance Analyst |
| Kavya Iyer | Research Analyst — Auto & Industrials | Investment Compliance | 1st | Compliance Analyst |
| Manish Agarwal | Research Analyst — Metals & Materials | Investment Compliance | 1st | Compliance Analyst |
| Divya Pillai | Research Analyst — Infrastructure & Realty | Investment Compliance | 1st | Compliance Analyst |

The eight sector research analysts are not filler. They are the first line behind the board-approved
Investment Research and Review Policy: each owns one sector and must evidence a research review per
cycle — twice-weekly for active holdings, annual for the regulator's top-250 universe — tabled at
the Investment Sub-Committee. They are the worked example of an **internal, policy-driven duty**
being handled with exactly the same machinery as a statutory filing, which is Requirement 2 in §20.

### 4.3 Persona, role and person are three different things

The distinction is easy to blur and expensive to get wrong.

- A **person** is accountable. Escalation resolves to a person. Ownership is held by a person. The
  audit trail names a person.
- A **role** is a capability set. Authority is checked against a role (with the exceptions in §4.12).
  Several people hold the same role: Anjali, Vikram, Priya and Arvind are all Compliance Managers,
  and they do very different jobs.
- A **persona** is the point of view a user adopts. It determines what the sidebar offers, what the
  queue contains, and which approvals appear. The prototype exposes persona switching as its only
  authentication; in production, a real user has one identity and possibly several roles, and the
  switcher becomes a view selector rather than an impersonation device.

**A persona switch must never confer access a person does not have.** This is the rule that keeps
the model honest, and it is enforced structurally in the one place it matters most: access to a
sealed investigation is decided by **person**, not by role, so switching into a persona that
normally holds the ethics channel does not open a case the person is not on (§4.12, `BR-SCP-05`).

*As built.* The prototype offers eleven switchable personas over nine roles: one per department head
plus the executive landing, and a separate **Committee** group carrying the two board-committee
chairs. The Company Secretary is on the roster but is not currently a switchable persona.

### 4.4 The nine platform roles

| Role | Who typically holds it | Altitude | Primary work |
|---|---|---|---|
| **Executive** | CRO, and the executive audience generally | Highest — roll-up and exceptions | Board cockpit, appetite, approvals of last resort, risk acceptance |
| **Risk Manager** | Risk function | Register-level | Risk register, heat map, treatment plans, indicators, appetite |
| **Compliance Manager** | Head of Compliance, Company Secretary, DPO, Head of Investment Compliance | Deepest working view | Obligations, clause decisions, approvals, regulatory change, the ethics channel |
| **Compliance Analyst** | Tax, labour, secretarial and research analysts | Narrowest — my tasks | Performing duties, attaching evidence, clause-pipeline preparation |
| **Control Owner** | CISO, SecOps, IT controls, SOC | Control-level | Control tests, continuous monitoring, evidence, incident response, remediation |
| **Auditor** | Head of Internal Audit, internal auditors | Assurance view | Audit plan, working papers, findings, remediation follow-up, evidence trail |
| **Administrator** | Platform administrator | Configuration | Org profile, users and roles, frameworks, thresholds, workflow rules, connected systems, retention, notifications, audit log |
| **Audit Committee Chair** | Non-executive chair of the Audit Committee | Committee remit only | Assurance chain: audits, findings, issues, the exception register, speak-up oversight |
| **Risk Committee Chair** | Non-executive chair of the Risk Management Committee | Committee remit only | Exposure: register, appetite, mitigating controls, incidents, third-party concentration |

The two committee roles are deliberately narrow. A committee chair **reviews**; they do not operate
the platform. The working screens — the clause pipeline, continuous monitoring, data-protection
casework, integrations — are not offered to them, because offering a non-executive an operational
screen invites exactly the involvement the three-lines model is designed to prevent.

### 4.5 Departments and the access boundary

**Department is a derived dimension, not a field somebody maintains.** A record takes its department
from whoever owns it. That single rule gives the platform an access boundary without a separate
permissions tree to keep in step with the org chart.

The eight departments are: Compliance and Company Secretarial · Risk · IT and Information Security ·
Investment Compliance · Data Protection · Finance and Tax · HR and Labour · Internal Audit.

The boundary rule (`BR-SCP-01`):

- A user sees the records owned by people in **their own department**.
- **Compliance and Company Secretarial** keeps the cross-department view, because holding the whole
  obligation picture is the function's job.
- The **Administrator** sees everything, because configuring the platform requires it.
- The boundary applies to the surfaces where work is **discovered** — lists, registers, calendars and
  the personal queue. A detail page stays reachable by direct link and by command search, so a
  cross-reference never dead-ends and a person handed a record identifier can always open it.

That last point is a deliberate design choice and should be preserved: scoping discovery without
scoping navigation keeps the connected model navigable while still making each person's working set
small. Where a record must be hidden outright rather than merely de-emphasised — a sealed
investigation — a stronger rule applies (§4.12).

*As built.* A scope banner on scoped surfaces tells the user which department's records they are
looking at, so a short list is never mistaken for an empty world.

### 4.6 The primary personas in depth

**The Compliance Manager (Anjali Deshmukh), second line.** She owns the overall obligation picture
and is the platform's champion. She holds together duties from different worlds: sector rules,
statutory and secretarial filings, tax, labour, and the policy-driven duties the firm sets itself.
Much of her day is chasing others for the proof that something was done and assembling material for
committees and the board. She also holds the ethics channel, which means she carries the speak-up
reports and decides what becomes an investigation. **She wants** a single, live register with a
duty-coverage view and the ability to produce proof on demand. **She fears** an inspection exposing an
undocumented duty, and her own inability to answer "are we compliant right now" without a manual
effort each time. **Her altitude** is the deepest working view: the whole register and where the
control mapping is thin, kept legible despite carrying the most. **Her landing** is the obligations register; her
queue is dominated by approvals, clause decisions and overdue escalations that have reached her rung.

**The Company Secretary (Vikram Rao), first and second line.** Responsible for statutory and board
governance: annual filings, board and committee minutes, statutory registers. **He wants** the
secretarial calendar and its evidence in the same place as everything else, and clean board
material. **He fears** missed filings and the personal liability that attaches to them. He shares the
Compliance Manager role and its clause authority.

**The Chief Risk Officer (Meera Krishnan), second line, wearing the Executive persona.** Runs the
risk register and, as chair, the Risk Management Committee. **She wants** a register connected to the
obligations and controls that bear on each risk, with ratings grounded in the consequence of the
specific failure rather than set by judgment alone, and an appetite view that says plainly where the
firm sits outside its own tolerance. **She fears** a risk picture disconnected from what compliance
and controls are actually doing. **Her altitude** is the roll-up: the cockpit, the heat map, appetite,
the top risks, the exceptions, with the ability to drill into the obligations and controls feeding
each one. She is the natural default landing for an executive cockpit. Note the deliberate
consequence of her dual hat: because the CRO may herself be the subject of a speak-up report, the
Executive role is **absent** from the speak-up module entirely (§4.12).

**The Risk Manager (Sanjay Verma), first line.** Operates the register day to day: re-scores risks
in the assessment cycle, drives treatment plans and their remediation actions, watches the
indicators, and prepares the committee view. **He wants** the register to move when the work moves —
an assessment cycle that changes nothing is theatre. **His altitude** is register-level.

**The Control Owner (Rajesh Iyer as CISO; Karthik Nair, Rohan Gupta and Neha Joshi beneath him),
first and second line.** These are the people who run the controls, respond to incidents, and hold
the continuously-monitored estate. **They want** their control's test history, its evidence and its
failures in one place, and they want a failing monitored control to raise its own issue rather than
waiting to be noticed. **They fear** a control that has quietly stopped working, and an incident clock
they did not know had started. **Their altitude** is the control and the incident.

**Obligation owners, the first line: Deepa Iyer (Finance and Tax), Farhan Ali (HR and Labour), and
the eight research analysts.** These are the people who actually do the duties and capture the proof:
filing a monthly tax return, depositing statutory contributions on time, performing the mandated
investment review. **They want** the simplest possible view: only their own items, the single action
each one needs, the deadline, and one place to attach the evidence. **They fear** not knowing what is
theirs until someone chases them, and proof that ends up scattered. **Their altitude** is the
narrowest: my tasks, my dates, attach my proof, nothing else competing for attention. Their queue
should be short enough to clear.

**The Data Protection Officer (Priya Sharma), second line.** Holds the data inventory, the consent
picture and the data-subject-request queue, and is the named owner of the personal-data-breach
control that satisfies duties under both the data-protection statute and the security regulator's
direction. **She wants** privacy duties handled in the same fabric as everything else rather than in a
separate privacy tool. She sits on the ethics office for data-misuse reports.

**Internal Audit (Sunita Menon, with Lakshmi Rao), third line.** Provides independent assurance.
Plans risk-based audits, tests whether controls are designed and operating, gathers working papers,
writes findings, and follows up on remediation. **She wants** a traceable line from an obligation to a
control to its proof, a findings-and-remediation workflow in the same system, and a plan-versus-actual
view she can take to her committee. **She fears** scattered evidence that makes it impossible to
attest that a control operated. **Her altitude** is the assurance view.

**The executive and the board.** Accountable for oversight. **They want** a roll-up with the exceptions
surfaced, a live posture rather than a periodic snapshot, and confidence that an inspection would not
catch the firm flat. **They fear** months of preparation producing a snapshot that is already stale.
**Their altitude** is the highest: the roll-up and the exceptions, drilling down only when something
demands it.

### 4.7 Committee roles

Two board committees have their own personas because they have their own remit, their own statutory
basis, and their own reporting pack.

**Audit Committee Chair.** Reviews the assurance chain: the audit plan and its delivery, findings and
their ageing, the remediation register, the exception register, the evidence behind them, and the
speak-up channel — to which the committee chair has **direct access as a statutory requirement**, not
as a courtesy. Sees: campaigns, fraud, speak-up, obligations-derived assurance, audits, issues,
evidence, the sector pack.

**Risk Committee Chair.** Reviews exposure: the register, appetite versus tolerance, the top residual
risks with owners and mitigation progress, the controls that mitigate them, the incidents that
realized them, third-party concentration, and losses actually incurred. Sees: risks, controls,
campaigns, third parties, incidents, the sector pack.

Neither chair is offered the working screens. Both consume a pack (§5.24) produced under a named
statutory or charter basis.

The five committees the platform tracks, each with a cadence, a constitutional quorum and a
membership, are: the Investment Sub-Committee, the Risk Management Committee, the Audit Committee,
the Nomination and Remuneration Committee, and the Compliance Committee. Committee minutes double as
evidence on the obligations they discharge — which is what makes the committee cadence part of the
compliance model rather than a calendar beside it.

### 4.8 The administrator

The platform administrator configures the organization profile, the people and their roles, which
regulatory frameworks are enabled, the regulator thresholds and escalation owners, the
maker-and-checker rules for each kind of change, the connected systems, the data-retention policies,
and the notification preferences.

Two rules constrain the role, and both are load-bearing:

1. **Administrative changes themselves route through maker-and-checker** and are written to the audit
   log. A platform that manages compliance cannot have an unaudited back door.
2. **The administrator's breadth of visibility is not breadth of authority.** The administrator sees
   every department in order to configure the platform, but configuration is a different act from
   approving a filing, accepting a risk or closing an investigation, and the authority matrix does
   not grant those.

*As built.* The prototype exposes nine settings sections — Organisation · Users and Roles ·
Frameworks and Libraries · Regulators and Clocks · Maker-Checker and Workflow · Integrations · Data
Retention and Privacy · Notifications · Audit Log — read-only for non-administrator personas, with
the audit log always visible.

### 4.9 Visibility matrix: which role is offered which surface

A role that is not listed does not get the item in its navigation. The record remains reachable by
direct link and command search except where §4.12 applies. The Administrator is offered every
surface.

| Surface | Exec | Risk Mgr | Compliance Mgr | Analyst | Control Owner | Auditor | Audit Cttee | Risk Cttee |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Home — Board Cockpit | ● | ● | ● | ● | ● | ● | ● | ● |
| My Queue | ● | ● | ● | ● | ● | ● | ● | ● |
| Risk Register | ● | ● | ● | | ● | ● | | ● |
| Control Library | ● | ● | ● | | ● | ● | | ● |
| Continuous Control Monitoring | ● | | | | ● | ● | | |
| Policies | ● | ● | ● | ● | ● | ● | | |
| Campaigns | ● | ● | ● | ● | ● | ● | ● | ● |
| Third Parties | ● | ● | ● | | ● | ● | | ● |
| Incidents | ● | ● | ● | | ● | ● | | ● |
| Fraud Cases | ● | ● | ● | | ● | ● | ● | |
| Speak-up | | | ● | | | ● | ● | |
| Obligations | ● | ● | ● | ● | ● | ● | | |
| Regulatory Change | ● | ● | ● | ● | | ● | | |
| Source Library | ● | ● | ● | ● | | ● | | |
| Sector Pack | ● | ● | ● | ● | ● | ● | ● | ● |
| Data Governance | ● | ● | ● | ● | ● | ● | | |
| Audits | ● | ● | ● | | ● | ● | ● | |
| Issues and Remediation | ● | ● | ● | ● | ● | ● | ● | |
| Evidence Vault | ● | | ● | ● | ● | ● | ● | |
| Integrations | ● | | | | | | | |
| Settings | ● | ● | ● | ● | ● | ● | ● | ● |

Two entries deserve explanation.

**The Executive is absent from Speak-up.** This is not an oversight. The CRO holds the Executive
persona, and the CRO may be the subject of a report. A channel whose subject can read it is not a
channel.

**Settings is offered to everyone** but is read-only for anyone who is not the Administrator. Hiding
configuration would make the platform's own governance invisible; the audit log in particular should
be readable by the second and third lines.

### 4.10 The action-authority matrix

Every governed action in the platform resolves through a single authority check. Centralizing this
is a requirement, not a convenience: authority scattered across screens as ad-hoc role comparisons
is how a system ends up with one screen that lets the maker approve their own filing.

**The matrix is data, not code.** The action→authority assignments below are held as configuration
the central check reads, maintained through the governed configuration workflow (5.30) and within
the floor of §14.2 — separation of duties can never be configured away. Encoding the matrix as data
is what lets a customer tighten an approver set without a code release, and what makes `BR-AUT-01`
auditable: there is exactly one table to review.

The matrix below is the complete set of governed actions. **SoD** marks an action that additionally
enforces separation of duties — the actor may not be the person who made the item (§4.11).

| Action | Permitted roles | SoD |
|---|---|:--:|
| **Clause pipeline** | | |
| Save a clause to a control (accept it as tracked) | Compliance and Company Secretarial **department** — see note | |
| Engage an external specialist on a clause | Compliance and Company Secretarial **department** | |
| Set a clause's applicability to the firm | Compliance and Company Secretarial **department** | |
| **Obligations and tasks** | | |
| Submit an obligation / task for approval | Compliance Manager, Compliance Analyst | |
| Approve an obligation / task | Compliance Manager, Executive | ● |
| **Controls** | | |
| Re-test a control | Control Owner, Auditor, Executive | |
| **Incidents** | | |
| File a regulator track on an incident | Control Owner, Executive | ● |
| **Issues and exceptions** | | |
| Resolve an issue | Control Owner, Auditor, Compliance Manager | |
| Raise an exception | Control Owner, Compliance Manager, Compliance Analyst, Risk Manager | |
| Approve an exception | Compliance Manager, Risk Manager, Executive | ● |
| Renew an exception (authority escalates with the renewal count, `BR-AUT-11`: second renewal Executive only) | Compliance Manager, Risk Manager, Executive | ● |
| Close an exception | Control Owner, Compliance Manager, Auditor | |
| **Regulatory change** | | |
| Acknowledge a regulatory change | Compliance Manager, Compliance Analyst, Risk Manager | |
| **Data protection** | | |
| Advance a data-subject request | Compliance Manager, Compliance Analyst | |
| **Risk** | | |
| Advance a remediation action | Risk Manager, Control Owner, Compliance Manager | |
| Submit a treatment plan | Risk Manager, Control Owner, Compliance Manager | |
| Approve a treatment plan | Risk Manager, Executive | ● |
| Accept a risk (time-bound) | Executive, Risk Manager | ● |
| **Speak-up** | | |
| Triage a report | Compliance Manager | |
| Investigate a report | Compliance Manager, Auditor | |
| Close a report | Compliance Manager, Auditor | ● |
| Unseal a reporter's identity | Compliance Manager, Audit Committee Chair | ● |
| **Fraud** | | |
| Open a case | Compliance Manager, Auditor, Risk Manager, Control Owner | |
| Investigate a case | Auditor, Compliance Manager, Control Owner | |
| File a regulator track on a case | Compliance Manager, Control Owner, Executive | ● |
| Close a case | Compliance Manager, Risk Manager, Executive | ● |
| **Administration** | | |
| Change platform configuration | Administrator | |

**Note on clause authority.** Accepting a clause as a tracked obligation is the one authority gated
by **department rather than role**. Four people hold the Compliance Manager role — the Head of
Compliance, the Company Secretary, the DPO and the Head of Investment Compliance — but only the first
two sit in Compliance and Company Secretarial. Deciding that a provision of law binds the firm, or
routing it to external counsel, is that function's accountability specifically. Gating it on the role
alone would hand the DPO and the Head of Investment Compliance an authority they do not hold in the
real org. This is the worked example of why role and department are separate dimensions
(`BR-AUT-02`).

For the speak-up and fraud rows, **role membership is necessary but never sufficient**: the case-level
access rule in §4.12 decides whether a *specific* case opens, and it overrides the matrix.

**Note on committee chairs and closure (v2.1 ruling).** Neither committee chair holds *close*
authority on a speak-up report or a fraud case. v2.0 granted it to the Audit Committee Chair, which
contradicted §4.7: a chair **reviews; they do not operate the platform**. The chair keeps statutory
direct access to the speak-up channel — reading, oversight and challenge — but closing a case is an
operational act belonging to the ethics office and internal audit. Access to read is not authority to
dispose. In practice a non-executive would never perform closure in the tool, and a matrix that
implies they might is a matrix that invites the involvement the three-lines model exists to prevent.

### 4.11 Separation of duties

The rule is one sentence: **the person who performs an action may not be the person who approves it.**

Applied consistently, it covers more ground than the word "approval" suggests. The following actions
all carry it, because each is a sign-off on someone else's work even where the verb is not "approve":

- Approving an obligation or task submitted by its maker.
- Approving, renewing or accepting a risk treatment plan or a risk acceptance. An owner may not
  accept their own exposure — accepting a risk is precisely the decision that needs a second pair of
  eyes.
- Approving or renewing a control or obligation exception. Renewal carries the rule too, because
  extending a deviation is the same decision as granting it.
- Filing a regulator notification on an incident or a fraud case.
- Closing a speak-up report or a fraud case.
- Unsealing a reporter's identity.
- Approving a committee pack's narrative before issue.

The checker is nominated per record, not inferred at the moment of approval, so that the audit trail
shows who was *supposed* to check as well as who did.

**Where the rule needs strengthening in production.** Today the constraint is "not the same person".
For a production system, the customer should also be able to configure line-of-defence constraints —
for example, that the checker on a first-line control test must sit in the second line, and that no
audit working paper may be raised by the owner of the control it tests. §14 lists this as
configuration; §21 flags the policy decision.

### 4.12 The ethics office, case confidentiality and recusal

Investigations are the one place where the ordinary access model is not enough, and the rules here
should be read as requirements rather than preferences.

**The ethics office is a named list of people, not a role.** Membership is by person precisely so that
switching persona does not open a sealed case. The Head of Compliance holds the channel; the DPO
handles data-misuse reports; the Head of Internal Audit gives the Audit Committee its statutory
direct access.

**A restricted case opens only for someone on its access list.**

**Recusal beats clearance.** Anyone recused from a case cannot open it, whatever their role and
whatever list they are on. Recusal is computed, not merely recorded: anyone named in the allegation,
and anyone who leads the department the allegation points at, must stand down. This is the rule that
makes the whole model worth having — a conflicted senior person is the exact failure mode an ethics
channel exists to survive.

**Sealed cases are counted but not shown.** A user who cannot open a case still sees that it exists as
a count. Pretending a sealed case does not exist is its own kind of dishonesty, and it would let the
number of open reports be quietly understated to the very committee that must oversee them.

**The queue is gated at source.** A persona who cannot open a case never receives its work item, so the
personal queue cannot become the leak the case page prevents.

**The identity is not held.** The reporter's identity is not a field. Where someone chose to identify
themselves, the record carries a reference code and a *sealed custody note* naming who could unseal
it and why — never the identity itself — so no screen, export, search index or log can leak what the
platform does not hold. Unsealing is a governed, separated-duty action that is itself logged.

**The audit trail for these modules records the act, never the content.** A log line says that a report
was triaged and by whom; it does not repeat the allegation.

### 4.13 Delegation, department heads and escalation authority

**The department head is the master authority for the department.** Each of the eight departments has a
named head, and the head is the default escalation target for anything owned inside it. The heads are
configurable by the administrator, and a change to them is itself audited — an escalation path that
can be edited without a trace is not an escalation path.

**Escalation is automatic and fixed.** No person decides that something should be escalated; the ladder
fires on elapsed time (§5.25, `BR-ESC-*`). Each rung notifies real named people, and every fired rung
is written to the audit log, so the firm can prove it chased.

**Delegation is a production requirement not yet built.** A named owner who is on leave currently
blocks their own queue. Production needs a delegation mechanism — a time-boxed stand-in who inherits
the queue items and the maker rights but not the approval rights that separation of duties reserves —
together with the trail showing who acted under whose delegation. §19 records this as a gap and §21
as a decision.
---

## 5. Functional Workflows

This section is the operational heart of the specification. It walks every workflow the platform
runs, end to end, in a uniform shape that a development team can build from and a test team can
write cases against.

Throughout, **enforcement** means the combination of ownership, deadlines and clocks, required
evidence, maker-and-checker approval, role-gating, and automatic escalation that the system applies
so that a duty cannot quietly fall through.

### 5.0 How each workflow is described

Every workflow below carries the same nine parts:

| Part | What it tells the builder |
|---|---|
| **Purpose** | Why the workflow exists and what would go wrong without it |
| **Trigger** | What starts it — a person, a clock, a feed, or another workflow |
| **Actors** | The roles involved and what each contributes |
| **Preconditions** | What must already be true |
| **Steps** | The numbered sequence: actor, action, resulting state, and the gate that must pass |
| **State model** | The states a record moves through and the legal transitions |
| **Alternate and exception paths** | What happens when the happy path does not hold |
| **Side effects** | Audit entries, notifications, evidence, and records created elsewhere |
| **Acceptance** | What must be demonstrable for the workflow to count as built |

The workflows are grouped: the source spine (5.1–5.3), the duty cycle (5.4–5.7), controls
(5.8–5.9), events (5.10–5.11), risk (5.12–5.15), campaigns (5.16–5.18), third parties (5.19–5.20),
assurance (5.21–5.22), investigations (5.23–5.24), privacy (5.25), reporting (5.26), and the
cross-cutting machinery (5.27–5.30).

---

### 5.1 Source-to-action: from a law to a tracked control (headline)

**Purpose.** This is the flow that turns raw law into managed compliance, and it is the spine every
other record connects to. Without it, a compliance system is a to-do list whose items nobody can
justify. It is anchored on the principle that the clause is the unit.

**Trigger.** A legal instrument enters the Source Library — already held, arriving from a
regulatory-intelligence feed, detected as newly issued (5.29), or created by a person (5.2).

**Actors.** *Compliance Manager in the Compliance and Company Secretarial department* decides.
*Compliance Analyst* prepares and researches. *The assistant* recommends. *An external specialist*
interprets where asked.

**Preconditions.** The instrument exists in the library with its authority, type, date of issue,
status and provenance recorded.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | System | Surface new or changed instruments at the top of the Source Library, sorted so items awaiting a decision float up | Instrument `In force` / `Draft`, clauses `Processing` | — |
| 2 | Compliance | Open the instrument; read what it covers and how it affects the firm; follow the supersession banner to the prior version if there is one | unchanged | — |
| 3 | Compliance | Read the clause list: for each clause, the compliance it creates, what it requires, the penalty if missed, when it is due, whether it applies, and where it sits in the pipeline | unchanged | — |
| 4 | Compliance | Open one clause. Read what it requires in plain language, its key parts, the exact extract and citation, and the sourced penalty tiers from which the clause's severity is derived | unchanged | — |
| 5 | System | Present a recommendation — typically which existing control already covers this — with a confidence indicator, labelled as a proposal | Clause `Recommended` | — |
| 6a | Compliance | **Save to a control**: attach the clause to an existing control, or create a new control from the clause | Clause `Saved`, clause↔control link recorded | Clause authority (§4.10) |
| 6b | Compliance | **Engage a specialist**: route for external legal interpretation | Clause `Specialist review` | Clause authority |
| 6c | Compliance | **Mark not applicable**, recording the basis | Clause `Not applicable` | Clause authority |
| 7 | System | On save, wire the chain: obligations deriving from the clause carry provenance back to it; the control lists the clause among those it satisfies, grouped by act; the risk that the clause feeds reflects the consequence | Chain live | — |

**State model — clause.**

```
Processing ──► Recommended ──┬──► Saved ──► (tracked; changes only via a new instrument version)
                             ├──► Specialist review ──► Recommended  (opinion returns for decision)
                             └──► Not applicable ──► Recommended     (re-opened on a change)
```

`Processing` is the extraction state. `Recommended` means a proposal is on the table and a decision
is owed. `Saved`, `Specialist review` and `Not applicable` are all *decided* states, and all three are
recorded with an actor, a timestamp and a basis.

**Alternate and exception paths.**

- *The recommendation is wrong.* The decider ignores it and picks a different control, or creates a
  new one. The rejected recommendation stays on the record — an assistant whose bad suggestions
  disappear cannot be assessed.
- *The specialist's opinion is that the clause does not apply.* The clause returns to `Recommended`
  and is then marked not applicable, with the opinion as its basis. The two-step matters: the
  specialist advises, the accountable person decides.
- *A clause is decided and then the instrument is superseded.* The new version's clauses arrive as
  `Processing`; the prior decisions are preserved against the prior version and are visible through
  the supersession link. Prior decisions are never silently carried forward (`BR-LFC-02`).
- *A clause has no obvious control.* Creating a new control from the clause is a first-class path, not
  a fallback; the new control inherits the clause's frequency and its owner is nominated at creation.

**Side effects.** Audit entry naming actor, clause, decision and basis · the clause's proof chain
becomes resolvable in both directions · the control's "clauses satisfied, grouped by act" panel gains
a row · the department scope of the instrument widens to include the deciding department.

**Acceptance.** A reviewer can open an instrument, see it broken into clauses, open one clause, read
its sourced penalty and derived severity, accept a recommendation, and land on a control that now
lists that clause among those it satisfies — and can then run the reverse lookup from the clause to
every record it produced.

---

### 5.2 Creating a source instrument, with assistance

**Purpose.** Getting law into the platform is the highest-friction step in every GRC deployment. A
firm with 8,000 statutory changes a year cannot key them in. This workflow makes ingestion a review
task rather than a data-entry task, while keeping a human accountable for every accepted clause.

**Trigger.** A Compliance user supplies an instrument name and a URL, or uploads a document.

**Actors.** *Compliance* (Compliance and Company Secretarial department) reviews and accepts. *The
extractor* proposes.

**Preconditions.** The user holds clause authority (§4.10).

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Compliance | Supply the instrument name and source URL, or upload the document | Draft ingestion | Clause authority |
| 2 | System | Extract the instrument's identity — authority, type, date of issue, effective date, version, supersession — and propose a clause-level breakdown | Proposal, every extracted figure marked **unverified** | — |
| 3 | Compliance | Review clause by clause. Accept, edit or reject each proposed clause. Confirm or correct each extracted figure | Accepted set | — |
| 4 | Compliance | Assign the departments the instrument routes to | Accepted set | — |
| 5 | Compliance | Create the instrument | Instrument created with its accepted clauses at `Processing` / `Recommended`; the entry method and source link recorded as provenance | — |
| 6 | — | The clauses now enter 5.1 | — | — |

**Alternate and exception paths.**

- *The extraction is poor.* The user rejects clauses wholesale and enters them by hand; manual entry
  must remain a complete path, never a degraded one.
- *The instrument supersedes one already held.* The user links the supersession; the prior version is
  marked superseded and its clauses remain readable, with the banner in 5.1 step 2 pointing back.
- *A figure cannot be verified.* It stays flagged unverified and the clause cannot be saved to a
  control until a person confirms it (`BR-AI-03`).

**Side effects.** Audit entry recording who created the instrument, by which entry method, from which
source · the instrument appears in the Source Library flagged as needing work · the assigned
departments gain visibility of it.

**Acceptance.** A user can go from a URL to a reviewed, clause-broken instrument in the library
without leaving the screen, and every figure the system extracted is visibly attributed and
individually confirmable.

*As built.* The prototype's extractor is scripted and deterministic — the same input always produces
the same breakdown, and there is no model call. The screens and the accept-per-clause interaction are
built against a stable seam so a real extractor can replace it without reworking the flow. §19
records this.

---

### 5.3 Regulatory change management

**Purpose.** Keep the firm current. A change that reaches the right person in a week is manageable; a
change discovered during an inspection is not.

**Trigger.** A change arrives from a regulatory-intelligence feed, a regulator circular, or the
source-scanning agent (5.29).

**Actors.** *Compliance Manager or Analyst* assesses and acknowledges. *Risk Manager* where the change
bears on exposure. *The owners of impacted records* are alerted.

**Preconditions.** The change carries its source, its publication date and a summary.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | System | Capture the change with its provenance and publication date | `Assessed` pending | — |
| 2 | System | Assess impact: which existing obligations, controls and policies the change touches | Impact set computed | — |
| 3 | System | Alert the owners of every impacted record, automatically | Notifications sent, logged | — |
| 4 | Compliance | Review the impact and acknowledge the change | `In progress` | Acknowledge authority |
| 5 | Compliance | Update what the change actually alters — an obligation's due date or requirement, a control's description, a policy's next review | Impacted records patched | Per-record authority |
| 6 | Compliance | Where the change creates a *genuinely new* duty, promote it into the source pipeline (5.1) rather than editing an existing obligation | New clause enters `Processing` | Clause authority |
| 7 | Compliance | Close the change once every impacted record is updated | `Closed` | — |

**State model.** `Assessed → In progress → Closed`. A change cannot close while an impacted record is
still unacknowledged (`BR-LFC-08`).

**Alternate and exception paths.**

- *No impact.* The change is acknowledged and closed with a recorded basis. "No impact" is a decision
  that must be visible, not an absence.
- *The change is a new duty, not an amendment.* Step 6 is the correct path. Editing an existing
  obligation to mean something new destroys the provenance of what it used to mean.
- *The change lands on a duty that is currently overdue.* The escalation ladder continues to run; a
  regulatory change is not a reason for a deadline to stop counting.

**Side effects.** Audit entry per acknowledgement and per patched record · owner notifications ·
obligation records gain a link to the change that drove them · the reg-change feed's provenance
counter (how many updates the feed captured this year) is the honest denominator behind the firm's
claim to be current.

**Acceptance.** A reviewer can watch a change arrive, see its computed impact across obligations and
controls, see the owner alerted without anyone pressing send, and follow the trail to the updated
records.

---

### 5.4 The obligation and its tasks

**Purpose.** This is the duty cycle — the workflow that most users spend most of their time inside.
Its design decision is that **the obligation is the duty, and the task is the work**: maker-checker,
evidence and chasing all live at the task level, so a duty with four steps has four owners, four
deadlines and four evidence trails rather than one blurred one.

**Trigger.** A cycle falls due, or a duty is created from a clause (5.1) or a regulatory change (5.3).

**Actors.** *Owner* (first line) performs. *Maker* attaches proof — usually the owner. *Checker*
verifies. *Compliance Manager* oversees the register.

**Preconditions.** The obligation (the standing duty, §7.1) has a regulator or an internal basis, an
owner, a frequency, a nominated checker, and provenance to a clause or a policy; the cycle in hand
carries the due date.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | System | Present the duty in the register, on the one calendar, and in the owner's queue | `Due` | — |
| 2 | System | Chase on the fixed ladder as the due date approaches (5.27) | `Due` | — |
| 3 | Maker | Do the work and attach the evidence to the task (5.6) | Task `InProgress` (evidence attached) | Submit authority |
| 4 | Maker | Submit the task | Task `Submitted`, obligation cycle `In review` | Submit authority |
| 5 | Checker | Verify the evidence and approve | Task `Done` (displayed *Verified*), cycle `Filed` | Approve authority **+ SoD** |
| 6 | System | Record the cycle's timing — on time or late — and, for a recurring duty, schedule the next cycle (5.5) | Next cycle `Due` | — |

A duty with sub-steps — a payroll deduction chain, say, where the deduction, the deposit and the
return are three separate acts by three people — fans into one task per sub-step, each with its own
maker, checker, due date, evidence and ladder. A single-action duty carries exactly one task, so the
model is uniform and every screen can assume it.

**The task is one engine, not one module's object** *(v2.1)*. The same work item serves obligations,
issue remediation, campaign responses, DSAR stages and attestations. What varies is the task's
**completion policy** — `simple` (do it and mark it done), `acknowledge` (an attestation act),
`evidence` (done requires attached proof, `BR-EVD-01`), or `maker-checker` (done requires a
different person's approval, `BR-AUT-05`) — which gates which transitions are legal. Display labels
vary with the policy (*Verified*, *Acknowledged*, *Approved*) over one underlying state machine
(§7.3), so the platform has one definition of "done" and one ladder chasing it.

**State model — obligation cycle.**

```
Due ──► In review ──► Filed
```

`Overdue` is **derived** — a cycle whose due date has passed and whose state is not `Filed` reads
as overdue everywhere, but it is a relationship between the date and now, never a stored state
(`BR-DRV-17`). It does not stop the flow.

**State model — maker-checker (the pattern reused across the platform, §5.7).**

```
Drafted ──► Submitted ──┬──► Approved
                        └──► Returned ──► Drafted
```

**Alternate and exception paths.**

- *The checker rejects.* The task returns to the maker with a note; the obligation returns to `Due`;
  the ladder resumes. A rejection is recorded with its reason.
- *The duty cannot be completed on time.* The owner raises an exception (5.14). An exception is the
  only legitimate way for a duty to be late without the escalation ladder continuing to run against
  it, and it is time-boxed and approved by someone else.
- *Evidence is missing at submission.* The submission is blocked. A duty may not be marked complete
  with nowhere for its proof to live (`BR-EVD-01`).
- *The maker and the checker are the same person.* Approval is refused (`BR-AUT-05`).
- *The duty is overtaken by a regulatory change.* 5.3 patches it in place and links the change.

**Side effects.** Audit entries at submit and approve, each naming actor and timestamp · queue items
appear and clear · the cockpit's overdue count and on-time rate move · the evidence vault gains the
attached artifact, linked to the task, the obligation, the control and the framework references.

**Acceptance.** A reviewer can take an internal, policy-driven duty and a statutory filing through the
identical sequence, see both on one calendar, watch the checker reject and the maker resubmit, and
find the evidence from three directions — the task, the control, and the vault.

---

### 5.5 The recurring cycle

**Purpose.** A firm should never have to re-create a duty it performs every month. Equally, it should
never be able to lose track of which cycles were met.

**Trigger.** A recurring obligation reaches `Filed`.

**Actors.** System only.

**Preconditions.** The obligation carries a periodic frequency — weekly, fortnightly, monthly,
quarterly, half-yearly or annual. Event-based, continuous and daily duties are explicitly **not**
auto-scheduled, because their next occurrence is not a function of the calendar.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | System | On approval of the current cycle, compute the next due date by adding the cadence to the later of this cycle's due date and today | — |
| 2 | System | Create the next instance: same duty, same owner, same checker, same provenance; cleared evidence; maker-checker reset to `Drafted` | Next instance `Due` |
| 3 | System | Record this cycle's timing: **on time** if filed on or before its due date, **late** otherwise | Cycle history extended |

**Alternate and exception paths.**

- *The cycle was filed late.* The next instance is still scheduled; lateness is recorded against the
  cycle, not carried forward as a penalty on the next one.
- *The cadence changes* (a regulator moves a quarterly return to monthly). The change flows through
  5.3, and the next generated instance uses the new cadence. Historic cycles keep the cadence they
  were performed under.
- *A cycle is missed entirely.* It remains `Overdue` and escalating. Generating the next instance does
  not close the missed one — that would let a firm outrun its own failures.

**Side effects.** The obligation detail shows a period-by-period ledger of which cycles were met on
time · the on-time percentage in §10 is computed from it.

**Acceptance.** A reviewer can approve a monthly duty and immediately see next month's instance
scheduled, with the current cycle's on-time status recorded, without anyone creating anything.

---

### 5.6 Evidence: capture, submission and verification

**Purpose.** Evidence is what turns an assertion into a defence. This workflow exists to make proof a
byproduct of doing the work rather than a separate act of documentation, and to keep a clear line
between "someone said this happened" and "someone independent checked".

**Trigger.** A task requires proof; or a monitored control produces proof automatically; or a person
attaches an artifact to a control or an obligation.

**Actors.** *Maker* attaches. *Checker* verifies. *Feeds* capture automatically.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | System | For the duty in hand, show what good proof looks like: acceptance criteria, worked examples, and sample templates for the relevant control | — |
| 2 | Maker / feed | Capture the artifact: a filing acknowledgement, a committee minute, a configuration export, a log extract, an attestation, a screenshot | Evidence `Submitted` |
| 3 | System | Link the evidence to its task, its obligation, its control and the framework references those satisfy | Links live |
| 4 | Checker | Verify the artifact — that it is the right artifact, for the right period, showing the right thing | Evidence `Verified` |

**State model.** `Submitted → Verified`. Auto-captured evidence from a trusted feed still requires a
verification act before it counts toward a duty's completion; the feed proves the system ran, a person
attests that it proves the duty.

**Alternate and exception paths.**

- *The artifact is wrong.* The checker rejects; the evidence stays `Submitted` and the task returns to
  its maker.
- *Evidence is captured on someone's behalf.* Recorded explicitly — the trail names both the person who
  attached and the person it was attached for.
- *Generated text is offered as evidence.* Refused, always (`BR-AI-04`). The assistant may summarize
  what an artifact shows; the artifact remains the evidence.

**Side effects.** The vault gains the item with its capture method (automatic or by a named person),
its source, and everything it is linked to · the control's evidence count moves · the duty's cycle
becomes provable.

**Acceptance.** A reviewer can find the same evidence item from the task, from the control, from the
obligation and from the vault, see whether it was captured automatically or by hand, and see who
verified it.

---

### 5.7 Maker-and-checker: the shared pattern

**Purpose.** Separation of duties is the platform's core governance mechanism, and it is one pattern
reused everywhere rather than a different approval mechanism per module.

**Trigger.** Any governed change (§4.10).

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | System | Nominate the checker on the record, at creation | `Drafted` | — |
| 2 | Maker | Do the work; attach what the decision rests on | `Drafted` | Maker authority |
| 3 | Maker | Submit | `Submitted` | Maker authority |
| 4 | Checker | Approve, or return with a note | `Approved` / `Returned` | Checker authority **+ SoD** |

**The pattern's non-negotiables.**

- The checker is nominated **before** the work, so the trail shows who was supposed to check.
- The approver may never be the maker (`BR-AUT-05`).
- A return carries a reason, and the reason is part of the record.
- Both acts carry actor and timestamp, and both are logged.
- The pattern applies to administrative configuration changes as much as to filings (§5.30).

**Where it applies.** Obligation and task filing · incident regulator filings · risk treatment approval
and risk acceptance · exception approval and renewal · campaign response review · committee pack
narrative issue · investigation closure and unsealing · fraud regulator filings · platform
configuration changes.

**One pattern, one state machine** *(v2.1)*. For work items the pattern is not a second state
machine beside the task's: `Drafted/Submitted/Approved/Returned` are **projections of the task
states** (§7.3) — `Submitted` is the task's `Submitted`, `Approved` is `Done` under a
`maker-checker` policy, `Returned` is the recorded return reason plus the transition back to
`InProgress`. Records that are not tasks (a pack narrative, a configuration change) carry the
pattern directly.

---

### 5.8 Control testing and re-testing

**Purpose.** A control that is never tested is an assertion. The test history is what an auditor asks
for first.

**Trigger.** The control's test cadence falls due; or an incident, a finding or a regulatory change
prompts an out-of-cycle re-test.

**Actors.** *Control Owner* tests. *Auditor* may test independently. *Executive* may direct a re-test.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | System | Present the control with its cadence, last test, current result and evidence count | — | — |
| 2 | Tester | Perform the test by a recorded method against a defined population | — | Re-test authority |
| 3 | Tester | Record the result: `Pass`, `Partial` or `Fail`, with a note | Result updated; history prepended | Re-test authority |
| 4 | System | Attach the test's evidence to the control for the period | Evidence linked | — |
| 5 | System | On `Fail`, raise a remediation issue against the control (5.22) | Issue `Open` | — |

**Alternate and exception paths.**

- *`Partial`.* Not a clean pass *(v2.1 — aligned with the corrected pass-rate definition, §10.1)*:
  a partial is outside the pass-rate numerator, visible as its own band in the register and on the
  drill, and it does not clear an open issue. What a partial is *not* is a failure — it does not
  raise one.
- *The failure cannot be fixed inside the window.* An exception is raised (5.14) with a compensating
  control named.
- *The tester owns the control and the test is meant to be independent.* Production must be able to
  require a second-line or third-line tester by configuration (§14, §21).

**Side effects.** The control's period-by-period evidence ledger gains a row · the control pass rate
moves · the risks the control mitigates reflect the change in assurance · an audit working
paper can cite the test.

**Acceptance.** A reviewer can re-test a control, watch the result and the ledger update, see the
issue that a failure raises, and see the pass-rate number on the cockpit move accordingly.

---

### 5.9 Continuous control monitoring and the failure cascade

**Purpose.** This is the workflow that proves the platform is continuous rather than periodic: a
monitored control tests itself against a live population, captures its own evidence, and escalates on
its own when it fails.

**Trigger.** A monitoring rule runs on its schedule against a feed.

**Actors.** System, then *Control Owner*.

**Preconditions.** The control is designated as continuously monitored and bound to a feed, a
population definition, a pass condition and a run frequency.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | System | Run the rule against the population from the bound feed | Pass and fail counts recorded |
| 2 | System | Capture the run as evidence, automatically, linked to the control and its framework references | Evidence `Submitted` (auto) |
| 3 | System | Where every item passes, set the rule `Passing` and the control's result to `Pass` | — |
| 4 | System | Where items fail, set the rule `Failing`, list the failing items with their age against the service level, and set the control's result to `Fail` | Rule `Failing` |
| 5 | System | Raise a remediation issue against the control, naming the failing items | Issue `Open` |
| 6 | System | Where the failure has already produced a real-world event, link the issue to the incident it feeds | Incident linked |
| 7 | Control Owner | Work the issue (5.22), or raise a time-boxed exception (5.14) | — |

**The worked cascade.** The prototype's load-bearing example: a rule requiring critical
vulnerabilities to be patched within fourteen days finds three items past the window; the rule reads
`Failing`; an issue is raised naming those three; that issue is linked to the live critical incident;
and the evidence captured by the run is the same evidence the incident's regulator filings cite. One
failure, one issue, one incident, one evidence trail, three regulator outputs.

**Alternate and exception paths.**

- *The feed is unavailable.* The rule reads `Degraded`, not `Passing`. A rule that cannot see its
  population must never report success (`BR-DRV-09`).
- *The failing item is a false positive.* The owner records that on the issue with a basis; the item is
  excluded from the population by a configuration change, which is itself governed (5.30).
- *The failure is accepted for a period.* An exception with a compensating control (5.14).

**Side effects.** Auto-captured evidence · an issue in the one remediation register · the cockpit's
failing-control count and control pass rate move · the incident, where linked, shows the control
failure as its cause.

**Acceptance.** A reviewer can open a failing rule, see its population and its failing items, follow
the issue it raised without anyone raising it, and follow that issue to the incident and to the
evidence the filings reuse.
---

### 5.10 Incident response across multiple regulator clocks

**Purpose.** India's multi-clock breach problem, made operable. One incident can simultaneously trip a
six-hour cyber-reporting direction, a forty-eight-hour sector-regulator duty plus its quarterly
return, and a data-protection breach intimation of around seventy-two hours. Three regulators, three
deadlines, three formats — and one underlying set of facts. A firm that gathers proof three times
gets three slightly different stories, which is worse than getting it late.

**Trigger.** An incident arrives from security monitoring, the endpoint estate, the vulnerability
scanner, or the IT service desk — or is raised by a failing monitored control (5.9).

**Actors.** *Control Owner* runs the response. *Compliance Manager* owns the regulator relationship.
*DPO* where personal data is involved. *Executive* signs off. *Auditor* reviews after the fact.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Feed | Detect and raise the incident with its detection time, source and affected assets | `Open` | — |
| 2 | System | Classify automatically against the sector regulator's taxonomy — Critical, High, Medium, Low | Classification set | — |
| 3 | System | Determine which regulator tracks the incident's shape engages: cyber-enabled, subscriber-impacting, personal data involved | Tracks created, each with its clock started at detection | — |
| 4 | System | Start every clock from the **detection** time, not from the time someone opened the record | Clocks live | — |
| 5 | Responder | Work one unified timeline: containment, eradication, recovery, each entry attributed and timestamped | Timeline extended | — |
| 6 | System | Capture evidence once — logs, configuration exports, forensic notes — and make it available to every track | Evidence linked | — |
| 7 | Responder | Draft each regulator's report from the one timeline and the one evidence set, in that regulator's format | Track `Drafted` | — |
| 8 | Checker | File the track | Track `Filed`, acknowledgement captured as evidence | File authority **+ SoD** |
| 9 | Responder | Link the incident to the control that failed and the risk it realized | Cross-links live | — |
| 10 | System | Where a loss was incurred, book it (5.11) | Loss recorded | — |
| 11 | Executive | Close the incident once every required track is filed and remediation is owned | `Closed` | — |

**State model — incident.** `Open → Contained → Closed`, with each regulator track running its own
`Pending → Drafted → Filed` independently. An incident may not close while a required track is
unfiled (`BR-LFC-05`).

**Alternate and exception paths.**

- *A clock is breached.* The track is marked breached and stays visible. A missed regulatory deadline
  is itself a reportable failure and must never be quietly cleared.
- *The incident turns out not to be reportable to one of the regulators.* The track is closed with a
  recorded basis and the assessment that reached it. "We decided it wasn't reportable" is a decision
  that an inspector will ask to see.
- *Personal data involvement is discovered late.* The data-protection track is added at that point,
  with its clock started at the **time of discovery of the personal-data involvement**, and the
  divergence from the detection time is recorded explicitly. This is the most legally sensitive
  clock-start rule in the platform and production must let the customer configure it (§14, §21).
- *The incident is a fraud.* It converts (5.23) and carries its regulator tracks with it.

**Side effects.** The nearest live clock appears in the vital-signs strip on every screen · the
cockpit's open-incident and critical counts move · the failing control and the realized risk both
gain a link · filings become evidence · the loss engine gains an entry.

**Acceptance.** A reviewer sees one incident with three clocks counting down side by side, one
timeline, one evidence set, and three distinct regulator outputs — and can show that the evidence
behind all three is the same set of artifacts, gathered once.

---

### 5.11 Operational loss capture

**Purpose.** An incident that cost money is a loss event, and a firm that cannot say what its
operational losses were cannot manage operational risk. This workflow puts incidents and confirmed
frauds into one loss book on one categorisation.

**Trigger.** An incident or fraud case is confirmed to carry a financial loss.

**Actors.** *Control Owner* or *Investigator* records; *Finance* reconciles; *Risk Manager* reports.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Responder | Categorize the loss on the standard operational-risk event categories | Category set |
| 2 | Responder | Record the gross loss | Gross recorded |
| 3 | Responder | Record recoveries — insurance, restitution, reversal — as they land, with an accounting reference | Recovery recorded |
| 4 | System | Derive the net loss as gross minus recovery, floored at zero | Net derived |

**The seven categories** are the standard operational-risk taxonomy: internal fraud; external fraud;
employment practices and workplace safety; clients, products and business practices; damage to
physical assets; business disruption and system failures; execution, delivery and process management.
Using the standard set is what makes the loss book comparable to the rest of the industry and
acceptable to a regulator.

**Business rules.** Net loss is **derived, never stored and never keyed** (`BR-DRV-04`) — the incident
list, the detail and any period roll-up cannot disagree. A recovery may not exceed the gross loss and
turn a loss into a gain.

**Side effects.** The Risk Committee pack's loss section · the operational risk domain's evidence base
· the fraud module's recovery-rate metric.

---

### 5.12 The risk lifecycle

**Purpose.** A risk register that is a list of nouns is a compliance artefact, not a management tool.
This workflow makes a risk a thing that moves: identified from somewhere real, assessed, treated by
named actions with owners and dates, evidenced, challenged, approved, and then monitored.

**Trigger.** A risk is identified — from an assessment cycle, an audit finding, an incident, a
regulatory change, a control failure, or a manual entry.

**Actors.** *Risk Manager* or *Control Owner* owns and executes. *Risk Manager or Executive* approves.
*Auditor* tests independently.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Any | Identify the risk, recording where it came from and the reference of the source record | `Identified` | — |
| 2 | Owner | Assess likelihood and impact; the inherent score follows; controls reduce it to a residual | `Assessed` | — |
| 3 | Owner | Write the treatment: the approach (mitigate, accept, transfer, avoid), a rationale, and a target residual | `Treatment planned` | — |
| 4 | Owner | Add remediation actions, each with an owner, a due date, milestones, and the residual reduction it is expected to bank | `Treatment planned` | — |
| 5 | Owner | Progress the actions; the ladder chases each one on its own due date | `In execution` | Advance authority |
| 6 | Owner | Attach evidence to each completed action | `Evidenced` once every action is done **and** evidenced | — |
| 7 | Reviewer | Review the plan and its execution | `Under review` | — |
| 8 | Owner | Submit the plan for approval | `Awaiting approval` | Submit authority |
| 9 | Approver | Approve | `Monitoring` | Approve authority **+ SoD** |
| 10 | System | Where the residual now sits at or below target and the risk is mitigated, the risk may close | `Closed` | — |

**State model.**

```
Identified → Assessed → Treatment planned → In execution → Evidenced
                → Under review → Awaiting approval → Monitoring → Closed
                                     │
        Accept (5.13) ───────────────┴──► Accepted ──(expiry)──► Acceptance lapsed
```

**The two load-bearing rules.**

1. **Actions gate approval** (`BR-LFC-03`). A treatment plan cannot reach `Awaiting approval` while a
   remediation action is still open. The execution layer is the gate, which is what stops a plan being
   approved on the strength of its intentions.
2. **Accept routes around execution** and lands in a time-bound acceptance that must be signed off and
   always expires (5.13).

**Alternate and exception paths.**

- *The plan is returned.* It goes back to the owner with a note and re-enters execution.
- *An action is overdue.* The ladder chases it, and the risk shows a projected residual — what the
  score will be once every open action lands — next to the current one, so a plan that is behind
  cannot present itself as a plan that is done.
- *A monitored indicator on the risk breaches* (5.15). The register badges the risk.
- *The risk is realized by an incident.* The incident links back, and the realized risk is evidence
  that the residual was understated.

**Side effects.** Heat map position (inherent and residual) · appetite aggregate for the domain ·
queue items for the approver and for action owners · the audit trail of every review, approval and
acceptance · reminder and escalation rows on every action.

**Acceptance.** A reviewer can watch a risk move from an audit finding through a treatment plan whose
actions have owners and dates, see approval refused while an action is open, see it approved once they
land, and see the register and the detail page agree at every step because the stage is derived from
the record rather than typed into it.

---

### 5.13 Risk acceptance

**Purpose.** Sometimes the right answer is to carry the risk. That decision is legitimate; carrying it
silently and forever is not.

**Trigger.** The owner proposes acceptance rather than mitigation, typically where the residual sits
above the treatment target and no proportionate action exists.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Owner | Propose acceptance with a rationale, an expiry date and, where one exists, a compensating control | Proposed | — |
| 2 | Approver | Accept | `Accepted` until expiry | Accept authority **+ SoD** — the owner may not accept their own exposure |
| 3 | System | Chase the expiry on the ladder, starting thirty days out | — | — |
| 4 | Owner / Approver | Before expiry: renew, close, or convert to a treatment plan | — | Renew carries SoD |
| 5 | System | On expiry with no decision, the acceptance lapses | `Acceptance lapsed` | — |

**The rule that makes this worth having** (`BR-LFC-04`): **an expired acceptance is not "accepted".** It
is an open, unmanaged exposure, it reads as such on the register and the committee pack, and it
escalates. Governance by expiry only works if expiry actually bites.

*(v2.1 naming note.)* The lapse state was called `Exception expired` in v2.0. It is renamed
`Acceptance lapsed` because the Exception is now a first-class entity (§5.14) and a lapsed risk
acceptance does **not** create an Exception record — the risk itself is the visible open exposure,
escalating on the ladder, until someone renews, closes or converts it to a treatment plan.

**Side effects.** Queue item for the accepting person at thirty days and again on lapse · the appetite
view counts an expired acceptance as exposure, not as a decision · the Risk Committee pack lists
acceptances and their expiry dates.

---

### 5.14 The exception register

**Purpose.** A deviation from a control or a duty that is *known, time-boxed, approved and
compensated* is governance. The same deviation undocumented is a finding. This workflow is how the
firm says "we know, here is why, here is what we are doing instead, and here is when it ends".

**The model** *(v2.1 — supersedes v2.0's "exception is an issue with a deviation record attached")*.
An **exception is a first-class entity**, not a subtype of issue. Its **subject** is the control or
the obligation being deviated from; where a surfaced weakness prompted it, it links the issue
(`issueId`, optional). The v2.0 fusion was a prototype economy that bought the remediation
apparatus at the price of fusing two different lifecycles: an issue is a weakness being *fixed*, an
exception is a deviation being *governed* — and a **proactive exception**, raised before anything
has failed (a planned migration that will suspend a control for a fortnight), is a first-class path
that has no issue at all and must not be forced to masquerade as one.

What made the v2.0 fusion attractive is preserved a different way: **the remediation register is a
union view over Issues and Exceptions** (`BR-LNK-06`). One register, one place the Audit Committee
looks, nothing invisible — but two entities underneath, each with its own honest lifecycle.

**Trigger.** A control is failing or a duty will be late and the gap cannot be closed inside the
window; **or** a deviation is known in advance and is being approved before it occurs; **or** an
attestation "cannot comply" declaration (5.17).

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Owner | Raise the exception against its subject — the control or the obligation: reason, compensating control, requested expiry, severity, and the linked issue where one exists | `Requested` | Raise authority |
| 2 | Approver | Approve or refuse | `Active` / refused | Approve authority **+ SoD** |
| 3 | System | Chase the expiry on the same ladder the duties use, pointed at the expiry date; `Expiring soon` inside the warning window | `Active → Expiring soon` | — |
| 4 | Owner | Close the exception when the underlying gap is fixed or the deviation ends | `Closed` | Close authority |
| 5 | System | On expiry with no closure, the exception **expires and enters review** — it reads as an open exposure and escalates | `Expired (under review)` | — |
| 6 | Approver | Resolve the review: **close** (the gap is fixed), **renew-extend** (new expiry; renewal count increments), or **convert to an accepted risk** (a risk acceptance via 5.13, which closes the exception with that outcome) | `Closed` / `Active` / `Converted` | Renew and convert carry Approve authority **+ SoD**; see renewal escalation below |

**State model.** `Requested → Active → Expiring soon → Expired`; `Active | Expiring soon | Expired →
Closed`; `Expired → Active` (renewed, count incremented); `Expired → Converted` (risk acceptance
created). `Expiring soon` and `Expired` are **derived** from the expiry date and the warning window
(`BR-DRV-08`), never stored.

**The three rules that make expiry bite** (`BR-LFC-13`):

1. **No issue is auto-created on expiry.** The expired exception *is* the visible open exposure —
   it sits in the union register in the danger state and escalates on the standard ladder until an
   outcome is recorded. Spawning a second record would split one exposure across two lifecycles and
   let the exception itself quietly read as merely "expired" while a clone carries the heat.
2. **Lapse is not an outcome.** If nobody resolves the review, the exception simply remains
   `Expired`, escalating — reaching the executive rung at seven days like any other overdue item.
   There is no state in which an undecided expiry stops being loud.
3. **Renewal authority escalates with the count** (`BR-AUT-11`). The first renewal takes the normal
   approver set (§4.10, SoD). The **second** renewal requires the **Executive**. Every renewal
   beyond the second is reported **by name** in the Audit Committee pack's exception section. An
   exception renewed four times is a decision the firm has made without admitting it; escalating the
   authority forces the admission. The thresholds are configurable (§14); the escalation's existence
   is not.

**Alternate and exception paths.**

- *A "cannot comply" declaration from a policy attestation* (5.17) lands here as a real, time-boxed
  exception — subject: the control or obligation the policy mandates — rather than sitting inside a
  campaign response.
- *The linked issue closes while the exception is live.* The exception does not auto-close; the
  deviation was approved to an expiry and the owner closes it deliberately, or it expires into
  review. The link simply records that the prompting weakness is gone.

**Side effects.** Appears in the one remediation register (the union view) and in the exception
summary · the Audit Committee pack's exception section, with renewal counts and over-threshold
renewals named · the subject control or obligation shows the exception on its own page.

---

### 5.15 Key risk indicator breach

**Purpose.** Indicators are the early-warning layer above the register: a number that moves before a
risk materializes. Their value depends entirely on the band being honest.

**Trigger.** A reading is taken — from a feed or entered by hand — or a scheduled refresh falls due.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Feed / owner | Record the reading with its timestamp | Reading appended |
| 2 | System | Derive the band from the reading, the thresholds and the indicator's **direction** | `Green` / `Amber` / `Red` |
| 3 | System | Where the band is not green, chase the breach on the ladder, pointed at the refresh date | Queue item raised |
| 4 | Owner | Act: investigate, remediate, or record why the reading is expected | — |
| 5 | System | Badge the risk the indicator belongs to, and roll the worst band up to it | Risk badged |

**Direction is the whole subtlety** (`BR-DRV-02`). "Three unpatched critical vulnerabilities" and
"ninety-seven per cent multi-factor coverage" are both breaches, but one is above its threshold and
the other below it. For a *higher-is-worse* indicator, green is a **ceiling**; for a *lower-is-worse*
indicator, green is a **floor**. Getting this backwards inverts every alert in the platform, which is
why the band is derived and never stored.

**Alternate and exception paths.**

- *The reading is stale.* An indicator not refreshed within its cadence reads as stale and is chased.
  A stale green is not a green.
- *The threshold itself is wrong.* Changing a threshold is a configuration act (5.30), governed and
  logged, because moving the goalposts is the easiest way to make a red indicator disappear.

**Side effects.** The risk register's breach badge · the domain breach counts on the Risk Committee
pack · reminder and escalation rows in the audit log.

---

### 5.16 Risk and control self-assessment (campaign)

**Purpose.** The periodic cycle in which first-line owners re-score their own risks and assess whether
the controls over them are actually working. The design contract is blunt: **an assessment cycle that
collects opinions and files them is theatre.** This one moves the register.

**Trigger.** The assessment cycle opens — annually, or after a material change.

**Actors.** *Risk owner* re-scores. *Second line* challenges. *Approval* writes back.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Risk / Compliance | Open the campaign: scope it to a set of risks, set the due date, assign each to its owner | Campaign `Open`, one task per in-scope risk | — |
| 2 | System | Fan the tasks out into each owner's queue; chase on the ladder pointed at the campaign due date | Tasks `Assigned` | — |
| 3 | Owner | For each risk: confirm it is still relevant; re-score likelihood and impact; assess each mitigating control as effective, partially effective, ineffective or not tested; propose a treatment | Task `Submitted` | — |
| 4 | Checker | Challenge the submission — the second line's job is to disagree where the evidence does not support the score | Task `Approved` / `Returned` | **SoD** |
| 5 | System | On approval, **write the new score back to the risk**, with the timeline entry recording the change | Risk patched | — |
| 6 | Owner | Close the campaign once every task is resolved | Campaign `Closed`, completion certificate filed as evidence | — |

**Business rules.** The assessment history **is** the campaign record, read back — nothing extra is
stored on the risk, so there is one copy of the truth. A proposal to retire a risk as no longer
relevant is a first-class outcome and routes to the same challenge.

**Side effects.** Risk residual scores move, and the heat map, the appetite aggregate and the trend
move with them · a completion certificate is filed as evidence against the assessment obligation.

**Acceptance.** A reviewer can run a cycle, watch an owner re-score, watch a checker return one and
approve another, and see the register change as a result — with the change traceable to the person
who made it and the person who challenged it.

---

### 5.17 Policy attestation (campaign)

**Purpose.** Proving that the people bound by a policy have read and accepted it — the answer to "was
your staff aware of this?" that an inspector asks after something goes wrong.

**Trigger.** A policy is published or republished, or the periodic attestation cycle opens.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Compliance | Open the campaign scoped to a policy and a population | Campaign `Open`, one task per person |
| 2 | Assignee | Read the policy; acknowledge it; optionally answer comprehension questions; make any declaration | Task `Submitted` |
| 3 | Checker | Review declarations | Task `Approved` |
| 4 | System | Compute the attestation rate against the policy's **current version** | Rate derived |
| 5 | Compliance | Close the campaign; file the certificate as evidence | Campaign `Closed` |

**The one rule that shapes everything here** (`BR-LFC-06`): **an attestation is against a version.**
Republishing a policy at a new version does not carry forward the staff who acknowledged the previous
one. The version travels inside each response, and every reported rate is computed against the
policy's version as it stands now. A register reporting "94% attested" while the document has moved on
is the exact failure this exists to prevent — and the response summary shows plainly when a signature
was against a version that has since been superseded.

**Declarations.** An assignee may declare a conflict of interest, that they need clarification, or
that they **cannot comply**. The last is not a comment in a text box: it routes into the exception
register (5.14) as a real, time-boxed, approved deviation with an owner. A person who says they cannot
follow a policy has raised a control gap, and the platform treats it as one.

**Side effects.** The attestation rate on the policy page · exceptions created from declarations · the
certificate as evidence. *(v2.1: the UI label is "attestation rate" — "coverage" is reserved for
"Duty coverage" alone, §10.1.)*

---

### 5.18 The policy lifecycle

**Purpose.** Policies are where internal obligations come from. A policy that is out of date silently
invalidates every duty derived from it.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Owner | Draft or revise the policy, citing the clauses behind it | `Draft` | — |
| 2 | Owner | Submit for approval | `In review` | Submit authority |
| 3 | Approver | Approve and publish at a new version, recording the approval chain | `Published`, version incremented | Approve authority **+ SoD** |
| 4 | System | Map the policy to the controls that operationalize it, and schedule the next review | — | — |
| 5 | System | Open an attestation campaign for the new version (5.17) | Campaign `Open` | — |
| 6 | System | Chase the next review date on the ladder | — | — |

**Alternate and exception paths.**

- *The review date passes.* The policy reads as overdue for review and escalates. Duties derived from
  an unreviewed policy remain live — the duty does not lapse because the policy did — but the gap is
  visible on the cockpit and in the pack.
- *A regulatory change affects the policy* (5.3). The change links to it and drives the revision.

**Side effects.** Version history and approval chain on the policy page · the attestation rate · the
internal obligations derived from it carry provenance back to the policy, which itself carries
provenance to a clause.

---

### 5.19 Third-party risk: onboarding, diligence and assurance

**Purpose.** A regulated firm remains accountable for what it outsources. The register's job is to
make the exposure of an arrangement a computed fact rather than an opinion.

**Trigger.** A new arrangement is proposed; or a diligence cycle falls due; or an assurance report
approaches expiry.

**Actors.** *Vendor owner* (first line) holds the relationship. *Risk / Compliance* challenge.
*Auditor* tests.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Owner | Register the arrangement: services and their criticality, the classes of personal data touched, jurisdiction, sub-outsourcing, contractual right to audit, data-processing agreement | `Onboarding` |
| 2 | Owner | Record the independent assurance held — the report type and its expiry | — |
| 3 | Owner | Document the exit plan and test it | — |
| 4 | System | **Derive the risk tier** from everything above (see below) | Tier derived |
| 5 | System | Schedule the next diligence by the arrangement's cadence and chase it on the ladder | — |
| 6 | Owner | Complete the diligence cycle (5.20) | `Active` |
| 7 | System | Chase assurance expiry, on a sixty-day horizon rather than the seven days a short-lived exception gets | — |

**The derived tier** (`BR-DRV-03`). The tier is computed from the arrangement's attributes, and every
point is attributed so the tier can be argued with rather than merely believed. The drivers include:
how critical the outsourcing is; how many material services it carries; **whether it carries a
material service while being classified below material** — a mismatch that is itself the finding,
because it means the arrangement is escaping the diligence and exit obligations that go with
materiality; how many classes of personal data it touches and whether a data-processing agreement
exists; whether independent assurance is current, expiring, lapsed or absent; whether diligence is
current, overdue or never performed; whether a material service has a documented and tested exit
plan; whether there is a contractual right to audit; disclosed fourth parties; whether the service is
performed outside the jurisdiction; and incidents actually linked to the arrangement.

The point is stated plainly in the design: *a register that lets someone type "Low" next to a material
outsourcing with an expired assurance report is the thing this avoids.*

**Alternate and exception paths.**

- *Assurance lapses.* The tier rises automatically; the owner is chased; the arrangement appears in the
  Risk Committee's concentration view.
- *Concentration.* Where several material services depend on one provider, the register surfaces the
  concentration — a per-vendor risk view misses the systemic one.
- *Termination.* The exit plan is executed, tested against its documented steps, and the arrangement
  moves to terminated with the exit evidenced.

**Side effects.** Third-party exposure on the Risk Committee pack · queue items for lapsed diligence,
expired assurance and material services with no exit plan · links to the risks, controls and incidents
the arrangement touches.

---

### 5.20 Third-party due diligence (campaign)

**Purpose.** The periodic re-assessment of an arrangement, run through the same campaign machinery as
the assessment and attestation cycles.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Compliance / Risk | Open the campaign scoped to a set of arrangements | Campaign `Open`, one task per arrangement | — |
| 2 | System | Pre-fill the response from what the register already knows, so the reviewer **contradicts facts rather than inventing them** | Task drafted | — |
| 3 | Owner | Complete the review: is assurance current; how many service-level breaches; should the criticality be re-rated; what is the recommendation | Task `Submitted` | — |
| 4 | System | Block submission while required gaps remain unanswered | — | Completeness check |
| 5 | Checker | Review and approve | Task `Approved` | **SoD** |
| 6 | System | **Write back** the agreed changes to the arrangement — a re-rated criticality, a refreshed diligence date | Vendor patched | — |
| 7 | Compliance | Close the campaign; file the certificate | Campaign `Closed` | — |

**Side effects.** The derived tier moves as the underlying facts move · the diligence clock resets ·
the certificate is evidence.
---

### 5.21 The audit programme: plan, fieldwork, finding

**Purpose.** The third line's workspace. Its job in the connected model is to be able to test any link
in the chain independently and to leave a trail that survives external scrutiny.

**Trigger.** The annual risk-based plan is approved; or an audit in the plan reaches its scheduled
quarter; or an event triggers an unplanned review.

**Actors.** *Head of Internal Audit* plans and reports. *Internal Auditor* performs fieldwork.
*Control Owner* responds. *Audit Committee Chair* oversees.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Audit | Build the risk-based plan: entries scoped to areas, each with a quarter, an auditor and a rationale grounded in the register | Plan entries `Planned` |
| 2 | Audit | Open the audit: type, auditor, period, scope | Audit `In progress` |
| 3 | Auditor | Pull the control's evidence **from the connected model** rather than requesting it by email | — |
| 4 | Auditor | Record working papers: what was tested, the population, the sample, the result | Paper recorded |
| 5 | Auditor | Where a paper fails, raise a finding from it, carrying the paper's reference | Finding `Open` |
| 6 | System | Spawn a remediation issue from the finding, with an owner and a due date (5.22) | Issue `Open` |
| 7 | Audit | Report; track remediation; re-test | Finding `Closed` on verified remediation |
| 8 | System | Derive plan-versus-actual delivery and quarter coverage for the committee | — |

**State model.** Plan entry: `Planned → In progress → Complete` / `Deferred`. Audit: `Planned → In
progress → Reporting → Closed`. Finding: `Open → In remediation → Closed`.

**Alternate and exception paths.**

- *A failed working paper that never became a finding.* The platform surfaces these explicitly as
  unescalated failures. A test that failed and was quietly dropped is the most damaging thing an
  internal audit function can leave behind.
- *A repeat finding.* Visible as such. Repetition is the signal that remediation was cosmetic.
- *The plan is not delivered.* Plan-versus-actual is derived, not asserted, so the committee sees
  coverage rather than intentions.
- *Remediation is not verified.* A finding cannot close on the owner's say-so; closure requires the
  auditor to verify (`BR-LFC-07`).

**Side effects.** Findings and their ageing on the cockpit and the Audit Committee pack · issues in the
one remediation register · the working paper remains linked to the finding as its basis.

**Acceptance.** A reviewer can watch an auditor pull a control's evidence from the model, raise a
finding, see the remediation issue appear with an owner and a due date, and follow the finding to its
verified closure — and can see the plan's delivery rate as a derived number.

---

### 5.22 Issue remediation and closure

**Purpose.** One register for every weakness, whatever produced it. The alternative — a control-failure
tracker, an audit tracker, an incident-action list and an investigation to-do — is how findings get
lost between modules. *(v2.1)* The register is a **union view over Issues and Exceptions**
(`BR-LNK-06`, 5.14): exceptions appear in it as themselves, with their deviation fields and expiry
state, not as issues wearing a deviation record.

**Trigger — what raises an issue.** A control test fails (5.8); a monitoring rule fails (5.9); an
audit raises a finding (5.21); an incident produces a remedial action (5.10); an investigation
concludes (5.23, 5.24). *(Exceptions are raised in 5.14 and join the register through the union
view; an attestation "cannot comply" declaration creates an exception, 5.17.)*

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | System / raiser | Create the issue with its source, its source reference, a severity, an owner and a due date | `Open` | — |
| 2 | Owner | Work it; record progress | `In progress` | — |
| 3 | Owner | Attach the evidence that the weakness is closed | — | — |
| 4 | Checker | Verify and resolve | `Resolved` | Resolve authority |
| 5 | System | Where the issue backs an audit finding, closing it feeds the finding's closure (5.21) | — | — |

**Alternate and exception paths.**

- *The issue ages.* Age is derived from the raise date and is the number the Audit Committee asks for.
  Issues are grouped by source, severity and age precisely so that the oldest are not the least
  visible.
- *Bulk action.* Several issues may be actioned together where the same remediation closes them; each
  still records its own resolution.
- *It cannot be fixed in time.* An exception (5.14).

**Side effects.** Open-findings and average-remediation-days metrics · the control, incident, audit or
case that raised it shows the issue on its own page.

---

### 5.23 Fraud case management

**Purpose.** Fraud needs its own module because its intake, its investigation discipline and its
regulatory duties are different from an operational incident's. What it must **not** have is its own
private version of the shared machinery.

**Trigger.** Transaction monitoring; a monitoring rule failure; a reconciliation break; an audit
finding; or conversion from a speak-up report (5.24).

**Actors.** *Investigator* (usually Internal Audit or Compliance). *Compliance Manager* holds the
regulatory duties. *Executive or Risk* closes.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Detector | Open the case: scheme, detection method, estimated loss, subject scope | `Reported` | Open authority |
| 2 | System | Determine the regulatory tracks the case's shape engages (below) | Tracks created | — |
| 3 | Investigator | Triage: is there a case to answer; assign the investigator; apply recusals | `Triage` | Case access |
| 4 | Investigator | Investigate against a target: forty-five days for a critical case, ninety otherwise; chased on the ladder | `Investigation` | Investigate authority |
| 5 | Compliance | File each engaged regulator track | Track filed | File authority **+ SoD** |
| 6 | Investigator | Record the confirmed loss and any recovery; the net is derived (5.11) | `Recovery & action` | — |
| 7 | Investigator | Raise remediation into the one issues register (5.22) | Issue `Open` | — |
| 8 | Investigator | Push the outcome into the enterprise risk register — a case that changes nothing is noise | Risk linked | — |
| 9 | Approver | Close with an outcome, a disciplinary action and a recovery action | `Closed` | Close authority **+ SoD** |

**The regulatory tracks a case engages** are determined by the shape of the case, not by whoever
remembers: a subscriber-impacting event engages the sector regulator within forty-eight hours and then
the quarterly return; a cyber-enabled fraud engages the six-hour cyber direction; personal data
involvement engages the data-protection breach intimation; a loss above the board's criminal-referral
threshold engages a police referral; and a loss above the audit-committee threshold is reportable to
the statutory auditor and the committee. *This is why a fraud module in a regulated fund is not a
generic case tracker.*

**Alternate and exception paths.**

- *Detection quality.* The platform reports the proactive detection rate — the share of cases the
  firm's own controls found rather than a complaint or an external party. A book where the controls
  are not the ones finding it is a book with a control problem, not just a fraud problem.
- *The subject is senior.* Recusal (§4.12) applies and is computed, not left to good manners.
- *The case is unsubstantiated.* It still closes with an outcome, a trail and, where relevant, a
  control observation. An unsubstantiated case that leaves no record is a case that will be
  re-investigated from scratch.

**Side effects.** Loss book entry · issues · risk register link · regulator filings as evidence · the
Audit Committee pack.

---

### 5.24 Speak-up (whistleblower)

**Purpose.** The statutory vigil mechanism. Every design decision in this workflow follows from one
fact: **this module exists to protect a person.**

**Trigger.** A report arrives through the anonymous web portal, the ethics hotline, a dedicated email
address, a sealed letter, or in person.

**Actors.** *Ethics office* (a named list of people, not a role — §4.12). *Audit Committee Chair*, who
has direct access as a statutory matter. *Investigator*.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Reporter | Submit a report, anonymously or identified | `Received`, reference code issued | — |
| 2 | System | Where the reporter identified themselves, store a **sealed custody note** — who could unseal it and why — never the identity | — | — |
| 3 | Ethics office | Acknowledge the report inside the acknowledgement window | `Acknowledged` | Case access |
| 4 | Ethics office | Triage: accept or reject, assign an investigator, apply recusals | `Under triage` → `Investigation` / `Rejected` | Triage authority + case access |
| 5 | Investigator | Investigate; message the reporter through the reference code without learning who they are | `Investigation` → `Awaiting outcome` | Investigate authority |
| 6 | Investigator | Remediate through the one issues register (5.22) | `Remediation` | — |
| 7 | Approver | Close with an outcome and substantive feedback to the reporter inside the feedback window | `Closed` | Close authority **+ SoD** |
| 8 | Ethics office | Where a retaliation watch is open, review it — and review it again every ninety days until it is closed | — | — |
| 9 | Ethics office / Committee | Unseal an identity only where genuinely necessary | Unsealed, logged | Unseal authority **+ SoD** |

**State model.** `Received → Acknowledged → Under triage → Investigation → Awaiting outcome →
Remediation → Closed`, with `Rejected` as a terminal branch from triage. Outcomes are: substantiated,
partially substantiated, unsubstantiated, out of scope, withdrawn.

**The two clocks.** *Acknowledgement* — the reporter is told the report landed and is being looked at,
because a silent channel is a channel nobody uses twice. *Substantive feedback* — what came of it,
owed whether or not the allegation stood up. Both run on the standard ladder, and **the target of the
chasing is the ethics office, never the reporter.**

**Alternate and exception paths.**

- *The report is really a fraud matter.* The ethics office converts it into a case (5.23), which
  carries **the reference code and nothing else** across.
- *The subject is on the ethics office.* Recusal removes them from the case entirely; they cannot open
  it, and it does not appear in their queue.
- *The report is out of scope* (a grievance, not a disclosure). It closes with that outcome, and the
  reporter still receives feedback.

**Side effects.** The audit trail records **the act and never the content** — that a report was
triaged, by whom and when, not what it alleged · the Audit Committee pack carries counts by category,
the days reporters have been waiting, and the acknowledgement and feedback service levels · sealed
cases are counted for everyone and readable by nobody outside the list.

**Acceptance.** A reviewer can confirm that the reporter's identity is not stored anywhere the platform
can render it; that a persona switch does not open a sealed case; that a recused person is refused
even though their role permits the action; and that the number of open reports is honest for every
viewer even where the contents are not.

---

### 5.25 Data-subject request: erasure versus retention

**Purpose.** The worked case where two legal duties collide. A data principal asks for their data to be
erased; the firm is legally required to retain some of it. The platform's job is to make the resolution
explicit and auditable rather than a judgment call somebody made in an inbox.

**Trigger.** A request arrives, usually through the privacy tooling.

**Actors.** *DPO* owns. *Compliance Analyst* executes.

**Steps — erasure (five stages).**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Analyst | **Locate** every store holding the principal's data, using the data inventory | Step 1 complete |
| 2 | Analyst | **Check retention**: which records are under a statutory retention rule and cannot be erased | Step 2 complete |
| 3 | Analyst | **Erase what may be erased**, and record what may not, with the retention rule that requires it | Step 3 complete |
| 4 | Analyst | **Log** the action against each affected store | Step 4 complete |
| 5 | DPO | **Produce the audit record** given to the principal and held for the regulator | `Complete` |

Other request types — access, correction, portability — run a shorter three-stage sequence: locate,
verify the principal's identity, fulfil and log.

**Alternate and exception paths.**

- *The request cannot be met in full.* That is the normal outcome for erasure at a regulated firm, and
  the partial refusal with its statutory basis is the deliverable, not a failure.
- *The request reveals a breach.* It routes into the incident machinery (5.10) with the
  data-protection clock started.
- *The statutory response window is missed.* The request is flagged as breached and escalates; a missed
  privacy deadline is itself a reportable matter.

**Side effects.** The consent ledger and inventory reflect the outcome · the audit record is evidence ·
the data-protection obligation's cycle is discharged.

---

### 5.26 Board and committee packs

**Purpose.** Turn committee preparation from a project into a view. This is Requirement 13, and it is
the closing argument of the product.

**Trigger.** A committee meeting approaches, or a pack is requested on demand.

**Actors.** *Compliance or Risk* composes and drafts. *A second person* approves the narrative.
*Committee chair* consumes.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Preparer | Choose the audience — board, audit committee, risk committee, or management — and the period | Draft | — |
| 2 | System | Offer the sections that audience takes; each section is a **live query over the register**, not a stored table | Composed | — |
| 3 | System | Name the **basis** the pack is produced under: the statutory provision, the sector guideline, or the committee's charter | — | — |
| 4 | Preparer | Draft the narrative; edit it | Narrative drafted | — |
| 5 | Approver | Approve the narrative | Approved | **SoD** |
| 6 | Preparer | Issue the pack | Issued | — |
| 7 | System | File the issued pack as **evidence against the committee-meeting obligation's task**, so producing the pack discharges the duty to hold and minute the meeting | Evidence filed | — |

**The three things that make a pack governance-grade** rather than a print-out, and all three are
requirements:

1. It names the authority the meeting is held under.
2. Its narrative is maker-checked before issue — drafted by one person, approved by another, exactly
   like a filing.
3. Issuing it discharges a duty rather than sitting beside one.

**Alternate and exception paths.**

- *A section's module is not built.* The section is simply absent from the catalogue. **A pack that
  prints an empty heading is worse than one that prints less** — an empty section reads as "nothing to
  report" when it means "we cannot see".
- *The numbers move between composition and the meeting.* They should; the pack is a view. The issued
  version is snapshotted as evidence so the committee's record is fixed even though the live view moves
  on.

**Acceptance.** A reviewer can produce a committee pack on demand from live data, see the critical
incident and the overdue duties already surfaced in it, see the narrative approved by a second person,
and find the issued pack as evidence against the meeting obligation.

---

### 5.27 Reminders and escalation

**Purpose.** Nothing in the platform waits on someone noticing. This is the single engine that chases
every deadline, and its output is the trail proving the firm chased.

**Trigger.** Elapsed time against any deadline the platform holds.

**Actors.** System. The targets are real named people.

**The ladder** — fixed, and identical for every kind of deadline:

| When | Who is notified |
|---|---|
| 7 days before due | The owner |
| 3 days before due | The owner |
| 1 day before due | The owner |
| 1 day overdue | The owner **and their line manager** (the department head) |
| 3 days overdue | The compliance escalation owner — by default the Head of Compliance, resolved through the department-head map (§14) |
| 7 days overdue | The CRO / executive |

**What the ladder is pointed at.** One engine, many deadlines: an obligation's due date; each task's own
due date, so every step of a multi-step duty chases its own owner; a risk remediation action's due
date; a risk's periodic review date; an exception's expiry; a risk acceptance's expiry (starting thirty
days out, because a quarterly review cadence needs a longer runway than a short-lived control
deviation); an indicator's refresh date while it is breached; a third party's next diligence date and
its assurance expiry, whichever falls sooner; a campaign's due date; a speak-up feedback deadline; and
a fraud investigation's target date.

**Business rules.**

- Only **active** items carry a live ladder. A filed duty is not chased.
- Every **fired** rung is written to the audit log and surfaced on the record, in notifications and in
  the personal queue (`BR-ESC-03`).
- Escalation targets resolve to **real named people** through the department-head map, so "escalated to
  the line manager" names someone.
- The ladder is the **only** chasing mechanism. A module that needs chasing points this engine at its
  own date; it does not build a second one.

**Acceptance.** A reviewer can open an overdue duty and see exactly which reminders fired, when, and to
whom — and find the same events in the audit log.

---

### 5.28 The personal queue and the working day

**Purpose.** The answer to "what is mine and what do I do next", at the right altitude for the person
asking.

**Trigger.** Opening the queue; or a persona switch.

**Steps.**

| # | Actor | Action |
|---|---|---|
| 1 | System | Assemble the person's work from every module: approvals waiting on them, duties they own that are due or overdue, remediation actions, campaign tasks, expiring exceptions and acceptances, breached indicators, lapsed third-party diligence, and investigation work they are cleared for |
| 2 | System | Apply the department scope (§4.5) and the case-access rules (§4.12) **at source**, so nothing appears that the person may not act on |
| 3 | System | Order by urgency, and show for each item the record, the deadline, and the single action it needs |
| 4 | Person | Act; the item clears |

**Business rules.**

- The queue is **derived from live state**, never a stored inbox that can drift.
- Case-restricted work is filtered **at source**, so the queue cannot become the leak the case page
  prevents (`BR-SCP-05`).
- A first-line owner's queue should be short enough to clear in a sitting. Length is a design
  constraint, not an accident.

**Acceptance.** A reviewer can switch persona and watch the queue change to a genuinely different set of
work, with the individual owner's view simple enough to be usable by someone who opens the platform
twice a month.

---

### 5.29 An agentic run: propose, then approve to apply

**Purpose.** Multi-step work that a person should not have to do by hand, returned as a proposal a
person approves. This is where the platform's intelligence does real work without ever taking an
unreviewed action.

**Trigger.** A person starts a run, or a run fires on a schedule.

**Steps.**

| # | Actor | Action | Resulting state |
|---|---|---|---|
| 1 | Person / schedule | Start the run | Running |
| 2 | System | Execute fixed steps over live state — for example: scan the regulatory sources for instruments issued since the last run | — |
| 3 | System | Return **findings** and **proposed actions**, each with a confidence indicator and the evidence it rests on | Proposal returned; **nothing has changed** |
| 4 | Person | Review each proposal; approve or reject individually | — |
| 5 | System | On approval, perform the **existing governed action** — the same one a person would have performed by hand, through the same authority check and the same audit entry | Applied |

**The non-negotiables** (`BR-AI-01`, `BR-AI-02`). A run **never mutates anything**. Approval applies an
existing action rather than a special agent-only path, so an agent can never do something a person
could not. Every applied action names the run that proposed it in the audit trail, so the firm can
audit its automation. And every run **records its inputs, its evidence and its outputs**, so any
proposal can be reproduced and reviewed after the fact. *(v2.1 note: v2.0 required "the same inputs
produce the same result" — a property of the prototype's scripted implementation, not of the
product. A real model behind the seam (§13.3) cannot promise bit-identical output and does not need
to; what the firm must be able to do is audit what the run saw and what it proposed. The
recorded-run requirement is the durable form of that; determinism remains a property of the
deterministic provider only.)*

**The runs the platform should support.** Scanning sources for newly-issued instruments and raising them
as regulatory changes with owner alerts · proposing clause-to-control mappings · watching control status
and chasing owners · assembling a pack.

---

### 5.30 Administrative configuration change

**Purpose.** A platform that manages compliance must govern its own configuration, because the fastest
way to make a red number go green is to change what red means.

**Trigger.** An administrator changes any platform configuration.

**Steps.**

| # | Actor | Action | Resulting state | Gate |
|---|---|---|---|---|
| 1 | Administrator | Change a configuration item — a threshold, a maker-checker rule, a department head, a retention policy, a connected system, a user's role | `Submitted` | Configure authority |
| 2 | Checker | Approve | Applied | **SoD** |
| 3 | System | Write the change to the audit log with the before value, the after value, the actor and the timestamp | Logged | — |

**What is configurable** is set out in §14. **What must never be configurable** is set out there too, and
the most important entry is that the audit log itself cannot be edited, cleared or shortened below its
retention floor by anyone, including the administrator.
---

## 6. Business Rules

This is the catalogue of rules the system enforces. It exists so that a development team does not have
to infer the rules from the workflows, and so that a test team can write a case per rule.

**How to read a rule.** Each carries a stable identifier, a statement written so that it can be
evaluated as true or false, the reason it exists (usually the specific failure it prevents), and where
it is enforced. Identifiers are stable across versions of this document; a rule that is later withdrawn
keeps its number and is marked withdrawn rather than being reused.

**A rule is not a preference.** Everything in this section is load-bearing. Where a rule is a
customer-configurable policy rather than a platform invariant, it says so and points to §14.

### 6.1 Authority and separation of duties (`BR-AUT`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-AUT-01` | Every governed action resolves through **one** central authority check. No screen performs its own role comparison. | Authority scattered across screens is how a system acquires the one screen that lets a maker approve their own filing. | Every action; §4.10 is the complete list |
| `BR-AUT-02` | Clause authority — accepting a clause as tracked, engaging a specialist, or setting applicability — is granted by **department** (Compliance and Company Secretarial), not by role. | Four people hold the Compliance Manager role; only two sit in the accountable function. Gating on role alone would hand the DPO and the Head of Investment Compliance an authority they do not hold. | Clause pipeline (5.1, 5.2) |
| `BR-AUT-03` | A role that is not listed for an action cannot perform it, and the affordance is not merely hidden — the action is refused. | Hiding a button is presentation; refusing the action is control. | Every action |
| `BR-AUT-04` | The checker on a record is **nominated at creation**, before the work is done. | The trail must show who was *supposed* to check, not only who did. A checker chosen at the moment of approval is a checker chosen for convenience. | Maker-checker pattern (5.7) |
| `BR-AUT-05` | The person who submits an item may **never** approve it. | Separation of duties. This is the platform's single most important control. | Every approval action |
| `BR-AUT-06` | The separation rule applies to every sign-off on another person's work, whatever the verb: approving a filing or a treatment plan, accepting a risk, approving **or renewing** an exception, filing a regulator notification, closing an investigation, unsealing an identity, and approving a pack narrative. | Renewing a deviation is the same decision as granting it; filing to a regulator on someone else's investigation is a sign-off. Naming only the actions called "approve" leaves the rest open. | §4.11 |
| `BR-AUT-07` | An owner may not accept their own risk. | Accepting exposure is precisely the decision that needs a second pair of eyes. | Risk acceptance (5.13) |
| `BR-AUT-08` | Administrative configuration changes are themselves maker-checked and logged. | A platform that manages compliance cannot have an unaudited back door. | Configuration (5.30) |
| `BR-AUT-09` | The Administrator's visibility of every department confers no additional operational authority. | Breadth of sight is not breadth of authority; the administrator configures, they do not approve filings or accept risks. | §4.8, §4.10 |
| `BR-AUT-10` | *Configurable (§14).* The customer may require a checker to sit in a different line of defence from the maker, and may bar the owner of a control from raising the working paper that tests it. | "Not the same person" is the floor, not the ceiling. A first-line colleague rubber-stamping a first-line filing satisfies the letter and defeats the purpose. | Configuration; §21 records the policy decision |
| `BR-AUT-11` | *(v2.1)* Exception renewal authority escalates with the renewal count: the second renewal requires the Executive, and every renewal beyond the second is reported by name in the Audit Committee pack. Thresholds are configurable (§14); the escalation's existence is not. | An exception renewed repeatedly is a permanent decision the firm has not admitted to; escalating the authority forces the admission. | Exception renewal (5.14) |

### 6.2 Scope, visibility and confidentiality (`BR-SCP`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-SCP-01` | A record's department is **derived from its owner's department**, never stored separately. | A stored department drifts from the org chart the moment someone moves team. | Access layer |
| `BR-SCP-02` | A user sees records owned within their own department. Compliance and Company Secretarial, and the Administrator, see all departments. | Holding the whole obligation picture is the compliance function's job; everyone else works a smaller set. | List, register, calendar and queue surfaces |
| `BR-SCP-03` | The department boundary applies to **discovery** surfaces, not to navigation. A detail page remains reachable by direct link and command search. | Scoping navigation would break the connected model — a cross-reference that dead-ends is worse than a wide list. | Access layer |
| `BR-SCP-04` | A scoped surface states which scope it is showing. | A short list must never be mistaken for an empty world. | Scope banner |
| `BR-SCP-05` | Access to a restricted investigation is decided by **person**, not by role, and a persona switch never opens a case the person is not on. | The whole point of the ethics office being a named list is that impersonating a role does not grant access to it. | Case access check |
| `BR-SCP-06` | **Recusal beats clearance.** A person recused from a case cannot open it whatever their role and whatever list they are on. | A conflicted senior person is the exact failure mode an ethics channel exists to survive. | Case access check |
| `BR-SCP-07` | Recusal is **computed**: anyone named in an allegation, and anyone leading the department the allegation points at, must stand down. | Leaving recusal to good manners is how it fails to happen in the cases that matter most. | Case access check |
| `BR-SCP-08` | A case a user may not open is still **counted** for them. | Pretending a sealed case does not exist would let open-report counts be understated to the very committee that must oversee them. | Case list surfaces |
| `BR-SCP-09` | Case-restricted work is filtered out of the personal queue **at source**. | Otherwise the queue becomes the leak the case page prevents. | Queue assembly (5.28) |

### 6.3 Evidence (`BR-EVD`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-EVD-01` | A duty may not be marked complete without evidence attached. | "Done but not documented" is the single most painful real-world finding, and the structure is what prevents it. | Task submission (5.4) |
| `BR-EVD-02` | Evidence moves `Submitted → Verified`, and verification is performed by someone other than the person who attached it. | An artifact nobody checked is a claim, not proof. | Evidence workflow (5.6) |
| `BR-EVD-03` | Automatically captured evidence still requires a verification act before it counts toward completing a duty. | The feed proves the system ran; a person attests that it proves the duty. | Evidence workflow |
| `BR-EVD-04` | Evidence is linked to the task, the obligation, the control and the framework references it satisfies — captured once, reachable from every direction. | Re-gathering proof per regulator produces several slightly different stories, which is worse than being late. | Evidence linkage |
| `BR-EVD-05` | Evidence captured on another person's behalf records both people. | Attribution is what makes an artifact defensible. | Evidence workflow |
| `BR-EVD-06` | Where guidance exists for a duty, the platform shows what good proof looks like **before** the maker attaches anything. | Most bad evidence is not dishonest; it is someone guessing what was wanted. | Task screen |
| `BR-EVD-07` | Generated text is never evidence. | An auditor tests the artifact, not the system's assertion about it. | §13; also `BR-AI-04` |

### 6.4 Scheduling, recurrence and clocks (`BR-SCH`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-SCH-01` | Every deadline in the firm — a filing, a review, an incident-reporting window, an expiry — appears on **one** calendar. | A user must never have to assemble the firm's obligations from several calendars. | Calendar and clocks surfaces |
| `BR-SCH-02` | Approving a recurring duty schedules the next cycle automatically, at the cadence, from the later of this cycle's due date and today. | A firm should never re-create a duty it performs every month. | Recurrence (5.5) |
| `BR-SCH-03` | Event-based, continuous and daily duties are **not** auto-scheduled. | Their next occurrence is not a function of the calendar; generating one would be a fiction. | Recurrence |
| `BR-SCH-04` | A cycle is **on time** if filed on or before its due date, otherwise **late**. There is no grace band. | One definition of "on time", used by every metric and every report. | Cycle timing |
| `BR-SCH-05` | Generating the next cycle never closes a missed one. | Otherwise a firm outruns its own failures. | Recurrence |
| `BR-SCH-06` | An incident's regulator clocks start at **detection**, not at the time someone opened the record. | The regulator's clock does not wait for the firm's process. | Incident (5.10) |
| `BR-SCH-07` | Where a reporting duty is triggered by a later discovery — personal-data involvement found after the fact — that clock starts at the time of that discovery, and the divergence from the detection time is recorded explicitly. | This is the most legally sensitive clock-start rule in the platform; it must be visible and defensible, not implicit. *Configurable per regulator (§14).* | Incident |
| `BR-SCH-08` | A breached clock stays visible as breached and is never cleared by closing the record. | A missed regulatory deadline is itself a reportable failure. | Incident, fraud |
| `BR-SCH-09` | All times are held unambiguously and displayed in the organization's operating time zone with the zone shown. | A six-hour clock is not a place for time-zone ambiguity. | Formatting layer |

### 6.5 Reminders and escalation (`BR-ESC`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-ESC-01` | The ladder is fixed: reminders to the owner at 7, 3 and 1 days before due; escalation at 1 day overdue to the owner and their line manager, at 3 days to the Compliance Officer, at 7 days to the CRO. | One ladder the whole firm understands, rather than per-module cadences nobody can predict. *The intervals are configurable (§14); the existence of the ladder is not.* | Reminder engine (5.27) |
| `BR-ESC-02` | There is exactly **one** reminder engine. Any module needing chasing points it at its own deadline. | Six alerting mechanisms that disagree is the outcome this prevents. | Platform-wide |
| `BR-ESC-03` | Every fired reminder and escalation is written to the audit log and surfaced on the record, in notifications and in the queue. | The firm must be able to **prove** it chased, not merely assert it. | Reminder engine |
| `BR-ESC-04` | Escalation targets resolve to real named people via the department-head map. | "Escalated to the line manager" must name someone or it is not an escalation. | Reminder engine |
| `BR-ESC-05` | Only active items carry a live ladder; a completed duty is not chased. | Noise destroys the credibility of the signal. | Reminder engine |
| `BR-ESC-06` | Multi-step duties chase **per step**, each on its own due date and to its own owner. | A three-party payroll chain has three accountable people, and chasing only the first is chasing nobody. | Task ladder |
| `BR-ESC-07` | Expiry chasing uses the same ladder pointed at the expiry date, with a longer warning window where the review cadence is longer — thirty days for a risk acceptance, sixty for an independent assurance report, seven for a control exception. | An annual instrument needs a renewal in motion months before a short-lived deviation does. | Exceptions, acceptances, third parties |

### 6.6 Derived values (`BR-DRV`)

Every value here is **computed on read, never stored**. A stored copy that duplicates a derivable fact
is a future lie. These definitions are normative — §10 restates the reporting-facing ones as metric
definitions.

| ID | Derived value | Definition | Why it must not be stored |
|---|---|---|---|
| `BR-DRV-01` | **Risk workflow stage** | From the risk's lifecycle record: acceptance, approval state, review outcome, and the status and evidence of its remediation actions. | The register and the detail page read the same function, so they cannot disagree. |
| `BR-DRV-02` | **Indicator band** | From the reading, the thresholds and the **direction**. For *higher-is-worse*, green is a ceiling; for *lower-is-worse*, green is a floor. | An indicator must never read green while its number sits in the red zone. |
| `BR-DRV-03` | **Third-party risk tier** | From the arrangement's current attributes — criticality, material services, criticality mismatch, personal-data classes and the data-processing agreement, assurance currency, diligence currency, exit-plan documentation and testing, right to audit, fourth parties, jurisdiction, linked incidents — with **every point attributed**. | A register that lets someone type "Low" next to a material outsourcing with lapsed assurance is the thing this avoids. Attribution lets the tier be argued with rather than merely believed. |
| `BR-DRV-04` | **Net loss** | Gross loss minus recoveries, floored at zero. | The incident list, the detail and any period roll-up cannot disagree; and a recovery cannot become a gain. |
| `BR-DRV-05` | **Aggregate residual per domain** | The mean residual of the **worst fifth** of risks in the domain (minimum three), reported on the same scale as an individual residual. | Averaging lets a long tail of trivial risks mask a handful of severe ones. Tail-weighting is the point. |
| `BR-DRV-06` | **Appetite status** | Comparison of the aggregate against the board-approved tolerance band: at or above the red threshold is *outside appetite*; above green is *at tolerance*; otherwise *within appetite*. | Policy (the board's decision) and measurement (the register's state) must stay separable, meeting only in the derived status. |
| `BR-DRV-07` | **Residual at a past instant** | Reconstructed from the risk's own remediation record: add back the reduction of every action completed after that instant, capped at inherent. | This is why the exposure trend is real rather than seeded — it is the register's own history read backwards. |
| `BR-DRV-08` | **Exception / acceptance / assurance expiry state** | `Active`, `Expiring soon`, `Expired` or `Closed`, from the expiry date and the applicable warning window. | Governance by expiry only works if expiry actually bites. |
| `BR-DRV-09` | **Monitoring rule status** | `Passing` when the whole population passes; `Failing` when items fail; **`Degraded` when the feed is unavailable**. | A rule that cannot see its population must never report success. |
| `BR-DRV-10` | **Campaign progress and task status** | From the tasks: submitted, reviewed, overdue against the campaign's due date. | A stored status can otherwise claim a cycle is complete while tasks are open. |
| `BR-DRV-11` | **Audit plan delivery and quarter coverage** | From the plan entries and the audits actually performed. | The committee must see coverage, not intentions. |
| `BR-DRV-12` | **Issue age** | From the raise date to now, or to resolution. | Ageing is the number the Audit Committee asks for; it cannot be a field somebody forgot to update. |
| `BR-DRV-13` | **Attestation rate** *(UI label renamed from "attestation coverage" in v2.1; rule id unchanged)* | Responses whose recorded version equals the policy's **current** version, over the population. | "94% attested" against a superseded version is the failure this prevents. |
| `BR-DRV-14` | **Projected residual** | Current residual minus the reduction still to be banked by open remediation actions, floored at the minimum. | A plan that is behind cannot present itself as a plan that is done. |
| `BR-DRV-15` | **Proactive detection rate** | The share of fraud cases found by the firm's own controls rather than by complaint or an external party. | A book where the controls are not the ones finding it has a control problem, not just a fraud problem. |
| `BR-DRV-16` | **Worst band per risk** | The worst band across the indicators attached to the risk. | One amber among greens must not be averaged away. |
| `BR-DRV-17` | *(v2.1)* **Overdue, on anything** | A dated item reads overdue when its due date has passed and its state is not terminal — computed from the date against the current instant. Never a stored state, on any object: obligation cycles, tasks, campaign tasks, remediation actions, diligence, reviews. | A stored Overdue is stale the moment the clock ticks or the deadline is amended; v2.0 carried it as a state by inheritance from the prototype. |
| `BR-DRV-18` | *(v2.1)* **Trend series and deltas** | A trend point is the metric's own normative definition evaluated at a past instant over dated records; the final point of every series equals the live value, produced by the same function as the tile it sits under. No series, headline delta or trend arrow is ever stored, hand-set or synthesized. | The prototype fabricated its cockpit trends from a seeded RNG and hard-coded its deltas ("+0.3 QoQ"); a synthesized curve in front of a committee is a fabricated record. |

### 6.7 Lifecycle and transitions (`BR-LFC`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-LFC-01` | Only the transitions in §7 are legal. Any other transition is refused, not silently permitted. | A state machine that is advisory is not a state machine. | Every lifecycle |
| `BR-LFC-02` | Superseding an instrument never carries the previous version's clause decisions forward. Prior decisions are preserved against the prior version and remain visible through the supersession link. | A decision made about different words is not a decision about these words. | Source pipeline (5.1) |
| `BR-LFC-03` | A risk treatment plan cannot reach `Awaiting approval` while a remediation action is open. | The execution layer is the gate; otherwise a plan is approved on the strength of its intentions. | Risk lifecycle (5.12) |
| `BR-LFC-04` | An **expired risk acceptance is not "accepted"** — it is an open exposure that reads as such and escalates. | Governance by expiry only works if expiry bites. | Risk acceptance (5.13) |
| `BR-LFC-05` | An incident may not close while a required regulator track is unfiled. | Closing the record does not discharge the duty. | Incident (5.10) |
| `BR-LFC-06` | An attestation is recorded **against a version**; a new version does not inherit prior acknowledgements. | See `BR-DRV-13`. | Attestation (5.17) |
| `BR-LFC-07` | An audit finding cannot close on the owner's assertion; closure requires the auditor to verify the remediation. | Self-certified remediation is how repeat findings are born. | Audit (5.21) |
| `BR-LFC-08` | A regulatory change cannot close while an impacted record is unacknowledged. | Otherwise "closed" means "we stopped looking". | Reg change (5.3) |
| `BR-LFC-09` | Every decision state — including "not applicable", "no impact", "unsubstantiated" and "not reportable" — is recorded with an actor, a timestamp and a basis. | A negative decision is still a decision, and it is exactly what an inspector asks about. | Platform-wide |
| `BR-LFC-10` | A returned item carries the reason for its return as part of the record. | A rejection without a reason cannot be acted on or reviewed. | Maker-checker (5.7) |
| `BR-LFC-11` | A failing control test raises a remediation issue automatically; nobody has to remember. | A failure that depends on being noticed is a failure that will not be. | Control test (5.8), monitoring (5.9) |
| `BR-LFC-12` | A speak-up report is closed only with an outcome and substantive feedback owed to the reporter — including where the allegation did not stand up. | A channel that goes silent after "received" is a channel nobody uses twice. | Speak-up (5.24) |
| `BR-LFC-13` | *(v2.1)* An expired exception enters review and is itself the open exposure: it reads as expired in the union register, escalates on the standard ladder until closed, renewed or converted to an accepted risk — and **no issue is auto-created on expiry**. An undecided expiry never goes quiet. | Spawning a shadow issue would split one exposure across two lifecycles and let the exception read as merely "expired" while a clone carries the heat; silence would let expiry stop biting. | Exception register (5.14) |

### 6.8 Linkage and provenance (`BR-LNK`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-LNK-01` | Every obligation and control traces back to a source clause, or to a policy that itself traces to a clause. | "Why does this duty exist" must be answerable from the system. | Proof chain |
| `BR-LNK-02` | Every clause resolves forward to everything it produced: controls, obligations, tasks and evidence. | "What did this law produce" must be answerable from the system. | Reverse lookup |
| `BR-LNK-03` | The proof chain renders identically from whichever record the screen is about. | Per-screen drift in the central spine destroys confidence in the model. | Shared chain component |
| `BR-LNK-04` | A control may satisfy many clauses across many instruments, and the control's own page groups them **by act**. | This is the visible proof of "map once, satisfy many"; grouping by act is what makes the many-to-many legible. | Control detail |
| `BR-LNK-05` | Every detail screen offers a cross-reference panel showing where the record also appears. | The thesis is that these are the same records seen from different angles; the panel is where that becomes literal. | Every detail screen |
| `BR-LNK-06` | Remediation from any source lands in the **one** remediation register. *(v2.1)* The register is a union view over Issues and Exceptions: two entities, one place to look, nothing invisible. | A private to-do list per module is how findings get lost between them; the union preserves that guarantee without fusing a weakness's lifecycle with a governed deviation's. | Issues (5.22), exceptions (5.14) |
| `BR-LNK-07` | Losses from any source book into the **one** loss engine on the standard categories. | Comparability with the industry and acceptability to a regulator. | Loss capture (5.11) |
| `BR-LNK-08` | A substantiated investigation pushes its outcome into the risk register. | A case that changes nothing is noise. | Fraud (5.23), speak-up (5.24) |
| `BR-LNK-09` | Converting a speak-up report to a fraud case carries **the reference code and nothing else**. | The conversion must not become the leak. | Speak-up (5.24) |
| `BR-LNK-10` | Deleting or archiving a record never orphans the records that cite it; provenance survives. | An audit trail with holes in it is not an audit trail. | Data layer |

### 6.9 Audit trail (`BR-AUD`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-AUD-01` | Every action that changes a record writes one audit entry: actor, action, object, timestamp, and where relevant the before and after values. | This is the record the firm defends itself with. | Every mutation |
| `BR-AUD-02` | The log is **append-only and tamper-evident**. No user, including the administrator, can edit or delete an entry. | A log that can be quietly altered proves nothing. | Data layer |
| `BR-AUD-03` | System-originated events — fired reminders, escalations, monitoring runs, agent runs — are logged with the system as actor. | "The system chased them" must be provable. | Reminder and agent engines |
| `BR-AUD-04` | Each entry links to the records involved so the trail is navigable, not just readable. | An inspector reads the trail by following it. | Audit log surface |
| `BR-AUD-05` | For confidential modules, the log records **the act and never the content**. | The trail must not become the disclosure the module prevents. | Speak-up, fraud |
| `BR-AUD-06` | An action applied from an agent proposal names the run that proposed it. | The firm must be able to audit its automation. | Agent apply (5.29) |
| `BR-AUD-07` | The log is readable by the second and third lines, not only by the administrator. | Assurance over the platform is part of assurance over the firm. | §4.9 |

### 6.10 Assistive and agentic intelligence (`BR-AI`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-AI-01` | An agent run **never mutates state**. It returns findings and proposals. | The system proposes; a human disposes. | Agent engine (5.29) |
| `BR-AI-02` | Approving a proposal performs the **existing** governed action, through the same authority check and audit entry a person would trigger. There is no agent-only path. | An agent must never be able to do something a person could not. | Agent apply |
| `BR-AI-03` | An extracted or inferred figure is marked **unverified** until a person confirms it, and an unverified clause cannot be saved to a control. | The extraction is a draft of the law, not the law. | Ingestion (5.2) |
| `BR-AI-04` | Generated text is never evidence. The assistant may summarize an artifact; the artifact remains the proof. | An auditor tests the artifact. | Evidence, packs |
| `BR-AI-05` | Every recommendation is displayed as a recommendation, with a confidence indicator and the basis it rests on, and a rejected recommendation stays on the record. | An assistant whose bad suggestions disappear cannot be assessed. | Every assistive surface |
| `BR-AI-06` | Assistive answers are scoped to the record in hand and the user's own access; the assistant may not surface what the user could not open. | Otherwise the assistant becomes the access bypass. | Assistive panel |
| `BR-AI-07` | Where intelligent features materially aid a decision about an individual, the heightened diligence the data-protection regime expects applies. | Legal requirement, and a design constraint on where automation is appropriate at all. | §13, §16 |

### 6.11 Data handling, retention and privacy (`BR-DAT`)

| ID | Rule | Why | Enforced at |
|---|---|---|---|
| `BR-DAT-01` | Personal identifiers of data principals are displayed **masked** by default; unmasking is a governed, logged action. | The platform holds subscriber data and must not casually render it. | Presentation layer |
| `BR-DAT-02` | The reporter's identity in the speak-up channel **is not stored**; only a reference code and, where applicable, a sealed custody note. | You cannot leak what you do not hold. | Speak-up data model |
| `BR-DAT-03` | Retention rules are held per data store and enforced; erasure that conflicts with a statutory retention rule is refused with the rule cited. | This collision is the normal case at a regulated firm, and the refusal with its basis is the deliverable. | Data governance (5.25) |
| `BR-DAT-04` | Where the law requires it, data stays within the jurisdiction. The split-plane deployment in §15 exists for this. | Residency is a legal requirement, not a preference. | Deployment |
| `BR-DAT-05` | The audit log has a retention floor below which it cannot be shortened, by anyone. | The log's value is precisely that it outlives the convenience of the people it records. | Configuration (§14) |
| `BR-DAT-06` | Export of a register carries the same access scope as the screen it came from. | An export is the easiest way to defeat an access model. | Export |
---

## 7. Domain Objects and State Models

This section is a business-level catalogue of the things the platform manages. It is **not** a data
schema: it names no fields, no types and no storage. What it does give the build team is what a
narrative cannot — the identity, ownership, lifecycle and cardinality of each object, so that two
developers reading two different sections build the same model.

### 7.1 The object catalogue

Identifier examples follow the v2.1 conventions of §7.4: **catalogue records** carry
`TYPE-NNNNN` (no year), **event records** carry `TYPE-YY-NNNN`, nothing exceeds 11 characters, and
no identifier carries meaning — meaning lives in the record's `title`, its required `shortTitle`,
and its own fields.

| Object | What it is | Identifier (example) | Owned by | Lifecycle |
|---|---|---|---|---|
| **Source instrument** | A legal instrument: act, rules, regulation, master circular, notification, direction, standard or circular | `INST-024` | Compliance | In force · Superseded · Draft · Repealed |
| **Source clause** | One provision within an instrument — **the atomic unit**; its `citation` field carries the legal reference | `SRC-00231` | Compliance | Processing · Recommended · Saved · Specialist review · Not applicable |
| **Policy** | An internal instrument the firm binds itself to | `POL-046` | A named policy owner | Draft · In review · Published (versioned) |
| **Control** | The measure that satisfies duties; the reusable unit of "map once, satisfy many"; framework references are fields on the control, never part of its id | `CTRL-0273` | Control owner | Continuous; each test yields Pass · Partial · Fail |
| **Obligation** *(v2.1: the standing duty)* | The duty itself — regulator or internal basis, owner, checker, **frequency**, provenance. It does not have a due date; its cycles do | `OBL-0142` | First-line owner | Active · Retired (retirement is governed) |
| **Obligation cycle** *(v2.1: the instance)* | One period's performance of the duty, with the due date, the tasks and the on-time record | `<dutyId>.<period>` (`OBL-0142.2026-06`) — **never rendered inline**; lists show the duty id with a period column | Cycle inherits the duty's owner | Due · In review · Filed (`Overdue` derived, `BR-DRV-17`) |
| **Task** *(v2.1: the general work item)* | One unit of work with maker, checker, deadline and a `completionPolicy` (`simple · acknowledge · evidence · maker-checker`); used by obligations, remediation, campaigns, DSAR stages and attestations | `TSK-01847` | Maker | Open · InProgress · Submitted · Returned · Done · Cancelled (`Overdue` derived; display labels vary by policy) |
| **Evidence** | The artifact proving a task ran or a control operated | `EVD-00649` | Capturer (person or feed) | Submitted · Verified |
| **Risk** | Something that could prevent the firm meeting its objectives | `RISK-0140` | Risk owner | See §7.3 |
| **Remediation action** | A dated, owned step in a risk treatment plan, carrying the residual reduction it will bank | `ACT-0312` | Action owner | Not started · In progress · Done |
| **Key risk indicator** | A measured number with thresholds and a direction, attached to a risk | `KRI-027` | Indicator owner | Reading history; band derived Green · Amber · Red |
| **Incident** | A realized event requiring response and, often, regulatory notification | `INC-26-0411` | Responder | Open · Contained · Closed |
| **Regulator track** | One regulator's reporting duty arising from one incident or case, with its own clock | (child of incident/case) | Compliance | Pending · Drafted · Filed · Breached |
| **Loss event** | The financial consequence of an incident or fraud, on the standard categories | (child) | Finance / responder | Gross → recovery → net (derived) |
| **Issue** | A tracked **weakness** needing remediation, from any source | `ISS-26-0233` | Remediation owner | Open · In progress · Resolved |
| **Exception** *(v2.1: first-class)* | An approved, time-boxed, compensated **deviation** from a control or an obligation (its subject); optionally linked to the issue that prompted it | `EXC-26-041` | Requester | Requested · Active · Expiring soon · Expired · Converted · Closed (5.14) |
| **Audit** | An assurance engagement | `AUD-26-004` | Internal audit | Planned · In progress · Reporting · Closed |
| **Audit plan entry** | One line of the risk-based annual plan | `APE-26-016` | Head of audit | Planned · In progress · Complete · Deferred |
| **Working paper** | The record of one test performed during fieldwork | `WPR-26-0124` | Auditor | Pass · Fail · Not applicable |
| **Audit finding** | A conclusion from a failed test | `FND-26-027` | Auditor | Open · In remediation · Closed |
| **Regulatory change** | An incoming change to the law or a regulator's expectations | `RCM-26-118` | Compliance | Assessed · In progress · Closed |
| **Data asset** | A store holding personal or regulated data | `DAS-00120` | Data owner | Inventory record; classification and retention rule |
| **Data-subject request** | A request from a data principal | `DSR-26-014` | DPO | Stepwise: 5 stages for erasure, 3 otherwise; each stage is a Task (`simple`) |
| **Third party** | An outsourcing or supply arrangement | `VND-024` | Relationship owner | Onboarding · Active · Under review · Terminated |
| **Campaign** | A fanned-out cycle: assessment, attestation or due diligence | `CMP-008` | Campaign owner | Open · In review · Closed |
| **Campaign task** | One assignee's response within a campaign — a Task whose `completionPolicy` follows the campaign type (`maker-checker` for assessment and diligence, `acknowledge` for attestation) | (a Task) | Assignee | The Task lifecycle; `Overdue` derived (`BR-DRV-10`) |
| **Speak-up report** | A disclosure through the vigil mechanism | `WBR-26-008` (reference code) | Ethics office | Received · Acknowledged · Under triage · Investigation · Awaiting outcome · Remediation · Closed · Rejected |
| **Fraud case** | An investigation into suspected fraud | `FRD-26-005` | Investigator | Reported · Triage · Investigation · Recovery & action · Closed |
| **Committee** | A board committee with a cadence, quorum, membership and chair | — | Company Secretary | Standing record |
| **Pack** | An issued committee or board report composed from live queries | `PCK-26-012` | Preparer | Composed · Narrative drafted · Approved · Issued |
| **Person** | A named individual with a title, department, line of defence and one or more roles | — | Administrator | Active · Away · Invited · Suspended |
| **Audit entry** | One immutable line of the platform's own trail | Numeric sequence (internal; navigated, not quoted — exempt from the display convention) | System | Append-only |

### 7.2 Cardinality — how the objects connect

The relationships that matter, stated as constraints rather than as prose:

| Relationship | Cardinality | Note |
|---|---|---|
| Instrument → clause | 1 : many | An instrument with no clauses is not yet worked through |
| Clause → control | many : many | The heart of "map once, satisfy many" |
| Clause → obligation | 1 : many | One provision can create several duties (a filing and a register, say) |
| Policy → control | 1 : many | Policies are operationalized by controls |
| Policy → clause | many : many | A policy typically derives from several provisions |
| Control → framework reference | 1 : many (typically 2–4) | The many-to-many made visible as framework mappings |
| Control ↔ obligation | many : many | One control satisfies many duties, and one duty may require several controls acting together (v2.1 ruling) |
| Obligation → obligation cycle | 1 : many | The standing duty and its per-period instances (5.5); the on-time ledger is the cycle rows |
| Obligation cycle → task | 1 : many (at least 1) | A single-action duty has exactly one task per cycle, so the model is uniform |
| Task → evidence | 1 : many (at least 1 to complete, where the policy is `evidence` or `maker-checker`) | `BR-EVD-01` |
| Control → evidence | 1 : many | Evidence is reachable from both the task and the control |
| Risk → control | many : many | Controls mitigate risks; one control mitigates several |
| Risk → remediation action | 1 : many | |
| Risk → indicator | 1 : many | Worst band rolls up (`BR-DRV-16`) |
| Risk → incident | many : many | An incident realizes one or more risks |
| Incident → regulator track | 1 : many | Determined by the incident's shape, not chosen |
| Incident → issue | 1 : many | |
| Incident → loss event | 1 : 0..1 | |
| Audit → finding | 1 : many | |
| Finding → issue | 1 : 1 | Every open finding has exactly one remediation issue |
| Exception → subject (control or obligation) | 1 : 1 | *(v2.1)* The deviation is always *from* something nameable |
| Exception → issue | 1 : 0..1 | *(v2.1)* A proactive exception has no surfaced issue, and that is a first-class path (5.14) |
| Working paper → finding | 1 : 0..1 | A failed paper that produced no finding is surfaced as an exception (5.21) |
| Regulatory change → obligation / control / policy | 1 : many | The impact set |
| Campaign → task | 1 : many (one per in-scope object) | |
| Campaign task → object (risk / policy / third party) | 1 : 1 | |
| Third party → service | 1 : many | Criticality is per service as well as per arrangement |
| Third party → assurance report | 1 : many | The one in force is the latest-expiring |
| Speak-up report → fraud case | 1 : 0..1 | Conversion carries the reference code only (`BR-LNK-09`) |
| Pack → evidence | 1 : 1 | The issued pack is evidence against the meeting obligation |
| Any record → audit entries | 1 : many | |

### 7.3 Consolidated state models

The legal transitions. Anything not listed is refused (`BR-LFC-01`).

**Source clause**
```
Processing → Recommended
Recommended → Saved | Specialist review | Not applicable
Specialist review → Recommended
Not applicable → Recommended            (only on a new instrument version)
Saved → (terminal for this version)
```

**Obligation (the standing duty)** — `Active → Retired` (retirement is a governed act; retired
duties leave the live denominators but keep their history).

**Obligation cycle**
```
Due → In review → Filed
In review → Due                          (checker returns)
Filed → (terminal; the next cycle is a new instance, 5.5)
```
`Overdue` is derived (`BR-DRV-17`), never a stored state.

**Task (the general work item — one machine, gated by `completionPolicy`)**
```
Open → InProgress → Submitted → Done
Submitted → Returned → InProgress        (return reason recorded, BR-LFC-10)
Open → Done                              (policy `simple` or `acknowledge` only)
any non-terminal → Cancelled             (governed)
```
Policy gates: `evidence` — `Done` (and `Submitted`) require ≥1 attached evidence (`BR-EVD-01`);
`maker-checker` — `Submitted → Done` is performed by the nominated checker only (`BR-AUT-05`);
`acknowledge` — `Done` is the acknowledgement act; `simple` — no gate. Display labels vary by
policy (*Verified*, *Acknowledged*, *Approved*) over these stored states. `Overdue` is derived.

**Maker-checker (any record)**
```
Drafted → Submitted → Approved
Submitted → Returned → Drafted
```
For tasks these are projections of the task states (5.7); records that are not tasks carry them
directly.

**Evidence**
```
Submitted → Verified
```

**Risk**
```
Identified → Assessed → Treatment planned → In execution → Evidenced
Evidenced → Under review → Awaiting approval → Monitoring
Awaiting approval → Treatment planned     (returned)
Monitoring → Closed                       (residual at or below target and mitigated)
Assessed | Treatment planned → Accepted   (5.13; bypasses execution)
Accepted → Acceptance lapsed              (on expiry with no decision; open exposure, escalating)
Accepted → Treatment planned              (converted back)
Acceptance lapsed → Accepted              (renewed) | Treatment planned
```
*(v2.1: `Acceptance lapsed` was `Exception expired` in v2.0 — renamed to avoid colliding with the
first-class Exception entity. A lapsed acceptance creates no Exception record; the risk itself is
the exposure.)*
Gate: `Awaiting approval` is unreachable while any remediation action is open (`BR-LFC-03`).

**Remediation action**: `Not started → In progress → Done`.

**Incident**
```
Open → Contained → Closed
```
Gate: `Closed` is unreachable while a required regulator track is unfiled (`BR-LFC-05`).

**Regulator track**: `Pending → Drafted → Filed`; independently, `Pending | Drafted → Breached` when
the deadline passes, and `Breached` is sticky (`BR-SCH-08`).

**Issue**: `Open → In progress → Resolved`.

**Exception** *(v2.1, 5.14)*: `Requested → Active → Expiring soon → Expired`; `Active | Expiring
soon | Expired → Closed`; `Expired → Active` on renewal (count incremented, authority escalating
per `BR-AUT-11`); `Expired → Converted` on conversion to a risk acceptance. `Expiring soon` and
`Expired` are derived from the expiry date (`BR-DRV-08`). An `Expired` exception is under review
and escalating; there is no quiet terminal state for an undecided expiry (`BR-LFC-13`).

**Audit**: `Planned → In progress → Reporting → Closed`.
**Audit plan entry**: `Planned → In progress → Complete`; `Planned → Deferred`.
**Finding**: `Open → In remediation → Closed` — closure requires auditor verification (`BR-LFC-07`).

**Regulatory change**: `Assessed → In progress → Closed` — gated on acknowledgement (`BR-LFC-08`).

**Campaign**: `Open → In review → Closed`.
**Campaign task**: a Task (above) with the campaign type's `completionPolicy`; *Assigned* is the
task's `Open` and *Approved* its `Done`, and `Overdue` is derived, not stored (`BR-DRV-10`).

**Third party**: `Onboarding → Active → Under review → Active`; `Active | Under review → Terminated`.

**Speak-up report**
```
Received → Acknowledged → Under triage → Investigation → Awaiting outcome → Remediation → Closed
Under triage → Rejected
```
Gate: `Closed` requires an outcome and substantive feedback (`BR-LFC-12`).

**Fraud case**: `Reported → Triage → Investigation → Recovery & action → Closed`.

**Data-subject request**: a monotonic step counter — five stages for erasure, three otherwise;
complete when the counter reaches the total.

**Pack**: `Composed → Narrative drafted → Approved → Issued`.

### 7.4 Identifiers and record naming *(rewritten in v2.1)*

Identifiers are user-facing. People quote them in emails, in committee minutes and to regulators, so
they must be **short, typeable and stable — and carry no meaning**. v2.0 asked for "a meaningful
middle segment"; that was demo readability promoted into a convention, and it failed in practice:
semantic identifiers grow unboundedly (`SRC-PFRDA-INV-COMMITTEE`, 23 characters, broke every table
it appeared in), they encode facts that change (a control's framework, a duty's regulator), and
they duplicate what the record's own fields already say. The v2.1 conventions:

- **Two patterns, nothing else.**
  - **Catalogue records** — things that persist and accumulate — carry `TYPE-NNNNN` with **no
    year**: `SRC-00231`, `CTRL-0273`, `OBL-0142`, `TSK-01847`, `EVD-00649`, `RISK-0140`,
    `POL-046`, `VND-024`, `INST-024`, `KRI-027`, `ACT-0312`, `CMP-008`, `DAS-00120`.
  - **Event records** — things that happen in a year — carry `TYPE-YY-NNNN`: `INC-26-0411`,
    `ISS-26-0233`, `EXC-26-041`, `AUD-26-004`, `FND-26-027`, `RCM-26-118`, `FRD-26-005`,
    `WBR-26-008`, `DSR-26-014`, `APE-26-016`, `WPR-26-0124`, `PCK-26-012`.
- **Maximum 11 characters.** Pad widths are chosen per prefix to respect the cap at the §17.1
  volumes.
- **Prefixes are three or four letters.** The former 2-character prefixes are promoted
  (`WB`→`WBR`, `AP`→`APE`, `DA`→`DAS`, `WP`→`WPR`) and `DSAR` contracts to `DSR`.
- **No semantic middle segments.** A risk's domain, a control's frameworks, an obligation's
  regulator and period are fields, filters and columns — never id segments. Meaning lives in the
  title and the record's own fields.
- **The legal reference lives in a `citation` field** (e.g. "PFRDA MC Inv. Guidelines 2025,
  §14.2"), rendered beside the title wherever the law matters. It is display data, not identity.
- **A sequence**, zero-padded so identifiers sort naturally. Identifiers are **never reused**,
  including after deletion.
- **Cycles derive from the duty.** A recurring duty's cycles are identified as
  `<dutyId>.<period>` (`OBL-0142.2026-06`), so the series is visibly one duty over time. The cycle
  id is **never rendered inline** — lists and chips show the duty's id with the period as its own
  column or suffix text.

**Titles do the talking.** Every record carries a `title` (full, unbounded) and a **required
`shortTitle`** of at most 60 characters. Lists, tables, chips and cross-reference panels render the
shortTitle, single-line, truncated with an ellipsis where the column is narrower; detail pages
render the full title. **No list view ever renders the full title.** This pair is what lets the
identifier stay meaning-free without the screens going mute — the id locates the record, the
shortTitle says what it is, the citation says where the law stands.
---

## 8. Screens and UI Surfaces

Each surface below is described by its purpose and its content, not its layout. Every list-style
screen offers search, filtering, sortable columns, saved views, row-click navigation into a detail,
and an export. Every detail screen shows the record, its history, its proof chain, and a
cross-reference panel of "where this also appears".

Two rendering rules apply everywhere *(v2.1)*: record references render as **id + shortTitle**
(§7.4) — lists never render the full title — and every list surface has a **designed empty state**
(§17.4) that says *why* it is empty, because in production an empty register is a legitimate and
frequent condition, not a demo defect.

### 8.1 Navigation

The sidebar is grouped and its order is fixed. What a given persona is offered is set out in §4.9.

- *Pinned top:* **Home — Board Cockpit** · **My Queue**
- **Risk & Control:** Risk Register · Control Library · Continuous Control Monitoring · Policies ·
  Campaigns · Third Parties
- **Incidents:** Incidents · Fraud Cases · Speak-up
- **Compliance:** Obligations · Regulatory Change · Source Library · Sector Pack · Data Governance
- **Audit & Assurance:** Audits · Issues and Remediation · Evidence Vault
- *Pinned bottom:* **Integrations** · **Settings**

### 8.2 The main application

**Board Cockpit (home).** The executive landing. Headline measures, a risk heat map, exposure
against appetite, trend lines, and what needs attention right now — **content, layout and thresholds
per the dashboard design document** (§10.1), which also defines the committee-chair variants. *(v2.1:
the cross-domain activity stream moves to working-persona dashboards; a board surface answers the
board's questions, not "what just happened".)*
*Purpose:* the live posture at a glance, with one click into anything that needs attention.

**My Queue.** The personal, role- and department-scoped task list of 5.28. *Purpose:* tell each person
exactly what is theirs and what to do next.

**Risk Register and risk detail.** The register lists risks by domain with inherent and residual
scores, owner, treatment, workflow stage, indicator breach badges and status. The detail shows the
inherent-versus-residual position on the grid, the treatment plan with its remediation actions and
their evidence, the projected residual, the lifecycle stage ribbon, the review and approval history,
any time-bound acceptance and its expiry, the indicators attached, and the controls, incidents,
issues, third parties and cases connected to it. *Purpose:* a connected risk picture whose ratings
are grounded in consequence and whose stage is derived from the work actually done.

**Risk appetite.** The board-approved tolerance band per domain alongside the live aggregate computed
from the register, the derived status, and the exposure trend reconstructed from the register's own
remediation history. *Purpose:* the third view of the board-reporting triad, next to the heat map and
the top-risk list.

**Control Library and control detail.** The library, headed "map once, satisfy many", lists controls
with their frameworks, the clauses each satisfies, owner, whether continuously monitored, last test,
result and evidence count. The detail shows attributes, the risks mitigated, the **clauses satisfied
grouped by act**, framework mappings, the period-by-period evidence ledger, test history, evidence and
open issues. *Purpose:* make the control the reusable, evidenced unit that satisfies many duties.

**Continuous Control Monitoring and rule detail.** Monitored controls with pass and fail counts and
status; the detail shows the monitored population, the failing items with their age against the
service level, the feed it reads, and the automatic escalation chain — failure, evidence captured,
issue raised, incident linked. *Purpose:* show that monitored controls test themselves and escalate on
their own.

**Policies and policy detail.** Version, owner, approver, next review, mapped controls and the
attestation rate against the current version. The detail shows version history, the approval chain, the
clauses behind the policy, the controls it maps to, and its attestation campaigns. *Purpose:* connect
a policy to the controls and evidence that operationalize it.

**Campaigns and campaign detail.** The cycles: risk and control self-assessment, policy attestation,
and third-party due diligence. The detail shows scope, progress, who is outstanding, the distribution
of outcomes, each response and its review, and the completion certificate. *Purpose:* run periodic
cycles that actually move the registers.

**Third Parties and third-party detail.** The register with the **derived** risk tier, criticality,
assurance state, diligence state and flags. The detail shows services and their criticality, data
access and the processing agreement, assurance reports and expiry, the exit plan and when it was last
tested, sub-outsourcing, the right to audit, jurisdiction, linked incidents, and the **attributed
drivers behind the tier**. A portfolio view shows concentration. *Purpose:* make outsourcing exposure a
computed fact rather than an opinion.

**Incidents and incident detail.** The list by severity, source and status. The detail — the most
worked example in the product — shows classification, the multiple regulator clocks counting down, the
action to draft each regulator report, one unified timeline, affected assets, the control failure that
caused it, the risk it realized, any loss booked, and the evidence trail captured once and reused
across every filing. *Purpose:* run a multi-regulator incident response coherently from one place.

**Regulator Clocks.** One timeline bringing together standing regulatory requirements, live incident
clocks, and upcoming obligation deadlines, all counting down. *Purpose:* one calendar, one clock.

**Fraud Cases and case detail.** The book by scheme, detection method, stage and net loss. The detail
shows the investigation, the regulatory tracks the case's shape engages, the loss and recovery, the
remediation raised, the risk pushed, and the closure with its outcome and actions. Portfolio views
show loss by scheme and by category and the proactive detection rate. *Purpose:* investigate fraud
with the regulatory duties attached, not in a silo.

**Speak-up and report detail.** The channel. The list shows what the viewer may see and **counts** what
they may not. The detail shows the disclosure, the acknowledgement and feedback clocks, the triage and
investigation, messages exchanged with the reporter through the reference code, the retaliation watch,
and the outcome. *Purpose:* a vigil mechanism that protects the reporter structurally.

**Obligations and the calendar, obligation detail, and task detail.** The unified register and calendar
of all duties, internal and external, filterable by regulator, status, frequency and owner, with a
forward and current-month calendar. The obligation detail shows the duty, its tasks, the
maker-and-checker chain, its evidence and filing acknowledgements, the source clause or policy behind
it, the reminder ladder that has fired, the period-by-period on-time ledger, and any regulatory change
that drove it. The task detail is the working screen for the person who actually does the duty: what
is required, what proof is expected, attach, submit. *Purpose:* one place for every duty, however it
arose — and a screen simple enough for an occasional user.

**Regulatory Change and change detail.** Incoming changes with their computed impact and owner; the
detail shows what changed, the automatic owner alert, the impact flow, and the affected obligations,
controls and policies. *Purpose:* keep the firm current and route changes to the right people.

**Source Library, instrument detail, and clause detail.** The library of legal instruments, headed
"the acts behind the controls", sorted so items awaiting a decision rise to the top. The instrument
detail explains what it covers and how it affects the firm, carries the supersession banner, and lists
its clauses with the pipeline action on each. The clause detail — the engine of the headline flow —
shows what the clause requires, its key parts, its extract and citation, the sourced penalty tiers and
the severity derived from them, the recommendation with its confidence, the specialist option, and the
decision. *Purpose:* turn law into tracked, owned, evidenced controls, with the clause as the unit.

**Sector Pack.** A sector-specific cockpit gathering the duties, committee cadence, monitoring
controls, exposure-limit controls and incident-reporting obligations that matter to one regulator, plus
report templates. *Purpose:* give a sector its tailored home without fragmenting the underlying model.
Extensible to other regulators and sectors.

**Data Governance and request detail.** The data inventory (what the firm holds, where, of what kind,
how long it is kept, with what consent), the request queue, the consent picture, and the routing of a
breach into the incident machinery. The request detail shows the erasure-versus-retention workflow and
the audit record it generates. *Purpose:* manage data duties in the same fabric as everything else.

**Audits and audit detail.** The audit programme: the risk-based plan with delivery against it, audits
by type, auditor, period and findings. The detail shows scope, working papers and their results, each
finding and its spawned remediation issue, and unescalated test failures. *Purpose:* the third line's
workspace.

**Issues and Remediation, and issue detail.** The union register (5.22): issues by source, severity,
owner, age and due date, with bulk action, and exceptions appearing as themselves — deviation reason,
compensating control, approver, expiry state and renewal count — with the exception register as the
union filtered to exceptions. The detail traces the issue back to what caused it and
forward to the controls involved. *Purpose:* make every weakness owned, dated and closed, and every
approved deviation visible beside them.

**Evidence Vault and evidence detail.** All evidence, showing how each item was captured — automatically
from a feed or by a named person — its source, its verification state, and everything it is linked to.
*Purpose:* one place where proof lives and links back to the duties and controls it supports.

**Integrations.** The connected systems as spokes around a vendor-neutral backbone, each showing status
and last sync, with the firm's existing service desk shown prominently as kept rather than replaced,
and simulated connections honestly labelled as simulated.
*Purpose:* make "one platform that connects, not replaces" visible.

**Settings.** Nine sections, each routed through maker-and-checker and logged: organization profile;
people and roles, with the role matrix, the segregation-of-duties view and the department heads;
frameworks and control libraries; regulator thresholds, owners and escalation; maker-and-checker and
workflow rules; connected systems; data retention and privacy; notification preferences; and the
tamper-evident audit log. Read-only for non-administrators; the audit log readable by all.

### 8.3 Cross-cutting surfaces

These appear across many screens rather than as a single page.

- A **vital-signs strip** keeping the headline measures and the nearest live clock in view everywhere.
- A **command search** that jumps to any record by identifier or title.
- A **persona switcher** that changes the queue, the navigation and the approvals on view. *(v2.1
  target-state note: this is a **view selector** over the roles and altitudes the signed-in person
  actually holds — never an identity change. The prototype used it as its only authentication;
  production authenticates for real (G-02), and impersonation exists only as a logged, dev-mode
  capability.)*
- A **notifications** affordance carrying fired escalations and owner alerts.
- The **proof chain** — the source-to-evidence spine — rendered identically on every record that sits
  on it (`BR-LNK-03`).
- A **source affordance** on every record, opening the originating clause and showing what that clause
  produced.
- A **cross-reference panel** on every detail showing where the record also appears.
- A **scope banner** on scoped surfaces naming the department scope in force.
- **Action drawers** that preview a regulator report, an export or an evidence upload before it is
  submitted.
- An **assistive panel**, in-page rather than global, answering questions scoped to the record in hand
  and the user's own access.
- A **report menu** offering the role-scoped report templates for the module in view.
- A **pack generator** for committee and board reporting (5.26).
- **Saved views** on registers, so a person's working filter survives.
- A **guided tour** that walks the connected model for a first-time viewer.

---

## 9. Capability Map

The consolidated functional inventory, by theme. Each has been walked in §5.

**Source and provenance management.** A single library of legal instruments and their clauses; the
clause as the atomic unit; assisted ingestion from a URL or a document with per-clause acceptance; the
source-to-action pipeline; two-way traceability; version supersession; department routing of
instruments.

**Obligations management.** One unified register and calendar for internal and external duties; tasks
as the unit of work; ownership; frequency and recurrence with automatic next-cycle scheduling;
maker-and-checker; required evidence; period-by-period on-time tracking; overdue flagging and
escalation; provenance back to the clause or the policy.

**Control management.** A control library on "map once, satisfy many"; create-from-clause and
attach-to-existing; many-to-many coverage across laws; test and re-test with history; a per-period
evidence ledger; continuous monitoring with automatic escalation; the "clauses satisfied, grouped by
act" view.

**Risk management.** A register across domains; inherent and residual scoring; a heat map;
consequence-based rating derived from sourced penalties; a full treatment lifecycle with dated,
owned remediation actions; projected residual; time-bound risk acceptance; periodic review; risk and
control self-assessment cycles that write back; key risk indicators with derived banding; risk
appetite with tolerance bands and a reconstructed exposure trend.

**Regulatory change management.** Capture from feeds and circulars; impact assessment against
obligations, controls and policies; automatic owner alerting; acknowledgement and update; promotion of
genuinely new duties into the source pipeline.

**Incident and regulator-clock management.** Detection including from a failing monitored control;
automatic classification; simultaneous regulator clocks started at detection; one breach-response
control satisfying several reporting duties; evidence captured once and reused; maker-checked filing;
a unified timeline; operational loss capture on the standard categories.

**Audit and assurance.** A risk-based annual plan with derived delivery and quarter coverage; scoping
and control testing against the connected model; working papers; findings that spawn remediation
issues; surfacing of unescalated test failures; reporting; follow-up and re-test; repeat-finding
visibility.

**Issue and exception management.** One remediation register — a union view over issues and
first-class exceptions (5.14, 5.22) — fed by every source; severity, ownership, ageing and closure;
bulk action; exceptions as approved, time-boxed, compensated deviations with enforced expiry, an
expiry review, and a visible renewal count with escalating renewal authority.

**Policy management.** Versioning; approval chains; the line from a policy to its controls to its
evidence; review cadence; provenance to the clauses behind a policy; version-bound attestation
campaigns with declarations that route to the exception register.

**Third-party risk management.** A register of arrangements with services, data access, jurisdiction,
sub-outsourcing and contractual rights; independent assurance tracking with expiry; documented and
tested exit plans; a derived, attributed risk tier; periodic due-diligence campaigns that write back;
concentration analysis.

**Investigations.** A protected speak-up channel with anonymity by design, statutory committee access,
acknowledgement and feedback clocks, retaliation watch, and governed unsealing; fraud case management
with scheme and detection analysis, shape-driven regulatory tracks, loss and recovery, and closure
with disciplinary and recovery actions; shared confidentiality, remediation and risk-push machinery
behind both.

**Data governance and privacy.** A data inventory; consent tracking; the data-subject-request workflow
with erasure-versus-retention and an audit record; automatic routing of a breach into the incident and
regulator-reporting machinery.

**Evidence management.** A vault of all evidence; automatic capture from feeds and manual attachment;
a submit-and-verify lifecycle; expected-evidence guidance; linkage to tasks, controls, obligations and
framework references.

**Sector packs.** A tailored cockpit per regulator or sector, extensible to new sectors.

**Governance reporting.** Board and committee packs composed from live queries, produced under a named
statutory or charter basis, maker-checked before issue, and filed as evidence against the meeting
obligation; a committee register with cadence, quorum and membership; role-scoped report templates per
module.

**Dashboards and metrics.** The board cockpit; the headline measures; trend lines; the heat map; the
appetite view; the activity stream. All drillable into the underlying records (§10).

**Assistive and agentic intelligence.** In-context recommendations and a scoped question-answering
assistant; agentic runs for source scanning, clause-to-control proposals, instrument extraction,
monitoring and chasing, and pack assembly; always propose-then-approve (§13).

**Governance and workflow.** Maker-and-checker on every change that matters; three lines of defence
expressed in roles and ownership; role-based access, department scoping and role-gated authority; case
confidentiality with computed recusal; one reminder-and-escalation engine; a tamper-evident audit log.

**Search and navigation.** Command search across all records; cross-reference panels; the proof chain;
saved views; deep links between the cockpit, the registers and the details.

**Integration management.** Connected systems as spokes on a vendor-neutral backbone, with status and
last sync, and the firm's systems of record kept rather than replaced.
---

## 10. Metrics, Reporting and Pack Catalogue

Risk and control metrics are first-class in this product, because they are what turn "are we in
control" from an opinion into a number. This section defines each one precisely. **Ambiguity here is
expensive**: two screens computing "coverage" differently is a defect a customer will find in front of
their board.

### 10.1 Definitions *(restructured in v2.1)*

**The governing document for board and committee surfaces is the companion dashboard design,
`onegrc-dashboard-kpi-design.md`.** It defines the full metric catalogue (M1–M26), the three
dashboard layouts (Executive, Risk Committee Chair, Audit Committee Chair), the threshold and
banding hierarchy, and the anti-vanity rules. This section does not duplicate that catalogue —
duplicating it is how two definitions of one number are born. What remains normative here:

- Every measure is computed from the live records (`BR-DRV`), and every one is **drillable** — the
  drill query and the tile query are the same function, so they cannot disagree.
- **Every number carries its denominator or basis** on the surface that shows it. "96.2%" is
  banned; "96.2% of 254 tested controls" ships.
- **No metric may improve as a result of doing less work.** Closing young issues, ceasing to test,
  ceasing to file, or retiring records must never flatter a number. Every definition is tested
  against this before it ships; the dashboard document applies the test to each entry.
- **The word "coverage" is banned from the UI** except in the compound label "Duty coverage". This
  decision is made (§21.11 — decided): v2.0's single "control coverage" number wore two meanings
  and was generous on both axes.

**The two metrics that replaced "control coverage":**

| Measure | Definition | Drills into |
|---|---|---|
| **Control pass rate** | Controls whose latest completed test is a clean Pass, over controls **with a current test on record** (tested within their own cadence). Partial is not a pass; a control with no current test is in neither side — it is counted separately as *tests lapsed or never run*, because unknown is not green | Control library grouped Pass / Partial / Fail; the lapsed list |
| **Duty coverage** | Live obligations with at least one active control mapped, over all live obligations; with the count of key risks carrying no mitigating control alongside. Retirements in the period are shown on the drill, so a rise in the rate produced by shrinking the denominator is visible as exactly that | Unmapped obligations by regulator; unmitigated key risks |

**Operational measures that remain defined here** (they appear on working-persona surfaces and as
drill content, not as board furniture):

| Measure | Definition | Drills into |
|---|---|---|
| **Failing controls** | The count of controls whose latest test failed, with the count of those lacking an open remediation issue (a fail without an issue is a process breach, 5.9) | Controls filtered to failing |
| **Monitored controls passing** | The share of continuously monitored rules currently passing, with degraded rules counted as **not passing** | Monitoring list |
| **Open incidents / critical open** | Incidents not closed, and of those, the count classified critical | Incident list |
| **Nearest regulator clock** | The soonest deadline among all live incident regulator tracks, counting down | The incident carrying it |
| **Overdue duties** | Obligation cycles past their due date and not filed (`BR-DRV-17`), with the live-duty denominator | Obligations filtered to overdue |
| **Duties due soon** | Cycles due within the next thirty days and not filed | Obligations filtered to due |
| **On-time filing rate** | Cycles filed on or before their due date, over **cycles that fell due** in the stated period. *(v2.1 correction: v2.0 divided by "cycles filed", which a firm could flatter by not filing. Unfiled and late both count against.)* | The per-cycle ledger |
| **Evidence-backed completions** | Filed cycles in the period whose task carries at least one verified evidence item, over all filed cycles — the "done but not documented" number the product exists to prevent *(v2.1 addition, from the dashboard design M4)* | Filed cycles lacking evidence |
| **Open findings** | Audit findings not closed | Audit findings |
| **Findings ageing** | Open findings bucketed 0–30 / 31–90 / 91–180 / >180 days, plus the **oldest** open finding's age. *(v2.1: replaces v2.0's mean "finding age" and "average remediation days" — a mean of open ages **improves when young items are closed and when nothing else changes but time passing stalls**, so it punished work and hid the tail an inspector reads first. Means of open ages are banned as reported measures.)* | Issues in each band; the oldest finding |
| **Issues closed within SLA** | Issues resolved within their severity's SLA, over issues resolved in the period; with the count of open issues currently past SLA | Breaching issues by owner |
| **Aggregate residual per domain** | The mean residual of the worst fifth of risks in the domain, minimum three (`BR-DRV-05`) | The register filtered to that domain |
| **Enterprise residual exposure** | `BR-DRV-05` applied enterprise-wide, on the register's own 1–25 scale, with its quarter-over-quarter movement reconstructed per `BR-DRV-07`. *(v2.1: replaces v2.0's "enterprise risk level", which the prototype implemented as a stored constant (7.8/10) with a hard-coded trend string — the single largest violation of derive-don't-store in the build. No board-level headline may be stored, and the /10 scale matched nothing else in the product.)* | The heat map and the top residual risks |
| **Appetite status per domain** | Aggregate against the board tolerance band: outside appetite / at tolerance / within appetite (`BR-DRV-06`) | The register |
| **Indicator breaches** | Indicators whose derived band is amber or red, by domain; stale indicators are counted as unknown, never as green | The indicators and their risks |
| **Third-party tier distribution** | Arrangements by derived tier, with the count carrying lapsed assurance, overdue diligence, or a material service without a tested exit plan | The third-party register |
| **Campaign completion** | Tasks approved over tasks in scope, with the overdue count | The campaign |
| **Attestation rate** | Acknowledgements recorded against the policy's **current** version, over the population (`BR-DRV-13`). *(v2.1: renamed from "attestation coverage".)* | The campaign |
| **Audit plan delivery** | Plan entries complete over plan entries **due to date** (never the full-year total), by quarter | The plan |
| **Net operational loss** | Gross minus recoveries across incidents and confirmed frauds, for a period, by category — gross and recovered shown beside net | The loss book |
| **Proactive detection rate** | Fraud cases found by the firm's own controls over all cases (`BR-DRV-15`) | The fraud book |
| **Speak-up service levels** | Acknowledgement and substantive-feedback windows met, breached or due; and the days reporters have been waiting — counts honest for every viewer, sealed cases included | The reports the viewer may open |
| **Reminders and escalations fired** | Counts for the period, from the audit log. Drill-level and pack content only — a count of nags is proof of chasing (Req 16), not a posture measure, and as a headline it would reward a noisy ladder | The audit log |

### 10.2 Trends *(rewritten in v2.1)*

A trend is the metric's own definition evaluated at past instants (`BR-DRV-18`): the series and the
tile come from the same function, the last point of the series **is** the live value, and no series
is ever stored, seeded or synthesized. The dashboard design document fixes which measures get a
series, over what window and grain, and what each compares against (quarter-over-quarter,
year-over-year, or sitting-over-sitting for committee views).

The risk exposure trend is reconstructed from the register's own remediation history (`BR-DRV-07`)
rather than stored, which is what makes it defensible when a committee asks why the line moved.
Until enough real history exists, a window renders "since go-live (n months)" — **a board surface
never shows a synthesized series** (§23, G-26). *(The prototype's cockpit curves are generated from
a seeded RNG with hard-coded headlines; they are demo staging, recorded in §23, and nothing about
them is a requirement.)*

### 10.3 The pack catalogue

Packs are composed from live queries (5.26). Four audiences, each with its named basis:

| Audience | Committee | Basis it is produced under | Discharges |
|---|---|---|---|
| **Board** | — | The board's reporting duty under the companies legislation | Board meeting and minutes |
| **Audit Committee** | Audit | The audit-committee provision of the companies legislation; the quarterly cadence follows listed-company best practice, which SPF is not bound by and carries deliberately | Audit committee meeting |
| **Risk Management Committee** | Risk | The sector regulator's information and cyber-security guidelines, and the enterprise-risk board-reporting pattern | Risk committee meeting |
| **Management** | — | Internal management review — explicitly not a statutory return | — |

Composition rules, all of them requirements:

- Each section is a **live query**, never a stored table.
- The pack **names its basis** and, where the basis is best practice rather than a binding duty, says
  so. Overclaiming a statutory basis is a compliance failure in a compliance product.
- The narrative is **maker-checked** before issue (`BR-AUT-06`).
- Issuing **files the pack as evidence** against the meeting obligation's task.
- A section whose module does not exist is **absent**, not empty (5.26).
- Management and the board read the **same live data**, so the two are never reading different
  numbers.

### 10.4 Report templates

Beyond packs, each module offers role-scoped report templates — risk, control, obligations,
compliance, incident, audit, data-subject requests and the sector pack. Generation is an export of the
live register under the user's own access scope (`BR-DAT-06`), named and dated, with the basis and the
filters applied recorded on the face of it. A report that does not say what it was filtered to is a
report that will be misread.

---

## 11. Notifications, Calendar and Clocks

### 11.1 The one calendar

Every dated thing the platform knows about appears on one timeline (`BR-SCH-01`): obligation due
dates and their cycles; committee meetings; control test cadences; policy review dates; audit plan
quarters; campaign due dates; exception and acceptance expiries; third-party diligence and assurance
expiries; indicator refresh dates; and live incident regulator clocks.

The calendar is filterable to a person's own items, which is the view a first-line owner actually
uses, and to a regulator, which is the view a compliance officer uses when a regulator calls.

### 11.2 Clock semantics

- Incident clocks start at **detection** (`BR-SCH-06`), not at record creation.
- A clock triggered by a later discovery starts at that discovery, and the divergence is recorded
  (`BR-SCH-07`).
- Countdowns are live. Deadlines are fixed; only the display ticks.
- A breached clock stays breached (`BR-SCH-08`).
- The nearest live clock is present in the vital-signs strip on every screen, because a six-hour
  window is not something a user should have to navigate to.
- All times are unambiguous and displayed in the organization's operating time zone with the zone
  named (`BR-SCH-09`).

### 11.3 The notification matrix

| Event | Recipients | Timing | Channel |
|---|---|---|---|
| Duty approaching due | Owner | 7, 3 and 1 days before | In-app, digest |
| Duty overdue | Owner + department head | 1 day overdue | In-app, direct |
| Duty overdue | Compliance Officer | 3 days overdue | In-app, direct |
| Duty overdue | CRO / executive | 7 days overdue | In-app, direct |
| Approval waiting | Nominated checker | On submission | In-app, queue |
| Item returned | Maker | On return | In-app, queue |
| Regulatory change impacting a record | Owner of each impacted record | On impact assessment | In-app, direct |
| Monitoring rule failing | Control owner | On the failing run | In-app, queue |
| Regulator clock inside its final quarter | Incident responder + Compliance | Derived from the deadline | In-app, prominent |
| Regulator clock breached | Responder + Compliance + executive | On breach | In-app, direct |
| Indicator breached | Indicator owner | On the breaching reading, then the ladder | In-app, queue |
| Exception or acceptance expiring | Owner + approver | 7 days (exception) / 30 days (acceptance) before | In-app, queue |
| Assurance report expiring | Third-party owner | 60 days before | In-app, queue |
| Diligence overdue | Third-party owner | On lapse, then the ladder | In-app, queue |
| Campaign task assigned / due | Assignee | On assignment, then the ladder | In-app, queue |
| Speak-up acknowledgement or feedback due | Ethics office **only** | The ladder against the window | In-app, restricted |
| Investigation target approaching | Investigator | The ladder | In-app, restricted |
| Audit finding raised | Finding owner | On the finding | In-app, queue |
| Configuration changed | Administrator + checker | On change | In-app, audit log |

Two rules govern the whole matrix. **Every fired notification is logged** (`BR-ESC-03`) — the trail is
the point, not the message. And **notifications for restricted cases go only to people cleared for
that case** (`BR-SCP-09`); a notification is as capable of leaking as a screen.

*Production requirement.* The prototype delivers in-app only. Production needs email at minimum, with
per-person and per-event-type preferences, digesting to prevent notification fatigue, and delivery
confirmation for the escalation rungs — because "we escalated" is a claim the firm will need to
substantiate. §19 records this.
---

## 12. Integrations and Connectors

Described in functional terms: what the platform connects to, and why. The platform reads from these
where it can, so signals and proof flow in rather than being keyed by hand, and it is vendor-neutral
about which specific products a customer uses.

### 12.1 The connector catalogue

| Connector class | Direction | Feeds | Triggered by | What it proves or enables |
|---|---|---|---|---|
| **Security monitoring** (intrusion detection, endpoint, cloud security posture) | In | Incidents; monitored controls | Event and schedule | A real security signal becomes a managed incident; a control's pass-or-fail reflects reality |
| **Vulnerability management** | In | Monitored controls | Scheduled scan | The patch-window control's population and its failing items; drives the automatic escalation |
| **IT service desk** (the customer's own, **kept not replaced**) | In | Incidents; asset and configuration context | Ticket events | The operational system of record stays authoritative; the platform reconciles rather than supplants |
| **Identity and access** | In | Control evidence | Scheduled export | Who has access to what; privileged-access recertification |
| **Privacy tooling** | In / out | Data inventory; consent; data-subject requests | Request events | Privacy duties live in the same fabric as everything else |
| **Regulatory-intelligence feeds** | In | Regulatory changes; new instruments | Publication | The stream the firm assesses and routes; the honest denominator behind "we are current" |
| **Tax filing systems** | **Out** | Obligations | Filing | The duty is filed through it and the acknowledgement returns as evidence |
| **Sector systems** (central record-keeping, trustee) | In | Sector pack; sector returns | Scheduled | The firm's scale figures and its sector returns |
| **Directory / HR** | In | People, departments, line management | Change events | Ownership and escalation resolve to the real org, and stay right when someone moves team |
| **Notification transport** (email, and any collaboration channel) | Out | Reminders, escalations, approvals | The reminder engine | Delivery of the chasing the platform performs, with confirmation |
| **Document and evidence stores** | In | Evidence | Attachment | Existing proof is linkable without being re-uploaded |

### 12.2 Principles governing all connectors

1. **Read rather than require entry.** Evidence that flows in automatically is both cheaper and more
   trustworthy.
2. **The customer decides the stack.** Which systems to keep, and which to make the backbone, is the
   customer's choice; the product integrates with what they run and is never branded as, or
   architecturally bound to, any single vendor.
3. **A connector that cannot see reports that it cannot see.** A feed outage degrades the rules that
   depend on it; it never lets them report success (`BR-DRV-09`). Every connection shows its status
   and its last successful sync, and a stale sync is visible on the integrations view.
4. **Inbound data is attributed.** Anything a feed creates or proves names the feed as its source, so
   an auditor can distinguish a system-captured artifact from a hand-keyed one.
5. **Outbound actions are governed.** A filing made through a connector runs the same maker-checker
   path as one made by hand; there is no integration bypass.

*Production requirements.* Each connector needs: an authentication and credential-rotation model;
retry and back-off with a dead-letter path; idempotency, so a replayed event does not duplicate an
incident; field mapping the customer can configure; a sync history with error visibility; and a
documented behaviour when the far end changes its schema. §19 records that the prototype simulates all
of this.

---

## 13. Assistive and Agentic Intelligence

### 13.1 Scope

**Assistive** — in the screens, helping a person do the next step:

- Drafting a plain-language description of what a clause requires.
- Suggesting which existing control already satisfies a clause, with a confidence indicator.
- Answering a scoped question about the record in hand — "what does this control satisfy", "what do I
  owe this month", "why does this duty exist".
- Flagging a duty that is missing evidence, or an obligation whose control has lapsed.
- Drafting a committee narrative from a composed pack.
- Pre-filling a due-diligence or assessment response from what the register already knows, so the
  reviewer **contradicts facts rather than inventing them**.

**Agentic** — multi-step work returned as a proposal:

- Scanning regulatory sources for newly issued instruments and raising them as changes with owner
  alerts.
- Extracting an instrument's clause structure from a URL or an uploaded document.
- Proposing clause-to-control mappings across the library.
- Watching control status and chasing owners.
- Assembling a pack.

### 13.2 The governance around it

The rules are in `BR-AI-01` to `BR-AI-07` and they are not negotiable. Restated in one place because
this is the part of the product most likely to be built loosely:

- A run **never mutates**. It returns findings and proposals.
- Approving a proposal performs the **existing** governed action. There is no agent-only path, so an
  agent can never do what a person could not.
- Extracted figures are **unverified until a person confirms them**, and an unverified clause cannot be
  saved to a control.
- **Generated text is never evidence.**
- Every recommendation shows its confidence and its basis, and a **rejected recommendation stays on the
  record** — an assistant whose bad suggestions vanish cannot be assessed.
- The assistant is **scoped to the user's own access** and may not surface what the user could not open.
- Applied proposals name the run in the audit trail, so the firm can audit its automation.
- Where an intelligent feature materially aids a decision **about an individual**, the heightened
  diligence the data-protection regime expects applies — which is a real constraint on using automation
  in the investigation modules at all.

### 13.3 The seam

The specification deliberately requires a **clean seam** between the screens and the intelligence
behind them: one interface, a deterministic implementation now, a real one later, with the screens
depending only on the contract. This is what allows the first release to ship scripted behaviour
without the product having to be rebuilt when real capability replaces it.

*As built.* Every intelligent behaviour in the prototype is scripted and deterministic. There is no
model call anywhere: the clause extractor, the recommendations, the assistant's answers, the agent
runs and the pack narrative are all fixed functions of their inputs. The seam exists and the screens
sit on the contract side of it. §19 and §21 carry the decision about how real the intelligence is in
the first release.

### 13.4 Model governance, when it becomes real

When a real model is introduced, the following become requirements rather than good practice: recording
which model and version produced an output; retaining the prompt context for anything that fed a
decision; measuring accuracy against a held-out set of clauses before the extractor is trusted; a
documented human-review rate; a data-protection impact assessment where the feature touches personal
data; and a stated position on whether customer data may be used for training — which for a regulated
customer will normally be "no", and should be contractually so.

---

## 14. Configuration and Extensibility

What an administrator can change without a code release, and what must never be changeable at all.

### 14.1 Configurable by the administrator

Each of these changes is maker-checked and logged (`BR-AUT-08`).

| Area | What is configurable |
|---|---|
| **Organization** | Profile, entity details, operating time zone, financial calendar |
| **People and roles** | Users, their roles, departments, line of defence, status; department heads and therefore escalation targets |
| **Frameworks** | Which control frameworks and libraries are enabled; the mapping between them |
| **Regulators and clocks** | Which regulators apply; each reporting window and what triggers it; the clock-start rule per regulator (`BR-SCH-07`); the escalation owner per regulator |
| **Maker-checker rules** | Which change kinds require approval; who may approve each; whether a line-of-defence constraint applies (`BR-AUT-10`) |
| **Authority matrix** *(v2.1)* | The action→authority assignments of §4.10, held as data and edited through 5.30 — always within §14.2's floor: separation of duties can never be configured away |
| **The reminder ladder** | The reminder and escalation intervals and their targets, per object type |
| **Expiry windows** | The warning windows for exceptions, risk acceptances and assurance reports; the exception renewal-escalation thresholds (`BR-AUT-11`) |
| **Risk model** | The scoring scale; domains; appetite statements and tolerance bands per domain; the residual thresholds behind severity |
| **Indicators** | Definitions, thresholds, direction, refresh cadence, source feed |
| **Third-party model** | Diligence cadence per criticality; the tier thresholds and driver weights |
| **Campaigns** | Cycle definitions, scope rules, cadence, question sets |
| **Connected systems** | Which connectors are enabled, their credentials, field mapping and sync cadence |
| **Retention and privacy** | Retention rules per data store; masking rules; residency settings |
| **Notifications** | Per-person and per-event-type preferences; digest cadence; channels |
| **Sector packs** | Which pack is enabled; its sections, committees and report templates |
| **Pack composition** | Which sections each audience takes; the basis text |

### 14.2 Not configurable, by design

- **The audit log** cannot be edited, cleared, or shortened below its retention floor by anyone,
  including the administrator (`BR-AUD-02`, `BR-DAT-05`).
- **Separation of duties cannot be switched off.** The intervals and the approver sets are
  configurable; the rule that a maker may not approve their own work is not.
- **Derived values cannot be overridden.** An administrator may change a threshold; they may not type
  a band, a tier or a stage over the top of what the record implies (`BR-DRV`).
- **Evidence cannot be required optionally.** The requirement that a duty has proof is structural
  (`BR-EVD-01`).
- **Case confidentiality and recusal** are not administrative settings.

### 14.3 Extensibility

The product should absorb the following without a structural change, and the build should be shaped
accordingly: a new regulator with its own clocks and returns; a new control framework and its mappings;
a new sector pack; a new campaign type behind the existing campaign container; a new connector; a new
report or pack section; a new risk domain; and a new indicator source. The campaign container is the
worked example of this shape already: assessment, attestation and due diligence are **payloads behind
one registry**, not three parallel machines, and a fourth cycle type should be a payload too.
---

## 15. Deployment and Delivery Models

These are conceptual options for how a customer could consume the product, not a deployment design.

- **Shared, multi-tenant service.** The control plane is run as a service that several customers use,
  each isolated. Simplest to adopt; appropriate where data-residency constraints are light.
- **Dedicated, single-tenant service.** The control plane is run for one customer alone. Appropriate
  where a regulated firm wants isolation but not full self-hosting.
- **Customer-hosted or private deployment.** The control plane runs inside the customer's own
  environment. Appropriate for the most sensitive settings, and the natural answer where the law
  requires that personal and regulatory data stay within a jurisdiction.
- **Split planes for data residency.** Building on §2, the reasoning (the control plane) runs in one
  place while the sensitive data and systems of record (the data plane) stay close to the customer, so
  residency obligations are honored without losing the connected model.

A natural **adoption path** runs alongside these: a **demo** on seeded data to prove the model and the
flows; a **pilot** that connects a few read-only feeds so the cockpit reflects reality without yet
filing anything; and a **production** deployment that connects the systems of record and supports real
filings and approvals. Which of these a customer chooses, and in what order, is an open commercial
decision (§21).

---

## 16. Security, Compliance and Platform Governance

These are functional obligations the product itself must honor. A platform that manages compliance must
itself be exemplary.

- **Access control.** Role-based and least-privilege, with the department boundary of §4.5 and the
  action authority of §4.10. Certain actions are reserved to specific roles, and one — clause authority
  — to a specific function.
- **Separation of duties.** The maker may not be the checker, across operational duties, incident
  sign-offs, investigation closures and administrative changes alike (`BR-AUT-05`, `BR-AUT-06`).
- **Tamper-evident audit trail.** Every action that changes a record is written to an append-only log
  that no user can alter, each entry linking to the records involved (`BR-AUD-*`).
- **Confidentiality by construction.** Where a record can harm a person, the protection is structural
  rather than configured: the identity is not held, access is by person, recusal beats clearance, and
  the trail records the act not the content (`BR-SCP-05` to `BR-SCP-09`, `BR-DAT-02`, `BR-AUD-05`).
- **Data handling and residency.** The platform handles sensitive personal and regulatory data, so it
  must honor access restriction, logging, defined retention, masking by default, and — where the law
  requires it — keeping data within a jurisdiction. The data inventory and the retention policies exist
  to make these obligations explicit and enforceable.
- **Alignment to the frameworks it manages.** The product is shaped to fit a certifiable
  compliance-management standard and to support its plan-do-check-act cycle, and it should itself
  maintain a sound information-security posture consistent with the standards it helps customers meet.
  It supports a customer's path to certification but does not claim to be the certificate.
- **Human-in-the-loop for intelligence.** Nothing an assistant produces becomes a tracked obligation, a
  filed return, or evidence without a person accepting it (§13).
- **Evidence integrity.** Generated text is never evidence; the evidence is the real artifact.
- **The platform's own compliance.** The product should be able to demonstrate, on itself, the things it
  asks customers to demonstrate: who accessed what, that changes were approved by someone other than
  the maker, that its own retention rules are enforced, and that its log is complete.

---

## 17. Non-Functional Requirements

These are the qualities that decide whether a well-designed system is usable in a regulated firm. They
are stated as targets to be agreed and refined with the customer, not as a contract.

### 17.1 Scale

Sized for a mid-size regulated enterprise, with headroom of roughly an order of magnitude:

| Dimension | Working target |
|---|---|
| Named users | Hundreds; tens concurrent |
| Risks | Low thousands |
| Controls | Low thousands, each mapped to several framework references |
| Obligations | Low thousands live, with several years of historical cycles |
| Tasks | Several per obligation per cycle |
| Evidence items | Hundreds of thousands, growing continuously from feeds |
| Incidents | Hundreds per year |
| Instruments and clauses | Hundreds of instruments; thousands of clauses |
| Audit log entries | Millions, retained for years, never pruned below the floor |

The two that grow fastest are **evidence** and the **audit log**, and both are append-only. The design
should assume that neither is ever deleted within the retention period and that both must remain
searchable at that volume.

### 17.2 Performance

- A register or list view should be usable at full customer volume, with server-side filtering,
  sorting and pagination rather than loading everything.
- The cockpit must render its headline measures quickly enough to be the landing screen. Since every
  measure is derived (`BR-DRV`), the build will need a materialization or caching strategy that
  preserves the derivation guarantee — a cache that can go stale against its source reintroduces
  exactly the drift the derivation rule exists to prevent, so invalidation must be tied to the writes
  that affect it.
- Live countdowns animate client-side from fixed deadlines; they must not poll.
- Report and pack generation may be asynchronous, with the user notified on completion.

### 17.3 Availability and continuity

- The platform is not itself in the critical path of the firm's operations, but it **is** in the
  critical path of a six-hour regulatory clock. Availability targets should be set with that in mind.
- Recovery objectives must be defined and tested; the audit log and the evidence vault are the two
  stores where data loss is unacceptable rather than merely inconvenient.
- The platform's own continuity arrangements are themselves auditable artefacts a regulator may ask
  for.

### 17.4 Usability and accessibility

- **Density is a requirement, not a style.** These are working screens for people with a lot of records.
- Designed for desktop use at a minimum working width; the first-line task screen is the one surface
  that most needs to work on a smaller viewport, because it is used by people who open the platform
  twice a month.
- Accessible to the customer's stated standard: keyboard navigation throughout, sufficient contrast in
  both light and dark presentation, screen-reader labelling on every control, and — importantly for
  this product — **state never conveyed by colour alone**, since severity, band and status are the
  platform's core vocabulary.
- Colour is used for **state**, never for decoration.
- *(v2.1)* **Empty states are designed, not avoided.** In production, empty registers are a normal
  and frequent condition — day one before migration, a filter that matches nothing, a module not
  yet deployed, a period with genuinely nothing to report — and each of those is a *different*
  message the screen must give. A metric whose inputs are absent renders "no data — [reason]",
  never zero and never a fabricated value. (The demo world's "no empty tables anywhere" was a
  seeding aesthetic, §23; it is not a UI requirement and must not be inherited as one.)
- *(v2.1)* **Round numbers are legitimate output.** A real system will show 100%, 0 open items and
  round totals, and must render them plainly. Credibility comes from denominators and drillability
  (§10.1), not from decorating values to look organic. (The demo's "non-round numbers everywhere"
  was seed styling, §23.)

### 17.5 Data integrity and concurrency

- Two people acting on the same record must not silently overwrite one another; the later actor is
  told what changed.
- Every mutation is transactional with its audit entry: a change that is not logged must not commit.
- Identifiers are never reused (§7.4).
- Deleting or archiving never orphans provenance (`BR-LNK-10`).

### 17.6 Observability and support

- The platform's own operational health — connector status, sync freshness, run failures, queue depth —
  must be visible to the administrator, since a silently broken feed is indistinguishable from
  compliance.
- A support path must exist that does not require a person to be granted access to a customer's
  confidential case data.

### 17.7 Localization

- Currency, number grouping and date formats follow the customer's locale.
- The time zone is the organization's, stated explicitly wherever a time appears.
- Multi-language support is not required for the first release but should not be designed out.

---

## 18. Data Migration and Onboarding

A firm adopting OneGRC is not starting from nothing. It has years of registers, filings and evidence in
other systems, in shared drives and in inboxes. How that is brought across decides whether the platform
is trusted in its first year.

### 18.1 What has to come across

| Data | Source, typically | Difficulty | Priority |
|---|---|---|---|
| The obligation register | Spreadsheets; the incumbent regulatory-content tool | Moderate — the mapping is conceptual, not just structural | Essential |
| The risk register | Spreadsheets | Moderate — scoring scales rarely match | Essential |
| The control library and framework mappings | Spreadsheets; the IT-GRC tool | Moderate | Essential |
| Policies and their versions | Document store | Low | Essential |
| The people, departments and reporting lines | HR system or directory | Low | Essential |
| Open issues and audit findings | Audit tracker | Low | Essential |
| Third-party register and contracts | Procurement | Moderate | High |
| Historical evidence | Everywhere | **High** — this is the hard one | Decision required |
| Historical filings and acknowledgements | Inboxes, portals | High | Decision required |
| Closed incidents | The service desk | Moderate | Useful |

### 18.2 The principles

1. **Migrate the live picture first.** Open duties, current controls, the live register and open issues
   are what make the platform usable on day one. History can follow.
2. **Provenance is retro-fitted, not invented.** A migrated obligation whose source clause is not known
   is marked as lacking provenance rather than being given a plausible one. The gap is honest and it is
   work to be done; a fabricated citation is a defect that will surface during an inspection.
3. **Migrated records carry their origin.** Every migrated record is flagged with where it came from and
   when, so that a year later a user can tell the difference between what the platform captured and
   what it inherited.
4. **Do not migrate evidence wholesale.** Consider linking to the existing store instead (§12), and
   migrating only what backs a duty that is currently live. Bulk-importing a decade of screenshots
   creates a vault nobody trusts.
5. **The first cycle is the real migration.** After one full cycle of every recurring duty, the platform
   holds a complete, native, evidenced record. Plan for that as the milestone rather than the import.

### 18.3 Displacing the incumbent

Moving off an embedded regulatory-content tool is as much about trust as features. The practical path
is a period of **parallel running** where the incumbent's feed and the platform's obligation register
are compared, and the discrepancies are worked through until the firm believes the new register is
complete. That comparison should be a supported activity, not a spreadsheet exercise — and §21 records
the decision about how far to build it.
---

## 19. The Prototype As Built, and the Gap to Production

This section does two jobs. First it records what the prototype demonstrates and why that was the
right thing to prove. Then it states, explicitly and in one place, everything the prototype fakes and
what production must do instead. **This is the most operationally useful section of the document at
hand-over**, because it is the difference between "we showed it working" and "it works".

### 19.1 What the prototype demonstrates

The prototype's job is to make a sceptical, jointly-deciding audience — Compliance, IT, Risk, plus the
board — each see themselves and believe the connected model. The headline thing it proves is the
**source-to-action pipeline**: starting from a law, breaking it into clauses, and turning a clause into
a tracked, owned, evidenced control, with one control visibly satisfying clauses across more than one
law.

**The flows it carries end to end.** The source-to-action pipeline for a representative set of real
instruments; the unified obligations view showing an internal and an external duty handled
identically; the many-to-many control; the multi-clock cyber incident; the continuous-monitoring
cascade; the regulatory-change flow; the audit flow from finding to remediation issue; the risk
lifecycle from identification to monitoring; the assessment, attestation and due-diligence cycles;
third-party tiering; the fraud and speak-up modules; the data-subject erasure case; committee packs;
and the persona switch that changes a person's queue and approvals.

**What must feel real, and does.** The connected cross-links between records; the continuous
source-to-action line; the many-to-many control; the live ticking clocks; the role-based views; the
heat map, appetite and the metrics; evidence captured once and reused; provenance in both directions;
the reminder ladder and its trail; the derived values that cannot be typed over.

**The load-bearing scenario chain**, which recurs across screens and is what makes the world feel
internally consistent: a monitoring rule requiring critical vulnerabilities to be patched within
fourteen days fails on three items → an issue is raised naming them → the issue links to the live
critical incident → the incident carries three regulator clocks → the evidence captured by the failing
run is the same evidence all three filings cite. The same records surface in monitoring, issues, the
incident detail, the evidence vault and the cockpit's activity stream.

### 19.2 The gap register

| # | Area | The prototype | Production must | Priority |
|---|---|---|---|---|
| G-01 | **Persistence** | In-memory session state; a reload resets everything to the seed | Durable storage with full history and versioned records | Essential |
| G-02 | **Identity and authentication** | The persona switcher is the only "auth" | Real authentication, single sign-on, multi-factor, session management; the switcher becomes a view selector, never an impersonation device | Essential |
| G-03 | **Authorization enforcement** | Authority is checked in the client | The same central authority model enforced server-side; the client check becomes an affordance, not the control | Essential |
| G-04 | **Multi-user concurrency** | Single user, single session | Concurrent editing, conflict detection, and the "someone else changed this" path (§17.5) | Essential |
| G-05 | **The scheduler** | Reminders and escalations are *derived* from deadlines against the demo anchor (Appendix A) — deterministic and provable, but nothing actually fires | A real scheduler that fires on time, with delivery, retry and confirmation, while keeping the derivation property so the ladder remains reconstructible | Essential |
| G-06 | **Notification delivery** | In-app only | Email at minimum, per-person and per-event preferences, digesting, and delivery confirmation for escalation rungs (§11.3) | Essential |
| G-07 | **Connectors** | Feeds are simulated; statuses and last-sync times are seeded | Real connectors with credentials, mapping, retry, idempotency and sync history (§12) | Essential |
| G-08 | **Instrument ingestion** | The extractor is scripted and deterministic; no model call | A real extractor behind the same seam, with accuracy measured before it is trusted, and manual entry preserved as a complete path | High |
| G-09 | **Assistive answers and recommendations** | Scripted, grounded in the record's own context; deterministic | Real capability behind the same interface, with the governance of §13.4 | High |
| G-10 | **Agent runs** | Scripted steps over live state, returning fixed proposals | Real multi-step runs; the propose-then-approve contract (`BR-AI-01`, `BR-AI-02`) is unchanged | High |
| G-11 | **Engaging an external specialist** | The route exists and the opinion returns; there is no external party | A real workflow to a panel firm, with the engagement, the brief, the opinion and its cost tracked | Medium |
| G-12 | **Filing to regulators** | Filings are mocked; acknowledgements are seeded | Where a regulator offers a channel, real submission with the acknowledgement captured as evidence; otherwise, a governed manual filing with the acknowledgement attached | High |
| G-13 | **Export, upload and file handling** | Mocked as a preview drawer and a toast | Real file upload with virus scanning, type and size limits, storage with retention, and real export formats | Essential |
| G-14 | **Evidence storage** | Evidence items are records without payloads | Real artifact storage, integrity hashing, retention enforcement, and legal hold | Essential |
| G-15 | **Audit log immutability** | Append-only within the session | Genuinely tamper-evident storage — write-once or hash-chained — with the retention floor enforced against everyone (`BR-AUD-02`) | Essential |
| G-16 | **Delegation** | None; a named owner on leave blocks their own queue | Time-boxed delegation that inherits queue items and maker rights but never approval rights, with the trail showing who acted under whose delegation | High |
| G-17 | **Line-of-defence constraints on maker-checker** | Only "not the same person" is enforced | Configurable line-of-defence constraints (`BR-AUT-10`) | High |
| G-18 | **Clock-start configuration** | Clock windows are seeded per regulator | Administrator-configurable windows and trigger rules per regulator, including the discovery-based start (`BR-SCH-07`) | High |
| G-19 | **Duty coverage metric** | Only the control pass-rate sense of "coverage" is computed | *Decided (v2.1, §10.1):* both metrics built, labelled "Control pass rate" and "Duty coverage"; the bare word "coverage" banned from the UI | High |
| G-20 | **Cockpit performance at scale** | Everything is derived on read over a small world | A materialization strategy that preserves the derivation guarantee (§17.2) | High |
| G-21 | **Search** | Command search matches identifiers and titles | Full-text search across records, clauses and evidence metadata, respecting access scope | Medium |
| G-22 | **Bulk operations** | Bulk status change on issues only | Bulk assignment, bulk evidence attachment, bulk campaign actions | Medium |
| G-23 | **Reporting formats** | Reports and packs are composed and previewed | Real document generation in the formats a committee actually accepts, with the issued version snapshotted | High |
| G-24 | **Mobile and small viewports** | Desktop only above a minimum width | At minimum, the first-line task screen usable on a phone (§17.4) | Medium |
| G-25 | **Multi-tenancy** | Single organization | Tenant isolation, per-tenant configuration, and the deployment models of §15 | Depends on §21 |
| G-26 | **Historical data** | The world is seeded around a single demo anchor; every "past" record and every curve is staged relative to it | Real history, with metrics computed over real periods rather than synthesized ones; windows read "since go-live (n months)" until real history exists (`BR-DRV-18`) | Essential |
| G-27 | **Data migration** | None | The migration path of §18 | Essential |
| G-28 | **Accessibility** | Not formally validated | Validated against the customer's stated standard, with state never conveyed by colour alone (§17.4) | High |

### 19.3 What may legitimately stay simulated in an early release

Not everything in the register needs to be real to ship something useful. A pilot that connects a few
read-only feeds, files nothing, and runs on real data for one quarter is a genuinely valuable
deployment. The items that can stay simulated longest are: real regulator submission (G-12), the
external specialist workflow (G-11), and real intelligence (G-08 to G-10) — provided the seam holds
and the scripted behaviour is honestly labelled as such in front of a customer.

The items that cannot stay simulated in **any** real deployment are persistence, authentication,
server-side authorization, the scheduler, evidence storage and the audit log's immutability. Those six
are the floor.

---

## 20. Acceptance Criteria

### 20.1 The customer's requirements

This is the acceptance checklist: a reviewer should be able to sit in front of the system and confirm
each line. The requirements are drawn from what the customer told us mattered.

**Requirement 1 — One platform for IT and non-IT compliance together.** *Demonstrate:* in a single
session, a cyber duty and a non-cyber duty living in the same registers and reconciling in the same
cockpit. *Pass when:* a reviewer can move from a security control to a tax obligation to an
investment-policy review without leaving the platform, and the cockpit reflects all of them.

**Requirement 2 — Policy-driven duties tracked, with evidence, not only statutory filings.**
*Demonstrate:* the investment-policy review tracked as an obligation, completed, with the committee
minute attached as evidence; and the same duty visibly flagged as lacking evidence if the minute is not
attached. *Pass when:* an internal duty is handled identically to a statutory one, and the absence of
evidence is visibly a gap.

**Requirement 3 — The clause as the unit.** *Demonstrate:* open an instrument, see it broken into
clauses, open one clause, and turn that one clause into a tracked control. *Pass when:* the smallest
manageable object is a clause, and work, ownership, evidence and consequence all attach at that level.

**Requirement 4 — From source to action, as one continuous line.** *Demonstrate:* from any obligation,
trace back to the exact clause and citation; from any clause, run the reverse lookup to every record it
produced. *Pass when:* a reviewer can answer "why does this duty exist" and "what did this law produce"
from the system, both ways.

**Requirement 5 — Map once, satisfy many.** *Demonstrate:* a single breach-response control satisfying
both a data-protection clause and a security-regulator clause, shown on the control's own page grouped
by act. *Pass when:* one control is visibly mapped to clauses across more than one law.

**Requirement 6 — Risk derived from the consequence of non-compliance.** *Demonstrate:* a clause whose
penalty escalates from a fixed fine to a per-day charge to personal liability, carrying a severity
derived from that penalty, and that severity flowing into the connected risk. *Pass when:* the rating
is visibly grounded in the sourced consequence.

**Requirement 7 — A connected demonstration, not four disconnected screens.** *Demonstrate:* a policy
producing an obligation, satisfied by a control, performed by a task, proven by evidence, with a risk
attached — all linked and navigable. *Pass when:* a reviewer can walk the whole chain by clicking.

**Requirement 8 — Role-based, simplified views.** *Demonstrate:* the cockpit roll-up, the compliance
officer's full register, and an individual owner's single-task queue, switched live. *Pass when:* each
persona sees the same underlying data at their own altitude, and the individual owner's view is
genuinely simple.

**Requirement 9 — Regulatory change managed end to end.** *Demonstrate:* a change arriving, its impact
assessed, the owner alerted automatically, and the records updated. *Pass when:* a change reaches the
right person and leaves a documented trail.

**Requirement 10 — A multi-regulator incident handled coherently.** *Demonstrate:* one incident,
several clocks counting down together, one control satisfying the reporting duties, evidence captured
once and reused. *Pass when:* the firm responds once and satisfies several legal duties without
re-gathering proof.

**Requirement 11 — Recurring duties that run to completion every cycle, with proof.** *Demonstrate:* a
monthly and a quarterly obligation cycling through due, in review and filed, with the next instance
scheduled automatically and overdue cycles escalating. *Pass when:* the firm never re-creates a
recurring duty, and the register always shows which cycles were on time.

**Requirement 12 — An audit flow that makes "done but not documented" impossible.** *Demonstrate:* an
auditor pulling a control's evidence from the model, raising a finding, and that finding becoming a
tracked remediation issue with an owner and a due date. *Pass when:* documentation is a byproduct of
doing the duty.

**Requirement 13 — Board and committee preparation as a view, not a project.** *Demonstrate:* producing
a committee pack from live data on demand, under a named basis, with the narrative approved by a second
person, and the issued pack filed as evidence against the meeting obligation. *Pass when:* the pack
reflects current state without weeks of collation.

**Requirement 14 — Inspection-readiness and metrics on demand.** *Demonstrate:* answering, from the
cockpit, what is failing, what is overdue, how long findings have been open, and where exposure sits
against appetite — and drilling from each number into the records. *Pass when:* "are we in control" is
answered with current numbers a reviewer can verify by drilling down.

**Requirement 15 — Shaped to a recognized standard.** *Demonstrate:* the platform's structure mapping
to the clauses of a certifiable compliance-management standard, supporting its plan-do-check-act cycle.
*Pass when:* a reviewer can see how the platform supports a certification effort, without the product
overclaiming to be the certificate.

### 20.2 Additional acceptance criteria for the expanded scope

The requirements above predate several modules. These complete the checklist.

**Requirement 16 — Nothing waits on someone noticing.** *Demonstrate:* an overdue duty showing exactly
which reminders and escalations fired, when, and to whom — and the same events in the audit log.
*Pass when:* the firm can **prove** it chased.

**Requirement 17 — Deviations are governed, not hidden.** *Demonstrate:* a control failure that cannot
be fixed in the window becoming an approved, time-boxed exception with a compensating control, chased
to expiry, with its renewal count visible. *Pass when:* an expired exception reads as an open exposure
and escalates.

**Requirement 18 — Risk acceptance always expires.** *Demonstrate:* an acceptance approved by someone
other than the owner, chased from thirty days out, and lapsing into an open, escalating exposure
(`Acceptance lapsed`, 5.13) when nobody decides. *Pass when:* "accepted" can never mean "forgotten".

**Requirement 19 — Assessment cycles move the register.** *Demonstrate:* an assessment cycle where an
owner re-scores, a checker challenges, and approval writes the new score back to the risk. *Pass when:*
the register changes as a result, traceably.

**Requirement 20 — Attestation is version-bound.** *Demonstrate:* the attestation rate against a
policy, then the policy republished at a new version and the rate correctly falling. *Pass when:* a
signature against a superseded version is visibly not a signature against the current one.

**Requirement 21 — Third-party exposure is computed, not asserted.** *Demonstrate:* an arrangement whose
tier rises automatically when its independent assurance lapses, with every point of the tier
attributed. *Pass when:* nobody can type a low tier over a material outsourcing with expired assurance.

**Requirement 22 — The speak-up channel protects the reporter structurally.** *Demonstrate:* that the
identity is not stored anywhere the platform can render it; that a persona switch does not open a
sealed case; that a recused person is refused despite their role; and that the count of open reports is
honest for every viewer. *Pass when:* protection is a property of the design, not of a setting.

**Requirement 23 — Indicators cannot lie about their own band.** *Demonstrate:* a lower-is-worse
indicator and a higher-is-worse indicator both breaching correctly. *Pass when:* the band is derived
and cannot be overridden.

**Requirement 24 — The platform governs itself.** *Demonstrate:* a configuration change that is
maker-checked and logged, and an audit log that the administrator cannot edit. *Pass when:* the
platform can pass, on itself, the test it applies to its customer.

### 20.3 Traceability matrix

| Requirement | Workflows | Key rules | Primary screens |
|---|---|---|---|
| 1 One platform | 5.1, 5.4, 5.10 | `BR-LNK-01`, `BR-LNK-05` | Cockpit, obligations, controls |
| 2 Policy-driven duties | 5.4, 5.18 | `BR-EVD-01` | Obligations, policies, task detail |
| 3 Clause as the unit | 5.1, 5.2 | `BR-AUT-02` | Source library, clause detail |
| 4 Source to action | 5.1 | `BR-LNK-01`, `BR-LNK-02`, `BR-LNK-03` | Clause detail, obligation detail |
| 5 Map once, satisfy many | 5.1, 5.8 | `BR-LNK-04` | Control detail |
| 6 Risk from consequence | 5.1, 5.12 | — | Clause detail, risk detail |
| 7 Connected demonstration | 5.1, 5.4, 5.6, 5.12 | `BR-LNK-03`, `BR-LNK-05` | Every detail screen |
| 8 Role-based views | 5.28 | `BR-SCP-01` to `BR-SCP-04` | Queue, cockpit, registers |
| 9 Regulatory change | 5.3 | `BR-LFC-08` | Reg change |
| 10 Multi-regulator incident | 5.10, 5.6 | `BR-SCH-06`, `BR-SCH-08`, `BR-LFC-05` | Incident detail, clocks |
| 11 Recurring duties | 5.4, 5.5 | `BR-SCH-02` to `BR-SCH-05` | Obligation detail, calendar |
| 12 Audit flow | 5.21, 5.22 | `BR-LFC-07`, `BR-LNK-06` | Audits, issues |
| 13 Packs as a view | 5.26 | `BR-AUT-06` | Pack generator |
| 14 Metrics on demand | 5.28, §10 | `BR-DRV-*` | Cockpit |
| 15 Shaped to a standard | §16 | — | — |
| 16 Nothing waits | 5.27 | `BR-ESC-01` to `BR-ESC-07` | Obligation detail, audit log |
| 17 Governed deviations | 5.14 | `BR-DRV-08` | Exception register |
| 18 Acceptance expires | 5.13 | `BR-LFC-04`, `BR-AUT-07` | Risk detail |
| 19 Cycles move the register | 5.16 | `BR-DRV-10` | Campaigns, risk detail |
| 20 Version-bound attestation | 5.17 | `BR-LFC-06`, `BR-DRV-13` | Campaigns, policy detail |
| 21 Computed third-party tier | 5.19, 5.20 | `BR-DRV-03` | Third-party register |
| 22 Structural protection | 5.24 | `BR-SCP-05` to `BR-SCP-09`, `BR-DAT-02`, `BR-AUD-05` | Speak-up |
| 23 Honest bands | 5.15 | `BR-DRV-02` | Indicators, risk register |
| 24 Self-governance | 5.30 | `BR-AUT-08`, `BR-AUD-02` | Settings, audit log |

A system that can demonstrate all twenty-four, on a coherent set of real, representative instruments,
in front of the three constituencies that decide, is a winning system.

---

## 21. Open Decisions

These are the calls that should be made before the build commits, captured here so they are not
decided by default. The first ten carry forward from v1.0; the remainder are new, and most of them
surfaced from reconciling this document against the prototype.

*(v2.1 status note.)* Three calls that were open or implicit in v2.0 are now **decided** and folded
into the body of this document: the "control coverage" definition (#11 below), the **exception
model** (first-class entity, union register, expiry review — §5.14), and the **identifier scheme**
(§7.4). The build plan carries per-chunk defaults for several of the rest; a default is not a
decision, and the numbered items below remain open until ruled on.

**Carried forward.**

1. **Audience and layering of materials.** Whether this specification serves only the build team, or is
   also adapted into a customer-facing solution narrative, and how the two are kept in step.
2. **Scope breadth for the first release.** Sector regime only, sector plus the cyber overlap, a
   representative slice across all duty areas, or the full universe. *Recommendation:* a representative
   slice that proves the model across towers, with breadth added later.
3. **The lead anchor.** Whether the first built and demonstrated thing is the source-to-action pipeline,
   a single persona's end-to-end journey, or the connected core modules. The pipeline is the spine and
   the natural lead; the customer narrative may favour a persona journey.
4. **How real the intelligence is in the first release** (G-08 to G-10).
5. **The backend reality for the agentic features** — automatically pulling instruments from regulator
   sources, and engaging an external specialist, are the most backend-heavy and accuracy-sensitive.
6. **Integration depth for the pilot** — which feeds are connected read-only first, and in what order.
7. **The standard-certification ambition** — positioned as a programme the product accelerates, kept
   clearly distinct from the product.
8. **Evidence and history migration** — how much is in scope for the first release (§18).
9. **Incumbent displacement and migration** — how far to build the parallel-running comparison (§18.3).
10. **Deployment and data residency** — which delivery model, and whether residency requires the
    split-plane approach (§15).

**New.**

11. **The definition of "control coverage".** ***Decided (v2.1):*** both metrics are built, labelled
    **Control pass rate** and **Duty coverage**; the bare word "coverage" is banned from the UI
    (§10.1, G-19, and the dashboard design document). Recorded here because the number will be
    quoted in front of boards and the decision must not reopen by accident.
12. **Line-of-defence constraints on maker-checker.** Whether "not the same person" is sufficient for
    the first release, or whether the checker must be constrained by line (`BR-AUT-10`, G-17).
13. **Delegation.** The model for cover during absence, and specifically whether a delegate may ever
    inherit approval rights (G-16). The recommendation in this document is that they may not.
14. **Clock-start rules per regulator.** How far the customer configures trigger conditions and start
    events, particularly for a duty triggered by later discovery (`BR-SCH-07`, G-18).
15. **Whether the Company Secretary becomes a switchable persona.** He holds clause authority and a
    distinct statutory calendar but is currently not selectable.
16. **Ownership of third-party risk.** The standing narrative names a dedicated vendor and third-party
    lead; the prototype's roster now assigns that person to the platform administrator role and leaves
    TPRM ownership implicit. The real org design should be settled and the roster reconciled.
17. **How the persona switcher behaves once real authentication exists.** It must become a view selector
    rather than an impersonation device (G-02); whether any genuine impersonation capability exists for
    support, and under what audit, is a decision.
18. **Retention floors.** The specific retention period for the audit log, evidence and closed
    investigations, per the applicable regimes.
19. **Whether closed investigations are ever purged**, and who may authorize it.
20. **The sector-pack extension model.** Whether a second sector is a configuration exercise or a build,
    which determines how much of the pack must be data-driven from the outset.

---

## 22. Glossary

For a reader new to this domain.

- **Assistive and agentic modes.** Two ways the platform's intelligence helps: *assistive* is in-screen
  help with the next step; *agentic* is multi-step work returned as a proposal. Both propose; a person
  disposes.
- **Attestation.** A person's recorded acknowledgement that they have read and accepted a policy, always
  against a specific version of it.
- **Campaign.** A fanned-out periodic cycle — self-assessment, attestation or due diligence — that
  creates one task per in-scope object, routes each submission to a checker, and files a completion
  certificate.
- **Clause (or provision).** The smallest individual rule inside a law, regulation, circular or policy.
  The atomic unit the product manages.
- **Continuous control monitoring.** Testing a control automatically and continuously rather than by
  hand, and escalating on its own when it fails.
- **Control.** The measure that actually satisfies a duty. One control can satisfy many clauses across
  many laws ("map once, satisfy many").
- **Control plane and data plane.** The *control plane* is the reasoning and the connected model; the
  *data plane* is the feeds and systems of record it connects to. Keeping them separate lets a firm
  adopt the model without replacing its systems, and lets sensitive data stay where the law requires.
- **Department scope.** The access boundary derived from a record's owner: a user sees their own
  department's records, with compliance and the administrator seeing all.
- **Escalation ladder.** The fixed sequence of reminders before a deadline and escalations after it,
  each rung notifying a wider audience, used by every module.
- **Ethics office.** The named individuals who may open speak-up cases. Membership is by person, not by
  role.
- **Evidence.** The real artifact that proves a control operated or a duty was done. Required to
  complete a duty. Generated text is never evidence.
- **Exception.** An approved, time-boxed, compensated deviation from a control or an obligation — a
  first-class record with an enforced expiry and an expiry review. It may link the issue that
  prompted it; a proactive exception has none. It appears alongside issues in the one remediation
  register.
- **Governance, Risk, Compliance and Audit (GRC).** The connected disciplines of steering an
  organization, managing what could go wrong, meeting obligations, and independently checking that all
  of it is real.
- **Inherent and residual risk.** *Inherent* is the rating before controls; *residual* is what remains
  after them. The "how serious" half should be grounded in the actual penalty.
- **Key risk indicator.** A measured number with thresholds and a direction, attached to a risk, whose
  band is derived from the reading rather than stated.
- **Line of defence.** First line owns and manages the risk in daily work; second line oversees and
  challenges; third line provides independent assurance; the board sits above all three.
- **Loss event.** The financial consequence of an incident or a confirmed fraud, categorized on the
  standard operational-risk taxonomy, with net loss derived as gross minus recoveries.
- **Maker-and-checker.** A separation-of-duties rule: the person who performs an action ("maker") is not
  the person who approves it ("checker").
- **Obligation.** A duty the firm must perform. *External* obligations are imposed by law and
  regulators; *internal* obligations are duties the firm sets itself. The product treats both
  identically.
- **Proof chain.** The canonical spine every record sits on: source clause or policy → control →
  obligation → task → evidence, with risk attached as the consequence.
- **Provenance and traceability.** The ability to trace a record forward (what a clause produced) and
  backward (why an obligation exists).
- **RCSA (risk and control self-assessment).** The periodic cycle in which first-line owners re-score
  their risks and assess the controls over them, with approval writing the result back to the register.
- **Recusal.** Standing down from a case because of a conflict. In this product recusal beats clearance:
  a recused person cannot open a case whatever their role.
- **Regulator clock.** A countdown to a regulatory deadline, from a periodic filing to a short
  incident-reporting window. All of them sit on one timeline.
- **Regulatory change management.** Detecting changes in the law, assessing what they affect, and
  routing them to the right owner before they become urgent.
- **Risk appetite and tolerance band.** The board's stated willingness to carry a type of risk, and the
  numeric band against which the register's live aggregate is compared.
- **Sector pack.** A tailored cockpit for a regulator or industry that gathers the relevant duties,
  committees, controls and reports in one place, without fragmenting the shared model.
- **Task.** The platform's one unit of work — used by obligations, remediation, campaigns,
  data-subject-request stages and attestations — carrying its own maker, checker, deadline and,
  depending on its completion policy, evidence or a second-person approval.
- **Third-party (or vendor) risk.** The exposure created by outsourcing, tracked per arrangement with a
  derived risk tier, independent assurance, and a tested exit plan.
- **Vigil mechanism (speak-up channel).** The statutory whistleblowing channel, with direct access to
  the audit committee chair, an acknowledgement and a substantive-feedback duty, and structural
  protection of the reporter.
- **Working paper.** The record of one test performed during audit fieldwork, and the basis of any
  finding raised from it.
---

## 23. Demo-only constructs and their production answers *(new in v2.1)*

The prototype exists to make a sceptical audience believe the connected model, and much of what it
does to achieve that is **staging**: a world arranged around one instant, numbers arranged to look
lived-in, and shortcuts that make a single-user, in-memory demo feel like a platform. Every one of
those choices was right for the demo. **None of them is a requirement**, and several of them are
the *opposite* of a requirement. This section is the fence: each demo construct, why the demo does
it, and what production must do instead. When a reviewer finds one of these patterns in a build PR,
this table is the citation.

| # | Demo construct | What it is / why the demo does it | What production must do instead |
|---|---|---|---|
| D-01 | **The demo "now" anchor** | The world is seeded relative to one instant so the story is always mid-flight (the marquee incident's 6-hour clock reads ~3h11m on first paint). Originally frozen at Wed 10 Jun 2026, 05:02:18 IST; the prototype later moved to an evergreen anchor — the moment the app loads — with every seeded date an offset from it. Either way, **the anchor is the load-bearing fiction**: deadlines, ages, histories and countdowns are all staged around it | All time flows through one clock service in the organization's zone (`BR-SCH-09`); deadlines are real dates; "as at" is stamped on every metric surface and pack; seeds are parameterized by anchor and used only in demo/test profiles; the scheduler fires for real while staying reconstructible (G-05) |
| D-02 | **Deadlines and ages as offsets from the anchor** | "Detected 2h48m ago", "9 overdue", "assurance expiring in 60 days" are all seed offsets chosen for narrative tension | Deadlines come from cycles (5.5), clocks (5.10) and expiries (5.13/5.14) computed from real records; nothing is staged; the mix of urgent and quiet is whatever the data says, including "nothing urgent" |
| D-03 | **Synthesized history** | Past cycles, past test results and past readings are generated backwards from the anchor so ledgers and trends have something to show | History accrues from go-live; migration imports history only where real dates exist (§18.2); windows without enough history say "since go-live (n months)" — never back-filled synthesis (G-26) |
| D-04 | **Fabricated trend curves** | The three cockpit series are RNG-generated shapes landing on the headline value, with hard-coded chart headlines — a demo needs a line, and the seed has no real past | `BR-DRV-18`: a series is the metric's own function evaluated at past instants; the last point is the live value; the tile and the chart share one function. No stored or synthesized series, ever |
| D-05 | **The stored enterprise-risk headline (7.8/10, "+0.3 QoQ")** | A board number the demo cannot derive, so it is a seeded constant with a string-literal trend | Enterprise residual exposure derived per `BR-DRV-05` enterprise-wide on the 1–25 scale, with quarter-over-quarter movement reconstructed per `BR-DRV-07` (§10.1). No stored headline anywhere |
| D-06 | **Mean-age "readiness" metrics** | "Avg remediation days" and mean finding age are easy to seed and look managerial | Banned: a mean of open ages improves when young items close and flatters stalling. Ageing bands + oldest item + %-closed-within-SLA (§10.1) |
| D-07 | **On-time rate over "cycles filed"** | With a staged world every cycle is filed, so the denominator error is invisible in the demo | On-time rate is over **cycles that fell due**; unfiled counts against (§10.1) |
| D-08 | **"No empty tables anywhere"** | Demo realism: an empty screen reads as an unfinished prototype | Empty states are **designed** (§17.4): day-one, filtered-to-nothing, module-absent and nothing-to-report are four different messages; a metric without inputs reads "no data — reason"; pack sections are absent, not empty (5.26) |
| D-09 | **"Non-round numbers everywhere"** | Round numbers read as invented in a demo | Round numbers are legitimate output (§17.4); honesty comes from denominators and drill paths (§10.1), not from organic-looking values |
| D-10 | **Demo volumes and staged headline figures** | Appendix A's counts (273 controls, 217 obligations, 649 evidence items…) and figures (AUM, subscribers, "12,973 updates captured") are seed sizing and world-building | §17.1 is the scale contract — low thousands of records, hundreds of thousands of evidence items, millions of log entries. Nothing in Appendix A is a limit, a target or a product number |
| D-11 | **Semantic, unbounded identifiers** | `SRC-PFRDA-INV-COMMITTEE`, `OBL-PFRDA-Q1-07` made demo screens self-explanatory | §7.4 v2.1: meaning-free ids ≤11 chars in two patterns; meaning in `title`/`shortTitle`; the legal reference in `citation` |
| D-12 | **The persona switcher as authentication** | One reviewer plays six people; impersonation *is* the demo | Real authentication with the switcher as a **view selector** over the person's actual roles (G-02); impersonation only as a logged dev-mode act; a persona switch never confers access (`BR-SCP-05`) |
| D-13 | **Client-side authority and scope checks** | The demo has no server; checks live in the UI | The one authority check server-side (G-03, `BR-AUT-01`); the client renders capabilities the server computed; hiding a button is presentation, refusal is control (`BR-AUT-03`) |
| D-14 | **Session-scoped "append-only" audit log** | Append-only until reload — enough to demonstrate the trail | Genuinely tamper-evident storage: hash-chained, same-transaction with the mutation, immutable at the database layer, retention floor enforced against everyone (G-15, `BR-AUD-02`, `BR-DAT-05`) |
| D-15 | **The ladder derived but never firing** | Reminder rows are computed against the anchor so the trail *displays*; nothing sends | A real scheduler fires rungs on time with delivery, retry and confirmation, writing each firing to the log — while the ladder stays derivable so it can be reconstructed and tested (G-05, `BR-ESC-03`) |
| D-16 | **Seeded connector statuses and last-sync times** | The integrations screen must look alive | Real connector framework with credentials, retry, idempotency and sync history (G-07); a feed that cannot see degrades its rules (`BR-DRV-09`); simulated spokes are labelled simulated |
| D-17 | **Mocked filings, uploads and exports (toast + drawer)** | Side-effect-free actions keep a demo safe | Real file handling with scanning, limits, hashing and retention (G-13/G-14); real export formats under the caller's scope (`BR-DAT-06`); regulator filing at minimum as a governed manual act with the acknowledgement as evidence (G-12) |
| D-18 | **Scripted, deterministic "intelligence"** | Same input, same output — reproducible on stage, no model risk | The seam (§13.3) with real capability behind it when adopted, under §13.4 governance. The durable requirement is the **recorded run** (inputs, evidence, outputs — 5.29), not bit-determinism, which only the deterministic provider promises |
| D-19 | **Exception-as-issue** | One object bought the demo the whole remediation UI for free | First-class Exception with subject, optional issue link, expiry review, escalating renewal authority; the register is a union view (5.14, `BR-LFC-13`, `BR-AUT-11`) |
| D-20 | **Single user, single session** | No concurrency in a one-presenter demo | Optimistic versioning with a visible conflict path — the second writer is told what changed, never silently overwritten (§17.5, G-04) |
| D-21 | **Sector-named routes and surfaces** (`/pfrda`, `/dpdp`) | The demo sells one sector to one customer | Sector packs are configuration (§14.3, §21.20); routing and navigation are sector-neutral, with the pack's slug and sections data-driven |
| D-22 | **The marquee scenario chain** | One staged cascade (patch-SLA → issue → incident → three clocks) recurs across screens so the world feels coherent | The *mechanism* is the requirement (5.9's cascade, `BR-LFC-11`, `BR-EVD-04`); the specific staged incident is seed data. Production's coherence comes from the engines, not from curation |

**How to use this section.** In review, any PR that (a) stores a derivable value, (b) synthesizes a
series or an age, (c) invents a threshold or a value to avoid an empty or round display, (d) checks
authority in the client, or (e) reintroduces meaning into identifiers, is reproducing a demo
construct — cite the row, not just the taste.

---

## Appendix A — The seeded demonstration world *(demo only — not product requirements)*

**Everything in this appendix describes the demo seed.** Nothing here is a volume target (§17.1
holds those), a metric definition (§10 and the dashboard design hold those), or a UI rule (§17.4
holds those). §23 maps each construct below to its production answer. The appendix is retained
because the seed world remains a build asset — the generators feed the demo and test profiles — and
because knowing exactly what was staged is how the team avoids inheriting it.

The prototype's world is deterministic: the same seed produces the same records on every load, so a
demonstration is reproducible. **The demo "now" anchor:** the world was originally frozen at
**Wed 10 Jun 2026, 05:02:18 IST**; the prototype has since moved to an **evergreen anchor** — the
real moment the app loads — with every seeded date held as an offset from it, so the marquee
incident's six-hour cyber clock reads roughly three hours eleven minutes remaining on first paint
on *any* demo date. Everything that looks temporal in the demo hangs off this anchor: seeded
deadlines and detection times (offsets), the "history" behind ledgers and trend lines (generated
backwards from it), reminder-ladder rows (derived against it, never fired), expiry and staleness
states, and every period-over-period comparison. In production none of these may depend on any
anchor: see §23 D-01 to D-05 and G-05/G-26.

**Volumes as built** *(seed counts, not scale targets — §17.1 governs scale)*.

| Object | Count | Note |
|---|---|---|
| People | 23 | 8 departments, 3 lines of defence, 11 switchable personas |
| Source instruments | 22 | Including framework standards as reference-only, and 8 recently-arrived drafts awaiting decision |
| Source clauses | 67 | Across the focus instruments |
| Controls | 273 | 40 continuously monitored; each mapped to 2–4 framework references |
| Risks | 140 | Across six domains |
| Key risk indicators | 27 | |
| Obligations | 217 | Across six regulators plus internal duties |
| Policies | 46 | |
| Evidence items | 649 | Roughly 70% auto-captured |
| Issues | 131 | Including the exception register |
| Incidents | 60 | 1 live critical marquee, 4 open high, the rest closed |
| Audits | 18 | 27 open findings, each with a 1:1 remediation issue |
| Audit plan entries | 16 | |
| Working papers | 124 | |
| Regulatory changes | 90 | |
| Data assets | 120 | |
| Data-subject requests | 14 open | Including the worked erasure-versus-retention case |
| Third parties | 24 | |
| Campaigns | 8 | Assessment, attestation and due diligence |
| Speak-up reports | 8 | Including sealed cases |
| Fraud cases | 5 | |

**Headline measures at the anchor** *(staged demo values — two of them are the defects §23 D-05/D-06
name: "enterprise risk 7.8/10" is a seeded constant, and "control coverage" is the conflated number
v2.1 split)*: enterprise risk 7.8/10 rising · control coverage 96.3% · 40 monitored controls · 5
open incidents, 1 critical · 9 overdue obligations · 43 due within thirty days · 27 open findings ·
assets under management ₹3,24,718 crore · 41,86,902 subscribers · 12,973 regulatory updates
captured in the prior year. None of these figures is a product number.

**Demo seeding aesthetics** *(v2.1: these apply to seeding demo and test worlds — and to nothing
else; they are **not** UI or product requirements, and two of them have explicit production
counter-rules in §17.4)*: realistic names drawn from the customer's own geography; real clock
timestamps rather than "X minutes ago" placeholders (production derives relative phrasing from
absolute timestamps anyway, `BR-SCH-09`); non-round figures, because round numbers read as invented
*in a demo* — production shows round numbers plainly (§17.4); masked personal identifiers and no
real personal data (this one **is** also a production rule, `BR-DAT-01`); no empty tables in the
seed — production designs its empty states instead (§17.4, §23 D-08); and one load-bearing scenario
chain (§19.1) that recurs across screens so the demo world is internally consistent.

---

## Appendix B — Route map *(the prototype as built — demo reference)*

This is the prototype's route map, kept as the baseline reference §0 names. It is not a URL
contract. In particular, two routes bake one sector's names into the path — `/pfrda` (the sector
pack) and `/dpdp` (data governance) — which contradicts the extensibility requirement that a second
sector be configuration, not build (§14.3, §21.20). Production routing is sector-neutral: the
sector pack lives at a configured slug and data governance under a regime-neutral path (§23 D-21).

| Route | Screen |
|---|---|
| `/` | Home — Board Cockpit |
| `/queue` | My Queue |
| `/risks` · `/risks/:id` | Risk Register · Risk detail |
| `/controls` · `/controls/:id` | Control Library · Control detail |
| `/ccm` · `/ccm/:id` | Continuous Control Monitoring · Rule detail |
| `/policies` · `/policies/:id` | Policies · Policy detail |
| `/campaigns` · `/campaigns/:id` | Campaigns · Campaign detail |
| `/vendors` · `/vendors/:id` | Third Parties · Third-party detail |
| `/incidents` · `/incidents/:id` | Incidents · Incident detail |
| `/fraud` · `/fraud/:id` | Fraud Cases · Case detail |
| `/whistleblower` · `/whistleblower/:id` | Speak-up · Report detail |
| `/obligations` · `/obligations/:id` | Obligations & Calendar · Obligation detail |
| `/tasks/:id` | Task detail |
| `/reg-change` · `/reg-change/:id` | Regulatory Change · Change detail |
| `/sources` · `/sources/:id` · `/sources/section/:id` | Source Library · Instrument detail · Clause detail |
| `/pfrda` | Sector Pack |
| `/dpdp` · `/dpdp/dsar/:id` | Data Governance · Request detail |
| `/audits` · `/audits/:id` | Audits · Audit detail |
| `/issues` · `/issues/:id` | Issues & Remediation · Issue detail |
| `/evidence` · `/evidence/:id` | Evidence Vault · Evidence detail |
| `/integrations` | Integrations |
| `/settings` | Settings |

---

## Appendix C — Rule index

| Group | Prefix | Rules | Covers |
|---|---|---|---|
| Authority and separation of duties | `BR-AUT` | 01–11 | Central authority check, clause authority by department, maker ≠ checker, configuration governance, escalating exception-renewal authority (v2.1) |
| Scope, visibility and confidentiality | `BR-SCP` | 01–09 | Department derivation and boundary, case access by person, recusal, sealed-case counting, queue gating |
| Evidence | `BR-EVD` | 01–07 | Evidence required, submit-and-verify, auto-capture still verified, linkage, guidance, generated text |
| Scheduling, recurrence and clocks | `BR-SCH` | 01–09 | One calendar, auto-scheduling, on-time definition, clock start at detection, sticky breach, time zones |
| Reminders and escalation | `BR-ESC` | 01–07 | The fixed ladder, one engine, logged firing, real named targets, per-step chasing, expiry windows |
| Derived values | `BR-DRV` | 01–18 | Every computed value and its normative definition; Overdue always derived and trends never synthesized (v2.1) |
| Lifecycle and transitions | `BR-LFC` | 01–13 | Legal transitions, supersession, action gating, expiry, closure gates, recorded negative decisions, exception expiry review (v2.1) |
| Linkage and provenance | `BR-LNK` | 01–10 | Two-way traceability, one chain renderer, grouping by act, one issues register, one loss engine |
| Audit trail | `BR-AUD` | 01–07 | One entry per change, append-only, system events, navigability, confidential logging, agent attribution |
| Assistive and agentic | `BR-AI` | 01–07 | No mutation on run, no agent-only path, unverified extraction, no generated evidence, scoped answers |
| Data handling and privacy | `BR-DAT` | 01–06 | Masking, identity not held, retention conflicts, residency, log retention floor, export scope |

---

## Appendix D — Change log

| Version | Date | Change |
|---|---|---|
| 2.1 | 22 Aug 2026 | **Demo-to-production audit** before the build commits; every change itemized with severity in the companion change register. Demo constructs quarantined: new **§23** (demo constructs → production answers); Appendix A relabelled demo-only, its anchor description corrected (now evergreen) and its dependency set named; Appendix B relabelled as the prototype route map with the sector-neutral routing note. Models corrected: **Exception** made first-class with a subject, an optional issue link, an expiry review and escalating renewal authority (§5.14, §7.1–7.3, `BR-LFC-13`, `BR-AUT-11`; `BR-LNK-06` reworded as a union view — supersedes v2.0's exception-as-issue); **Task** unified as one work-item engine with a `completionPolicy` (§5.4, §5.7, §7.3); **Obligation/ObligationCycle** split made explicit with the cycle-id convention (§7.1, §7.4); risk state `Exception expired` renamed `Acceptance lapsed` (§5.13, §7.3, Req 18). **Identifiers** redesigned (§7.4): two patterns, ≤11 chars, no semantic middles, `title`+`shortTitle` required, `citation` field; all examples updated. **Metrics** corrected (§10): enterprise-risk headline derived not stored; mean-age measures banned in favour of ageing bands + oldest + SLA; on-time denominator fixed to cycles-fallen-due; "coverage" split into Control pass rate and Duty coverage and banned as a bare UI word (§21.11 decided, G-19 decided); board surfaces defer to the dashboard KPI design document; new rules `BR-DRV-17` (Overdue derived) and `BR-DRV-18` (no synthesized trends). §5.29 agent determinism replaced with the recorded-run requirement. §4.10 matrix declared data; Person↔Role many-to-many made explicit; §17.4 gains designed-empty-states and round-numbers-legitimate; persona switcher stated as a view selector on §8.3. No rule, gap or workflow renumbered. |
| 2.0 | Prior | Reconciled against the prototype as built. §4 expanded into the full authority model with the visibility and action matrices. §5 expanded from ten narrated flows to thirty workflows on a uniform template with state machines and acceptance criteria. New: §6 business rules, §7 object and state models, §10 metric definitions and pack catalogue, §11 notification matrix, §13 intelligence scope and governance, §14 configuration model, §17 non-functional requirements, §18 migration, §19 gap register, §20.2–20.3 additional acceptance criteria and traceability. §12 integrations expanded into a connector catalogue. §21 open decisions extended from ten to twenty. Glossary extended. The document's own constraint on containing no lifecycle, cardinality or metric detail was relaxed and the change stated in "How to read". |
| 1.0 | Prior | Functional narrative: overview, architecture, principles, personas, ten flows, screens, capabilities, integrations, deployment, security, demo scope, fifteen acceptance requirements, ten open decisions, glossary. |
