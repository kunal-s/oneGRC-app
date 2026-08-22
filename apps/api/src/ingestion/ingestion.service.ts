import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { IdAllocator, detectFlags, segment } from '@onegrc/domain'
import { DocumentStoreService } from '../core/documents/document-store.service'
import { PrismaService } from '../core/prisma/prisma.service'
import { PdfTextService } from './pdf-text.service'

export interface IngestionResult {
  instrumentId: string
  pages: number
  clauses: number
  subClauses: number
  flags: number
  confidence: number
  method: string
}

/**
 * Turn a registered instrument into clauses (P0-16).
 *
 * Everything here is deterministic. Clauses land as `Processing` and nothing
 * becomes a tracked obligation without a person deciding (BR-AI-03, spec 5.1).
 * The enrichment stage that summarises and proposes controls is a separate,
 * swappable provider (P0-17) — it never writes state on its own.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: DocumentStoreService,
    private readonly pdf: PdfTextService,
    private readonly ids: IdAllocator,
  ) {}

  async ingest(instrumentId: string): Promise<IngestionResult> {
    const instrument = await this.prisma.instrument.findUnique({ where: { id: instrumentId } })
    if (!instrument) throw new NotFoundException(`no instrument ${instrumentId}`)
    if (!instrument.documentSha256) throw new NotFoundException(`${instrumentId} has no document`)

    // Verify the blob still hashes to its address before trusting its text.
    await this.store.get(instrument.documentSha256)
    const path = this.store.locate(instrument.documentSha256)

    const pages = await this.pdf.extract(path)
    const confidence = PdfTextService.confidenceOf(pages, instrument.textLayer)
    const clauses = segment(pages)

    if (clauses.length === 0) {
      this.logger.warn(`${instrumentId}: no clauses segmented — needs manual entry (spec 5.2)`)
      return {
        instrumentId, pages: pages.length, clauses: 0, subClauses: 0,
        flags: 0, confidence, method: 'none',
      }
    }

    // Replace any previous extraction for this instrument. Decided clauses are
    // preserved: a re-extraction must not silently discard a human decision.
    const decided = await this.prisma.sourceClause.findMany({
      where: { instrumentId, state: { not: 'Processing' } },
      select: { clauseRef: true },
    })
    const keep = new Set(decided.map((d) => d.clauseRef))
    await this.prisma.sourceClause.deleteMany({
      where: { instrumentId, state: 'Processing' },
    })

    let flagCount = 0
    // Sections precede their sub-clauses in ordinal order, so a parent id is
    // always known by the time a child needs it.
    const idByRef = new Map<string, string>()
    for (const c of clauses) {
      if (keep.has(c.ref)) continue
      const id = await this.ids.allocate('SRC')
      const found = detectFlags(c.body, confidence)
      flagCount += found.length

      await this.prisma.sourceClause.create({
        data: {
          id,
          instrumentId,
          clauseRef: c.ref,
          ordinal: c.ordinal,
          title: c.title.slice(0, 200),
          shortTitle: c.title.slice(0, 60),
          verbatimText: c.body,
          pageNumber: c.pageNumber,
          charStart: c.charStart,
          charEnd: c.charEnd,
          parentId: c.parentRef ? (idByRef.get(c.parentRef) ?? null) : null,
          extractionMethod: 'structural',
          extractionConfidence: confidence,
          origin: 'ingested',
          flags: { create: found.map((f) => ({ kind: f.kind, detail: f.detail })) },
        },
      })
      idByRef.set(c.ref, id)
    }

    const subClauses = clauses.filter((c) => c.parentRef).length
    this.logger.log(
      `${instrumentId}: ${clauses.length} clauses (${subClauses} sub), ${flagCount} flags, confidence ${confidence.toFixed(2)}`,
    )
    return {
      instrumentId,
      pages: pages.length,
      clauses: clauses.length - subClauses,
      subClauses,
      flags: flagCount,
      confidence,
      method: clauses[0]?.method ?? 'none',
    }
  }
}
