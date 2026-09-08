import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req, Res } from '@nestjs/common'
import type { Department, Prisma } from '@prisma/client'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { IdAllocator, formatCycleId } from '@onegrc/domain'
import { CurrentActor } from '../core/identity/actor.decorator'
import type { Actor } from '../core/identity/identity.types'
import { computeScope, DEPARTMENTS } from '../core/identity/scope'
import { AuthorityService } from '../core/authority/authority.service'
import { ClockService } from '../core/clock/clock.service'
import { calendarDateOf } from '../core/clock/timezone'
import { DocumentIntegrityError, DocumentStoreService } from '../core/documents/document-store.service'
import { FileIntakeRefusal, FileIntakeService } from '../core/documents/file-intake.service'
import { extensionFor } from '../core/documents/file-type-sniff'
import { GovernedMutationService } from '../core/governed/governed-mutation.service'
import { LadderService } from '../core/ladder/ladder.service'
import { PrismaService } from '../core/prisma/prisma.service'
import { renderRefusal } from '../core/refusals/catalogue'
import { httpRefusal } from '../core/refusals/http'
import { ChainService } from './chain.service'

const CONTROL_SORT_FIELDS = ['id', 'shortTitle', 'title'] as const
type ControlSortField = (typeof CONTROL_SORT_FIELDS)[number]

@Controller()
export class ChainController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
    private readonly governed: GovernedMutationService,
    private readonly ids: IdAllocator,
    private readonly ladder: LadderService,
    private readonly authority: AuthorityService,
    private readonly intake: FileIntakeService,
    private readonly store: DocumentStoreService,
    private readonly clock: ClockService,
  ) {}

  /** The spine, resolved from any anchor on it. REF-30: an anchor that does not resolve. */
  @Get('proof-chain')
  resolve(@Query('anchor') anchor: string) {
    if (!anchor) throw new BadRequestException('anchor is required')
    return this.chain.resolve(anchor)
  }

  @Get('controls/:id')
  async control(@Param('id') id: string) {
    const c = await this.prisma.control.findUnique({
      where: { id },
      include: {
        owner: { select: { fullName: true, department: true } },
        clauses: { include: { clause: { include: { instrument: true } } } },
        obligations: { include: { obligation: { include: { cycles: true } } } },
      },
    })
    if (!c) throw httpRefusal(404, renderRefusal('REF-30', { id }), 'REF-30')
    return {
      id: c.id, title: c.title, shortTitle: c.shortTitle, description: c.description,
      owner: c.owner,
      // Clauses grouped by act - "map once, satisfy many" made visible (spec 5.1).
      clausesByAct: Object.values(
        c.clauses.reduce<Record<string, { instrument: string; citation: string | null; clauses: unknown[] }>>(
          (acc, cc) => {
            const key = cc.clause.instrument.id
            acc[key] ??= {
              instrument: cc.clause.instrument.shortTitle,
              citation: cc.clause.instrument.citation,
              clauses: [],
            }
            acc[key].clauses.push({
              id: cc.clause.id, clauseRef: cc.clause.clauseRef,
              shortTitle: cc.clause.shortTitle, pageNumber: cc.clause.pageNumber,
              instrumentId: cc.clause.instrument.id,
            })
            return acc
          }, {}),
      ),
      obligations: c.obligations.map((o) => ({
        id: o.obligation.id, shortTitle: o.obligation.shortTitle,
        regulator: o.obligation.regulator, frequency: o.obligation.frequency,
        cycleCount: o.obligation.cycles.length,
      })),
    }
  }

  /**
   * The department boundary applied server side, in the query (SCR-088-020,
   * SCR-088-021, SCR-088-030, BR-SCP-02). A department-locked caller is
   * scoped to their own department regardless of what `department` asks for:
   * the boundary is enforced whether or not the client asked for it, never by
   * filtering a full result set after it is read.
   *
   * Also the shape a later register reuses (SCR-088-090, SCR-088-092): filter,
   * sort and paging parameters, with a count over the same filter and the
   * same boundary as the list beside it (SCR-088-091, D-035).
   */
  @Get('controls')
  async controls(
    @CurrentActor() actor: Actor,
    @Query('department') department?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const scope = computeScope(actor)

    let targetDepartment: Department | undefined
    if (!scope.seesAll) {
      // Never trust the query param here: a locked caller is always scoped
      // to their own department, whatever the client asked for (SCR-088-021).
      targetDepartment = actor.department
    } else if (department && department !== 'all') {
      if (!DEPARTMENTS.includes(department as Department)) {
        throw new BadRequestException(`unknown department "${department}"`)
      }
      targetDepartment = department as Department
    }
    const where: Prisma.ControlWhereInput = targetDepartment ? { owner: { department: targetDepartment } } : {}

    const [sortField, sortDir] = (sort ?? 'shortTitle:asc').split(':') as [string, string]
    if (!CONTROL_SORT_FIELDS.includes(sortField as ControlSortField)) {
      throw new BadRequestException(`unknown sort field "${sortField}"`)
    }
    const orderBy = { [sortField as ControlSortField]: sortDir === 'desc' ? 'desc' : 'asc' } as const

    const take = Math.min(Math.max(Number(pageSize) || 50, 1), 200)
    const pageNum = Math.max(Number(page) || 1, 1)

    const [items, total] = await Promise.all([
      this.prisma.control.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * take,
        take,
        select: { id: true, shortTitle: true, title: true },
      }),
      this.prisma.control.count({ where }),
    ])
    // CLK-008, CLK-009: the instant this count was read, and the zone to name beside it.
    return { items, total, asOf: this.clock.now().toISOString(), timezone: this.clock.timezone() }
  }

  @Get('obligations/:id')
  async obligation(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const o = await this.prisma.obligation.findUnique({
      where: { id },
      include: {
        owner: { select: { fullName: true, department: true } },
        checker: { select: { fullName: true } },
        sourceClause: { include: { instrument: { select: { shortTitle: true } } } },
        controls: { include: { control: { select: { id: true, shortTitle: true } } } },
        cycles: {
          orderBy: { dueDate: 'asc' },
          include: {
            tasks: {
              include: {
                assignee: { select: { fullName: true, department: true } },
                checker: { select: { fullName: true } },
                evidence: { include: { evidence: true } },
              },
            },
          },
        },
      },
    })
    if (!o) throw httpRefusal(404, renderRefusal('REF-30', { id }), 'REF-30')
    return {
      id: o.id, title: o.title, shortTitle: o.shortTitle, regulator: o.regulator,
      frequency: o.frequency, evidenceRequirement: o.evidenceRequirement,
      owner: o.owner, checker: o.checker,
      // CLK-008, CLK-009: the instant this read happened, and the zone to name beside it.
      asOf: this.clock.now().toISOString(),
      timezone: this.clock.timezone(),
      provenance: o.sourceClause
        ? { clauseId: o.sourceClause.id, clauseRef: o.sourceClause.clauseRef,
            instrument: o.sourceClause.instrument.shortTitle }
        : null,
      controls: o.controls.map((c) => c.control),
      cycles: await Promise.all(o.cycles.map(async (c) => {
        const cycleActive = c.state !== 'Filed'
        return {
          id: c.id, period: c.period, dueDate: c.dueDate, state: c.state,
          // Derived, never stored (BR-DRV-17, CLK-006): the due calendar date
          // has passed in the organisation's zone and the cycle is not
          // terminal, never a raw instant compared against a @db.Date.
          overdue: c.state !== 'Filed' && this.clock.isPastDate(calendarDateOf(c.dueDate)),
          // R-016, SCR-049-001: the whole ladder for this cycle, fired and
          // scheduled rungs alike (LDR-009, SCR-049-003).
          ladder: await this.ladder.ladderViewFor('ObligationCycle', c.id, c.dueDate, o.ownerId, o.owner.department, cycleActive),
          tasks: await Promise.all(c.tasks.map(async (t) => ({
            id: t.id, shortTitle: t.shortTitle, state: t.state,
            completionPolicy: t.completionPolicy,
            version: t.version,
            assignee: t.assignee.fullName, assigneeId: t.assigneeId, checker: t.checker?.fullName ?? null,
            // SCR-100-050, R-002: the server computes it, the client only
            // renders it (D-016). No screen offers the control to a caller
            // this comes back false for; the server refuses the call too
            // (SCR-100-051).
            capabilities: { attachEvidence: await this.authority.can(actor, { action: 'task.attachEvidence' }) },
            evidence: t.evidence.map((e) => ({
              id: e.evidence.id, shortTitle: e.evidence.shortTitle, state: e.evidence.state,
              // Build step 7: whether it holds a document at all. The type,
              // size and the rest of R-023 come from GET /evidence/:id
              // (FIL-048), which SCR-101 reads when its drawer opens.
              hasDocument: e.evidence.documentSha256 !== null,
            })),
            // TIM-02 chases each step of a MULTI-STEP duty separately
            // (workflows.md section 5, TSK-I6, BR-ESC-06): a cycle carrying
            // its one ordinary task is already fully chased by the cycle's
            // own ladder above, so that lone task carries no ladder of its
            // own here. A cycle with more than one task shows each task's
            // independent ladder.
            ladder: c.tasks.length > 1
              ? await this.ladder.ladderViewFor(
                  'Task', t.id, t.dueDate ?? c.dueDate, t.assigneeId, t.assignee.department,
                  t.state !== 'Done' && t.state !== 'Cancelled',
                )
              : null,
          }))),
        }
      })),
    }
  }

  /**
   * Create the duty a control discharges, and schedule its first cycle.
   *
   * The cadence is supplied by the person, because in this instrument it comes
   * from a subordinate rule and is conditional on the liability of the firm
   * (PT Rules r.11). That is exactly what the CadenceUnspecified flag on the
   * parent clause tells the reviewer to go and resolve.
   */
  @Post('controls/:id/obligations')
  async createObligation(
    @Param('id') controlId: string,
    @CurrentActor() actor: Actor,
    @Body() body: {
      title?: string; regulator?: string; frequency?: string
      dueDate?: string; period?: string; evidenceRequirement?: string
      sourceClauseId?: string; ownerId?: string; checkerId?: string
    },
  ) {
    const control = await this.prisma.control.findUnique({ where: { id: controlId } })
    if (!control) throw new NotFoundException(controlId)
    if (!body.title || !body.frequency || !body.dueDate || !body.period) {
      throw new BadRequestException('title, frequency, period and dueDate are required')
    }

    const obligationId = await this.ids.allocate('OBL')
    const taskId = await this.ids.allocate('TSK')
    const cycleId = formatCycleId(obligationId, body.period)

    const { result, auditId } = await this.governed.run({
      actor,
      action: 'obligation.submit',
      entityType: 'Obligation',
      entityId: obligationId,
      detail: { controlId, frequency: body.frequency, period: body.period },
      work: async (tx) => {
        await tx.obligation.create({
          data: {
            id: obligationId,
            title: body.title as string,
            shortTitle: (body.title as string).slice(0, 60),
            regulator: body.regulator ?? 'Maharashtra',
            frequency: body.frequency as never,
            ownerId: body.ownerId ?? actor.personId,
            checkerId: body.checkerId ?? null,
            evidenceRequirement: body.evidenceRequirement ?? null,
            sourceClauseId: body.sourceClauseId ?? null,
            origin: 'earned',
          },
        })
        await tx.obligationControl.create({ data: { obligationId, controlId } })
        await tx.obligationCycle.create({
          data: { id: cycleId, obligationId, period: body.period as string,
                  dueDate: new Date(body.dueDate as string), state: 'Due', origin: 'earned' },
        })
        // A duty always has at least one task, so the model stays uniform even
        // for a single-action duty (spec 7.2).
        await tx.task.create({
          data: {
            id: taskId,
            title: `Prepare and file: ${body.title}`,
            shortTitle: (body.title as string).slice(0, 60),
            // This duty cannot complete without proof, because the statute
            // itself requires a challan (BR-EVD-01).
            completionPolicy: 'evidence',
            assigneeId: body.ownerId ?? actor.personId,
            checkerId: body.checkerId ?? null,
            dueDate: new Date(body.dueDate as string),
            cycleId,
            origin: 'earned',
          },
        })
        return { obligationId, cycleId, taskId }
      },
    })
    return { ...result, auditId }
  }

  /**
   * Attach evidence to a task, with the artifact itself (FIL-040 to FIL-046).
   *
   * The file is multipart, so this reads it with Fastify's own parser rather
   * than Nest's `@Body()`. It is checked, scanned and stored BEFORE
   * `GovernedMutationService.run()` opens its transaction (FIL-024): bytes
   * cannot join a database transaction, and a refusal must write nothing
   * (FIL-007, FIL-010, FIL-015) - so nothing is written to the store either
   * unless the file is accepted. Authority is asserted explicitly here,
   * ahead of that, and not left to `governed.run()`'s own check alone: an
   * unauthorised caller's refusal must happen before intake ever touches the
   * store, or the store gains an orphaned blob nobody's Document row cites.
   * `governed.run()` still asserts it again when it runs, which is
   * redundant and harmless, the same shape `submitTask()` above already
   * uses for its own pre-transaction business check.
   */
  @Post('tasks/:id/evidence')
  async attachEvidence(
    @Param('id') taskId: string,
    @CurrentActor() actor: Actor,
    @Req() req: FastifyRequest,
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new NotFoundException(taskId)

    const data = await req.file()
    // FIL-044: an attach with no artifact is refused.
    if (!data) throw new BadRequestException('an artifact is required')

    const field = (name: string): string | undefined => {
      const f = (data.fields as Record<string, { value?: unknown } | undefined>)[name]
      return typeof f?.value === 'string' ? f.value : undefined
    }
    const title = field('title')
    const kind = field('kind') ?? 'Challan'
    const capturedOnBehalfOfId = field('capturedOnBehalfOfId') || undefined
    const expectedVersionRaw = field('expectedVersion')

    if (!title?.trim()) throw new BadRequestException('a title is required')

    // Checked before intake touches the store (see the method's own doc
    // comment): an authority refusal must leave no orphaned blob behind.
    await this.authority.assert(actor, { action: 'task.attachEvidence' })

    let bytes: Buffer
    try {
      bytes = await data.toBuffer()
    } catch {
      // FIL-004, FIL-006, FIL-007: the transport-layer ceiling rejected the
      // file before it was fully buffered. REF-28, its own text assembled
      // from the reference data actually enforced (REFU-028).
      throw httpRefusal(400, await this.intake.refusalMessage(), 'REF-28')
    }

    let accepted: Awaited<ReturnType<FileIntakeService['accept']>>
    try {
      accepted = await this.intake.accept(bytes)
    } catch (err) {
      // REFU-029: the scanner's two refusals are FileIntakeRefusal's own
      // text and carry no catalogue identifier; only the type/size case is
      // REF-28.
      if (err instanceof FileIntakeRefusal) throw httpRefusal(400, err.message, err.ref)
      throw err
    }

    let onBehalfOfName: string | null = null
    if (capturedOnBehalfOfId) {
      const p = await this.prisma.person.findUnique({
        where: { id: capturedOnBehalfOfId }, select: { fullName: true },
      })
      if (!p) throw new BadRequestException(`no such person ${capturedOnBehalfOfId}`)
      onBehalfOfName = p.fullName
    }

    const evidenceId = await this.ids.allocate('EVD')

    const { auditId } = await this.governed.run({
      actor, action: 'task.attachEvidence', entityType: 'Task', entityId: taskId,
      expectedVersion: expectedVersionRaw !== undefined ? Number(expectedVersionRaw) : undefined,
      // FIL-046: names both people when it was attached on someone's behalf.
      detail: {
        evidenceId, kind, documentSha256: accepted.sha256,
        capturedByName: actor.fullName,
        ...(capturedOnBehalfOfId ? { capturedOnBehalfOfId, capturedOnBehalfOfName: onBehalfOfName } : {}),
      },
      work: async (tx) => {
        // FIL-022, FIL-023: one Document row per stored blob. put() may have
        // recognised bytes it already held (FIL-021); this upsert is what
        // makes a second reference to the same artifact idempotent too.
        await tx.document.upsert({
          where: { sha256: accepted.sha256 },
          create: {
            sha256: accepted.sha256, byteSize: accepted.byteSize,
            mimeType: accepted.mimeType, pageCount: accepted.pageCount, origin: 'earned',
          },
          update: {},
        })
        await tx.evidence.create({
          data: {
            id: evidenceId,
            title,
            shortTitle: title.slice(0, 60),
            kind: kind as never,
            capturedAt: new Date(),
            capturedById: actor.personId,
            capturedOnBehalfOfId: capturedOnBehalfOfId ?? null,
            documentSha256: accepted.sha256,
            state: 'Submitted',
            origin: 'earned',
          },
        })
        await tx.taskEvidence.create({ data: { taskId, evidenceId } })
        await tx.task.update({ where: { id: taskId }, data: { state: 'InProgress' } })
      },
    })
    return { evidenceId, auditId }
  }

  /**
   * FIL-048: the part of R-023 SCR-101 needs. The rest, the verification
   * note and the period covered, is SLICE-21's (ER-005).
   */
  @Get('evidence/:id')
  async evidenceDetail(@Param('id') id: string) {
    const e = await this.prisma.evidence.findUnique({
      where: { id },
      include: {
        capturedBy: { select: { fullName: true } },
        verifiedBy: { select: { fullName: true } },
        capturedOnBehalfOf: { select: { fullName: true } },
        document: { select: { mimeType: true, byteSize: true } },
        tasks: { include: { task: { select: { id: true, shortTitle: true, cycleId: true } } } },
        controls: { include: { control: { select: { id: true, shortTitle: true } } } },
      },
    })
    if (!e) throw httpRefusal(404, renderRefusal('REF-30', { id }), 'REF-30')

    const obligations = new Map<string, string>()
    for (const te of e.tasks) {
      if (!te.task.cycleId) continue
      const cycle = await this.prisma.obligationCycle.findUnique({
        where: { id: te.task.cycleId },
        select: { obligation: { select: { id: true, shortTitle: true } } },
      })
      if (cycle) obligations.set(cycle.obligation.id, cycle.obligation.shortTitle)
    }

    return {
      id: e.id, title: e.title, shortTitle: e.shortTitle, kind: e.kind,
      capturedAt: e.capturedAt,
      capturedBy: e.capturedBy?.fullName ?? null,
      capturedBySystem: e.capturedBySystem,
      capturedOnBehalfOf: e.capturedOnBehalfOf?.fullName ?? null,
      state: e.state, verifiedAt: e.verifiedAt, verifiedBy: e.verifiedBy?.fullName ?? null,
      // CLK-009, CLK-014: the zone `capturedAt` is named in, so the drawer
      // renders it generically instead of the seed world's hard-coded IST.
      timezone: this.clock.timezone(),
      // SCR-101-030: no document is a real, pre-existing state for evidence
      // created before this slice.
      document: e.document ? { mimeType: e.document.mimeType, byteSize: e.document.byteSize } : null,
      links: [
        ...e.tasks.map((te) => ({ kind: 'task' as const, id: te.task.id, label: te.task.shortTitle })),
        ...Array.from(obligations, ([id, label]) => ({ kind: 'obligation' as const, id, label })),
        ...e.controls.map((ce) => ({ kind: 'control' as const, id: ce.control.id, label: ce.control.shortTitle })),
      ],
    }
  }

  /**
   * FIL-047: the second consumer of the one document store. Rehashes before
   * streaming (FIL-025): a read that trusted the filesystem without checking
   * would let bit rot or tampering surface only when a regulator asked.
   */
  @Get('evidence/:id/document')
  async evidenceDocument(@Param('id') id: string, @Res() reply: FastifyReply) {
    const e = await this.prisma.evidence.findUnique({
      where: { id }, include: { document: { select: { mimeType: true } } },
    })
    // REFU-042: an absent evidence record and a real one holding no bytes
    // are the same not-found under REF-30. A registered blob missing from
    // the store, below, is a genuine integrity failure and keeps its own
    // message.
    if (!e?.documentSha256 || !e.document) throw httpRefusal(404, renderRefusal('REF-30', { id }), 'REF-30')

    let bytes: Buffer
    try {
      bytes = await this.store.get(e.documentSha256)
    } catch (err) {
      if (err instanceof DocumentIntegrityError) {
        // SCR-101-031: named, not silently served.
        throw new BadRequestException(`this document failed its integrity check: ${(err as Error).message}`)
      }
      throw new NotFoundException('the document is registered but missing from the store')
    }

    const ext = extensionFor(e.document.mimeType)
    return reply
      .header('Content-Type', e.document.mimeType)
      .header('Content-Disposition', `attachment; filename="${e.id}.${ext}"`)
      .send(bytes)
  }

  /** Submit the task. Refused without evidence when the policy requires it. */
  @Post('tasks/:id/submit')
  async submitTask(
    @Param('id') taskId: string,
    @CurrentActor() actor: Actor,
    @Body() body: { expectedVersion?: number } = {},
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        evidence: true,
        cycle: { include: { obligation: { select: { evidenceRequirement: true } } } },
      },
    })
    if (!task) throw new NotFoundException(taskId)
    if (task.completionPolicy === 'evidence' && task.evidence.length === 0) {
      // REF-06, REFU-025, DN-048: the duty's own evidence requirement, read
      // from the record. Empty for every Obligation today, so the message
      // stops after "evidence." rather than naming a requirement no record
      // holds.
      const requirement = task.cycle?.obligation.evidenceRequirement?.trim() || undefined
      throw httpRefusal(400, renderRefusal('REF-06', { requirement }), 'REF-06')
    }

    const { auditId } = await this.governed.run({
      actor, action: 'task.submit', entityType: 'Task', entityId: taskId,
      expectedVersion: body.expectedVersion,
      detail: { evidenceCount: task.evidence.length },
      work: async (tx) => {
        await tx.task.update({
          where: { id: taskId },
          data: { state: 'Submitted', submittedAt: new Date() },
        })
      },
    })
    return { id: taskId, state: 'Submitted', auditId }
  }

  /**
   * Verify the task and file the cycle.
   *
   * Separation of duties applies: the runner refuses when the verifier is the
   * person who submitted it (BR-AUT-05).
   */
  @Post('tasks/:id/verify')
  async verifyTask(
    @Param('id') taskId: string,
    @CurrentActor() actor: Actor,
    @Body() body: { expectedVersion?: number } = {},
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }, include: { evidence: true, cycle: true },
    })
    if (!task) throw new NotFoundException(taskId)
    if (task.state !== 'Submitted') {
      // REF-09, REFU-026: the catalogue's own shape for an illegal transition.
      throw httpRefusal(400, renderRefusal('REF-09', {
        entity: 'task', requiredState: 'Submitted', action: 'verified', currentState: task.state,
      }), 'REF-09')
    }

    const { auditId } = await this.governed.run({
      actor,
      action: 'task.verify',
      entityType: 'Task',
      entityId: taskId,
      makerId: task.assigneeId,
      expectedVersion: body.expectedVersion,
      detail: { cycleId: task.cycleId },
      work: async (tx) => {
        await tx.task.update({
          where: { id: taskId }, data: { state: 'Done', completedAt: new Date() },
        })
        for (const te of task.evidence) {
          await tx.evidence.update({
            where: { id: te.evidenceId },
            data: { state: 'Verified', verifiedAt: new Date(), verifiedById: actor.personId },
          })
        }
        if (task.cycleId) {
          await tx.obligationCycle.update({
            where: { id: task.cycleId }, data: { state: 'Filed', filedAt: new Date() },
          })
        }
      },
    })
    return { id: taskId, state: 'Done', cycleFiled: task.cycleId, auditId }
  }
}
