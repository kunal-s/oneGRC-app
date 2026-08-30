---
type: moc
tags: [moc, personas]
aliases: [Personas]
---

# Personas, roles and people — map of content

**Person ≠ role ≠ persona** ([[functional-spec#4.3 Persona, role and person are three different things|spec §4.3]]): a person is accountable, a role is a capability set, a persona is a point of view. Person↔Role is many-to-many ([[ADR-007-roles-and-authority]]), and a persona switch never confers access a person does not have — enforced structurally for sealed cases ([[BR-SCP]] 05).

The roster (23 people, 8 departments) is **seed data, not a product constant** — [[functional-spec#4.2 The roster|spec §4.2]]. The eight sector research analysts are the worked example behind [[REQ-02-policy-driven-duties]].

## The nine roles

- **Executive** (CRO Meera Krishnan) — roll-up and exceptions: cockpit, appetite, approvals of last resort, risk acceptance → [[WF-5.13-risk-acceptance]], [[WF-5.12-risk-lifecycle]], second exception renewals ([[BR-AUT]] 11)
- **Risk Manager** — register-level: [[WF-5.12-risk-lifecycle]], [[WF-5.15-kri-breach]], [[WF-5.16-rcsa-campaign]], heat map and appetite
- **Compliance Manager** (Head of Compliance, Company Secretary, DPO, Head of Investment Compliance) — deepest working view: [[WF-5.01-source-to-action]] (clause authority is **department**-gated, [[BR-AUT]] 02), [[WF-5.03-regulatory-change]], [[WF-5.04-obligation-and-tasks]] approvals, the ethics channel
- **Compliance Analyst** (tax, labour, secretarial, research analysts) — narrowest: performing duties, attaching evidence → [[WF-5.04-obligation-and-tasks]], [[WF-5.06-evidence]], [[WF-5.28-personal-queue]]
- **Control Owner** (CISO, SecOps, IT controls, SOC) — control-level: [[WF-5.08-control-testing]], [[WF-5.09-continuous-monitoring]], [[WF-5.10-incident-multi-clock]], [[WF-5.22-issue-remediation]]
- **Auditor** (Head of Internal Audit, internal auditors) — assurance: [[WF-5.21-audit-programme]], evidence trail, remediation follow-up
- **Administrator** (Imran Sheikh — pure administrator per [[ADR-007-roles-and-authority]]) — configuration only: [[WF-5.30-admin-config-change]]; visibility of everything, operational authority over nothing ([[BR-AUT]] 09)
- **Audit Committee Chair** (Sunita Menon, also Auditor) — committee remit: findings, issues, exceptions, speak-up oversight — **reviews, never closes** ([[ADR-010-committee-chair-authority]]); statutory direct access to [[WF-5.24-speak-up]]
- **Risk Committee Chair** (Meera Krishnan, also Executive) — committee remit: exposure, appetite, incidents, third-party concentration → the RMC view in [[dashboard-kpi-design]]

## Where personas are load-bearing

- [[REQ-08-role-based-views]] — same data, three altitudes, switched live
- [[REQ-22-structural-protection]] — a persona switch never opens a sealed case
- The switcher is a **server-side identity act** in dev and a **view selector** in production ([[ADR-002-authorization-seam]], [[G-02-identity-authentication]])
- Escalation resolves to real named people via the department-head map ([[BR-ESC]] 04)
