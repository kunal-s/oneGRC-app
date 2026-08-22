# OneGRC Demo Video Pack

**Runtime:** 3 minutes 30 seconds (210 seconds).
**Voiceover:** AI TTS, Indian English, ~150 words per minute.
**Steps:** 9, aligned to Section 11 (Demo and Prototype Scope) of the functional product specification.
**Load-bearing chain (runs through steps 3, 4, 5, 6, 7):** the source clause → the control that satisfies it → the obligation that falls due → the task that does the work, under maker and checker → the evidence that proves it.

This document is the single source of truth for the demo. The narration script, the shot list, the on-screen captions, the SRT, and the guided-tour step configuration are aligned verbatim. If any of these needs to change, change it here first, then propagate. `TourProvider` reads Section 5 of this file at runtime; the steps are not declared anywhere in code.

---

## 1. Narration script (539 words)

Each block below is one tour step. The full block is what the voiceover reads and also what the tour caption bubble displays, verbatim. One idea per line, natural pauses on line breaks. Each line is one SRT cue.

### Step 1 · Board Cockpit, live posture (0:00–0:23)

This is OneGRC, one platform for governance, risk, compliance and audit.
Every duty this firm owes, from a law or from its own policy, sits in one connected model.
Six tiles carry the board's live posture, including a regulator clock counting down on an open incident.
These are not reported figures.
Each one opens the record behind it.

### Step 2 · Source Library, the two intakes (0:23–0:46)

OneGRC takes in duties from two places.
Public and industry-regulated sources come in here: Acts, Rules, Circulars, Directions and Standards.
Internal company policies come in alongside them.
Both are parsed and analysed by AI, broken into clauses, and turned into controls that a person owns.
The library shows where each act stands: tracked, awaiting a decision, or reference.

### Step 3 · Clause detail, what it asks and what it costs (0:46–1:09)

Open a clause and you see what the law asks of you.
This is Section 164(2) of the Companies Act.
What it requires is stated plainly, next to the exact statutory extract.
Below it sit the penalty tiers, each with its trigger, its consequence and its source.
Severity is not typed in by hand.
It is derived from those penalties.

### Step 4 · The decision, and the specialist in the loop (1:09–1:32)

Nothing is saved automatically.
A compliance officer decides.
On Section 92(5), the annual return duty, the platform recommends a control and shows its confidence.
The officer can save the clause to that control, mark it not applicable with a reason, or engage a specialist.
Engage routes it to a human expert, inside the firm or outside, and holds the clause until they answer.

### Step 5 · The proof chain (1:32–1:58)

This is the connective tissue.
From the clause, the chain runs to the control that satisfies it, the obligation that falls due, the task that does the work, and the evidence that proves it.
Every node is a live record, not a diagram.
The same chain renders on every screen, read from whichever end you start at.
This is what makes an inspection answerable: one path from the law to the proof.

### Step 6 · Recurring duty, maker and checker (1:58–2:21)

Follow the chain to a recurring duty.
Profession tax, monthly, three tasks in the cycle.
Every task names a maker, who does the work and attaches the evidence, and a checker, who verifies it.
They are different people, and both are on the record.
Below, the cycle history shows each period, met on time or late.

### Step 7 · Reminders and escalations (2:21–2:44)

Scheduled work chases itself.
Each task carries a ladder: reminders at seven, three and one day before it is due, then escalations after.
One day overdue reaches the owner and their line manager, three days the compliance officer, seven days the executive.
Fired rungs are stamped and written to the audit log.
Nothing waits on someone remembering.

### Step 8 · Copilot, grounded and cited (2:44–3:07)

The Copilot sits on the record, not beside it.
Ask this control what it derives from, and the answer comes back grounded in the act behind it, with the citation attached.
Open the citation and you land on the source text itself.
The Copilot proposes and explains.
It never acts.
A person still decides and signs.

### Step 9 · Audit readiness, and the reach beyond one industry (3:07–3:30)

Some controls test themselves.
This rule checks every asset against the fourteen-day critical patch window.
Three are failing.
The run captured its own evidence, raised an issue with an owner and a due date, and linked the live incident.
That is audit readiness as a state, not a scramble.
And none of this is pension-specific.
Any framework, any industry.

---

## 2. Shot list

Sum of column six equals 210 seconds.

| # | Screen / route | On-screen action | Element to highlight | Matching narration line | Seconds |
|---|---|---|---|---|---|
| 1 | `/` Board Cockpit, as the Executive | Tour switches the persona to the Executive and lands on the cockpit; spotlight on the six headline tiles, with the heat map visible directly below | The six KPI tiles: enterprise risk, control coverage, open incidents, nearest regulator clock (ticking), overdue obligations, open findings | "This is OneGRC ... Each one opens the record behind it." | 23 |
| 2 | `/sources` Source Library, as the Compliance Manager | Persona switches to Compliance; spotlight on the header, the intake counters and the two entry points | Header with the "Internal policies" link, the Acts / Clauses / Awaiting decision / Saved counters, and the bucket filters | "OneGRC takes in duties from two places ... tracked, awaiting a decision, or reference." | 23 |
| 3 | `/sources/section/SRC-CA-164-2` | Clause detail for Companies Act Section 164(2); spotlight on the requirement and the penalty tiers | "What this requires" plus "What happens if missed" with the tier table, its trigger, consequence, source and the derived severity | "Open a clause ... It is derived from those penalties." | 23 |
| 4 | `/sources/section/SRC-CA-92-5` | Sibling clause on the same Act with a live decision row; the three actions are hoverable through the scrim | The recommendation card at 95.7% confidence and the action row: Save to a control / Mark not applicable / Engage specialist | "Nothing is saved automatically ... holds the clause until they answer." | 23 |
| 5 | `/sources/section/SRC-CA-164-2` | Back to the clause; spotlight moves to the proof-chain band | The five-node chain: SRC-CA-164-2 → CTRL-COMP-CA-04 → OBL-CA-FY26-05 → TSK-2026-0209 → EVD-44612, every node a live link | "This is the connective tissue ... one path from the law to the proof." | 26 |
| 6 | `/obligations/OBL-LAB-JUN26-04` | The recurring profession-tax duty; spotlight on its task table and cycle history | Three tasks with named maker, named checker, due date, evidence and follow-up; the cycle history showing on time versus late | "Follow the chain to a recurring duty ... met on time or late." | 23 |
| 7 | `/tasks/TSK-2026-0036` | One task from that cycle; spotlight on the reminder and escalation ladder | Six rungs: reminders at 7, 3 and 1 day before due, escalations at 1, 3 and 7 days overdue, each stamped Fired or Scheduled | "Scheduled work chases itself ... Nothing waits on someone remembering." | 23 |
| 8 | `/controls/CTRL-COMP-PT-01?ask=2` | The control the duty maps to; one suggested Copilot question fires on arrival and the cited answer streams in | The Copilot panel: the grounded-on record, the question, the answer, and the citation row that opens the source text | "The Copilot sits on the record ... A person still decides and signs." | 23 |
| 9 | `/ccm/CCM-NIST-ID.RA-01` | The failing continuous-monitoring rule; spotlight on the failing population and what the platform did unassisted | The three CVEs past the 14-day SLA, then the auto-escalation chain: rule failed → evidence captured → issue ISS-2026-0103 → incident linked | "Some controls test themselves ... Any framework, any industry." | 23 |

---

## 3. On-screen captions (sound-off friendly)

Short overlay captions burned into the video. One per step, up to eight words.

| # | Caption |
|---|---|
| 1 | One connected model. One live posture. |
| 2 | Two intakes: the law, and your own policy. |
| 3 | What the clause asks. What missing it costs. |
| 4 | The officer decides. The specialist is a click away. |
| 5 | Source → control → obligation → task → evidence. |
| 6 | Every cycle: a maker, and a checker. |
| 7 | Reminders before due. Escalations after. Both trailed. |
| 8 | Grounded, cited, and it never acts alone. |
| 9 | Audit readiness as a state, not a scramble. |

---

## 4. SRT captions

The 49-cue SRT file lives at `docs/onegrc-demo.srt` and is the exact rendering of Section 1 above, one cue per narration line. Each step's `durationMs` from Section 5 is split across that step's lines in proportion to their word count, so cue boundaries always reconcile with the step boundaries. Total runtime 00:03:30,000. If the narration in Section 1 changes, regenerate the SRT from it; the SRT is a derivative artefact and never the timing authority.

---

## 5. Guided-tour step config (single source of truth for the build)

The guided tour is driven by the JSON block below. `TourProvider` reads this file at runtime and parses this block verbatim: nine ids, nine routes, nine anchors, nine captions, and nine durations summing to 210000 milliseconds. The steps are never re-declared in code.

- Steps 1 through 4 and 6 through 9 run for 23000ms each.
- Step 5 runs for 26000ms because it carries the proof-chain thesis.
- The captions in this config are identical to the narration in Section 1 so the on-screen tour and the recorded voiceover stay in sync.
- Anchors are `data-tour` attribute values placed on the single wrapper that encloses the whole element the spotlight should frame.
- `persona` is optional. When present, the tour switches the active persona before the step renders; steps without it inherit whichever persona is already active. Step 1 runs as the Executive so the Board Cockpit heat map is on screen; step 2 switches to the Compliance Manager, who holds clause authority, and every later step stays there. The persona active when the tour started is restored on Finish and on Skip.

```json
{
  "tour": "onegrc-demo-3.5min",
  "totalDurationMs": 210000,
  "steps": [
    {
      "id": 1,
      "route": "/",
      "persona": "meera",
      "anchor": "home-posture",
      "caption": "This is OneGRC, one platform for governance, risk, compliance and audit. Every duty this firm owes, from a law or from its own policy, sits in one connected model. Six tiles carry the board's live posture, including a regulator clock counting down on an open incident. These are not reported figures. Each one opens the record behind it.",
      "durationMs": 23000
    },
    {
      "id": 2,
      "route": "/sources",
      "persona": "anjali",
      "anchor": "sources-intake",
      "caption": "OneGRC takes in duties from two places. Public and industry-regulated sources come in here: Acts, Rules, Circulars, Directions and Standards. Internal company policies come in alongside them. Both are parsed and analysed by AI, broken into clauses, and turned into controls that a person owns. The library shows where each act stands: tracked, awaiting a decision, or reference.",
      "durationMs": 23000
    },
    {
      "id": 3,
      "route": "/sources/section/SRC-CA-164-2",
      "anchor": "clause-requires-and-penalty",
      "caption": "Open a clause and you see what the law asks of you. This is Section 164(2) of the Companies Act. What it requires is stated plainly, next to the exact statutory extract. Below it sit the penalty tiers, each with its trigger, its consequence and its source. Severity is not typed in by hand. It is derived from those penalties.",
      "durationMs": 23000
    },
    {
      "id": 4,
      "route": "/sources/section/SRC-CA-92-5",
      "anchor": "clause-decision",
      "caption": "Nothing is saved automatically. A compliance officer decides. On Section 92(5), the annual return duty, the platform recommends a control and shows its confidence. The officer can save the clause to that control, mark it not applicable with a reason, or engage a specialist. Engage routes it to a human expert, inside the firm or outside, and holds the clause until they answer.",
      "durationMs": 23000
    },
    {
      "id": 5,
      "route": "/sources/section/SRC-CA-164-2",
      "anchor": "proof-chain",
      "caption": "This is the connective tissue. From the clause, the chain runs to the control that satisfies it, the obligation that falls due, the task that does the work, and the evidence that proves it. Every node is a live record, not a diagram. The same chain renders on every screen, read from whichever end you start at. This is what makes an inspection answerable: one path from the law to the proof.",
      "durationMs": 26000
    },
    {
      "id": 6,
      "route": "/obligations/OBL-LAB-JUN26-04",
      "anchor": "obligation-cycles-and-tasks",
      "caption": "Follow the chain to a recurring duty. Profession tax, monthly, three tasks in the cycle. Every task names a maker, who does the work and attaches the evidence, and a checker, who verifies it. They are different people, and both are on the record. Below, the cycle history shows each period, met on time or late.",
      "durationMs": 23000
    },
    {
      "id": 7,
      "route": "/tasks/TSK-2026-0036",
      "anchor": "reminders-ladder",
      "caption": "Scheduled work chases itself. Each task carries a ladder: reminders at seven, three and one day before it is due, then escalations after. One day overdue reaches the owner and their line manager, three days the compliance officer, seven days the executive. Fired rungs are stamped and written to the audit log. Nothing waits on someone remembering.",
      "durationMs": 23000
    },
    {
      "id": 8,
      "route": "/controls/CTRL-COMP-PT-01?ask=2",
      "anchor": "copilot",
      "caption": "The Copilot sits on the record, not beside it. Ask this control what it derives from, and the answer comes back grounded in the act behind it, with the citation attached. Open the citation and you land on the source text itself. The Copilot proposes and explains. It never acts. A person still decides and signs.",
      "durationMs": 23000
    },
    {
      "id": 9,
      "route": "/ccm/CCM-NIST-ID.RA-01",
      "anchor": "ccm-escalation",
      "caption": "Some controls test themselves. This rule checks every asset against the fourteen-day critical patch window. Three are failing. The run captured its own evidence, raised an issue with an owner and a due date, and linked the live incident. That is audit readiness as a state, not a scramble. And none of this is pension-specific. Any framework, any industry.",
      "durationMs": 23000
    }
  ]
}
```

---

## 6. Anchor placement notes for the build

The tour points at whole visuals, not inner elements. Each `data-tour` attribute sits on the single wrapper that encloses the whole target visual. All nine resolve on their intended screen; none falls back in the happy path.

1. `home-posture`: the six-tile KPI grid on the Executive Board Cockpit, in `src/pages/Home.tsx`. The heat map sits directly beneath it (see the note on the dashboard order below) and stays visible during the step, but it is deliberately outside the anchor: including it makes the spotlight about 610px tall, which leaves no room for the caption bubble on either side at viewport heights of 1080px and below.
2. `sources-intake`: in `src/pages/Sources.tsx`, wrapping the page header (which carries the link to the internal-policy intake), the counter band and the bucket filters.
3. `clause-requires-and-penalty`: in `src/pages/SourceSectionDetail.tsx`, wrapping the "What this requires" card and the "What happens if missed" penalty-tier card as one block.
4. `clause-decision`: in `src/pages/SourceSectionDetail.tsx`, on the card holding the AI recommendation and the three-action decision row.
5. `proof-chain`: on the `ProofChain` component root (`src/components/ProofChain.tsx`), which takes an optional `dataTour` prop. Only the clause page passes it, so the anchor is unique.
6. `obligation-cycles-and-tasks`: in `src/pages/ObligationDetail.tsx`, wrapping the task table and the cycle history together, below the proof-chain band.
7. `reminders-ladder`: in `src/pages/TaskDetail.tsx`, on the "Reminders and escalations" card.
8. `copilot`: in `src/pages/ControlDetail.tsx`, on the wrapper around the inline Copilot panel.
9. `ccm-escalation`: in `src/pages/CcmDetail.tsx`, wrapping the failing-population table and the auto-escalation chain.

**Scroll alignment.** The engine top-aligns an anchor when the anchor plus the caption bubble fits the scroll port, and only centres anchors too tall for that. This keeps the bubble clear of the spotlight on the mid-height anchors (steps 3, 6 and 9) instead of forcing it over them.

**Dashboard order.** The Executive cockpit was reordered so the heat map and "Needs attention" sit directly below the KPI tiles, with Inspection readiness and Board and committee prep beneath them. This is a permanent product change, not a tour scaffold: tiles answer "where do we stand", the heat map answers "where is the exposure", and the readiness and committee surfaces are ones you go to deliberately rather than scan continuously.

---

## 7. Notes for future edits

- To change a caption, change it in Section 1 of this file and in the corresponding step in the JSON in Section 5, in the same edit. The tour reads Section 5 verbatim; the SRT is regenerated from Section 1.
- To rebalance the timing, edit the `durationMs` in Section 5 and the seconds column in Section 2 together. The sum must remain 210000ms (Section 2 = 210 seconds).
- To add or remove a step, update Section 1, Section 2, Section 3, Section 5 and Section 6 in one edit, and regenerate the SRT.
- `persona` in Section 5 switches the active persona before a step renders. Only two steps carry it: step 1 runs as the Executive because the cockpit is the Executive's screen, and step 2 switches to the Compliance Manager, who holds clause authority. Removing the step 2 persona would leave the later decision beats read-only. The persona active when the tour started is restored on Finish and on Skip.
- `?ask=<n>` on a control route fires one suggested Copilot question by index on arrival. It is read-only: it selects a question, composes the scripted answer in local state and mutates nothing. Out-of-range values are ignored.
- If the tour is later locked to the recorded audio, replace the `durationMs` auto-advance in the tour engine with a listener on the audio element's `timeupdate` that advances at each step's cumulative boundary derived from the SRT. Do not embed audio timings in the JSON; keep this file the sole timing authority.
