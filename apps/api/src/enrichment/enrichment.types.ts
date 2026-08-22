/**
 * The intelligence seam (P0-17, spec 13.3, G-08/G-09).
 *
 * Everything a model would add sits behind this interface. Today a
 * deterministic provider implements it from structure alone; a model provider
 * replaces it without touching a caller.
 *
 * Two rules hold regardless of provider:
 *   BR-AI-01  running enrichment mutates nothing
 *   BR-AI-02  output is a PROPOSAL; a person accepts it before it is tracked
 */
export interface ClauseEnrichment {
  /** Plain language, for the owning department. Empty when only a model can say. */
  summary: string
  /** Does this create a duty, or merely permit something? */
  disposition: 'duty' | 'discretion' | 'definition' | 'unclear'
  /** How clear the obligation is, 0..1. Low means a human must read it. */
  clarity: number
  /** Why a reviewer should look, in their words. */
  concerns: string[]
  /** Provenance of the opinion itself — never presented as fact. */
  provider: string
  providerVersion: string
}

export const ENRICHMENT_PROVIDER = Symbol('ENRICHMENT_PROVIDER')

export interface EnrichmentProvider {
  readonly name: string
  readonly version: string
  /**
   * Where this provider may run. Public statute can go to a hosted model;
   * customer-origin documents may be contractually barred from leaving the
   * premises, so the policy is carried per source class rather than assumed.
   */
  readonly allowedSourceClasses: ReadonlyArray<'publicStatute' | 'customerDocument'>
  enrich(input: { clauseRef: string; text: string; confidence?: number }): Promise<ClauseEnrichment>
}
