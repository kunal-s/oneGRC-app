import { extractFeatures, type ProvisionFeatures } from './features.js'

/**
 * Provision classification (P0-20).
 *
 * THE OUTPUT CONTRACT IS SHARED. A model provider returns this same shape, so
 * callers, storage and the promotion rule never learn which tier produced it
 * (spec 13.3, BR-AI-02). What differs is only `provider` and confidence.
 */

export type ProvisionClass =
  | 'Duty' | 'Applicability' | 'Consequence' | 'Definition'
  | 'PowerProcedure' | 'Machinery' | 'RateSchedule' | 'Housekeeping' | 'Unclassified'

export type BindsUs = 'yes' | 'no' | 'undetermined'

export interface Classification {
  classification: ProvisionClass
  /** 0..1 on a scale shared by every provider. */
  confidence: number
  dutyBearer: string | null
  bindsUs: BindsUs
  /** Plain-language duty. Left empty by tiers that cannot honestly produce one. */
  dutyStatement: string
  /** Why, so a reviewer can disagree with the reasoning rather than the label. */
  rationale: string[]
  provider: string
  providerVersion: string
  /** Identifies the ruleset or prompt, so a decision can be explained later. */
  ruleset: string
  features: ProvisionFeatures
}

/** What the organisation IS. The only thing that can answer "is this ours?". */
export interface OrgCapabilities {
  /** e.g. employer, pensionFundManager, intermediary, dataFiduciary */
  capacities: string[]
  jurisdictions: string[]
}

export const RULESET_VERSION = 'rules-1.0.0'

/** Bearer phrases that are never the regulated firm. */
const NOT_US = /\b(the\s+)?(Authority|Commissioner|State Government|Central Government|prescribed authority|Board|Tribunal|Trust|Court)\b/i

/** Bearer phrase to the capacity it implies. */
const BEARER_CAPACITY: Array<[RegExp, string]> = [
  [/\bemployer\b/i, 'employer'],
  [/\b(pension fund|point of presence|intermediary|central recordkeeping)\b/i, 'pensionFundManager'],
  [/\b(person|dealer|assessee|company)\b/i, 'entity'],
  [/\bsubscriber\b/i, 'subscriber'],
]

export function bearerBindsUs(bearer: string | null, org: OrgCapabilities): BindsUs {
  if (!bearer) return 'undetermined'
  if (NOT_US.test(bearer)) return 'no'
  for (const [re, capacity] of BEARER_CAPACITY) {
    if (re.test(bearer)) return org.capacities.includes(capacity) ? 'yes' : 'no'
  }
  return 'undetermined'
}

/**
 * The deterministic classifier.
 *
 * Heading first, because a heading is the draftsman saying what the provision
 * is; then modality and lexicon. It is deliberately conservative: where the
 * signals disagree it returns Unclassified with low confidence rather than
 * guessing, because a wrong promotion puts noise in the register and a wrong
 * demotion hides a duty. Both are corrected by a human, and neither is
 * corrected by a confident wrong answer.
 */
export function classifyProvision(
  input: { heading: string; text: string; isSubClause: boolean },
  org: OrgCapabilities,
): Classification {
  const f = extractFeatures(input)
  const why: string[] = []
  let cls: ProvisionClass = 'Unclassified'
  let confidence = 0.3

  // 1. The heading is the strongest single signal.
  switch (f.headingClass) {
    case 'definitions':
      cls = 'Definition'; confidence = 0.95; why.push('Heading names it as definitions or interpretation')
      break
    case 'housekeeping':
      cls = 'Housekeeping'; confidence = 0.95; why.push('Heading is short title, commencement, repeal or savings')
      break
    case 'penalty':
      cls = 'Consequence'; confidence = 0.85; why.push('Heading names a penalty, offence or interest')
      break
    case 'appealOrRevision':
      cls = 'PowerProcedure'; confidence = 0.85; why.push('Heading names an appeal, revision or rectification')
      break
    case 'power':
    case 'machinery':
      cls = 'Machinery'; confidence = 0.8; why.push('Heading constitutes an authority or confers a power')
      break
    case 'rateOrSchedule':
      cls = 'RateSchedule'; confidence = 0.85; why.push('Heading names a rate or schedule')
      break
    case 'applicability':
      cls = 'Applicability'; confidence = 0.75; why.push('Heading concerns extent, application or liability')
      break
    default:
      break
  }

  // 2. A mandatory obligation on an identifiable bearer overrides a weak
  //    heading signal - but never overrides definitions or housekeeping,
  //    which say "shall" constantly without creating a duty.
  const dutyish = f.modality === 'mandatory' && f.dutyBearerPhrase !== null
  const headingIsHard = f.headingClass === 'definitions' || f.headingClass === 'housekeeping'

  if (dutyish && !headingIsHard && (cls === 'Unclassified' || cls === 'Applicability')) {
    cls = 'Duty'
    confidence = f.headingClass === 'none' ? 0.75 : 0.7
    why.push(`Mandatory language binding "${f.dutyBearerPhrase}"`)
  } else if (dutyish && headingIsHard) {
    why.push('Mandatory language present, but the heading says this is not an operative duty')
  }

  // 3. A penalty inside an otherwise unclassified provision.
  if (cls === 'Unclassified' && f.penaltyTerms.length > 0) {
    cls = 'Consequence'; confidence = 0.6
    why.push(`Penalty vocabulary: ${f.penaltyTerms.slice(0, 3).join(', ')}`)
  }

  // 4. Definitional phrasing without a definitions heading.
  if (cls === 'Unclassified' && f.definitionMarkers.length >= 2) {
    cls = 'Definition'; confidence = 0.65
    why.push('Reads as interpretation rather than obligation')
  }

  const bindsUs = cls === 'Duty' ? bearerBindsUs(f.dutyBearerPhrase, org) : 'undetermined'
  if (cls === 'Duty') {
    why.push(
      bindsUs === 'yes' ? 'The bearer matches a capacity this organisation acts in'
      : bindsUs === 'no' ? 'The bearer is not this organisation'
      : 'The bearer could not be matched to this organisation',
    )
    if (bindsUs === 'undetermined') confidence = Math.min(confidence, 0.5)
  }

  return {
    classification: cls,
    confidence: Number(confidence.toFixed(2)),
    dutyBearer: f.dutyBearerPhrase,
    bindsUs,
    // A rules tier will not write a plain-language duty: a wrong statement of
    // a legal obligation is worse than none. The model tier fills this.
    dutyStatement: '',
    rationale: why,
    provider: 'rules',
    providerVersion: '1.0.0',
    ruleset: RULESET_VERSION,
    features: f,
  }
}
