---
type: workflow
id: WF 5.10
spec: "§5.10"
status: specified
phase: Phase 2
tags: [workflow, risk, events]
aliases: ["WF 5.10"]
---

# WF 5.10 — Incident response across multiple regulator clocks

India's multi-clock breach problem made operable: one incident trips several regulator duties (6-hour cyber, 48-hour sector, ~72-hour data-protection), each track with its own clock from **detection** — one timeline, one evidence set, several formats.

**Actors:** Control Owner runs response · Compliance Manager owns the regulator relationship · DPO where personal data is involved · Executive signs off · Auditor reviews after.
**States:** incident `Open → Contained → Closed`; each track independently `Pending → Drafted → Filed`; close gated on required tracks filed.

**Spec:** [[functional-spec#5.10 Incident response across multiple regulator clocks|functional-spec §5.10]]

## Governed by

- [[BR-SCH]] — BR-SCH-06 (clocks from detection) · BR-SCH-07 (late-discovery start recorded, per-regulator config → [[G-18-clock-start-config]]) · BR-SCH-08 (a breach stays visible forever)
- [[BR-LFC]] — BR-LFC-05 (no close with an unfiled track) · BR-LFC-09 ("not reportable" is a recorded decision)
- [[BR-EVD]] — BR-EVD-04: evidence captured once, cited by every track

## Built by

- [[phase-2-risk-and-events#P2-06|P2-06]] — track determination, per-regulator clock config, draft/file (SoD), sticky breach, gated close

## Proves

[[REQ-10-multi-regulator-incident]] · [[REQ-01-one-platform]] (cyber and non-cyber in one system)

## Connects

Raised by [[WF-5.09-continuous-monitoring]] · losses booked via [[WF-5.11-loss-capture]] · converts to [[WF-5.23-fraud-case]] when fraudulent · DSAR-revealed breaches route in from [[WF-5.25-dsar]]
