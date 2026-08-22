import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../core/prisma/prisma.service'

export interface ChainNode {
  kind: 'clause' | 'control' | 'obligation' | 'cycle' | 'task' | 'evidence'
  id: string
  label: string
  sub?: string
  route: string
  current: boolean
}

/**
 * Resolves the proof chain from ANY anchor on it (spec 2, BR-LNK-03).
 *
 * One resolver, so a clause page, a control page and a task page cannot drift
 * into three slightly different pictures of the same spine. Spec 2 calls that
 * property a requirement rather than an implementation detail.
 */
@Injectable()
export class ChainService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(anchorId: string): Promise<ChainNode[]> {
    const prefix = anchorId.split('-')[0]
    switch (prefix) {
      case 'SRC': return this.fromClause(anchorId)
      case 'CTRL': return this.fromControl(anchorId)
      case 'OBL': return this.fromObligation(anchorId)
      case 'TSK': return this.fromTask(anchorId)
      case 'EVD': return this.fromEvidence(anchorId)
      default: throw new NotFoundException(`cannot resolve a chain from ${anchorId}`)
    }
  }

  private async fromClause(id: string): Promise<ChainNode[]> {
    const c = await this.prisma.sourceClause.findUnique({
      where: { id },
      include: { instrument: true, controls: { include: { control: true } } },
    })
    if (!c) throw new NotFoundException(id)
    const control = c.controls[0]?.control
    const nodes: ChainNode[] = [
      { kind: 'clause', id: c.id, label: `${c.instrument.shortTitle} ${c.clauseRef}`,
        sub: c.shortTitle, route: `/sources/clause/${c.id}`, current: true },
    ]
    if (control) nodes.push(...(await this.downstreamOfControl(control.id, null)))
    return nodes
  }

  private async fromControl(id: string): Promise<ChainNode[]> {
    const ctrl = await this.prisma.control.findUnique({
      where: { id },
      include: { clauses: { include: { clause: { include: { instrument: true } } } } },
    })
    if (!ctrl) throw new NotFoundException(id)
    const cl = ctrl.clauses[0]?.clause
    const up: ChainNode[] = cl
      ? [{ kind: 'clause', id: cl.id, label: `${cl.instrument.shortTitle} ${cl.clauseRef}`,
           sub: cl.shortTitle, route: `/sources/clause/${cl.id}`, current: false }]
      : []
    return [...up, ...(await this.downstreamOfControl(id, id))]
  }

  private async downstreamOfControl(controlId: string, currentId: string | null): Promise<ChainNode[]> {
    const ctrl = await this.prisma.control.findUnique({
      where: { id: controlId },
      include: {
        obligations: {
          include: {
            obligation: {
              include: {
                cycles: { orderBy: { dueDate: 'asc' }, take: 1,
                  include: { tasks: { include: { evidence: { include: { evidence: true } } } } } },
              },
            },
          },
        },
      },
    })
    if (!ctrl) return []

    const nodes: ChainNode[] = [
      { kind: 'control', id: ctrl.id, label: ctrl.shortTitle, route: `/controls/${ctrl.id}`,
        current: currentId === ctrl.id },
    ]
    const ob = ctrl.obligations[0]?.obligation
    if (!ob) return nodes

    nodes.push({ kind: 'obligation', id: ob.id, label: ob.shortTitle,
      sub: `${ob.regulator} · ${ob.frequency}`, route: `/obligations/${ob.id}`, current: currentId === ob.id })

    const cycle = ob.cycles[0]
    if (!cycle) return nodes
    nodes.push({ kind: 'cycle', id: cycle.id, label: cycle.period,
      sub: `due ${cycle.dueDate.toISOString().slice(0, 10)} · ${cycle.state}`,
      route: `/obligations/${ob.id}`, current: false })

    const task = cycle.tasks[0]
    if (!task) return nodes
    nodes.push({ kind: 'task', id: task.id, label: task.shortTitle, sub: task.state,
      route: `/tasks/${task.id}`, current: currentId === task.id })

    for (const te of task.evidence) {
      nodes.push({ kind: 'evidence', id: te.evidence.id, label: te.evidence.shortTitle,
        sub: te.evidence.state, route: `/evidence/${te.evidence.id}`, current: currentId === te.evidence.id })
    }
    return nodes
  }

  private async fromObligation(id: string): Promise<ChainNode[]> {
    const ob = await this.prisma.obligation.findUnique({
      where: { id }, include: { controls: true },
    })
    if (!ob) throw new NotFoundException(id)
    const controlId = ob.controls[0]?.controlId
    if (!controlId) return []
    const chain = await this.fromControl(controlId)
    return chain.map((n) => ({ ...n, current: n.id === id }))
  }

  private async fromTask(id: string): Promise<ChainNode[]> {
    const t = await this.prisma.task.findUnique({
      where: { id }, include: { cycle: { include: { obligation: { include: { controls: true } } } } },
    })
    if (!t?.cycle) throw new NotFoundException(id)
    const controlId = t.cycle.obligation.controls[0]?.controlId
    if (!controlId) return []
    const chain = await this.fromControl(controlId)
    return chain.map((n) => ({ ...n, current: n.id === id }))
  }

  private async fromEvidence(id: string): Promise<ChainNode[]> {
    const e = await this.prisma.taskEvidence.findFirst({ where: { evidenceId: id } })
    if (!e) throw new NotFoundException(id)
    const chain = await this.fromTask(e.taskId)
    return chain.map((n) => ({ ...n, current: n.id === id }))
  }
}
