import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common'
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

  @Get('instruments')
  async list() {
    const rows = await this.prisma.instrument.findMany({
      orderBy: { id: 'asc' },
      include: {
        document: { select: { pageCount: true } },
        _count: { select: { provisions: true, clauses: true } },
      },
    })
    return rows.map((i) => ({
      id: i.id, shortTitle: i.shortTitle, title: i.title, citation: i.citation,
      authority: i.authority, type: i.type, status: i.status, issuedOn: i.issuedOn,
      textLayer: i.textLayer, retrievalMethod: i.retrievalMethod,
      pageCount: i.document?.pageCount ?? null,
      provisionCount: i._count.provisions,
      trackedCount: i._count.clauses,
    }))
  }

  /**
   * An instrument and its TRIAGE picture.
   *
   * Deliberately returns counts by class rather than a list of every
   * provision. An officer opening a 34-page Act should be shown the dozen
   * things that need a decision, not 178 rows of machinery.
   */
  @Get('instruments/:id')
  async detail(@Param('id') id: string) {
    const i = await this.prisma.instrument.findUnique({
      where: { id },
      include: {
        document: true,
        relationsFrom: { include: { to: { select: { id: true, shortTitle: true, type: true } } } },
        relationsTo: { include: { from: { select: { id: true, shortTitle: true, type: true } } } },
      },
    })
    if (!i) throw new NotFoundException(`no instrument ${id}`)

    const byClass = await this.prisma.sourceProvision.groupBy({
      by: ['classification', 'bindsUs'],
      where: { instrumentId: id },
      _count: true,
    })
    const blocked = await this.prisma.provisionFlag.count({
      where: { provision: { instrumentId: id }, blocking: true, resolvedAt: null },
    })
    const promoted = await this.prisma.sourceProvision.count({
      where: { instrumentId: id, promotedAt: { not: null } },
    })

    const counts: Record<string, number> = {}
    let needsDecision = 0
    let notOurs = 0
    for (const g of byClass) {
      counts[g.classification] = (counts[g.classification] ?? 0) + g._count
      if (g.classification === 'Duty') {
        if (g.bindsUs === 'yes') needsDecision += g._count
        if (g.bindsUs === 'no') notOurs += g._count
      }
    }

    return {
      id: i.id, title: i.title, shortTitle: i.shortTitle, citation: i.citation,
      authority: i.authority, jurisdiction: i.jurisdiction, type: i.type,
      status: i.status, issuedOn: i.issuedOn,
      provenance: {
        sourceUrl: i.sourceUrl, retrievedAt: i.retrievedAt,
        retrievalMethod: i.retrievalMethod, textLayer: i.textLayer,
        sha256: i.documentSha256, byteSize: i.document?.byteSize ?? null,
        pageCount: i.document?.pageCount ?? null,
      },
      relations: [
        ...i.relationsFrom.map((r) => ({ direction: 'from' as const, kind: r.kind, other: r.to })),
        ...i.relationsTo.map((r) => ({ direction: 'to' as const, kind: r.kind, other: r.from })),
      ],
      triage: {
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        needsDecision, notOurs, promoted, blockedByFlags: blocked,
        byClass: counts,
      },
    }
  }

  @Get('instruments/:id/document')
  async document(@Param('id') id: string, @Res() reply: FastifyReply) {
    const i = await this.prisma.instrument.findUnique({ where: { id } })
    if (!i?.documentSha256) throw new NotFoundException(`no document for ${id}`)
    if (!(await this.store.exists(i.documentSha256))) {
      throw new NotFoundException('the document is registered but missing from the store')
    }
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${i.id}.pdf"`)
      .send(createReadStream(this.store.locate(i.documentSha256)))
  }
}
