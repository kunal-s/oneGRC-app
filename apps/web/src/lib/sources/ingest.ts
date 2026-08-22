// AI-assisted Source Act ingestion (enhancement plan 1.6).
//
// SCRIPTED and deterministic — there is no model call. Given an Act name (+ URL)
// or an uploaded document, it returns a structured clause-level breakdown for a
// person to review and accept clause by clause. The shape mirrors the real
// research output and the SourceProvision fields, so the same screens work when a
// real extractor replaces this seam. Every extracted figure is flagged
// `verified: false` until a person confirms it — the AI proposes, a human disposes.
import type { InstrumentType, PenaltyTier, Severity } from '@/types'

export interface ExtractedClause {
  provision: string // 'Section 7'
  title: string // 'Section 7 — Payment of gratuity'
  nameOfCompliance: string
  whatItMeans: string
  keyParts: string[]
  penaltyTiers: PenaltyTier[]
  severity: Severity
  frequency: string
  citation: string
  applicable: boolean
  applicabilityBasis: string
  verified: boolean // false until a person confirms the extracted figures
}

export interface ExtractedAct {
  title: string
  authority: string
  instrumentType: InstrumentType
  summary: string
  applicability: string
  sourceLink: string
  clauses: ExtractedClause[]
}

// A prefilled sample so the demo's "supply name + URL" entry point is one click.
export const SAMPLE_ACT = {
  name: 'Payment of Gratuity Act, 1972',
  url: 'https://www.indiacode.nic.in/handle/123456789/1546',
}

const tier = (trigger: string, consequence: string, severity: Severity): PenaltyTier => ({ trigger, consequence, severity, sourceRef: 'extracted' })

function gratuityAct(): ExtractedAct {
  return {
    title: 'Payment of Gratuity Act, 1972',
    authority: 'Ministry of Labour & Employment',
    instrumentType: 'Act',
    summary: 'Provides for a gratuity payable to employees on exit (resignation, retirement, death or disablement) in covered establishments.',
    applicability: 'SPF employs more than ten persons, so the Act applies; gratuity administration sits with HR & Labour with Finance discharging payment.',
    sourceLink: SAMPLE_ACT.url,
    clauses: [
      {
        provision: 'Section 4',
        title: 'Section 4 — Payment of gratuity',
        nameOfCompliance: 'Gratuity payment on exit',
        whatItMeans: 'Pay gratuity at fifteen days’ wages for each completed year of service to an employee who has rendered at least five years of continuous service, on exit.',
        keyParts: ['15 days’ wages per completed year of service', 'Eligibility after 5 years continuous service', 'Statutory ceiling on the amount payable'],
        penaltyTiers: [tier('Non-payment of due gratuity', 'Interest on the delayed amount; offence under section 9 (fine and/or imprisonment)', 'High')],
        severity: 'High',
        frequency: 'Event-based',
        citation: 'Section 4, Payment of Gratuity Act, 1972',
        applicable: true,
        applicabilityBasis: 'Covered establishment with 10+ employees.',
        verified: false,
      },
      {
        provision: 'Section 7',
        title: 'Section 7 — Determination and time-limit',
        nameOfCompliance: 'Gratuity determination & timely disbursal',
        whatItMeans: 'Determine the gratuity amount and disburse it within thirty days of it becoming payable; pay interest if delayed beyond the period.',
        keyParts: ['Determine amount on exit', 'Disburse within 30 days', 'Interest on delay'],
        penaltyTiers: [tier('Delay beyond 30 days', 'Simple interest on the delayed gratuity for the period of delay', 'Medium')],
        severity: 'Medium',
        frequency: 'Event-based',
        citation: 'Section 7, Payment of Gratuity Act, 1972',
        applicable: true,
        applicabilityBasis: 'Applies to every payment of gratuity by the employer.',
        verified: false,
      },
      {
        provision: 'Section 4A',
        title: 'Section 4A — Compulsory insurance',
        nameOfCompliance: 'Gratuity liability insurance / approved fund',
        whatItMeans: 'Obtain insurance for the gratuity liability (or maintain an approved gratuity fund) and register the establishment with the controlling authority, where the provision is in force.',
        keyParts: ['Insure the gratuity liability or maintain an approved fund', 'Register with the controlling authority'],
        penaltyTiers: [tier('Failure to insure where required', 'Fine prescribed under the Act', 'Medium')],
        severity: 'Medium',
        frequency: 'Annual',
        citation: 'Section 4A, Payment of Gratuity Act, 1972',
        applicable: true,
        applicabilityBasis: 'Subject to the provision being notified in the State; confirm at acceptance.',
        verified: false,
      },
    ],
  }
}

function genericAct(name: string, url?: string): ExtractedAct {
  const mk = (provision: string, title: string, name: string, means: string, parts: string[], freq: string): ExtractedClause => ({
    provision,
    title,
    nameOfCompliance: name,
    whatItMeans: means,
    keyParts: parts,
    penaltyTiers: [tier('Default / late compliance', 'Penalty as prescribed — confirm amount against the source', 'Medium')],
    severity: 'Medium',
    frequency: freq,
    citation: `${title}, ${name}`,
    applicable: true,
    applicabilityBasis: 'Proposed applicable to SPF — confirm at acceptance.',
    verified: false,
  })
  return {
    title: name,
    authority: 'To be confirmed',
    instrumentType: 'Act',
    summary: `Scripted extraction of ${name}. Structure and figures are proposed and must be confirmed clause by clause before acceptance.`,
    applicability: 'Applicability to SPF proposed by the ingestion seam; confirm during review.',
    sourceLink: url || '',
    clauses: [
      mk('Registration', 'Registration / enrolment', name, 'Register or enrol the establishment with the prescribed authority within the stated window.', ['Obtain certificate of registration', 'Display / retain the certificate'], 'One-time'),
      mk('Periodic return', 'Periodic return / filing', name, 'File the periodic return in the prescribed form by the due date.', ['Prepare the return', 'File by the statutory date'], 'Annual'),
      mk('Penalty', 'Penalty for default', name, 'Default attracts a penalty and/or interest as prescribed.', ['Penalty on default', 'Interest on delayed payment'], 'Event-based'),
    ],
  }
}

/** Run the scripted extraction for an act name (+ optional URL) or an upload. */
export function extractAct(name: string, url?: string): ExtractedAct {
  if (/gratuity/i.test(name)) return gratuityAct()
  return genericAct(name.trim() || 'Untitled instrument', url)
}
