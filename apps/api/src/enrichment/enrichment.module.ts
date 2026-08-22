import { Global, Module } from '@nestjs/common'
import { DeterministicEnrichmentProvider } from './deterministic.provider'
import { ENRICHMENT_PROVIDER } from './enrichment.types'

/**
 * Swapping the provider is a one-line change here and nowhere else — that is
 * the point of the seam (spec 13.3). A model-backed provider registers in
 * place of the deterministic one and every caller is unaffected.
 */
@Global()
@Module({
  providers: [
    DeterministicEnrichmentProvider,
    { provide: ENRICHMENT_PROVIDER, useExisting: DeterministicEnrichmentProvider },
  ],
  exports: [ENRICHMENT_PROVIDER],
})
export class EnrichmentModule {}
