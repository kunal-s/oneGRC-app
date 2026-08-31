import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { classifyProvision, detectFlags, isBlocking, segment, type OrgCapabilities } from '@onegrc/domain'
import { DocumentStoreService } from '../core/documents/document-store.service'
import { PrismaService } from '../core/prisma/prisma.service'
import { PdfTextService } from './pdf-text.service'

export interface IngestionResult {
  instrumentId: string
  pages: number
  provisions: number
  byClass: Record<string, number>
  dutiesBindingUs: number
  blockingFlags: number
  confidence: number
  /// Tracked clauses whose source text changed under them.
  driftedClauses: string[]
}

/**
 * Turn a registered instrument into PROVISIONS (P0-20).
 *
 * Extraction no longer creates tracked clauses. A statute is mostly machinery;
 * the duties are a minority, and only a promoted provision becomes a
 * SourceClause. This is what keeps the tracked register clean rather than
 * burying an officer in definitions and appeal procedure.
 *
 * Everything here is deterministic. Classification is a PROPOSAL: a person
 * promotes (BR-AI-02, spec 5.1 step 6).
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: DocumentStoreService,
    private readonly pdf: PdfTextService,
  ) {}

  /** What the organisation is, which is what answers "does this bind us?". */
  private async orgCapabilities(): Promise<OrgCapabilities> {
    const p = await this.prisma.organisationProfile.findFirst()
    return {
      capacities: p?.capacities ?? [],
      jurisdictions: p?.jurisdictions ?? [],
    }
  }

  async ingest(instrumentId: string): Promise<IngestionResult> {
    const instrument = await this.prisma.instrument.findUnique({ where: { id: instrumentId } })
    if (!instrument) throw new NotFoundException(`no instrument ${instrumentId}`)
    if (!instrument.documentSha256) throw new NotFoundException(`${instrumentId} has no document`)

    // Verify the blob still hashes to its address before trusting its text.
    await this.store.get(instrument.documentSha256)
    const pages = await this.pdf.extract(this.store.locate(instrument.documentSha256))
    const confidence = PdfTextService.confidenceOf(pages, instrument.textLayer)
    const units = segment(pages)
    const org = await this.orgCapabilities()

    // Promoted provisions are never discarded by a re-extraction: a human
    // decision must survive the document being re-read.
    const promotedRows = await this.prisma.sourceProvision.findMany({
      where: { instrumentId, promotedAt: { not: null } },
      select: { id: true, clauseRef: true, verbatimText: true },
    })
    const promoted = new Map(promotedRows.map((r) => [r.clauseRef, r]))
    const driftedClauses: string[] = []

    await this.prisma.sourceProvision.deleteMany({
      where: { instrumentId, promotedAt: null },
    })

    const byClass: Record<string, number> = {}
    let dutiesBindingUs = 0
    let blockingFlags = 0
    const idByRef = new Map<string, string>()

    for (const u of units) {
      const verdict = classifyProvision(
        { heading: u.title, text: u.body, isSubClause: Boolean(u.parentRef) },
        org,
      )
      const flags = detectFlags(u.body, confidence)
      byClass[verdict.classification] = (byClass[verdict.classification] ?? 0) + 1
      if (verdict.classification === 'Duty' && verdict.bindsUs === 'yes') dutiesBindingUs++
      blockingFlags += flags.filter((f) => isBlocking(f.kind)).length

      // A promoted provision is UPDATED, never recreated. Re-reading the
      // document must not destroy a human decision, and the unique
      // (instrument, clauseRef) pair means a blind create would collide.
      const existing = promoted.get(u.ref)
      const created = existing
        ? await this.prisma.sourceProvision.update({
            where: { id: existing.id },
            data: {
              heading: u.title.slice(0, 200),
              verbatimText: u.body,
              pageNumber: u.pageNumber,
              charStart: u.charStart,
              charEnd: u.charEnd,
              classification: verdict.classification,
              classifierConfidence: verdict.confidence,
              dutyBearer: verdict.dutyBearer,
              bindsUs: verdict.bindsUs,
              features: verdict.features as never,
              classifierName: verdict.provider,
              classifierVersion: verdict.providerVersion,
              classifierRuleset: verdict.ruleset,
              classifiedAt: new Date(),
            },
          })
        : await this.prisma.sourceProvision.create({
        data: {
          instrumentId,
          clauseRef: u.ref,
          parentId: u.parentRef ? (idByRef.get(u.parentRef) ?? null) : null,
          ordinal: u.ordinal,
          heading: u.title.slice(0, 200),
          verbatimText: u.body,
          pageNumber: u.pageNumber,
          charStart: u.charStart,
          charEnd: u.charEnd,
          classification: verdict.classification,
          classifierConfidence: verdict.confidence,
          dutyBearer: verdict.dutyBearer,
          bindsUs: verdict.bindsUs,
          features: verdict.features as never,
          classifierName: verdict.provider,
          classifierVersion: verdict.providerVersion,
          classifierRuleset: verdict.ruleset,
          classifiedAt: new Date(),
          origin: 'earned',
          flags: {
            create: flags.map((f) => ({
              kind: f.kind,
              detail: f.detail,
              blocking: isBlocking(f.kind),
            })),
          },
        },
      })
      idByRef.set(u.ref, created.id)

      // The clause froze the words it was decided on; the provision follows
      // the document. If a re-read changes the text under a tracked clause,
      // the firm is quoting law the library no longer contains - so say so
      // loudly rather than let the two "verbatim" texts diverge in silence.
      if (existing && existing.verbatimText !== u.body) {
        driftedClauses.push(u.ref)
        this.logger.warn(
          `${instrumentId} ${u.ref}: source text CHANGED beneath a tracked clause - its basis must be re-read`,
        )
      }
    }

    this.logger.log(
      `${instrumentId}: ${units.length} provisions, ${dutiesBindingUs} duties binding us, ` +
        `${blockingFlags} blocking flags, confidence ${confidence.toFixed(2)}`,
    )
    return {
      instrumentId, pages: pages.length, provisions: units.length,
      byClass, dutiesBindingUs, blockingFlags, confidence, driftedClauses,
    }
  }
}
