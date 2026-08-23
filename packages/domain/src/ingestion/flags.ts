/**
 * Deterministic ambiguity detection (P0-16).
 *
 * Every flag here is found by structure or lexis, with no model involved, and
 * every one has a real instance in the fixture instruments. This matters: the
 * most useful review signals are available before any intelligence is added,
 * and a reviewer opening a clause should already see why it needs their eye.
 *
 * The model-backed stage (P0-17) adds what heuristics genuinely cannot — the
 * plain-language summary, the duty-versus-discretion judgement, and which
 * existing control already covers the clause.
 */

export type ClauseFlagKind =
  | 'CadenceUnspecified'
  | 'ConditionalApplicability'
  | 'UnresolvedCrossReference'
  | 'AmendedText'
  | 'ProvisoPresent'
  | 'DiscretionaryLanguage'
  | 'LowExtractionConfidence'

export interface DetectedFlag {
  kind: ClauseFlagKind
  /** The phrase that triggered it, so a reviewer can see the evidence. */
  detail: string
}

interface Detector {
  kind: ClauseFlagKind
  pattern: RegExp
  describe: (match: string) => string
}

const DETECTORS: Detector[] = [
  {
    // PT Act s.6: "a return in such form, for such period and by such dates as
    // may be prescribed" - the Act defers its cadence to the Rules.
    kind: 'CadenceUnspecified',
    pattern:
      /\b(as may be prescribed|as may be notified|as the [A-Z][a-z]+ may (?:direct|specify)|in such (?:form|manner|period)[^.]{0,60}as may be prescribed)\b/i,
    describe: (m) => `Defers to subordinate legislation: "${m}"`,
  },
  {
    // PT Rules r.11: monthly or annual depending on the liability of the firm.
    kind: 'ConditionalApplicability',
    pattern:
      /\b(?:was |is |exceeds |less than |not less than |more than |upto |up to )(?:Rs\.?|rupees|₹)\s?[\d,]+|\bwhose\b[^.]{0,80}\bexceeds\b/i,
    describe: (m) => `Applies conditionally on a threshold: "${m.trim()}"`,
  },
  {
    // PFRDA circular para 4: "under Section 14 of the ... Act, 2013".
    kind: 'UnresolvedCrossReference',
    pattern:
      /\b(?:under|referred to in|in exercise of the powers conferred (?:under|by)|as defined in)\s+(?:sub-)?(?:section|rule|clause|regulation|paragraph|schedule)\s+\(?[0-9]+[A-Za-z]?\)?/i,
    describe: (m) => `Cites another provision: "${m.trim()}"`,
  },
  {
    // Indian statute marks amended text with square brackets and footnote refs.
    kind: 'AmendedText',
    pattern: /\[[^\]]{4,}\]|\*{4,}/,
    describe: () => 'Text carries amendment substitutions or omissions',
  },
  {
    kind: 'ProvisoPresent',
    pattern: /\bProvided (?:that|further|also)\b/i,
    describe: (m) => `Carries a proviso: "${m.trim()}"`,
  },
  {
    // A discretion is not a duty, and only one of them creates an obligation.
    kind: 'DiscretionaryLanguage',
    pattern: /\b(?:may,? (?:subject to|at his|at its|from time to time|by notification)|it shall be lawful for)\b/i,
    describe: (m) => `Discretionary rather than mandatory: "${m.trim()}"`,
  },
]

/** Confidence at or below this marks the clause for review. */
export const LOW_CONFIDENCE_THRESHOLD = 0.85

export function detectFlags(text: string, extractionConfidence?: number): DetectedFlag[] {
  const found: DetectedFlag[] = []

  for (const d of DETECTORS) {
    const m = d.pattern.exec(text)
    if (m) found.push({ kind: d.kind, detail: d.describe(m[0]) })
  }

  if (extractionConfidence !== undefined && extractionConfidence <= LOW_CONFIDENCE_THRESHOLD) {
    found.push({
      kind: 'LowExtractionConfidence',
      detail: `Extraction confidence ${extractionConfidence.toFixed(2)} — the source is a scan and the text may be unreliable`,
    })
  }

  return found
}

/** Does this clause read as a duty? "shall" creates one; "may" does not. */
export function looksMandatory(text: string): boolean {
  return /\bshall\b|\bmust\b|\bis required to\b|\bliable to pay\b/i.test(text)
}

/**
 * Which flags PREVENT promotion to a tracked clause.
 *
 * The test is simple: could a competent officer schedule and evidence this
 * duty without answering the question? If not, tracking it would create an
 * obligation nobody can discharge, which is worse than leaving it in triage.
 */
export const BLOCKING_FLAGS: ReadonlySet<ClauseFlagKind> = new Set<ClauseFlagKind>([
  // You cannot schedule a duty you cannot date.
  "CadenceUnspecified",
  // You do not yet know the duty is yours.
  "ConditionalApplicability",
  // It depends on an instrument that has not been ingested.
  "UnresolvedCrossReference",
  // The text may not be what the law says.
  "LowExtractionConfidence",
])

export const isBlocking = (kind: ClauseFlagKind): boolean => BLOCKING_FLAGS.has(kind)
