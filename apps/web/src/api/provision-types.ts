export interface ProvisionRow {
  id: string
  instrumentId: string
  clauseRef: string
  heading: string
  pageNumber: number | null
  classification: string
  confidence: number | null
  dutyBearer: string | null
  bindsUs: 'yes' | 'no' | 'undetermined'
  blockingFlags: number
  flagKinds: string[]
  promotedAs: string | null
}

export interface ProvisionDetail {
  id: string
  clauseRef: string
  heading: string
  verbatimText: string
  pageNumber: number | null
  instrument: { id: string; shortTitle: string; citation: string | null; authority: string }
  parent: { id: string; clauseRef: string; heading: string } | null
  classification: string
  confidence: number | null
  dutyBearer: string | null
  bindsUs: 'yes' | 'no' | 'undetermined'
  classifier: { name: string | null; version: string | null; ruleset: string | null }
  flags: Array<{
    id: string; kind: string; detail: string | null; blocking: boolean
    resolvedAt: string | null; resolution: string | null; resolutionNote: string | null
  }>
  promotedAs: string | null
  notApplicable: { at: string; reason: string | null } | null
  specialistEngagedAt: string | null
  capabilities: {
    promote: boolean
    resolveFlag: boolean
    notApplicable: boolean
    engageSpecialist: boolean
  }
  promotionBlockedBy: string[]
}

export interface InstrumentTriage {
  id: string
  title: string
  shortTitle: string
  citation: string | null
  authority: string
  type: string
  provenance: {
    sourceUrl: string | null; retrievedAt: string | null; retrievalMethod: string | null
    textLayer: string; sha256: string | null; pageCount: number | null
  }
  relations: Array<{ direction: 'from' | 'to'; kind: string; other: { id: string; shortTitle: string } }>
  triage: {
    total: number
    needsDecision: number
    notOurs: number
    promoted: number
    blockedByFlags: number
    byClass: Record<string, number>
  }
}
