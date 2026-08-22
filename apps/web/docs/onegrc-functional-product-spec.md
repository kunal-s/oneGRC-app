# OneGRC — Functional Product Specification

**A unified Governance, Risk, Compliance and Audit platform for regulated enterprises.**

---

## How to read this document

This is a functional specification. It describes **what** the product does, **why** it does it, and **who** it does it for. It deliberately contains no technical design: no data schema, no field names, no file layout, no database design, no interface contracts, no implementation instructions, and no effort estimates. Where it touches architecture, it stays at the level of ideas (for example, distinguishing a "control plane" from a "data plane"), never naming components or mandating technologies. The job of turning this into a build belongs to the engineering team that receives it.

It is written to stand entirely on its own. A developer who has never heard of this product, and who knows nothing about the compliance industry, should be able to open any single section and understand who is using the feature, what the flow is, what appears on screen, and what difference it makes. To make that possible, the document carries one continuous worked example throughout, and ends with a glossary of every domain term it uses.

**The worked example.** Wherever a concrete illustration helps, the document uses a single fictional customer: **Sankalp Pension Funds Pvt. Ltd. (SPF)**, a mid-size, heavily regulated financial firm that manages retirement savings for several million subscribers. Its named (and entirely fictional) staff recur across the scenarios so that the same people reappear in different flows:

- **Meera Krishnan**, Chief Risk Officer.
- **Anjali Deshmukh**, Compliance Officer.
- **Vikram Rao**, Company Secretary (in a firm this size, the compliance and secretarial roles sit close together, and one person often wears both hats).
- **Rajesh Iyer**, Chief Information Security Officer.
- **Arvind Patel**, Investment Compliance Officer.
- **Sunita Menon**, Head of Internal Audit.
- **Priya Sharma**, Data Protection Officer.
- **Deepa Iyer**, Finance and Tax lead.
- **Farhan Ali**, HR and Labour lead.

SPF is a stand-in. The product is built for any regulated enterprise that has to obey a mix of sector rules and general statutes, prove it on demand, and survive an inspection. The pension-fund details are the most demanding example, not the only target.

---

## 1. Product Overview

### What it is

OneGRC is one platform that unifies an organization's **governance, risk, compliance and audit** work. Today most organizations run these as separate islands: cyber and IT compliance in one tool, financial and statutory compliance in spreadsheets and email, risk in another register, audit in its own tracker, and a legacy "regulatory content" service that lists what the law says but connects to none of the firm's actual controls or evidence. OneGRC replaces that fragmentation with a single connected model in which a law or an internal policy produces a duty, the duty has an owner and a deadline, a control satisfies it, evidence proves the control ran, a risk rating expresses how serious it is if the duty is missed, audit independently tests it, and any change in the law flows back through the whole chain. The same underlying records are presented differently to a board member, a compliance officer, and a junior analyst, so that one fine-grained system serves very different readers.

### Who it is for

The primary buyer and owner is the compliance function of a regulated mid-size enterprise, often the same person who serves as Company Secretary. But the platform is bought and judged jointly by three constituencies that historically each had their own tool: **Compliance, Information Security or IT, and Risk**, with **Internal Audit** as an independent user and the **board and executive** as the oversight audience. The reason these groups buy together is the reason the product exists: the work genuinely connects, and a tool that serves only one of them leaves the others stranded. (Section 4 describes each persona in full.)

### The problem it solves

A firm like SPF cannot, today, answer one deceptively simple question on demand and with proof: *"Are we compliant, across everything we are obliged to do, right now, and can we show it?"* The pieces of the answer live in different systems, different inboxes, and different people's heads. Four specific pains follow from that:

1. **Fragmentation.** IT compliance, statutory and secretarial compliance, tax, labour, and sector-specific duties are tracked separately, so there is no single, current picture.
2. **Inspection and personal exposure.** A regulator can inspect, and senior officers carry personal liability. The recurring nightmare is the finding that a control was operating but was never documented, so it cannot be proven. That is an evidence gap, and it is precisely what a connected, evidence-backed system is built to prevent.
3. **The periodic scramble.** Preparing for a board meeting or an audit takes weeks of manual collation, and the resulting snapshot is stale by the time it is presented. Compliance is reactive and event-triggered rather than continuous.
4. **Tool sprawl and a disconnected incumbent.** Firms accumulate point tools, and the legacy regulatory-content product tells them what the rules are and when filings fall due, but it does not connect a rule to the firm's own controls, evidence, or risk.

### The core idea, in one line

A law or a policy creates a duty; the duty is owned and scheduled; a control satisfies it; evidence proves it; a risk rates the cost of missing it; audit tests it; and change management keeps the whole chain current. OneGRC makes that chain **visible and operable**, and surfaces it to each person at the level they need.

---

## 2. Architecture Overview (conceptual)

This section describes the shape of the system as ideas, not as components. Nothing here mandates a technology.

### Two planes

It is useful to picture OneGRC as two layers.

- **The control plane** is the brain. It holds the connected model of sources, obligations, controls, risks, policies, evidence, incidents, audits and findings, and it runs the workflows and governance that operate on them: the maker-and-checker approvals, the role-based views, the clocks and escalations, the recommendations. This is where the product's value lives, and it is largely the same regardless of which customer systems sit underneath.
- **The data plane** is the senses. It is the set of feeds and systems of record the platform connects to in order to populate and prove the model: security monitoring, the IT service desk, identity systems, privacy tooling, tax-filing systems, regulatory-intelligence feeds, and sector systems. The control plane reads from these where it can, so that evidence and signals flow in rather than being keyed by hand.

Keeping these conceptually separate matters for two reasons. First, it lets a customer adopt the brain without ripping out their existing systems of record (see "alongside other tools" below). Second, it allows sensitive data to stay close to the customer while the reasoning happens in the control plane, which is relevant where data residency is a legal requirement (Section 9 and Section 10).

### The connected model (the spine)

At the heart of the control plane is a single connected model that reads as one continuous line from **source to action**: a legal instrument is broken into its individual clauses; an applicable clause becomes a tracked obligation; the obligation has an owner, a cadence and an evidence requirement; a control satisfies it; evidence proves the control operated; a risk rating expresses the consequence of failure; and an audit can independently test any link in the chain. Every record carries its **provenance** both ways: forward, so you can see what a clause produced, and backward, so you can see why an obligation exists. The same objects roll up into a board view, a compliance view, and an individual's task list, each at a different altitude.

### Modes of operation

OneGRC operates in two modes, both of which keep a human in control.

- **Assistive mode** sits inside the screens. It reads a record and its links and helps a person do the next step faster: drafting a plain-language description of a clause, suggesting which existing control already covers it, answering a scoped question like "what do I owe this month," or flagging an obligation that is missing evidence.
- **Agentic mode** runs multi-step work and returns a result for a person to approve: scanning regulatory sources for changes, proposing how a new clause maps to controls, watching control status and chasing owners, or assembling a board pack as a living view.

In both modes the rule is the same: the system proposes, a human disposes. Nothing the assistant produces becomes a tracked obligation, a filed return, or a piece of evidence without a person accepting it. For the first releases, these intelligent behaviors may be deterministic and scripted while the connecting structure is built; the design keeps a clean seam so the scripted behavior can be replaced with real capability later without reworking the screens.

### How it sits alongside other tools

OneGRC is **vendor-neutral** and is positioned as a backbone that integrates rather than replaces. The customer's existing systems of record (for example, their IT service desk) are explicitly kept and connected, not displaced. The platform's role is to be the one place where the obligations, controls, risks and evidence reconcile, drawing signals and proof from whatever systems the customer already runs. Which backbone or systems a customer keeps is the customer's decision; the product does not force a stack.

### Default posture

Detail screens are **read-by-default with explicit, governed actions**. A user reads the connected picture freely, but any change that matters (approving a filing, signing off an incident report, accepting a clause as a tracked obligation) is an explicit action that runs through maker-and-checker control and is written to a tamper-evident log. This keeps the platform trustworthy in a regulated setting.

---

## 3. Design Principles and Product Philosophy

These are the non-negotiable beliefs that should shape every screen and every flow. If a design decision conflicts with one of these, the principle wins.

**The clause is the atomic unit.** The smallest thing the system manages is not an act or a regulation but an individual **clause or provision** within it. This is deliberate: a clause is the level at which four things line up at once. The work is done per clause, the proof is captured per clause, accountability is assigned per clause, and the consequence (and therefore the risk) is defined per clause. Coarser than that and a user cannot act or evidence; finer than that and there is nothing to manage. Everything else in the model hangs off the clause.

**From source to action, as one line.** Every obligation should read as a single continuous statement: this exact provision requires this, it applies to us because of that, this person owns it, it is due then, this control satisfies it, here is the evidence, here is the risk if it slips, here is the next action. A citation on its own is not enough; the value is the unbroken line from the law to the work to the proof.

**Internal and external obligations are one fabric.** A duty the firm owes the world (a statutory filing) and a duty the firm has set itself (a policy-driven review) are handled identically: same register, same calendar, same ownership, same evidence, same approval. The system does not privilege the statute over the policy. A formal definition of compliance, which the product follows, is "meeting obligations," and obligations are both external (imposed by law and regulators) and internal (anything the organization commits itself to).

**Map once, satisfy many.** A control is the thing that actually satisfies a duty, and one control can satisfy many clauses across many different laws. The model is many-to-many on purpose, so the firm does the underlying work once and points many obligations at it, rather than rebuilding the same control for each rule.

**Evidence is first-class, and "done but not documented" is the failure to prevent.** Proof is not an afterthought; it is a required part of completing a duty. The system's structure should make it impossible to mark a duty complete with nowhere for its evidence to live, because the single most painful real-world finding is a control that operated but was never documented.

**Risk derives from consequence.** A risk rating is the combination of how likely a failure is and how bad it would be, and the "how bad" should be grounded in the actual sourced penalty. A duty whose breach escalates from a fixed fine to a per-day charge to personal disqualification of officers is a high-consequence item, and the system should rate it that way from the penalty itself rather than from unaided judgment.

**One calendar, one clock.** Every deadline, from a quarterly filing to a six-hour incident-reporting window, lives on one timeline. A user should never have to assemble the firm's obligations from several calendars.

**Role-based simplified views (altitude per persona).** The data underneath is fine-grained, but each person is shown it at the altitude appropriate to them: the board sees a roll-up and the exceptions; the compliance officer sees the full register and where coverage is thin; an individual owner sees only their own handful of tasks and the single action each one needs. Simplified views are not cosmetic; they are the mechanism that lets one fine-grained system serve everyone.

**Continuous, not periodic.** The platform's natural state is always-on monitoring with a live posture, so that a board pack is a view rather than a project and an inspection finds the firm ready rather than scrambling.

**Provenance and traceability everywhere.** Every record can be traced forward (what did this clause produce) and backward (why does this obligation exist), so that the firm can always show its working.

**Governance is built in.** Maker-and-checker approval, the three-lines-of-defence model (first line owns and manages, second line oversees and challenges, third line independently assures), and role-based access are part of the fabric, not an add-on.

**Integrate, do not replace.** The platform is vendor-neutral and keeps the customer's existing systems of record, connecting to them rather than supplanting them.

**Trust through human-in-the-loop.** Intelligent features assist and propose; people decide and sign. The platform's authority comes from the human-approved record.

**Shaped to a recognized standard, not sold as a certificate.** The product is designed to fit the structure of a certifiable compliance-management standard and to accelerate a firm's path to certification, but it does not claim to be that certificate itself.

---

## 4. User Personas and Roles

The personas map cleanly onto the three lines of defence and the governing body. One practical note shapes the whole design: in a firm this size the roles blend, so the system must serve the **role**, not assume one person per role. Vikram Rao, for example, is both a first-line doer of secretarial filings and a second-line compliance owner.

### Primary users

**The Compliance Officer (Anjali Deshmukh), second line.** She owns the overall obligation picture and is the platform's champion. She holds together duties from different worlds: sector rules, statutory and secretarial filings, tax, labour, and the policy-driven duties the firm sets itself. Much of her day is chasing others for the proof that something was done and assembling material for committees and the board. **She wants** a single, live register with a coverage view and the ability to produce proof on demand. **She fears** an inspection exposing an undocumented duty, and her own inability to answer "are we compliant right now" without a manual effort each time. **Her altitude** is the deepest working view: the whole register and where coverage is thin, kept legible despite carrying the most.

**The Company Secretary (Vikram Rao), first and second line.** Responsible for statutory and board governance: annual filings, board and committee minutes, statutory registers. **He wants** the secretarial calendar and its evidence in the same place as everything else, and clean board material. **He fears** missed filings and the personal liability that attaches to them.

**The Chief Risk Officer (Meera Krishnan), second line.** Runs the risk register and the risk committee. **She wants** a register that is connected to the obligations and controls that bear on each risk, with ratings derived from the consequence of the specific failure rather than set by judgment alone. **She fears** a risk picture that is disconnected from what compliance and controls are actually doing. **Her altitude** is the risk view: the heat map, the top risks, the exceptions, with the ability to drill into the obligations and controls feeding each one. She is the natural default landing for an executive cockpit.

**The Chief Information Security Officer (Rajesh Iyer), second line.** Owns cyber and IT compliance: the sector's cyber rules, incident-reporting clocks, data-security safeguards, vulnerability cycles, and cyber audits. **He wants** his slice of the same system rather than a second silo, an incident workflow that fans out to every regulator that must be told, and a control library where a security control can be reused across obligations. **He fears** an incident setting several reporting clocks running at once across different regulators with a real chance of missing one. He is often the technical gatekeeper for the platform's adoption.

**The Investment Compliance Officer (Arvind Patel), first and second line.** Monitors the firm's investment activity against the sector's investment rules and the firm's own investment policy (for example, exposure limits and a mandated periodic review of holdings). **He wants** the investment rules tracked as living obligations with their committee evidence attached. **He fears** a breach of an exposure limit, or a mandated review that happens but is not minuted.

**The Data Protection Officer (Priya Sharma), second line.** Owns data-protection compliance: the data inventory, consent, data-subject requests, and breach handling. **She wants** data duties in the same fabric, and a breach to route automatically into the incident and regulator-reporting machinery. **She fears** a breach mishandled across the data-protection, security, and sector regulators at once.

**Obligation owners (the first line): Deepa Iyer (Finance and Tax), Farhan Ali (HR and Labour), research analysts, and others.** These are the people who actually do the duties and capture the proof: filing a monthly tax return, depositing statutory contributions on time, performing the mandated investment review. **They want** the simplest possible view: only their own items, the single action each one needs, the deadline, and one place to attach the evidence. **They fear** not knowing what is theirs until someone chases them, and proof that ends up scattered. **Their altitude** is the narrowest: my tasks, my dates, attach my proof, nothing else competing for attention.

**Internal Audit (Sunita Menon), third line.** Provides independent assurance. Plans risk-based audits, tests whether controls are designed and operating, gathers evidence, writes findings, and follows up on remediation. **She wants** a traceable line from an obligation to a control to its proof, and a findings-and-remediation workflow in the same system. **She fears** scattered evidence that makes it impossible to attest that a control operated, which is the undocumented-duty problem restated in audit language. **Her altitude** is the assurance view: coverage, control-test status, open findings, and the evidence trail.

**The executive and the board, the governing body.** Accountable for oversight. **They want** a roll-up with the exceptions surfaced, a live posture rather than a periodic snapshot, and confidence that an inspection would not catch the firm flat. **They fear** months of preparation producing a snapshot that is already stale. **Their altitude** is the highest: the roll-up and the exceptions, drilling down only when something demands it.

### Administrator and governance roles

**The platform administrator** configures the organization profile, the people and their roles, which regulatory frameworks are enabled, the regulator thresholds and escalation owners, the maker-and-checker rules for each kind of change, the connected systems, the data-retention policies, and the notification preferences. Crucially, administrative changes themselves route through maker-and-checker, and every change is written to the audit log.

**Role-gated authority.** Certain decisions are restricted by role. The most important example: accepting a clause as a tracked obligation, or sending it to an external specialist for an interpretation, is restricted to the Compliance Officer and the Company Secretary, because those are the people accountable for that judgment.

---

## 5. Core User Flows and System Workflows

This section walks the end-to-end flows in plain language. The headline flow comes first because it is the mechanism that makes everything else possible. The secondary flows then show the system in use across the working day. Throughout, "enforcement" means the combination of ownership, deadlines and clocks, required evidence, maker-and-checker approval, role-gating, and automatic escalation that the system applies so that a duty cannot quietly fall through.

### 5.1 Headline flow: from a law to a tracked control (the source-to-action pipeline)

This is the flow that turns raw law into managed compliance, and it is the spine that every other record connects to. It is anchored on the principle that the clause is the unit.

**Step 1 — A source arrives.** A legal instrument enters the system. It might be a long-standing act, a regulator circular, a set of rules, a direction, or an internal policy. It arrives one of three ways: it is already in the firm's library; it is pulled in from a regulatory-intelligence feed; or a recently issued instrument is detected and surfaced for attention. New or changed instruments appear in the **Source Library** flagged as needing work, sorted so that the items awaiting a decision float to the top.

*Example.* A revised tax-filing instruction and an updated investment-exposure circular both arrive dated this month. Both appear at the top of Anjali's Source Library, marked as not yet worked through.

**Step 2 — Understand the instrument.** Anjali opens the instrument. The top of the page answers two questions in plain language: **what this instrument covers**, and **how it affects SPF**. If this version supersedes an older one, a banner links to the previous version so nothing is lost.

**Step 3 — See the clauses.** Below, the instrument is broken into its individual clauses. Each clause row shows, in plain language: the name of the compliance it creates, a short description, what it actually requires, the penalty if it is missed (with the most serious tier shown as a severity), when it is due, whether it applies to SPF, and where it sits in the pipeline (still being processed, recommended for a decision, already accepted, sent for specialist review, or marked not applicable).

**Step 4 — Open a clause and read what it requires.** Anjali opens a single clause. The clause detail is the heart of the flow. On one side she sees what the clause requires in plain language, its key parts as a list, the exact clause extract with its citation, and **what happens if it is missed**, expressed as the sourced penalty tiers, each rising in severity, from which the system has derived the clause's overall severity. She also sees a **recommendation**: an assistive suggestion of how to handle the clause (for example, which existing control already covers it), shown with a confidence indicator, clearly labelled as a recommendation for her to accept or reject.

**Step 5 — Decide.** Anjali makes one of three decisions. This is the enforcement point, and it is role-gated to her and to Vikram.

- **Save to a control.** She maps the clause to a control that will satisfy it. She can attach it to an **existing** control (because one control can satisfy many clauses) or **create a new** control from the clause. Either way, the clause is now tracked, and the link between the clause and the control is recorded.
- **Engage a specialist.** If the clause needs a genuine legal interpretation (does it apply to us, given our facts), she routes it to an external specialist. The specialist's note is captured and the clause returns for a final decision. This path exists precisely because some judgments need a human expert, not an automated guess.
- **Mark not applicable.** If the clause does not apply to SPF, she records that, with the basis, so the decision is itself documented.

**Step 6 — The chain comes alive.** Once a clause is saved to a control, the rest of the spine follows. Obligations that derive from the clause carry a provenance link back to it, so anyone looking at an obligation can see exactly which provision it came from. The control shows, on its own page, the full set of clauses it satisfies, grouped by the act each one belongs to, which is the visible proof of "map once, satisfy many." Evidence attached to the control proves it operates. The risk that the clause feeds reflects the consequence of the clause being breached.

**Step 7 — Trace it both ways.** From any obligation, policy or control, a user can open the **source** behind it and see the originating clause, its extract, and its citation. From any clause, a user can run the reverse lookup, "what this source produced," and see every obligation, policy and control that cites it. This two-way traceability is what lets the firm show its working to an inspector or an auditor.

The outcome of this flow is that a piece of law has become a managed, owned, evidenced, risk-rated duty, connected to a control, with its provenance intact in both directions. Every other flow below operates on the records this flow creates.

### 5.2 Internal and external obligations as one unified workflow

This flow shows the principle that internal and external duties are one fabric, by walking one of each and demonstrating that the system handles them identically.

All obligations, whatever their origin, live in one **register and calendar**. Each shows its source regulator or policy, its title, its frequency, its due date (coloured if it is overdue or due soon), its owner, its maker-and-checker state, and its status. A calendar view lays the same duties out by date.

**An external obligation.** SPF must file a monthly tax return. The duty appears in the register with its statutory deadline, owned by Deepa. As the deadline approaches it surfaces in Deepa's personal queue and on the calendar. Deepa completes the filing and attaches the filing acknowledgement as evidence. She submits it for check; a checker approves it; the status moves from due, to in review, to filed. If the deadline passes without completion, it is flagged overdue and escalates.

**An internal obligation.** SPF's own investment policy requires the research team to review the firm's holdings every quarter. This duty is not imposed by any single statute; the firm set it for itself. It appears in the **same** register, with the **same** kind of deadline, owned by Arvind. Arvind completes the review and attaches the minutes of the Investment Committee meeting as the evidence that it happened. He submits for check; it is approved; the status moves the same way. If it is done but the minutes are never attached, the system shows it as lacking evidence, which is exactly the gap that has hurt firms at inspection.

The point of walking both is that nothing about the handling differs. The statutory filing and the policy-driven review are owned, scheduled, evidenced, approved, and escalated in precisely the same way. That sameness is the feature.

### 5.3 Control satisfies an obligation: the control workflows

A control is the measure that actually satisfies a duty, and it is also the thing an auditor tests. This flow defines each of the distinct workflows around controls. The Control Library is described under the banner "map once, satisfy many," and a control's own page shows the clauses it satisfies grouped by act.

**Workflow A — Create a control from a clause.** During the headline flow, when no existing control fits a clause, a user creates a new control directly from it. The new control starts life already linked to the clause that justified it, so its provenance is intact from the first moment.

**Workflow B — Attach a clause or obligation to an existing control (the many-to-many case).** When a clause is already covered by something the firm does, the user attaches it to that existing control instead of building a new one. The control now satisfies more than one clause, often across more than one law. *Example:* a single "personal-data-breach detection and notification" control satisfies both the data-protection law's breach-intimation clause and the security regulator's six-hour incident-reporting clause. One control, two laws, satisfied together. This is the heart of the efficiency the firm gains.

**Workflow C — Test and re-test a control.** A control must be shown to be designed well and operating. A user can record a test (with the date, result, method, tester, and a note) and can re-test on a cadence. The control's page keeps its test history and shows its latest result.

**Workflow D — Continuous control monitoring (automatic testing and escalation).** Some controls are monitored continuously rather than tested by hand. For these, the system shows the monitored population, how many items pass and fail, when it last ran, and how often it runs. When such a control fails, it escalates automatically: the failure captures evidence, raises a remediation **issue**, and, if serious, links to an **incident**. *Example:* a control that checks critical security patches are applied within a set window detects three overdue items, which raises an issue ("patch window breached on three critical items"), which is in turn linked to a live incident. This automatic cascade is how a quiet control failure becomes a visible, owned problem rather than a surprise at audit.

**Workflow E — Attach evidence to a control.** A user attaches evidence to a control to prove it operated. Evidence may be captured automatically from a connected feed or attached by a person. Either way it is linked to the control (and often to the obligations the control satisfies), so the proof sits next to the thing it proves.

Across all five, the enforcement is the same: a control without recent evidence or a passing result is visibly weak; a failing monitored control escalates on its own; and the line from the control back to the clauses it satisfies and forward to the evidence that proves it is always traceable.

### 5.4 Recurring obligation lifecycle

Many duties repeat. This flow shows how a recurring obligation runs to completion, every cycle, with proof.

A recurring obligation has a frequency (for example monthly or quarterly) and a next due date. As the date approaches, it surfaces in the owner's personal queue and on the shared calendar. The owner completes the duty and attaches the required evidence. The duty then moves through maker-and-checker: the owner (the maker) submits it, and a checker approves it, so no single person both does and signs off the same duty. The status moves from due, to in review, to filed. Once filed, the next instance is scheduled automatically according to the frequency, so the cycle continues without anyone re-creating it. If a cycle is not completed by its deadline, it is flagged overdue and escalates to the owner and, if it remains open, upward.

*Example.* The monthly tax return recurs for Deepa; the quarterly investment-policy review recurs for Arvind. Each month or quarter the duty reappears on its own, is completed, evidenced, checked, and filed, and the next one is already waiting. The firm never has to remember to set it up again, and at any moment the register shows which cycles are filed, which are in review, and which are overdue.

### 5.5 Regulatory change management

The law moves, and this flow keeps the firm current. It is the operational answer to a simple fact: in a single recent year, a firm like SPF can absorb several material rule changes across different regulators.

**Step 1 — A change is detected.** A change arrives from a regulatory-intelligence feed or as a regulator circular, and it lands in the **Regulatory Change** view, which shows the volume of updates captured and highlights the significant ones.

**Step 2 — Impact is assessed.** The system determines which existing obligations, controls and policies the change affects, and presents that as an impact picture (for example, "this affects two obligations and one control").

**Step 3 — The owner is alerted.** The owner of the affected duties is notified automatically, so the change reaches the right person rather than sitting in an inbox.

**Step 4 — The change is worked and acknowledged.** The owner reviews what changed, acknowledges the impact, and updates the affected obligations and controls. If the change introduces a genuinely new duty, it flows through the headline source-to-action pipeline to become a new tracked obligation. The provenance is updated so the affected records now point to the new version of the instrument.

*Example.* A revised tax-filing instruction changes what a monthly return must contain. The change is captured, assessed as affecting the monthly tax obligation and its supporting control, and Deepa is alerted automatically. Separately, an updated investment-exposure circular changes an exposure cap; it is assessed as affecting the exposure-monitoring control, and Arvind is alerted. Neither change is lost between people, and both leave a documented trail.

### 5.6 Cyber incident (the many-to-many control under pressure)

This flow shows the connected model holding together under time pressure, and it is where the many-to-many control earns its place.

**Step 1 — Detection.** An incident is detected. It may originate from a monitored control failing (the patch-window failure from Workflow D escalating into an incident) or from a security feed. *Example:* ransomware is detected on a fund-accounting server, traced back through the issue and the failed patch control.

**Step 2 — Classification.** The incident is automatically classified by severity, using the sector's incident-classification scheme, so its priority is set by business impact rather than by who noticed it first.

**Step 3 — The clocks start.** Because this incident touches several regulators at once, multiple reporting clocks begin together: a short window to the security regulator, a window to the sector regulator, and a window to the data-protection board. Each clock counts down live, so everyone can see how long remains.

**Step 4 — One control satisfies the reporting duties.** A single breach-response control satisfies the reporting obligations across all three regulators. The reports are drafted from the one incident; the evidence is captured once and reused across all three filings rather than re-gathered for each. This is the many-to-many principle doing its most valuable work: the firm responds once, coherently, and satisfies several legal duties with the same effort.

**Step 5 — Sign-off and filing.** The reports are signed off through maker-and-checker (for example, by the CRO and the CISO), and each regulator track moves to filed as its report is submitted. The whole sequence is captured on a unified timeline, from detection through containment to the three clocks starting and the sign-offs.

**Step 6 — The loop closes.** The incident links back to the control failure that caused it, the risk it realized, and the issues it raised, so the firm can see the full chain and feed the lesson back into its controls.

### 5.7 Audit flow on the platform

This flow gives the third line its workspace and makes the undocumented-duty problem structurally impossible.

**Step 1 — Plan.** Internal Audit (Sunita) plans a risk-based audit, focusing effort on the highest-risk areas, drawing on the same risk picture everyone else sees.

**Step 2 — Scope and test.** The audit is scoped, and fieldwork tests whether the relevant controls are designed and operating. Because controls, their test history, and their evidence already live in the connected model, the auditor pulls the proof from the system rather than chasing it across inboxes. The traceable line from an obligation, to the control that satisfies it, to the evidence that proves it, is exactly what lets the auditor attest that a control operated.

**Step 3 — Findings become remediation.** Where the audit finds a weakness, it raises a finding, and each finding spawns a one-to-one **remediation issue** with an owner and a due date. A finding is not a dead-end observation; it becomes tracked work.

**Step 4 — Report and follow up.** The audit produces a report. Remediation issues are followed up and re-tested until they close, and repeat findings are visible across cycles. The status of every finding and its remediation is always current.

The contrast with today is the point. The firm's worst real-world finding has been that a control operated but was never documented; in this flow, the documentation is the byproduct of doing the duty, so the auditor can always find the proof.

### 5.8 Board and committee preparation

This flow turns a recurring scramble into a standing capability.

The **board cockpit** is live at all times. It shows the firm's overall risk level, control coverage, open incidents (with the critical ones called out), the nearest regulatory deadline counting down, overdue obligations, and open audit findings. It shows a risk heat map, trend lines for the headline measures, and a stream of recent activity across the whole platform. The committee cadence (for example, the investment, risk, audit, and nomination-and-remuneration committees) is tracked with chairs and meeting dates.

When the board or a committee meets, the pack is a **view of the live posture**, exported on demand, rather than a document assembled over weeks. The executive sees the same posture continuously between meetings. *Example:* Meera opens the cockpit the morning of a board meeting, sees the one critical incident and the nine overdue obligations highlighted, drills into the two that matter, and exports the pack. What used to take her team weeks is now the current state of the system.

### 5.9 Supporting flow: data-subject request (erasure versus retention)

A data subject asks SPF to erase their personal data. The request enters a governed workflow: **locate** the person's data across the firm's systems, **check retention** to see what must legally be kept, **erase what is allowed**, **log the decision immutably**, and **generate an audit record**. *Example:* Priya works a request where the subject's records in the core registry, identity records, fund-accounting records, and security logs must be retained for statutory reasons, while marketing records are erased and a grievance record is anonymized. The decision and its reasons are recorded, and an audit record is produced, so the firm can show both that it honored the right and that it had a lawful basis to retain what it kept.

### 5.10 Cross-cutting flow: the personal queue and maker-and-checker

Underneath every flow above is the way work actually reaches people. Each user has a **personal queue** scoped to their role, showing only the tasks that are theirs: incident actions, approvals, control re-tests, regulatory-change reviews, evidence requests, data-subject requests. Each task shows what it is, its reference, its counterparty (the person who must check, test, or respond), its deadline (red if overdue), and its priority, with a quick action. The queue is filtered to the active role, and switching role changes which tasks and which approvals appear. Across the platform, changes that matter run through **maker-and-checker**: the person who does a thing is not the person who approves it, and the approval chain is visible on the record. This is the everyday enforcement layer that keeps duties owned and separated.

---

## 6. Screens and UI Surfaces

Each surface below is described by its purpose and its content, not its layout. They are grouped by area. Every list-style screen offers search, filtering, sortable columns, row-click navigation into a detail, and an export; every detail screen shows the record, its history, and a panel of cross-references to "where this also appears."

### The main application

**Board Cockpit (the home screen).** The board and executive landing. Shows the headline measures (overall risk level, control coverage, open incidents with critical ones flagged, the nearest deadline counting down, overdue obligations, open findings), a risk heat map, trend lines, and a recent-activity stream across the whole platform. Purpose: the live posture at a glance, with one click into anything that needs attention.

**My Queue.** The personal, role-scoped task list described in flow 5.10. Purpose: tell each person exactly what is theirs and what to do next.

**Risk Register and risk detail.** The register lists risks by domain with their inherent and residual scores, owner, treatment and status, filterable and sorted by residual severity. The detail shows a risk's position before and after controls (inherent versus residual) on a heat-map grid, its treatment plan, its history (reviews and registrations), and the controls that mitigate it, the incidents that realized it, and the issues it raised. Purpose: a connected risk picture whose ratings are grounded in consequence.

**Control Library and control detail.** The library, headed "map once, satisfy many," lists controls with the frameworks and the clauses each one satisfies, its owner, whether it is continuously monitored, when it was last tested, its result, and its evidence count. The detail shows the control's attributes, the risks it mitigates, its source clauses, the **clauses it satisfies grouped by act** (the visible proof of many-to-many), its framework mappings, its test history, its evidence, and any issues against it. Purpose: make the control the reusable, evidenced unit that satisfies many duties.

**Continuous Control Monitoring and rule detail.** A list of continuously monitored controls with their pass and fail counts and status, and a detail that shows the monitored population, the failing items, and the automatic escalation chain (failure, evidence captured, issue raised, incident linked). Purpose: show that monitored controls test themselves and escalate on their own.

**Policies and policy detail.** A list of the firm's policies with version, owner, approver, next review and mapped controls. The detail shows the policy's version history, its approval chain, the clauses behind it, and the controls it maps to. Purpose: connect a policy to the controls and evidence that operationalize it.

**Incidents and incident detail.** A list of incidents by severity, source, and status, and a detail (the most worked example in the product) that shows the incident's classification, the multiple regulator clocks counting down, the actions to draft each regulator report, a unified timeline, the affected assets, the control failure that caused it, the risk it realized, and the evidence trail captured once and reused across all the regulator filings. Purpose: run a multi-regulator incident response coherently from one place.

**Regulator Clocks.** A single timeline that brings together the firm's standing regulatory requirements, its live incident clocks, and its upcoming obligation deadlines, all counting down. Purpose: one calendar, one clock.

**Obligations and Calendar, and obligation detail.** The unified register and calendar of all duties, internal and external (flow 5.2), filterable by regulator, status, frequency and owner. The detail shows the duty, its maker-and-checker chain, its evidence and filing acknowledgements, the source clause behind it, and any regulatory change that drove it. Purpose: one place for every duty, however it arose.

**Regulatory Change and change detail.** A list of incoming regulatory changes with their impact (how many obligations and controls each affects) and owner, and a detail showing what changed, the automatic owner alert, the impact flow, and the affected obligations and controls. Purpose: keep the firm current and route changes to the right people.

**Source Library, act detail, and clause detail.** The library of legal instruments, headed "the acts behind the controls," sorted so items awaiting a decision rise to the top. The act detail explains what the instrument covers and how it affects the firm, and lists its clauses with the pipeline action on each. The clause detail (the engine of the headline flow) shows what the clause requires, its key parts, its extract and citation, what happens if it is missed, the assistive recommendation, the specialist option, and the decision to save it to a control or mark it not applicable. Purpose: turn law into tracked, owned, evidenced controls, with the clause as the unit.

**Sector Pack (the pension pack in the worked example).** A sector-specific cockpit that gathers the duties, committees, monitoring controls, and incident-reporting obligations that matter to this regulator in one place, plus a set of report templates. Purpose: give a sector its tailored home without fragmenting the underlying model. This pattern is extensible to other regulators and sectors.

**Data Governance and data-subject-request detail.** The data inventory (what data the firm holds, where, of what kind, how long it is kept, and with what consent), the data-subject-request queue, the consent picture, and the routing of a breach into the incident machinery. The request detail shows the erasure-versus-retention workflow and the audit record it generates (flow 5.9). Purpose: manage data duties in the same fabric as everything else.

**Audits and audit detail.** A list of audits by type, auditor, period and findings, and a detail showing each finding and its spawned remediation issue. Purpose: the third line's workspace (flow 5.7).

**Issues and Remediation, and issue detail.** A list of remediation issues by source (a control failure, an audit finding, or an incident), severity, owner, age and due date, with the ability to act on several at once. The detail traces the issue back to what caused it and forward to the controls involved. Purpose: make every weakness owned, dated, and closed.

**Evidence Vault.** The library of all evidence, showing how each item was captured (automatically from a feed or by a person), its source, and what it is linked to. Purpose: one place where proof lives and links back to the duties and controls it supports.

**Integrations.** A view of the connected systems as spokes around the platform's backbone, each showing its status and last sync, with the firm's existing service desk shown prominently as kept rather than replaced. Purpose: make the "one platform that connects, not replaces" idea visible.

### Cross-cutting surfaces

These appear across many screens rather than as a single page: a **vital-signs strip** that keeps the headline measures and the nearest clock in view everywhere; a **command search** that jumps to any record; a **role switcher** that changes the personal queue and the approvals on view; a **notifications** affordance; a **source affordance** on every record that opens the originating clause and shows what that clause produced; a **cross-reference panel** on every detail that shows where the record also appears; **action drawers** that preview a regulator report, an export, or an evidence upload before it is submitted; and an **assistive panel** that answers scoped questions and offers recommendations in context.

### Administration

**Settings**, organized into sections, each routed through maker-and-checker and logged: the **organization profile**; the **people and their roles**; the **regulatory frameworks** the firm has enabled; the **regulator thresholds, owners and escalation**; the **maker-and-checker rules** for each kind of change; the **connected systems**; the **data-retention policies**; the **notification preferences**; and a tamper-evident **audit log** of system events that links to the records involved. Purpose: configure the platform safely, with every change itself governed and recorded.

---

## 7. Capabilities and Feature Categories

The full functional capability map, organized by theme. Each theme has been walked in the flows above; this is the consolidated inventory.

**Source and provenance management.** A single library of legal instruments and their clauses; the clause as the atomic unit; the source-to-action pipeline (understand, see clauses, decide, save to a control or mark not applicable, or engage a specialist); two-way traceability (what a clause produced, and why an obligation exists); version supersession.

**Obligations management.** One unified register and calendar for internal and external duties; ownership; frequency and recurrence; maker-and-checker; required evidence; overdue flagging and escalation; provenance back to the clause.

**Control management.** A control library on the "map once, satisfy many" principle; create-from-clause and attach-to-existing; many-to-many coverage across laws; test and re-test with history; continuous monitoring with automatic escalation; evidence capture; the "clauses satisfied, grouped by act" view.

**Risk management.** A risk register across domains; inherent and residual scoring; a heat map; consequence-based rating derived from sourced penalties; treatment plans; links to the controls, incidents and issues connected to each risk.

**Regulatory change management.** Capture of incoming changes from feeds and circulars; impact assessment against existing obligations, controls and policies; automatic owner alerting; acknowledgement and update; promotion of genuinely new duties through the source-to-action pipeline.

**Incident and regulator-clock management.** Detection (including from a failing monitored control); automatic severity classification; multiple simultaneous regulator clocks; one breach-response control satisfying several reporting duties; evidence captured once and reused; sign-off through maker-and-checker; a unified timeline.

**Audit and assurance.** Risk-based planning; scoping and control testing against the connected model; findings that spawn remediation issues; reporting; follow-up and re-test; visibility of repeat findings.

**Policy management.** Versioning; approval chains; the line from a policy to its controls to its evidence; review cadence; provenance to the clauses behind a policy.

**Data governance and privacy.** A data inventory; consent tracking; the data-subject-request workflow with erasure-versus-retention and an audit record; automatic routing of a breach into the incident and regulator-reporting machinery.

**Evidence management.** A vault of all evidence; automatic capture from feeds and manual attachment; linkage to controls and obligations; the principle that proof is required to complete a duty.

**Sector packs.** A tailored cockpit per regulator or sector that gathers the relevant duties, committees, controls and reports, without fragmenting the shared model; extensible to new sectors.

**Dashboards and metrics.** The board cockpit; the headline measures; trend lines; the risk heat map; the activity stream. Risk and control metrics in particular (see below) are first-class.

**Risk and control metrics (called out, per emphasis).** The platform should expose, at a glance and over time, the measures that tell a board and a regulator whether the firm is in control: the overall enterprise risk level and its trend; control coverage (the share of duties and key risks that have a control mapped to them) and its trend; the share of controls passing their latest test; the share of monitored controls passing; the count of failing controls; the share of obligations completed on time and its trend; the count of overdue obligations; the count of open audit findings and how long they have been open; and the time to remediate a weakness. These are the health signals that turn "are we in control" from an opinion into a number, and they should be visible on the cockpit and drillable into the underlying records.

**Assistive and agentic intelligence.** In-context recommendations and a question-answering assistant scoped to the current record and the user's view; agentic behaviors for scanning sources, proposing clause-to-control mappings, monitoring and chasing, and assembling packs; always human-in-the-loop, with the system proposing and a person disposing; designed so scripted behavior can be replaced with real capability behind a stable seam.

**Governance and workflow.** Maker-and-checker on every change that matters; the three-lines-of-defence model expressed in roles and ownership; role-based access and role-gated authority (for example, only Compliance and the Company Secretary may accept a clause); a tamper-evident audit log.

**Search and navigation.** A command search across all records; cross-reference panels that connect a record to everywhere it appears; deep links between the cockpit, the registers, and the details.

**Integration management.** A view of connected systems as spokes on a vendor-neutral backbone, with status and last sync, and the firm's systems of record kept rather than replaced.

---

## 8. Integrations and Connectors

Described in functional terms: what the platform connects to, and why. The platform reads from these where it can, so signals and proof flow in rather than being keyed by hand, and it is vendor-neutral about which specific products a customer uses.

- **Security monitoring** (the firm's intrusion-detection, endpoint, and cloud-security tooling) feeds **incidents** and the **continuously monitored controls**, so that a real security signal becomes a managed incident and a control's pass-or-fail reflects reality.
- **Vulnerability management** feeds the monitored controls that check, for example, that critical fixes are applied within a set window, and drives the automatic escalation when they are not.
- **The IT service desk** feeds **incidents** and asset context. It is explicitly **kept, not replaced**: the platform connects to it rather than supplanting the firm's existing operational system of record.
- **Identity systems** feed **control evidence** about who has access to what.
- **Privacy tooling** feeds **data governance**: the data inventory, consent, and data-subject requests.
- **Regulatory-intelligence feeds** feed **regulatory change management**, supplying the stream of incoming changes that the firm assesses and routes.
- **Tax-filing systems** are an **outbound** connection: certain obligations are filed through them, and the filing acknowledgement returns as evidence.
- **Sector systems** (for example, the central record-keeping and trustee systems in the pension example) feed the **sector pack** with the firm's scale figures and its sector returns.

Two functional principles govern all of these. First, the platform prefers to **read** rather than to require manual entry, because evidence that flows in automatically is both cheaper and more trustworthy. Second, the choice of which systems to keep, and which to make the backbone, is the **customer's decision**; the product integrates with what they run.

---

## 9. Deployment and Delivery Models

These are conceptual options for how a customer could consume the product, not a deployment design.

- **Shared, multi-tenant service.** The control plane is run as a service that several customers use, each isolated. Simplest to adopt; appropriate where data-residency constraints are light.
- **Dedicated, single-tenant service.** The control plane is run for one customer alone. Appropriate where a regulated firm wants isolation but not full self-hosting.
- **Customer-hosted or private deployment.** The control plane runs inside the customer's own environment. Appropriate for the most sensitive settings, and the natural answer where the law requires that personal and regulatory data stay within a jurisdiction.
- **Split planes for data residency.** Building on the control-plane and data-plane distinction from Section 2, the reasoning (the control plane) can run in one place while the sensitive data and systems of record (the data plane) stay close to the customer, so that data residency obligations are honored without losing the connected model.

A natural **adoption path** runs alongside these: a **demo** on seeded data to prove the model and the flows; a **pilot** that connects a few read-only feeds so the cockpit reflects reality without yet filing anything; and a **production** deployment that connects the systems of record and supports real filings and approvals. Which of these a given customer chooses, and in what order, is an open commercial decision (Section 13).

---

## 10. Security, Compliance, and Governance

These are functional obligations the product itself must honor, expressed as requirements to satisfy rather than as an implementation. A platform that manages compliance must itself be exemplary.

- **Access control.** Access is role-based and least-privilege. Certain actions are reserved to specific roles; for example, accepting a clause as a tracked obligation, or engaging a specialist, is restricted to the Compliance Officer and the Company Secretary.
- **Separation of duties.** Changes that matter run through maker-and-checker, so the person who performs an action is not the person who approves it. This applies to operational duties (a filing), to incident sign-offs, and to administrative changes alike.
- **Tamper-evident audit trail.** Every system action that changes a record is written to an audit log that cannot be quietly altered, and each entry links to the records involved.
- **Data handling and residency.** The platform handles sensitive personal and regulatory data, so it must honor access restriction, logging, defined retention, and, where the law requires it, keeping data within a jurisdiction. The data inventory and the retention policies in administration exist to make these obligations explicit and enforceable.
- **Alignment to the frameworks it manages.** The product is shaped to fit a certifiable compliance-management standard and to support its plan-do-check-act cycle, and it should itself maintain a sound information-security posture consistent with the standards it helps customers meet. It supports a customer's path to certification but does not claim to be the certificate.
- **Human-in-the-loop for intelligence.** No assistive or agentic output becomes a tracked obligation, a filed return, or a piece of evidence without a person accepting it. Where intelligent features ever materially aid a decision about individuals, the platform must support the heightened diligence (such as impact assessment) that the data-protection regime expects.
- **Evidence integrity.** Generated text is never evidence. The evidence is always the real artifact (a filing acknowledgement, a committee minute, a system-captured record). Intelligent features may help capture, check, or summarize proof, but they may not manufacture it, because an auditor tests the artifact, not the system's assertion.

---

## 11. Demo and Prototype Scope

This section defines what a convincing first prototype must show. It is grounded in what already exists and in the near-term build priority, and it draws a clear line between what must feel real and what may be faked.

### What the prototype must demonstrate

The prototype's job is to make a sceptical, jointly-deciding audience (Compliance, IT, Risk, plus the board) each see themselves and believe the connected model. The headline thing it must prove is the **source-to-action pipeline**: starting from a law, breaking it into clauses, and turning a clause into a tracked, owned, evidenced control, with one control visibly satisfying clauses across more than one law. The near-term build should land this pipeline end to end for a small, representative set of instruments and clauses before breadth is added.

### Must-have flows

- The **source-to-action pipeline** for a handful of real, representative instruments (a sector investment rule, a data-protection rule, a security direction, and a couple of general statutes), worked from instrument, to clause, to a saved control.
- The **unified obligations** view showing an internal and an external duty handled identically, each with its evidence.
- The **many-to-many control** made visible: one control satisfying clauses from two different laws.
- The **cyber-incident** flow with several regulator clocks counting down and evidence captured once and reused.
- The **continuous monitoring** cascade: a monitored control failing, raising an issue, and linking to an incident.
- The **regulatory-change** flow: a change arriving, its impact assessed, and the owner alerted.
- The **audit** flow: a finding spawning a remediation issue, traceable to the control and its evidence.
- The **board cockpit** as a live view, with the headline metrics and the heat map, exportable as a pack.
- The **role switch** that changes a person's queue and approvals, demonstrating role-based views.

### Must-have screens

The board cockpit, the personal queue, the source library with act and clause detail, the obligations register and calendar, the control library and a control detail showing "clauses satisfied across acts," the continuous-monitoring detail with its escalation chain, the marquee incident detail with its regulator clocks, the regulatory-change detail, an audit detail, the evidence vault, and the integrations view.

### Demo data

A single, coherent, fictional world (the SPF example), with realistic names, realistic timestamps anchored to a fixed "now" so the clocks read sensibly, realistic non-round figures, and one **load-bearing scenario chain** that recurs across screens (the failing patch control, the issue it raises, the incident it feeds, the three regulator clocks, and the evidence reused across them). The world should be internally consistent so that the same records reconcile wherever they appear.

### What must feel real versus what may be faked

- **Must feel real:** the connected cross-links between records; the continuous source-to-action line; the many-to-many control; the live, ticking clocks; the role-based views; the heat map and the metrics; the evidence captured once and reused; the provenance in both directions.
- **May be faked in the prototype:** real connections to live regulator systems; real automatic pulling of new instruments from the internet; real intelligent reasoning (scripted, deterministic behavior is acceptable, behind a seam that can later be made real); persistence across sessions; and multiple simultaneous users. Actions such as exporting, uploading, submitting and approving may acknowledge success without changing stored data. These fakes are acceptable precisely because the things in the "must feel real" list are what carry the conviction.

---

## 12. What a Winning System Looks Like — Post-Build Validation and Acceptance Criteria

This section maps the product against the specific requirements that the customer raised, and states, for each, what the system must be able to **demonstrate** for it to count as won. It is the acceptance checklist: a reviewer should be able to sit in front of the system and confirm each line. The requirements are drawn directly from what the customer told us mattered.

**Requirement 1 — One platform for IT and non-IT compliance together.** *Demonstrate:* in a single session, show a cyber duty (a security incident-reporting clause) and a non-cyber duty (a statutory filing and a policy-driven review) living in the same registers and reconciling in the same cockpit. *Pass when:* a reviewer can move from a security control to a tax obligation to an investment-policy review without leaving the platform, and the board cockpit reflects all of them.

**Requirement 2 — Policy-driven duties tracked, with evidence, not only statutory filings.** *Demonstrate:* the investment-policy quarterly review tracked as an obligation, completed, with the Investment Committee minute attached as evidence; and the system flagging the same duty as lacking evidence if the minute is not attached. *Pass when:* an internal, policy-driven duty is handled identically to a statutory one, and the absence of evidence is visibly a gap.

**Requirement 3 — The clause as the unit.** *Demonstrate:* open an instrument, see it broken into clauses, open a single clause, and turn that one clause into a tracked control. *Pass when:* the smallest manageable object in the system is a clause, and work, ownership, evidence and consequence all attach at that level.

**Requirement 4 — From source to action, as one continuous line.** *Demonstrate:* from any obligation, trace back to the exact clause and citation it came from; from any clause, run the reverse lookup to see every record it produced. *Pass when:* a reviewer can answer "why does this duty exist" and "what did this law produce" from the system, both ways.

**Requirement 5 — A control satisfies an obligation, and one control satisfies many (map once, satisfy many).** *Demonstrate:* a single breach-response control satisfying both a data-protection clause and a security-regulator clause, shown on the control's own page grouped by act. *Pass when:* one control is visibly mapped to clauses across more than one law, and the firm has done the underlying work once.

**Requirement 6 — Risk derived from the consequence of non-compliance.** *Demonstrate:* a clause whose penalty escalates (a fixed fine, then a per-day charge, then personal liability) carrying a severity derived from that penalty, and that severity flowing into the connected risk. *Pass when:* a reviewer can see that the risk rating is grounded in the sourced consequence, not set by unaided judgment.

**Requirement 7 — A connected demonstration of the core modules, not four disconnected screens.** *Demonstrate:* a policy producing an obligation, satisfied by a control, proven by evidence, with a risk attached, all linked and navigable. *Pass when:* a reviewer can walk the whole chain by clicking, without re-finding the same record by hand in a separate module.

**Requirement 8 — Role-based, simplified views.** *Demonstrate:* the board cockpit roll-up, the compliance officer's full register, and an individual owner's single-task queue, switched live. *Pass when:* each persona sees the same underlying data at the altitude they need, and the individual owner's view is genuinely simple.

**Requirement 9 — Regulatory change managed end to end.** *Demonstrate:* a change arriving, its impact assessed against existing obligations and controls, the owner alerted automatically, and the records updated. *Pass when:* a change reaches the right person and leaves a documented trail rather than sitting in an inbox.

**Requirement 10 — A multi-regulator incident handled coherently.** *Demonstrate:* one incident, several regulator clocks counting down together, one control satisfying the reporting duties, and evidence captured once and reused. *Pass when:* a reviewer sees the firm respond once and satisfy several legal duties without re-gathering proof for each.

**Requirement 11 — Recurring duties that run to completion every cycle, with proof.** *Demonstrate:* a monthly and a quarterly obligation cycling through due, in review, and filed, with the next instance scheduled automatically and overdue cycles escalating. *Pass when:* the firm never has to re-create a recurring duty, and the register always shows which cycles are filed and which are overdue.

**Requirement 12 — An audit flow that makes "done but not documented" impossible.** *Demonstrate:* an auditor pulling a control's evidence from the connected model, raising a finding, and that finding becoming a tracked remediation issue with an owner and a due date. *Pass when:* the documentation is a byproduct of doing the duty, and the auditor can always find the proof.

**Requirement 13 — Board and committee preparation as a view, not a project.** *Demonstrate:* exporting a board pack from the live cockpit on demand, with the critical incident and the overdue duties already surfaced. *Pass when:* the pack reflects the current state without weeks of manual collation.

**Requirement 14 — Inspection-readiness and risk-and-control metrics on demand.** *Demonstrate:* answering, from the cockpit, "what is our control coverage," "what is overdue," "what is failing," and "how long have findings been open," and drilling from each number into the underlying records. *Pass when:* "are we in control" is answered with current numbers that a reviewer can verify by drilling down.

**Requirement 15 — Shaped to a recognized standard.** *Demonstrate:* the platform's structure mapping to the clauses of a certifiable compliance-management standard, supporting its plan-do-check-act cycle. *Pass when:* a reviewer can see how the platform would support a certification effort, without the product overclaiming to be the certificate.

A system that can demonstrate all fifteen, on a coherent set of real, representative instruments, in front of the three constituencies that decide, is a winning system.

---

## 13. Open Decisions for Review

These are the calls that should be made before the build commits, captured here so they are not decided by default.

- **Audience and layering of materials.** Whether this specification serves only the build team, or is also adapted into a customer-facing solution narrative, and if both, how the two layers are kept in step.
- **Scope breadth for the first release.** Whether the first built scope covers the sector regime only, the sector plus the cyber overlap, a representative slice across all the duty areas, or the full universe of statutes. The recommendation is a representative slice that proves the model across towers, with breadth added later.
- **The lead anchor.** Whether the first built and demonstrated thing is the source-to-action pipeline, a single persona's end-to-end journey, or the connected core modules. The pipeline is the spine and is the natural lead, but the customer narrative may favor a persona journey.
- **How real the intelligence is in the first release.** Whether assistive and agentic behaviors are scripted and deterministic at first (with a seam to become real later), include one genuinely real intelligent step to prove the concept, or specify the full agentic ambition now to be built later.
- **The backend reality for the agentic features.** The two most compelling agentic behaviors (automatically pulling new instruments from regulator sources, and engaging an external specialist) are also the most backend-heavy and accuracy-sensitive; how far these are built versus simulated for the first release is a decision for the engineering and backend leads.
- **Integration depth for the pilot.** Which feeds are connected read-only first so the cockpit reflects reality before anything is filed, and in what order.
- **The standard-certification ambition.** Whether the firm's certification against a compliance-management standard is positioned as a program the product accelerates, kept clearly distinct from the product itself.
- **Evidence and history migration.** How years of existing evidence and filings, which live in other systems and inboxes today, are brought into the connected model, and how much of that is in scope for the first release.
- **Incumbent displacement and migration.** How the firm transitions off its embedded legacy regulatory-content tool, recognizing that this is as much about migration and trust as about features.
- **Deployment and data residency.** Which delivery model the customer adopts, and whether data-residency obligations require the split-plane approach from Section 9.

---

## Glossary

For a reader new to this domain.

- **Governance, Risk, Compliance and Audit (GRC).** The connected disciplines of steering an organization, managing what could go wrong, meeting obligations, and independently checking that all of it is real. The product's premise is that these work best as one connected system rather than separate tools.
- **Clause (or provision).** The smallest individual rule inside a law, regulation, circular or policy. The atomic unit the product manages.
- **Obligation.** A duty the firm must perform. **External** obligations are imposed by law and regulators (for example, a tax filing). **Internal** obligations are duties the firm sets itself (for example, a policy-mandated review). The product treats both identically.
- **Control.** The measure that actually satisfies a duty (for example, a documented breach-response procedure). One control can satisfy many clauses across many laws ("map once, satisfy many").
- **Evidence.** The real artifact that proves a control operated or a duty was done (for example, a filing acknowledgement or a committee minute). It is required to complete a duty.
- **Risk, inherent and residual.** A risk is something that could prevent the firm from meeting its objectives, rated by how likely it is and how serious it would be. **Inherent** risk is the rating before controls; **residual** risk is what remains after controls. The "how serious" should be grounded in the actual penalty.
- **Maker-and-checker.** A separation-of-duties rule: the person who performs an action ("maker") is not the person who approves it ("checker").
- **Three lines of defence.** A governance model: the **first line** owns and manages the risk in its daily work; the **second line** (compliance, risk, security) oversees and challenges; the **third line** (internal audit) provides independent assurance; and the **board** sits above all three.
- **Continuous control monitoring.** Testing a control automatically and continuously rather than by hand, and escalating on its own when it fails.
- **Regulator clock.** A countdown to a regulatory deadline, from a periodic filing to a short incident-reporting window. The product puts all of them on one timeline.
- **Provenance and traceability.** The ability to trace a record forward (what a clause produced) and backward (why an obligation exists).
- **Regulatory change management.** The discipline of detecting changes in the law, assessing what they affect, and routing them to the right owner before they become urgent.
- **Control plane and data plane.** A way of describing the system's shape: the **control plane** is the reasoning and the connected model; the **data plane** is the feeds and systems of record it connects to. Keeping them conceptually separate lets the firm adopt the model without replacing its existing systems, and lets sensitive data stay where the law requires.
- **Sector pack.** A tailored cockpit for a particular regulator or industry that gathers the relevant duties, committees, controls and reports in one place, without fragmenting the shared model.
