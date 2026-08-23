import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common'
import { IdAllocator } from '@onegrc/domain'
import { CurrentActor } from '../core/identity/actor.decorator'
import type { Actor } from '../core/identity/identity.types'
import { AuthorityService } from '../core/authority/authority.service'
import { GovernedMutationService } from '../core/governed/governed-mutation.service'
import { PrismaService } from '../core/prisma/prisma.service'
import { ENRICHMENT_PROVIDER, type EnrichmentProvider } from '../enrichment/enrichment.types'

@Controller('clauses')
export class ClausesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governed: GovernedMutationService,
    private readonly authority: AuthorityService,
    private readonly ids: IdAllocator,
    @Inject(ENRICHMENT_PROVIDER) private readonly enrichment: EnrichmentProvider,
  ) {}

  @Get(':id')
  async detail(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const c = await this.prisma.sourceClause.findUnique({
      where: { id },
      include: {
        instrument: { select: { id: true, shortTitle: true, citation: true, authority: true, type: true } },
        provision: { include: { flags: { orderBy: { kind: 'asc' } } } },
        penaltyTiers: { orderBy: { ordinal: 'asc' } },
        controls: { include: { control: { select: { id: true, shortTitle: true } } } },
        parent: { select: { id: true, clauseRef: true, shortTitle: true } },
      },
    })
    if (!c) throw new NotFoundException(`no clause ${id}`)

    // A proposal, never a fact (BR-AI-02). Computed on read and stored nowhere.
    const proposal = await this.enrichment.enrich({
      clauseRef: c.clauseRef,
      text: c.verbatimText,
      confidence: c.extractionConfidence ?? undefined,
    })

    return {
      id: c.id,
      clauseRef: c.clauseRef,
      title: c.title,
      shortTitle: c.shortTitle,
      state: c.state,
      /** The exact extract. Never paraphrased. */
      verbatimText: c.verbatimText,
      pageNumber: c.pageNumber,
      extractionMethod: c.extractionMethod,
      extractionConfidence: c.extractionConfidence,
      instrument: c.instrument,
      parent: c.parent,
      flags: c.provision.flags.map((f) => ({
        id: f.id, kind: f.kind, detail: f.detail,
        blocking: f.blocking, resolvedAt: f.resolvedAt,
      })),
      penaltyTiers: c.penaltyTiers,
      controls: c.controls.map((cc) => cc.control),
      proposal,
      /** What this actor may do, so the UI offers only real options. */
      capabilities: {
        save: await this.authority.can(actor, { action: 'clause.save' }),
        notApplicable: await this.authority.can(actor, { action: 'clause.notApplicable' }),
      },
    }
  }



  /**
   * Attach a promoted clause to a control, creating one if needed.
   *
   * Promotion decided that the provision binds the firm; this decides HOW the
   * firm satisfies it. One control can satisfy clauses across several laws,
   * which is the many-to-many that makes "map once, satisfy many" real.
   */
  @Post(':id/control')
  async attachControl(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
    @Body() body: { controlId?: string; newControlTitle?: string; basis?: string },
  ) {
    const clause = await this.prisma.sourceClause.findUnique({
      where: { id },
      include: { instrument: { select: { shortTitle: true } } },
    })
    if (!clause) throw new NotFoundException(`no clause ${id}`)

    const newControlId = body.controlId ? null : await this.ids.allocate('CTRL')

    const { result, auditId } = await this.governed.run({
      actor,
      action: 'clause.save',
      entityType: 'SourceClause',
      entityId: id,
      detail: {
        clauseRef: clause.clauseRef,
        controlId: body.controlId ?? newControlId,
        created: !body.controlId,
        basis: body.basis ?? null,
      },
      work: async (tx) => {
        let controlId = body.controlId
        if (!controlId) {
          const title = body.newControlTitle?.trim() || `Control for ${clause.clauseRef}`
          await tx.control.create({
            data: {
              id: newControlId as string,
              title,
              shortTitle: title.slice(0, 60),
              description: `Satisfies ${clause.instrument.shortTitle} ${clause.clauseRef}`,
              ownerId: actor.personId,
              origin: 'user',
            },
          })
          controlId = newControlId as string
        }
        await tx.controlClause.upsert({
          where: { controlId_clauseId: { controlId, clauseId: id } },
          create: { controlId, clauseId: id },
          update: {},
        })
        await tx.sourceClause.update({
          where: { id },
          data: {
            state: 'Saved',
            decidedAt: new Date(),
            decidedById: actor.personId,
            decisionBasis: body.basis ?? null,
          },
        })
        return { clauseId: id, controlId }
      },
    })
    return { ...result, auditId }
  }
}
