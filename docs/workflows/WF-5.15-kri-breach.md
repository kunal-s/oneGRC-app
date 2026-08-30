---
type: workflow
id: WF 5.15
spec: "§5.15"
status: specified
phase: Phase 2
tags: [workflow, risk, indicators]
aliases: ["WF 5.15"]
---

# WF 5.15 — Key risk indicator breach

The early-warning layer above the register: a reading lands, the band is **derived** from thresholds and the indicator's **direction** (higher-is-worse: green is a ceiling; lower-is-worse: green is a floor), a non-green band is chased, and the worst band badges the risk.

**Actors:** feed or owner records the reading · owner acts on the breach.
**States (band):** `Green | Amber | Red`, derived per reading; a stale reading is chased — a stale green is not a green.

**Spec:** [[functional-spec#5.15 Key risk indicator breach|functional-spec §5.15]]

## Governed by

- [[BR-DRV]] — BR-DRV-02: direction-aware band, never stored, never overridable · BR-DRV-16: worst band per risk, one amber never averaged away
- Threshold changes are governed configuration ([[WF-5.30-admin-config-change]]) — moving goalposts is the easiest way to make a red disappear

## Built by

- [[phase-2-risk-and-events#P2-05|P2-05]] — readings API, derived band both directions, breach → ladder + risk badge, staleness chasing

## Proves

[[REQ-23-honest-bands]]

## Connects

Badges [[WF-5.12-risk-lifecycle]] · chased by [[WF-5.27-reminders-escalation]] · feeds domain breach counts in [[WF-5.26-committee-packs]]
