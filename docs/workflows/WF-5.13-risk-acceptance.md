---
type: workflow
id: WF 5.13
spec: "§5.13"
status: specified
phase: Phase 2
tags: [workflow, risk]
aliases: ["WF 5.13"]
---

# WF 5.13 — Risk acceptance

Carrying a risk is a legitimate decision; carrying it silently and forever is not: acceptance needs someone other than the owner, always expires, is chased from thirty days out, and lapses into a visible, escalating exposure if nobody decides.

**Actors:** Owner proposes · Approver accepts (SoD — an owner may not accept their own exposure).
**States:** proposed → `Accepted` (until expiry) → renewed / closed / converted to treatment, or → `Acceptance lapsed` on silence.

**Spec:** [[functional-spec#5.13 Risk acceptance|functional-spec §5.13]]

> Naming (v2.1): the lapse state was `Exception expired` in v2.0, renamed **`Acceptance lapsed`** because Exception is now a first-class entity and a lapsed acceptance does **not** create an Exception record — [[ADR-005-exception-first-class]].

## Governed by

- [[BR-LFC]] — BR-LFC-04: an expired acceptance is an open exposure that reads as such and escalates
- [[BR-AUT]] — BR-AUT-07: owner may not self-accept
- [[BR-ESC]] — BR-ESC-07: 30-day expiry warning window

## Built by

- [[phase-2-risk-and-events#P2-03|P2-03]] — accept (SoD), 30-day ladder registration, lapse to open exposure; conversion **from** an expired exception lands here via [[phase-2-risk-and-events#P2-13|P2-13]]

## Proves

[[REQ-18-acceptance-expires]] — "accepted" can never mean "forgotten"

## Connects

A branch of [[WF-5.12-risk-lifecycle]] · appetite counts a lapsed acceptance as exposure ([[dashboard-kpi-design]]) · expired exceptions may convert into an acceptance from [[WF-5.14-exception-register]]
