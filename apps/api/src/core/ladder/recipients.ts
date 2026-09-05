import type { Department } from '@prisma/client'
import type { Rung } from './rungs'

/**
 * Escalation targets resolve to real named people through the department-head
 * map (BR-ESC-04, FRD 4.13, LDR-013). A pure function over the map as it
 * stands, so it is unit-testable directly without a database (recipients.spec.ts).
 */
export interface DepartmentHeadRow {
  department: Department
  personId: string
  effectiveFrom: Date
}

export interface LadderSubjectOwner {
  ownerId: string
  ownerDepartment: Department
}

export interface ResolvedRecipients {
  recipientIds: string[]
  /**
   * Set when some department in this rung's resolution chain has no head on
   * record (LDR-019). The rung still fires, to the compliance escalation
   * owner, and this names which department could not be reached.
   */
  unresolvedDepartment: Department | null
}

/**
 * Rung 5's target and the fallback for every other rung: the Head of
 * Compliance and Company Secretarial, resolved through the map and never a
 * second setting (LDR-016).
 */
const COMPLIANCE_DEPARTMENT: Department = 'ComplianceAndSecretarial'

/**
 * Rung 6's target. FRD 5.27 says "the CRO / executive" and gives no
 * resolution rule; this is the recommendation of DN-033, implemented and
 * movable by changing one department-head row (LDR-017).
 */
const EXECUTIVE_DEPARTMENT: Department = 'Risk'

/** The person whose row for `department` has the latest `effectiveFrom` at or before `asOf` (LDR-014). Exported for R-065. */
export function headOf(department: Department, asOf: Date, heads: DepartmentHeadRow[]): string | null {
  const candidates = heads
    .filter((h) => h.department === department && h.effectiveFrom.getTime() <= asOf.getTime())
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())
  return candidates[0]?.personId ?? null
}

function dedupe(ids: Array<string | null>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => id !== null)))
}

/**
 * Resolves the recipients for one rung against one subject.
 *
 * A rung that cannot name a person still fires, to the compliance escalation
 * owner, naming the department that has no head, never silently (LDR-019,
 * BR-ESC-04). Where the owner is already the head of their own department,
 * rung 4 notifies them once, not twice (LDR-018): the fixed target-role label
 * still reads "Owner and line manager", so nothing is lost by not writing a
 * second row to the same person.
 */
export function resolveRecipients(
  rung: Rung,
  subject: LadderSubjectOwner,
  heads: DepartmentHeadRow[],
): ResolvedRecipients {
  if (rung.kind === 'reminder') {
    return { recipientIds: [subject.ownerId], unresolvedDepartment: null }
  }

  if (rung.offsetDays === 1) {
    const headId = headOf(subject.ownerDepartment, rung.moment, heads)
    if (headId) {
      return { recipientIds: dedupe([subject.ownerId, headId]), unresolvedDepartment: null }
    }
    const fallback = headOf(COMPLIANCE_DEPARTMENT, rung.moment, heads)
    return {
      recipientIds: dedupe([subject.ownerId, fallback]),
      unresolvedDepartment: subject.ownerDepartment,
    }
  }

  const targetDepartment = rung.offsetDays === 3 ? COMPLIANCE_DEPARTMENT : EXECUTIVE_DEPARTMENT
  const headId = headOf(targetDepartment, rung.moment, heads)
  if (headId) return { recipientIds: [headId], unresolvedDepartment: null }
  const fallback = headOf(COMPLIANCE_DEPARTMENT, rung.moment, heads)
  return { recipientIds: dedupe([fallback]), unresolvedDepartment: targetDepartment }
}
