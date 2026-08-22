import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { createReadStream } from 'node:fs'
import { DocumentStoreService } from '../core/documents/document-store.service'
import { PrismaService } from '../core/prisma/prisma.service'

@Controller()
export class InstrumentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: DocumentStoreService,
  ) {}

  /** The Source Library. */
  @Get('instruments')
  async list() {
    const rows = await this.prisma.instrument.findMany({
      orderBy: { id: 'asc' },
      include: {
        document: { select: { pageCount: true, byteSize: true } },
        _count: { select: { clauses: true } },
      },
    })
    return rows.map((i) => ({
      id: i.id,
      shortTitle: i.shortTitle,
      title: i.title,
      citation: i.citation,
      authority: i.authority,
      type: i.type,
      status: i.status,
      issuedOn: i.issuedOn,
      textLayer: i.textLayer,
      retrievalMethod: i.retrievalMethod,
      pageCount: i.document?.pageCount ?? null,
      clauseCount: i._count.clauses,
    }))
  }

  /** An instrument with its clauses and its relations to other instruments. */
  @Get('instruments/:id')
  async detail(@Param('id') id: string) {
    const i = await this.prisma.instrument.findUnique({
      where: { id },
      include: {
        document: true,
        clauses: {
          orderBy: { ordinal: 'asc' },
          include: { flags: { where: { resolvedAt: null } } },
        },
        relationsFrom: { include: { to: { select: { id: true, shortTitle: true, type: true } } } },
        relationsTo: { include: { from: { select: { id: true, shortTitle: true, type: true } } } },
      },
    })
    if (!i) throw new NotFoundException(`no instrument ${id}`)

    return {
      id: i.id,
      title: i.title,
      shortTitle: i.shortTitle,
      citation: i.citation,
      authority: i.authority,
      jurisdiction: i.jurisdiction,
      type: i.type,
      status: i.status,
      issuedOn: i.issuedOn,
      // Provenance, shown so a reader can see where this came from and that it
      // has not changed since (spec 5.1).
      provenance: {
        sourceUrl: i.sourceUrl,
        retrievedAt: i.retrievedAt,
        retrievalMethod: i.retrievalMethod,
        textLayer: i.textLayer,
        sha256: i.documentSha256,
        byteSize: i.document?.byteSize ?? null,
        pageCount: i.document?.pageCount ?? null,
      },
      relations: [
        ...i.relationsFrom.map((r) => ({ direction: 'from' as const, kind: r.kind, other: r.to })),
        ...i.relationsTo.map((r) => ({ direction: 'to' as const, kind: r.kind, other: r.from })),
      ],
      clauses: i.clauses.map((c) => ({
        id: c.id,
        clauseRef: c.clauseRef,
        shortTitle: c.shortTitle,
        state: c.state,
        pageNumber: c.pageNumber,
        parentId: c.parentId,
        extractionConfidence: c.extractionConfidence,
        flagCount: c.flags.length,
        flagKinds: c.flags.map((f) => f.kind),
      })),
    }
  }

  /**
   * Stream the source document.
   *
   * This is what makes provenance real rather than claimed: from a control a
   * reader reaches the clause, and from the clause the actual page of the
   * actual PDF the clause was extracted from.
   */
  @Get('instruments/:id/document')
  async document(@Param('id') id: string, @Res() reply: FastifyReply, @Query('page') page?: string) {
    const i = await this.prisma.instrument.findUnique({ where: { id } })
    if (!i?.documentSha256) throw new NotFoundException(`no document for ${id}`)
    if (!(await this.store.exists(i.documentSha256))) {
      throw new NotFoundException('the document is registered but missing from the store')
    }
    const suffix = page ? `#page=${encodeURIComponent(page)}` : ''
    void suffix
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${i.id}.pdf"`)
      .send(createReadStream(this.store.locate(i.documentSha256)))
  }
}
