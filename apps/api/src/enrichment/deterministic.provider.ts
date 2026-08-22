import { Injectable } from '@nestjs/common'
import { detectFlags, looksMandatory } from '@onegrc/domain'
import type { ClauseEnrichment, EnrichmentProvider } from './enrichment.types'

/**
 * The provider that ships today: structure and lexis, no model.
 *
 * It is deliberately honest about its ceiling. It will not invent a
 * plain-language summary, because a wrong summary of a legal duty is worse
 * than none — it leaves `summary` empty and says so. What it can do well is
 * say whether a clause reads as a duty, and surface the concerns a reviewer
 * should look at first.
 */
@Injectable()
export class DeterministicEnrichmentProvider implements EnrichmentProvider {
  readonly name = 'deterministic'
  readonly version = '1.0.0'
  readonly allowedSourceClasses = ['publicStatute', 'customerDocument'] as const

  async enrich(input: { clauseRef: string; text: string; confidence?: number }): Promise<ClauseEnrichment> {
    const flags = detectFlags(input.text, input.confidence)
    const mandatory = looksMandatory(input.text)
    const isDefinition = /^\s*\(?\d*\)?\s*(In these rules|In this Act|means|unless the context)/i.test(input.text)

    const disposition: ClauseEnrichment['disposition'] = isDefinition
      ? 'definition'
      : mandatory
        ? 'duty'
        : flags.some((f) => f.kind === 'DiscretionaryLanguage')
          ? 'discretion'
          : 'unclear'

    // Each unresolved concern reduces clarity. A duty whose cadence is deferred
    // and whose text has been amended is not a clear duty.
    const weights: Record<string, number> = {
      CadenceUnspecified: 0.25,
      ConditionalApplicability: 0.15,
      UnresolvedCrossReference: 0.1,
      AmendedText: 0.05,
      ProvisoPresent: 0.1,
      DiscretionaryLanguage: 0.15,
      LowExtractionConfidence: 0.2,
    }
    const penalty = flags.reduce((acc, f) => acc + (weights[f.kind] ?? 0), 0)
    const clarity = Math.max(0, Math.min(1, (disposition === 'duty' ? 1 : 0.7) - penalty))

    return {
      summary: '',
      disposition,
      clarity: Number(clarity.toFixed(2)),
      concerns: flags.map((f) => f.detail),
      provider: this.name,
      providerVersion: this.version,
    }
  }
}
