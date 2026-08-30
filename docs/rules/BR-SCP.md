---
type: rule-group
prefix: BR-SCP
spec: "§6.2"
count: 9
status: normative
tags: [rules, access, investigations]
aliases: [BR-SCP-01, BR-SCP-02, BR-SCP-03, BR-SCP-04, BR-SCP-05, BR-SCP-06, BR-SCP-07, BR-SCP-08, BR-SCP-09]
---

# BR-SCP — Scope, visibility and confidentiality

Who sees what: department scope on discovery surfaces, and person-not-role access to restricted investigations. Full rule text: [[functional-spec#6. Business Rules|functional-spec §6.2]]; the confidentiality model is [[functional-spec#4.12 The ethics office, case confidentiality and recusal|spec §4.12]] and build-plan invariant I-7.

## The rules

- **BR-SCP-01** — a record's department is **derived from its owner**, never stored. → [[ADR-007-roles-and-authority]]; schema convention in [[build-plan#3. The data model (Prisma schema outline)|build-plan §3.1]]
- **BR-SCP-02** — users see their own department's records; Compliance & Company Secretarial and the Administrator see all. → [[phase-1-platform-floor#P1-04|P1-04]]
- **BR-SCP-03** — the boundary scopes **discovery**, not navigation; detail pages stay reachable by direct link. → [[phase-1-platform-floor#P1-04|P1-04]]
- **BR-SCP-04** — a scoped surface states which scope it is showing. → scope banner, [[phase-1-platform-floor#P1-04|P1-04]]
- **BR-SCP-05** — restricted-case access is decided by **person**, not role; a persona switch never opens a case. → [[WF-5.24-speak-up]], [[phase-4-investigations-and-privacy#P4-01|P4-01]], [[REQ-22-structural-protection]]
- **BR-SCP-06** — **recusal beats clearance**: a recused person is refused whatever their role. → [[phase-4-investigations-and-privacy#P4-01|P4-01]]
- **BR-SCP-07** — recusal is **computed**: anyone named in an allegation, and the head of the department it points at, stands down. → [[phase-4-investigations-and-privacy#P4-01|P4-01]]
- **BR-SCP-08** — a case you may not open is still **counted** for you; sealed is never invisible. → [[phase-4-investigations-and-privacy#P4-01|P4-01]], [[dashboard-kpi-design]] M23
- **BR-SCP-09** — case-restricted work is filtered out of the personal queue **at source**. → [[WF-5.28-personal-queue]], [[phase-1-platform-floor#P1-12|P1-12]] (hook), [[phase-4-investigations-and-privacy#P4-01|P4-01]]

## Proves

[[REQ-08-role-based-views]] (scope) · [[REQ-22-structural-protection]] (rules 05–08 are its four acceptance tests)
