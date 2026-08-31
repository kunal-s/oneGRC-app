---
type: moc
status: current
tags: [moc]
aliases: [Start here]
---

# Start here

A reading path into OneGRC for someone new, and the map of how this vault answers the two questions that matter during a build.

## The two questions this vault answers

- **"Why am I building this?"** — start from a chunk in a phase note (e.g. [[phase-2-risk-and-events#P2-04|P2-04]]) and follow its links to the workflow it builds, the rules that constrain it, and the requirement it proves.
- **"What does this touch?"** — start from a rule group (e.g. [[BR-DRV]]), a requirement (e.g. [[REQ-17-governed-deviations]]) or a gap (e.g. [[G-05-scheduler]]) and follow its links to every chunk, workflow, ADR and screen that implements it. The [[traceability]] matrix is the graph in table form.

## Reading path

1. **What the product is** — [[functional-spec]] §1–§3 (overview, architecture, design principles). One sitting.
2. **Who uses it** — [[personas]], then spec §4 for the full authority model.
3. **What changed and why** — [[spec-change-register]] (v2.0 → v2.1: read this instead of diffing the spec), then the eleven ADRs in [[index]] order. The ADRs are **authoritative** — several deliberately override the spec and say so.
4. **How it gets built** — [[build-plan]] §1–§2 (architecture, the eight unretrofittable invariants), then the phase notes: [[phase-0-proof-chain-spike]] · [[phase-1-platform-floor]] · [[phase-2-risk-and-events]] · [[phase-3-cycles-and-assurance]] · [[phase-4-investigations-and-privacy]] · [[phase-5-intelligence-admin-handoff]].
5. **The proof of done** — the 24 requirement notes (start with [[REQ-07-connected-demonstration]] and [[REQ-17-governed-deviations]]), and [[dashboard-kpi-design]] for what the board actually sees.

## The vault's shape

| Folder | Notes | What they are |
|---|---|---|
| `workflows/` | 30 | One per spec §5 workflow — what it does, actors, states, and links each way |
| `requirements/` | 24 | One per §20 acceptance requirement — the demonstrable test and everything that makes it pass |
| `rules/` | 11 | One per business-rule **group** (§6) — every rule glossed in a line, linked to its enforcement |
| `gaps/` | 28 | One per §19.2 gap — what the prototype fakes, what closes it, and where |
| `phases/` | 6 | One per build phase — every chunk as a stable link anchor (`#P2-04`) |
| `mocs/` | 8 | These hubs, by domain and persona, plus [[traceability]] |

## By domain

[[domain-compliance]] · [[domain-risk]] · [[domain-audit-assurance]] · [[domain-investigations]] · [[domain-privacy-data]]

## Conventions

- The spec is the contract; the ADRs are the amendments; these notes are **connective tissue only** — a line or two plus links, never a copy of spec text. When a note is not enough, its `Spec:` link lands on the governing section.
- Stable identifiers (`WF 5.14`, `BR-LNK-06`, `G-19`, `Requirement 17`, `P2-04`) are aliases, so `[[BR-DRV-17]]` and `[[Requirement 17]]` resolve.
