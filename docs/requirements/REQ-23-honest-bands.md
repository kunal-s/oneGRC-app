---
type: requirement
id: Requirement 23
spec: "§20.2"
status: planned
target: Phase 2
tags: [requirement, risk, indicators]
aliases: ["Requirement 23", "Req 23"]
---

# Requirement 23 — Indicators cannot lie about their own band

**The test:** a lower-is-worse indicator and a higher-is-worse indicator both breach correctly — the band is derived from reading, thresholds and direction, and cannot be overridden.

## Proven by

- Workflows: [[WF-5.15-kri-breach]]
- Rules: [[BR-DRV]] (BR-DRV-02 direction-aware band; BR-DRV-16 worst band rolls up)
- Screens: indicators, risk register
- Chunks: [[phase-2-risk-and-events#P2-05|P2-05]] ("both band correctly; no band column exists to override")

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
