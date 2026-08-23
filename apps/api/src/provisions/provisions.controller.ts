import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common'
import { IdAllocator } from '@onegrc/domain'
import { CurrentActor } from '../core/identity/actor.decorator'
import type { Actor } from '../core/identity/identity.types'
import { AuthorityService } from '../core/authority/authority.service'
import { GovernedMutationService } from '../core/governed/governed-mutation.service'
import { PrismaService } from '../core/prisma/prisma.service'

@Controller('provisions')
export class ProvisionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governed: GovernedMutationService,
    private readonly authority: AuthorityService,
    private readonly ids: IdAllocator,
  ) {}

  /** The triage list. Defaults to what actually needs a decision. */
  @Get()
  async list(
    @Query('instrumentId') instrumentId?: string,
    @Query('classification') classification?: string,
    @Query('bindsUs') bindsUs?: string,
    @Query('promoted') promoted?: string,
  ) {
    const rows = await this.prisma.sourceProvision.findMany({
      where: {
        ...(instrumentId ? { instrumentId } : {}),
        ...(classification ? { classification: classification as never } : {}),
        ...(bindsUs ? { bindsUs: bindsUs as never } : {}),
        ...(promoted === 'true' ? { promotedAt: { not: null } } : {}),
        ...(promoted === 'false' ? { promotedAt: null } : {}),
      },
      orderBy: [{ instrumentId: 'asc' }, { ordinal: 'asc' }],
      include: {
        flags: { where: { resolvedAt: null } },
        promotedClause: { select: { id: true, state: true } },
      },
      take: 400,
    })
    return rows.map((p) => ({
      id: p.id, instrumentId: p.instrumentId, clauseRef: p.clauseRef,
      heading: p.heading, pageNumber: p.pageNumber,
      classification: p.classification, confidence: p.classifierConfidence,
      dutyBearer: p.dutyBearer, bindsUs: p.bindsUs,
      blockingFlags: p.flags.filter((f) => f.blocking).length,
      flagKinds: p.flags.map((f) => f.kind),
      promotedAs: p.promotedClause?.id ?? null,
    }))
  }

  @Get(':id')
  async detail(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const p = await this.prisma.sourceProvision.findUnique({
      where: { id },
      include: {
        instrument: { select: { id: true, shortTitle: true, citation: true, authority: true } },
        flags: { orderBy: [{ blocking: 'desc' }, { kind: 'asc' }] },
        promotedClause: { select: { id: true, state: true } },
        parent: { select: { id: true, clauseRef: true, heading: true } },
      },
    })
    if (!p) throw new NotFoundException(`no provision ${id}`)

    const unresolvedBlocking = p.flags.filter((f) => f.blocking && !f.resolvedAt)
    return {
      id: p.id, clauseRef: p.clauseRef, heading: p.heading,
      verbatimText: p.verbatimText, pageNumber: p.pageNumber,
      instrument: p.instrument, parent: p.parent,
      classification: p.classification, confidence: p.classifierConfidence,
      dutyBearer: p.dutyBearer, bindsUs: p.bindsUs,
      classifier: { name: p.classifierName, version: p.classifierVersion, ruleset: p.classifierRuleset },
      features: p.features,
      flags: p.flags.map((f) => ({
        id: f.id, kind: f.kind, detail: f.detail, blocking: f.blocking,
        resolvedAt: f.resolvedAt, resolution: f.resolution, resolutionNote: f.resolutionNote,
      })),
      promotedAs: p.promotedClause?.id ?? null,
      capabilities: {
        promote:
          (await this.authority.can(actor, { action: 'clause.save' })) &&
          !p.promotedClause &&
          unresolvedBlocking.length === 0 &&
          p.bindsUs === 'yes' &&
          p.classification === 'Duty',
        resolveFlag: await this.authority.can(actor, { action: 'clause.resolveFlag' }),
      },
      /** Why promotion is unavailable, so the UI never shows a dead button. */
      promotionBlockedBy: unresolvedBlocking.map((f) => f.kind),
    }
  }

  /**
   * Promote a provision into a tracked clause.
   *
   * This is the moment a piece of a document becomes something the firm owes.
   * It is governed (department-gated per BR-AUT-02), audited, and it is where
   * the SRC identifier is finally issued - so the SRC table holds nothing but
   * qualified, tracked clauses.
   *
   * Blocking flags refuse it. You cannot track a duty you cannot date, whose
   * applicability is undetermined, or whose text you do not trust.
   */
  @Post(':id/promote')
  async promote(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
    @Body() body: { basis?: string; confirmBinding?: boolean },
  ) {
    const p = await this.prisma.sourceProvision.findUnique({
      where: { id },
      include: { flags: { where: { resolvedAt: null, blocking: true } }, promotedClause: true },
    })
    if (!p) throw new NotFoundException(`no provision ${id}`)
    if (p.promotedClause) {
      throw new BadRequestException(`already tracked as ${p.promotedClause.id}`)
    }
    if (p.flags.length > 0) {
      throw new BadRequestException(
        `cannot track this yet - resolve first: ${p.flags.map((f) => f.kind).join(', ')}`,
      )
    }
    if (p.classification !== 'Duty' && p.classification !== 'Applicability') {
      throw new BadRequestException(
        `only a duty or an applicability provision is tracked; this is classified ${p.classification}`,
      )
    }
    if (p.bindsUs === 'no') {
      throw new BadRequestException(
        `this binds "${p.dutyBearer}", which is not this organisation`,
      )
    }
    // An undetermined bearer must not slip through. The classifier could not
    // match "${'$'}{p.dutyBearer}" to a capacity this organisation acts in, and a duty
    // you cannot confirm is yours is not a duty you should be tracking. A
    // person may still assert it, but must say so and say why - which is then
    // in the audit trail rather than implied by silence.
    if (p.bindsUs === 'undetermined' && !body.confirmBinding) {
      throw new BadRequestException(
        `the bearer ${p.dutyBearer ? `"${p.dutyBearer}"` : 'could not be identified'} was not matched to this organisation; ` +
          'confirm explicitly that it binds the firm, with a basis, to track it',
      )
    }
    if (p.bindsUs === 'undetermined' && !body.basis?.trim()) {
      throw new BadRequestException('confirming an unmatched bearer requires a basis')
    }

    const clauseId = await this.ids.allocate('SRC')
    const { auditId } = await this.governed.run({
      actor,
      action: 'clause.save',
      entityType: 'SourceProvision',
      entityId: id,
      detail: {
        clauseRef: p.clauseRef,
        classification: p.classification,
        dutyBearer: p.dutyBearer,
        promotedAs: clauseId,
        basis: body.basis ?? null,
        bindingConfirmedByPerson: p.bindsUs === 'undetermined' ? true : undefined,
      },
      work: async (tx) => {
        // The clause SNAPSHOTS the text it was decided on: a decision is bound
        // to the words in force when it was taken (spec 5.1).
        await tx.sourceClause.create({
          data: {
            id: clauseId,
            provisionId: p.id,
            instrumentId: p.instrumentId,
            clauseRef: p.clauseRef,
            ordinal: p.ordinal,
            title: p.heading,
            shortTitle: p.heading.slice(0, 60),
            verbatimText: p.verbatimText,
            pageNumber: p.pageNumber,
            charStart: p.charStart,
            charEnd: p.charEnd,
            state: 'Recommended',
            extractionMethod: 'structural',
            extractionConfidence: p.classifierConfidence,
            origin: 'ingested',
          },
        })
        await tx.sourceProvision.update({
          where: { id },
          data: { promotedAt: new Date(), promotedById: actor.personId },
        })
      },
    })
    return { provisionId: id, clauseId, auditId }
  }

  /** Clear a review flag, optionally naming the provision that answered it. */
  @Post('flags/:flagId/resolve')
  async resolveFlag(
    @Param('flagId') flagId: string,
    @CurrentActor() actor: Actor,
    @Body() body: { resolution?: 'Resolved' | 'Accepted'; note?: string; byProvisionId?: string },
  ) {
    if (!body.note?.trim()) {
      throw new BadRequestException('a note is required: clearing a review item must be justified')
    }
    const { auditId } = await this.governed.run({
      actor,
      action: 'clause.resolveFlag',
      entityType: 'ProvisionFlag',
      entityId: flagId,
      detail: { resolution: body.resolution ?? 'Resolved', byProvisionId: body.byProvisionId ?? null },
      work: async (tx) =>
        tx.provisionFlag.update({
          where: { id: flagId },
          data: {
            resolvedAt: new Date(),
            resolvedById: actor.personId,
            resolution: body.resolution ?? 'Resolved',
            resolutionNote: body.note,
            resolvedByProvisionId: body.byProvisionId ?? null,
          },
        }),
    })
    return { flagId, auditId }
  }
}
