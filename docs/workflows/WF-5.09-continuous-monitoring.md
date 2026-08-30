---
type: workflow
id: WF 5.9
spec: "§5.9"
status: specified
phase: Phase 2
tags: [workflow, compliance, controls]
aliases: ["WF 5.9"]
---

# WF 5.9 — Continuous control monitoring and the failure cascade

The proof the platform is continuous, not periodic: a monitored control tests itself against a live population, captures its own evidence, and escalates on its own when it fails — the load-bearing cascade (patch-SLA rule fails on 3 items → issue naming them → linked live incident → one evidence set cited by three regulator filings).

**Actors:** system, then Control Owner.
**States (rule):** `Passing | Failing | Degraded` — derived; **Degraded, never Passing, when the feed is blind**.

**Spec:** [[functional-spec#5.9 Continuous control monitoring and the failure cascade|functional-spec §5.9]]

## Governed by

- [[BR-DRV]] — BR-DRV-09: a rule that cannot see its population never reports success
- [[BR-EVD]] — BR-EVD-03: auto-captured evidence still needs a verification act
- [[BR-LFC]] — BR-LFC-11: failure raises the issue; false positives are excluded only by a **governed** config change ([[WF-5.30-admin-config-change]])

## Built by

- [[phase-2-risk-and-events#P2-08|P2-08]] — `FeedProvider` seam with simulated impl ([[G-07-connectors]]), runs as auto-evidence, the cascade wired to the marquee incident

## Proves

The §19.1 load-bearing scenario, live · feeds [[REQ-10-multi-regulator-incident]] and [[REQ-14-metrics-on-demand]]

## Connects

Escalates into [[WF-5.22-issue-remediation]] and [[WF-5.10-incident-multi-clock]] · tolerated deviations via [[WF-5.14-exception-register]] · real connectors arrive in [[phase-5-intelligence-admin-handoff#P5-06|P5-06]]
