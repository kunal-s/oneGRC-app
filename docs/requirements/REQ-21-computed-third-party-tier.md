---
type: requirement
id: Requirement 21
spec: "§20.2"
status: planned
target: Phase 3
tags: [requirement, risk, third-party]
aliases: ["Requirement 21", "Req 21"]
---

# Requirement 21 — Third-party exposure is computed, not asserted

**The test:** an arrangement's tier rises automatically when its independent assurance lapses, every point attributed — nobody can type a low tier over a material outsourcing with expired assurance.

## Proven by

- Workflows: [[WF-5.19-third-party-risk]] · [[WF-5.20-vendor-dd-campaign]]
- Rules: [[BR-DRV]] (BR-DRV-03 attributed tier) · [[BR-ESC]] (BR-ESC-07, 60-day assurance window)
- Screens: third-party register
- Chunks: [[phase-3-cycles-and-assurance#P3-04|P3-04]] ("time-travel an assurance report past expiry → tier rises with the driver attributed; no tier field exists to type over") · [[phase-3-cycles-and-assurance#P3-05|P3-05]] DD write-back

**Spec:** [[functional-spec#20.2 Additional acceptance criteria for the expanded scope|functional-spec §20.2]] · matrix: [[traceability]]
