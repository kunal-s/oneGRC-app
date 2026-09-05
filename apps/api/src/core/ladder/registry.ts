import type { Department, Prisma } from '@prisma/client'

/**
 * The subject registry (LDR-030, LDR-031): one provider per kind of chased
 * thing, each returning the subject's identifier, its deadline, its owner and
 * whether it is still active. Adding a kind is adding a provider; this slice
 * registers the two kinds that have rows (LDR-032).
 */
export interface LadderSubject {
  entityType: 'ObligationCycle' | 'Task'
  entityId: string
  shortTitle: string
  dueDate: Date
  ownerId: string
  ownerName: string
  ownerEmail: string | null
  ownerDepartment: Department
}

const ACTIVE_CYCLE_STATES = ['Due', 'InReview'] as const
const ACTIVE_TASK_STATES = ['Open', 'InProgress', 'Submitted', 'Returned'] as const

/**
 * TIM-01: an obligation cycle is active while its state is Due or InReview,
 * and is not chased once Filed (LDR-034, BR-ESC-05, CYC-S3, DRV-17). A
 * cycle's owner for ladder purposes is the owner of its obligation (LDR-037).
 */
export async function activeCycleSubjects(prisma: Prisma.TransactionClient | { obligationCycle: Prisma.TransactionClient['obligationCycle'] }): Promise<LadderSubject[]> {
  const cycles = await prisma.obligationCycle.findMany({
    where: { state: { in: [...ACTIVE_CYCLE_STATES] } },
    include: { obligation: { include: { owner: true } } },
  })
  return cycles.map((c) => ({
    entityType: 'ObligationCycle' as const,
    entityId: c.id,
    shortTitle: `${c.obligation.shortTitle} (${c.period})`,
    dueDate: c.dueDate,
    ownerId: c.obligation.ownerId,
    ownerName: c.obligation.owner.fullName,
    ownerEmail: c.obligation.owner.email,
    ownerDepartment: c.obligation.owner.department,
  }))
}

/**
 * TIM-02: a task is active while Open, InProgress, Submitted or Returned, and
 * is not chased once Done or Cancelled (LDR-035). A task's owner is its
 * assignee (LDR-037).
 *
 * TIM-02 chases "each step of a multi-step duty separately" (workflows.md
 * section 5, TSK-I6, BR-ESC-06): a three-party chain has three accountable
 * people, and chasing only the first is chasing nobody. A cycle carrying its
 * one ordinary task is already fully chased by TIM-01, the cycle's own
 * ladder against the same due date and the same owner; giving that task a
 * second, identical ladder would chase the one accountable person twice, not
 * chase a second one, which is not what BR-ESC-06 asks for. A task registers
 * its own ladder only where its cycle carries more than one task, the
 * genuinely multi-step case this line exists for. Recorded as an
 * implementation decision in the close-out report, not a plan edit: no
 * screen today can create a multi-task cycle, so this is unexercised until
 * one can.
 */
export async function activeTaskSubjects(prisma: Prisma.TransactionClient | { task: Prisma.TransactionClient['task'] }): Promise<LadderSubject[]> {
  const tasks = await prisma.task.findMany({
    where: { state: { in: [...ACTIVE_TASK_STATES] }, dueDate: { not: null }, cycleId: { not: null } },
    include: { assignee: true, cycle: { select: { tasks: { select: { id: true } } } } },
  })
  return tasks
    .filter((t) => (t.cycle?.tasks.length ?? 0) > 1)
    .map((t) => ({
      entityType: 'Task' as const,
      entityId: t.id,
      shortTitle: t.shortTitle,
      dueDate: t.dueDate as Date,
      ownerId: t.assigneeId,
      ownerName: t.assignee.fullName,
      ownerEmail: t.assignee.email,
      ownerDepartment: t.assignee.department,
    }))
}
