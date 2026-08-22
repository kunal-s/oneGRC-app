# OneGRC Enhancement Plan (grouped for implementation)

This consolidates the external compliance expert's feedback into changes grouped by **where the change is made**, with your confirmed decisions baked in. It is the build-facing companion to two existing documents: the verbatim feedback and its item IDs live in `onegrc-feedback-enhancements.md` (left unchanged), and the functional behavior of the product lives in `onegrc-functional-product-spec.md`. This plan describes what changes on each screen and why, at a functional level; the technical design remains the build team's call.

Each change cites the feedback ID (E-…) it comes from, and notes the decision you made.

---

## 1. Foundational and cross-cutting changes (do these first)

These touch the underlying data and several screens at once, so they should land before the screen-level work.

### 1.1 Department as a derived dimension and an access boundary

- **Department is derived from the owner's function.** Each obligation, control, task, and approval takes its department from whoever owns it. (E-A1, E-A2; your decision 1)
- **The department set:** Compliance and Company Secretarial; Risk; IT and Information Security; Investment Compliance; Data Protection; Finance and Tax; HR and Labour; Internal Audit. (E-A2; your decision 1)
- **No empty departments.** Every department must have at least one named owner or user. Where a record's owner does not map to a department, create a new named owner or user for that department so the department is represented. (your decision 1)
- **Access boundary by department and role.** A user sees only the controls, follow-up actions, approvals, and tasks assigned or applicable to their department or role, and cannot see other departments'. Compliance and the administrator keep the overall, all-departments view. (E-A3; your decision 2)
- **Where this applies:** the Source Library and the source Act and Clause records, Policies, Obligations, Control Library and Control detail, My Queue, approvals, and any task list. (extension per your latest decision 1)
- **How Source visibility is scoped.** A source Act, and the clauses underneath it, is visible to a department when the act has been mapped to that department, and to any department that owns one or more obligations or controls deriving from the act. Compliance and the administrator see all source acts. Unmapped or newly created acts that have not yet been routed to a department are visible to Compliance only until they are assigned.

### 1.2 Reminder and escalation engine, audit-trailed

- **Reminders before the due date**, at set intervals: seven days, three days, and one day before due. (E-C3; timings are my call per your decision 3)
- **Escalation after the due date**, at set intervals: day plus one, notify the owner and the line manager or department head; day plus three, escalate to the Compliance Officer; day plus seven, escalate to the CRO or executive. (E-C2; timings are my call per your decision 3)
- **Everything is audit-trailed.** Each reminder and escalation event is written to the audit trail with the actor, the action, the timestamp, and the interval it represents. (E-C1, E-C4)
- **The workflow and its evidence must be visible**, not merely configured. The prototype should let a reviewer see reminders and escalations having fired at the set intervals, with the trail to prove it. (your decision 3)
- **Where this applies:** Obligations, Notifications, the Audit Log, and My Queue.

### 1.3 Explicit, clickable, traceable linkage (provenance, never implied)

- **Every action and every relationship is explicit and traceable, with a clickable link to its evidence, and is never implied.** (your decision 4)
- **The upstream proof chain.** From a filed piece of **Evidence**, a user can click up to the **Obligation** it discharges, and from the Obligation up to the **Control** that satisfies it: Evidence to Obligation to Control, fully linked and walkable upstream to prove satisfaction. (E-E4; your decision 8)
- This is the upstream traversal of the existing model, in which a control satisfies an obligation and evidence proves the control. Both directions are clickable; the upstream direction is what proves the whole line back to source.
- **Where this applies:** Obligation detail, Control detail, the Evidence views, and the maker-checker steps.

### 1.4 Two-step maker-checker, made explicit and traceable

- **Keep today's two-step maker-checker.** Do not add a third approver step. (your decision 4)
- **Make the two steps explicit.** The tool must clearly demonstrate what the maker did and what the checker verified. Each action is recorded with its actor and timestamp and a clickable link to the evidence, so the sequence is traceable and not implied. (E-I1, revised per your decision 4)
- **Worked screen:** the maker uploads the evidence; the checker verifies it; both actions are visible on the record with their evidence one click away.
- **Where this applies:** the obligation evidence workflow, My Queue, and the Audit Log.

### 1.5 Department head as master authority

- **Each department has a named head, designated as the department's master authority.** The head is a person, set in administration, with audit-trailed changes. (latest decision 4)
- **Department visibility.** The head sees every record in their department: every obligation, control, policy, source act and clause mapped to the department, and every task, approval and follow-up assigned to anyone in it.
- **The right to act on any record in the department.** The head may step into any record in the department to act on it, including the maker step where the assigned owner is unavailable, with the action recorded as taken by the head on the owner's behalf so the audit trail remains clear.
- **Final sign-off above the checker.** For records that require it (filings, evidence on high-severity obligations, and any obligation flagged for head sign-off in administration), the head provides the final sign-off after the checker's verification. This does not change the default two-step maker-checker in 1.4; it adds a head sign-off on top, only where configured.
- **Override authority on department matters.** The head may override a department decision (for example, reopen a closed obligation cycle, reassign an owner, or reverse a marked-not-applicable clause), with the override and its basis recorded.
- **Where this applies:** Obligations, Controls, Policies, the Source Library (acts and clauses mapped to the department), the Audit Log, and administration. The head's authority does not extend outside the department; Compliance and the administrator remain the cross-department authority.

### 1.6 AI-assisted Source Act and Clause creation

- **Who may create.** Creation and editing of source Acts and Clauses is restricted to Compliance and the Company Secretary. Other users can read what is mapped to their department per 1.1. (latest decision 2)
- **Two entry points to start the workflow.** The user either supplies the Act's name and a URL to its authoritative source, or uploads the actual document. Either entry point kicks off the same AI-assisted ingestion workflow. (latest decision 2)
- **What the AI does.** The AI summarizes the document and extracts the Act's structure and its clauses: each clause's identifier, what it requires in plain language, its key parts, the sourced penalty tiers (with amounts and escalation), the due date or frequency, the exact citation, and a proposed applicability flag. The extracted breakdown is presented as a draft for the user to review, edit, accept clause by clause, or reject. (latest decision 2)
- **Human-in-the-loop.** Nothing the AI extracts becomes a tracked source until a person accepts it. The AI proposes; Compliance or the Company Secretary disposes. This is consistent with the product principle that intelligent features assist and propose; people decide and sign.
- **Routing and visibility.** On acceptance, the act is routed to one or more departments (per 1.1) and becomes visible to those departments. Until routed, the act is visible to Compliance only.
- **Every step is audit-trailed.** The upload or URL submission, the AI extraction, each clause-level acceptance or edit, the routing decision, and any subsequent change are written to the audit log with actor and timestamp.
- **Where this applies:** the Source Library (a new Create Source Act action), the source Act and Clause detail screens (the review step), administration (the creation-rights configuration), and the Audit Log.

---

## 2. My Queue (the scheduler)

- **Add a Calendar at the top of My Queue.** The existing task tables move below it. The aim is for the user to see what is important and due, visually, on the calendar first, then work the tables underneath. (E-H3, E-B2 revised; your decision 6)
- **Simplify the queue** to a clear, minimal view: what needs to get done, what is done, what is pending, the evidence, and what is overdue. (E-H1)
- **Scope by department and role** (see 1.1): a user sees only their own tasks, approvals, and follow-ups, and the controls applicable to them. (E-H2; your decision 2)
- **The Board Cockpit (Home) summary is unchanged.** (your decision 6)

---

## 3. Obligations (menu renamed from "Obligations & Calendar")

- **Rename the menu item to "Obligations."** (your decision 7)
- **Make the Calendar the default view.** The List, which is the current default, becomes a toggle alongside the Calendar. (your decision 7)
- **The calendar is driven by owner and due date:** each entry shows who must act and by when, and updates as duties move. (E-B3)
- **Group and filter by Department** (E-A1, E-A4), and add calendar filters for Filed versus Unfiled, Completed, and Pending. (E-B4)
- **State the duty and prove it.** On each obligation, show what must happen, by when, and the proof it was done; and for each cycle show whether it was completed within the due date or after it (on time versus late), using OBL-LAB-JUN26-02 as the worked example. (E-E1, E-E2)
- **Multi-step duties as a sequence.** Model deduction-type obligations as an ordered set of sub-steps, each with its own proof: deduct, then pay, then file the return (the labour and tax pattern). (E-E3; scope set to deduction-type duties, see assumptions)
- **Filing shows the chain.** At filing, surface the upstream linkage from 1.3: the evidence links to the obligation and on to the control, clickable, to prove satisfaction. (E-E4)

---

## 4. Control detail

- **Turn the test and evidence history into a period-by-period ledger.** For each cycle, show what was due, when the evidence was filed, and whether it was on time. (E-G1)
- **Show the linkage**, not just the list: from the control to the obligations it satisfies and to the evidence that proves each period, as the clickable chain from 1.3. (E-G1, E-E4)
- **Scope visibility by department and role** (see 1.1). (your decision 2)

---

## 5. Sources and the provenance affordance

- **Remove the "What this source produced" reverse-lookup section everywhere it appears:** on Obligation, on Control, on Policy, and in the source viewer. (E-F1; your decision 5)
- **Keep forward provenance** (a record showing the clause or source it derives from) and the upstream proof chain from 1.3. Only the "what this produced" reverse section is removed.

---

## 6. Reports (new surface)

- **Add a per-department summary report** confirming the completion status of that department's obligations: completed, pending, and overdue, so a department head can see at a glance that everything is done. (E-D1)
- **Add a per-act compliance status report.** For any source act, show the status of all obligations and controls deriving from that act over a chosen period: completed on time, completed late, pending, and overdue. The report breaks down by clause within the act so a reviewer can see exactly which clauses are clean and which are not. (latest decision 5)
- **Period range is explicit on both reports.** A period selector (month, quarter, year, or a custom from-and-to range) is required at the top of each report. The result reflects only the selected period; "on time versus late" is judged against the due dates that fell in that period. (latest decision 5)
- **Other report dimensions.** Either report can be filtered by department, by act, by status (completed on time, completed late, pending, overdue), and by owner. Compliance and the administrator can run the report across all departments and all acts; a department user runs it scoped to their own department.
- **Recipients and cadence.** Department heads and Compliance. On demand, plus a periodic summary.

---

## 7. Audit Log

- **Record every event as explicit, timestamped, and clickable to its evidence:** reminders, escalations, the maker's action, the checker's verification, and each filing. (E-C4; your decisions 3 and 4)

---

## Assumptions made where a point was not explicitly confirmed

- **Reminder and escalation timings (1.2)** are my proposal under your delegation. Adjust if you prefer a different ladder.
- **Multi-step sub-tasks (3)** are scoped to deduction-type obligations (provident fund, professional tax, and tax deducted at source). Say if you want them broader or narrower.
- **Department head as master authority (1.5).** I have written this as visibility across the department, the right to act on any record in the department, and final sign-off above the checker only where configured. The override authority is intentionally bounded to the department. Adjust if you want any of these tighter or broader.
- **Source visibility scoping (1.1).** A source act is visible to a department once it has been mapped to that department, and to any department that owns obligations or controls deriving from it. Unmapped acts are visible to Compliance only. Adjust if you want a different default.

---

## Reference

- Verbatim feedback and item IDs: `onegrc-feedback-enhancements.md`.
- Functional behavior of the product: `onegrc-functional-product-spec.md`.
- Authoritative acts and frameworks with source URLs: `onegrc-source-registry.md`.
