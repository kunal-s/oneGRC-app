import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common'
import type { Department, Prisma } from '@prisma/client'
import { IdAllocator, formatCycleId } from '@onegrc/domain'
import { CurrentActor } from '../core/identity/actor.decorator'
import type { Actor } from '../core/identity/identity.types'
import { computeScope, DEPARTMENTS } from '../core/identity/scope'
import { GovernedMutationService } from '../core/governed/governed-mutation.service'
import { PrismaService } from '../core/prisma/prisma.service'
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
  ) {}

  /** The spine, resolved from any anchor on it. */
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
    if (!c) throw new NotFoundException(id)
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
    return { items, total }
  }

  @Get('obligations/:id')
  async obligation(@Param('id') id: string) {
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
                assignee: { select: { fullName: true } },
                checker: { select: { fullName: true } },
                evidence: { include: { evidence: true } },
              },
            },
          },
        },
      },
    })
    if (!o) throw new NotFoundException(id)
    const now = new Date()
    return {
      id: o.id, title: o.title, shortTitle: o.shortTitle, regulator: o.regulator,
      frequency: o.frequency, evidenceRequirement: o.evidenceRequirement,
      owner: o.owner, checker: o.checker,
      provenance: o.sourceClause
        ? { clauseId: o.sourceClause.id, clauseRef: o.sourceClause.clauseRef,
            instrument: o.sourceClause.instrument.shortTitle }
        : null,
      controls: o.controls.map((c) => c.control),
      cycles: o.cycles.map((c) => ({
        id: c.id, period: c.period, dueDate: c.dueDate, state: c.state,
        // Derived, never stored (BR-DRV-17).
        overdue: c.state !== 'Filed' && c.dueDate < now,
        tasks: c.tasks.map((t) => ({
          id: t.id, shortTitle: t.shortTitle, state: t.state,
          completionPolicy: t.completionPolicy,
          assignee: t.assignee.fullName, checker: t.checker?.fullName ?? null,
          evidence: t.evidence.map((e) => ({
            id: e.evidence.id, shortTitle: e.evidence.shortTitle, state: e.evidence.state,
          })),
        })),
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

  /** Attach evidence to a task. */
  @Post('tasks/:id/evidence')
  async attachEvidence(
    @Param('id') taskId: string,
    @CurrentActor() actor: Actor,
    @Body() body: { title?: string; kind?: string },
  ) {
    if (!body.title?.trim()) throw new BadRequestException('a title is required')
    const evidenceId = await this.ids.allocate('EVD')

    const { auditId } = await this.governed.run({
      actor, action: 'task.attachEvidence', entityType: 'Task', entityId: taskId,
      detail: { evidenceId, kind: body.kind ?? 'Challan' },
      work: async (tx) => {
        await tx.evidence.create({
          data: {
            id: evidenceId,
            title: body.title as string,
            shortTitle: (body.title as string).slice(0, 60),
            kind: (body.kind ?? 'Challan') as never,
            capturedAt: new Date(),
            capturedById: actor.personId,
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

  /** Submit the task. Refused without evidence when the policy requires it. */
  @Post('tasks/:id/submit')
  async submitTask(@Param('id') taskId: string, @CurrentActor() actor: Actor) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }, include: { evidence: true },
    })
    if (!task) throw new NotFoundException(taskId)
    if (task.completionPolicy === 'evidence' && task.evidence.length === 0) {
      throw new BadRequestException(
        'this duty cannot be submitted without evidence: the statute requires proof of payment (BR-EVD-01)',
      )
    }

    const { auditId } = await this.governed.run({
      actor, action: 'task.submit', entityType: 'Task', entityId: taskId,
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
  async verifyTask(@Param('id') taskId: string, @CurrentActor() actor: Actor) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }, include: { evidence: true, cycle: true },
    })
    if (!task) throw new NotFoundException(taskId)
    if (task.state !== 'Submitted') {
      throw new BadRequestException(`a task must be Submitted to be verified; this is ${task.state}`)
    }

    const { auditId } = await this.governed.run({
      actor,
      action: 'task.verify',
      entityType: 'Task',
      entityId: taskId,
      makerId: task.assigneeId,
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
