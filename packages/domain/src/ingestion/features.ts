/**
 * Feature extraction for provision classification.
 *
 * ONE extractor, TWO consumers. The rules below classify from these features
 * today; when a model provider lands it receives the same features as
 * structured hints alongside the text. That is what keeps the model tier a
 * drop-in rather than a rewrite (spec 13.3).
 *
 * Nothing here reads a whole document — a provision plus its heading is the
 * unit of inference, fixed now so long sections do not need re-chunking later.
 */

export interface ProvisionFeatures {
  /** shall/must creates a duty; may confers a discretion. */
  modality: 'mandatory' | 'discretionary' | 'none'
  /** The noun phrase the obligation falls on, in the words of the instrument. */
  dutyBearerPhrase: string | null
  /** What the heading alone says this provision is. */
  headingClass: HeadingClass
  /** Lexicon hits, kept as evidence a reviewer can see. */
  penaltyTerms: string[]
  applicabilityTerms: string[]
  procedureTerms: string[]
  definitionMarkers: string[]
  hasCrossReference: boolean
  hasProviso: boolean
  hasAmendmentMarker: boolean
  hasMonetaryAmount: boolean
  isSubClause: boolean
  wordCount: number
}

export type HeadingClass =
  | 'definitions'
  | 'housekeeping'
  | 'penalty'
  | 'appealOrRevision'
  | 'power'
  | 'machinery'
  | 'rateOrSchedule'
  | 'applicability'
  | 'none'

const HEADING_RULES: Array<[HeadingClass, RegExp]> = [
  ['definitions', /\b(definitions?|interpretation)\b/i],
  ['housekeeping', /\b(short title|commencement|extent and commencement|repeal|savings?|validation|duration)\b/i],
  ['penalty', /\b(penalt(y|ies)|offences?|prosecution|compounding|interest|late fee|forfeiture)\b/i],
  ['appealOrRevision', /\b(appeal|revision|rectification of mistakes?|review of order)\b/i],
  ['power', /\b(power to|powers of|special powers|delegation)\b/i],
  ['machinery', /\b(authorities for|constitution|establishment|incorporation|composition|fund|committee)\b/i],
  ['rateOrSchedule', /\b(rate schedule|schedule|rates? of tax)\b/i],
  ['applicability', /\b(extent and application|application of|levy and charge|liability to|charge of tax)\b/i],
]

export function headingClassOf(heading: string): HeadingClass {
  for (const [cls, re] of HEADING_RULES) if (re.test(heading)) return cls
  return 'none'
}

/**
 * Duty-bearer detection.
 *
 * This is the question that decides whether a duty is OURS. PFRDA Act s.14 is
 * a genuine duty clause - it just binds the Authority. Without the bearer, a
 * classifier promotes 303 provisions and none of them are the firm's problem.
 */
// Most specific first. Order matters: one sentence often names both the actor
// and the official it is filed with, and only the first is the duty-bearer.
const BEARER_PATTERNS: RegExp[] = [
  /\b(the|any|every)\s+holder of a certificate[^,.;]{0,40}/i,
  /\b(every|each|any|an?|the)\s+(registered\s+|enrolled\s+)?(employer|dealer|assessee|subscriber|intermediary|pension fund|point of presence|aggregator|company|person)\b/i,
  /\bthe\s+(Authority|Commissioner|State Government|Central Government|prescribed authority|Board|Tribunal|Trust)\b/i,
]

export function dutyBearerOf(text: string): string | null {
  // The duty attaches to the subject standing BEFORE the modal. Search that
  // window with every pattern before widening, so "he shall submit ... to the
  // prescribed authority" yields the holder, not the authority.
  const modalIdx = text.search(/\b(shall|must)\b/i)
  const before = modalIdx > 0 ? text.slice(Math.max(0, modalIdx - 200), modalIdx) : ''

  for (const scope of [before, text.slice(0, 400)]) {
    if (!scope) continue
    for (const re of BEARER_PATTERNS) {
      const m = re.exec(scope)
      if (m) return m[0].replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

const hits = (text: string, re: RegExp): string[] =>
  [...new Set((text.match(re) ?? []).map((s) => s.toLowerCase().trim()))].slice(0, 6)

export function extractFeatures(input: { heading: string; text: string; isSubClause: boolean }): ProvisionFeatures {
  const { heading, text, isSubClause } = input
  const mandatory = /\b(shall|must|is liable to|shall be liable)\b/i.test(text)
  const discretionary = /\bmay\b/i.test(text)

  return {
    modality: mandatory ? 'mandatory' : discretionary ? 'discretionary' : 'none',
    dutyBearerPhrase: dutyBearerOf(text),
    headingClass: headingClassOf(heading),
    penaltyTerms: hits(text, /\b(penalt\w+|punishable|prosecut\w+|late fee|interest at|forfeit\w+|fine)\b/gi),
    applicabilityTerms: hits(text, /\b(shall apply|shall not apply|applies to|exempt\w*|notwithstanding|whose[^.]{0,40}exceeds|less than Rs\.?\s?[\d,]+)\b/gi),
    procedureTerms: hits(text, /\b(appeal|revision|application in Form|may apply to|aggrieved)\b/gi),
    definitionMarkers: hits(text, /\b(means|includes|shall be construed|unless the context otherwise requires)\b/gi),
    hasCrossReference: /\b(under|referred to in|as defined in)\s+(sub-)?(section|rule|clause|regulation)\s+\(?\d+/i.test(text),
    hasProviso: /\bProvided (that|further|also)\b/i.test(text),
    hasAmendmentMarker: /\[[^\]]{4,}\]|\*{4,}/.test(text),
    hasMonetaryAmount: /(Rs\.?\s?[\d,]+|rupees\s+[a-z\s]+|₹\s?[\d,]+)/i.test(text),
    isSubClause,
    wordCount: text.trim().split(/\s+/).length,
  }
}
