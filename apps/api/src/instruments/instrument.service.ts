import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { IdAllocator } from '@onegrc/domain'
import type { InstrumentRelationKind, InstrumentStatus, InstrumentType, Origin, RetrievalMethod, TextLayer } from '@prisma/client'
import { DocumentStoreService } from '../core/documents/document-store.service'
import { PrismaService } from '../core/prisma/prisma.service'

export interface InstrumentInput {
  title: string
  shortTitle: string
  citation?: string
  authority: string
  jurisdiction: string
  type: InstrumentType
  issuedOn?: Date
  status?: InstrumentStatus
  sourceUrl?: string
  retrievalMethod: RetrievalMethod
  textLayer?: TextLayer
  pageCount?: number
  origin?: Origin
}

@Injectable()
export class InstrumentService {
  private readonly logger = new Logger(InstrumentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: DocumentStoreService,
    private readonly ids: IdAllocator,
  ) {}

  /**
   * Register a legal instrument from its bytes.
   *
   * The document and the instrument row are written in one transaction with the
   * id allocation, so a failure cannot leave a blob referenced by nothing or an
   * instrument pointing at a document that was never stored.
   */
  async register(input: InstrumentInput, bytes: Buffer): Promise<{ id: string; sha256: string }> {
    const stored = await this.store.put(bytes)

    // The same file under two instruments is almost always a mistake, and it
    // would make provenance ambiguous: which instrument does a clause cite?
    const existing = await this.prisma.instrument.findFirst({
      where: { documentSha256: stored.sha256 },
      select: { id: true, shortTitle: true },
    })
    if (existing) {
      throw new ConflictException(
        `that document is already registered as ${existing.id} (${existing.shortTitle})`,
      )
    }

    const id = await this.ids.allocate('INST')

    await this.prisma.$transaction(async (tx) => {
      await tx.document.upsert({
        where: { sha256: stored.sha256 },
        create: {
          sha256: stored.sha256,
          byteSize: stored.byteSize,
          mimeType: 'application/pdf',
          pageCount: input.pageCount ?? null,
        },
        update: {},
      })
      await tx.instrument.create({
        data: {
          id,
          title: input.title,
          shortTitle: input.shortTitle,
          citation: input.citation ?? null,
          authority: input.authority,
          jurisdiction: input.jurisdiction,
          type: input.type,
          issuedOn: input.issuedOn ?? null,
          status: input.status ?? 'InForce',
          documentSha256: stored.sha256,
          sourceUrl: input.sourceUrl ?? null,
          retrievedAt: new Date(),
          retrievalMethod: input.retrievalMethod,
          textLayer: input.textLayer ?? 'native',
          origin: input.origin ?? 'earned',
        },
      })
    })

    this.logger.log(`registered ${id} ${input.shortTitle}`)
    return { id, sha256: stored.sha256 }
  }

  /** Relate two instruments, e.g. the PT Rules are madeUnder the PT Act. */
  async relate(fromId: string, toId: string, kind: InstrumentRelationKind, note?: string) {
    return this.prisma.instrumentRelation.upsert({
      where: { fromId_toId_kind: { fromId, toId, kind } },
      create: { fromId, toId, kind, note: note ?? null },
      update: { note: note ?? null },
    })
  }
}
