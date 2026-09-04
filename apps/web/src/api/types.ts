export interface InstrumentSummary {
  id: string
  shortTitle: string
  title: string
  citation: string | null
  authority: string
  type: string
  status: string
  issuedOn: string | null
  textLayer: 'native' | 'ocr' | 'none'
  retrievalMethod: 'fetched' | 'manualUpload' | null
  pageCount: number | null
  clauseCount: number
}

export interface ClauseSummary {
  id: string
  clauseRef: string
  shortTitle: string
  state: string
  pageNumber: number | null
  parentId: string | null
  extractionConfidence: number | null
  flagCount: number
  flagKinds: string[]
}

export interface InstrumentDetail extends Omit<InstrumentSummary, 'pageCount' | 'clauseCount'> {
  jurisdiction: string
  provenance: {
    sourceUrl: string | null
    retrievedAt: string | null
    retrievalMethod: string | null
    textLayer: string
    sha256: string | null
    byteSize: number | null
    pageCount: number | null
  }
  relations: Array<{
    direction: 'from' | 'to'
    kind: string
    other: { id: string; shortTitle: string; type: string }
  }>
  clauses: ClauseSummary[]
}

export interface ClauseDetail {
  id: string
  clauseRef: string
  title: string
  state: string
  verbatimText: string
  pageNumber: number | null
  extractionMethod: string
  extractionConfidence: number | null
  instrument: { id: string; shortTitle: string; citation: string | null; authority: string; type: string }
  parent: { id: string; clauseRef: string; shortTitle: string } | null
  flags: Array<{ id: string; kind: string; detail: string | null; resolvedAt: string | null }>
  penaltyTiers: Array<{ id: string; ordinal: number; description: string }>
  controls: Array<{ id: string; shortTitle: string }>
  proposal: {
    summary: string
    disposition: string
    clarity: number
    concerns: string[]
    provider: string
    providerVersion: string
  }
  capabilities: { save: boolean; notApplicable: boolean }
}

/** A view over the roles the signed-in person holds. SCR-082, D-045. */
export interface ViewOption {
  key: string
  roleCodes: string[]
  label: string
  group?: 'Committee'
}

export interface WhoAmI {
  personId: string
  fullName: string
  jobTitle: string
  department: string
  lineOfDefence: string
  roles: string[]
  views: ViewOption[]
}
