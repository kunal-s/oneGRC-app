---
type: workflow
id: WF 5.19
spec: "§5.19"
status: specified
phase: Phase 3
tags: [workflow, risk, third-party]
aliases: ["WF 5.19"]
---

# WF 5.19 — Third-party risk: onboarding, diligence and assurance

A regulated firm stays accountable for what it outsources: the arrangement's exposure is a **computed fact, not an opinion** — the tier derives from criticality, materiality mismatch, personal-data classes, assurance and diligence currency, exit-plan state, right to audit, fourth parties, jurisdiction and linked incidents, with **every point attributed**.

**Actors:** Vendor owner (first line) holds the relationship · Risk/Compliance challenge · Auditor tests.
**States:** `Onboarding → Active → Terminated` (exit evidenced); tier and expiry states derived throughout.

**Spec:** [[functional-spec#5.19 Third-party risk: onboarding, diligence and assurance|functional-spec §5.19]]

## Governed by

- [[BR-DRV]] — BR-DRV-03: the tier has no column to type over; attribution lets it be argued with
- [[BR-ESC]] — BR-ESC-07: assurance expiry chased on a 60-day horizon
- Concentration is surfaced per provider — a per-vendor view misses the systemic one

## Built by

- [[phase-3-cycles-and-assurance#P3-04|P3-04]] — register, derived attributed tier, diligence/assurance chasing

## Proves

[[REQ-21-computed-third-party-tier]]

## Connects

Periodic re-assessment via [[WF-5.20-vendor-dd-campaign]] · concentration in the RMC view ([[dashboard-kpi-design]]) · linked incidents raise the tier ([[WF-5.10-incident-multi-clock]])
