import type { Department } from '@prisma/client'
import type { Rung } from './rungs'
import { DEPARTMENT_LABEL } from '../identity/scope'

export type NotificationSeverity = 'info' | 'warn' | 'critical'

/** Reminders read info; the escalation rungs read progressively louder, matching reminders.ts's own escalation-severity rule. */
export function severityFor(rung: Rung): NotificationSeverity {
  if (rung.kind === 'reminder') return 'info'
  return rung.offsetDays >= 7 ? 'critical' : 'warn'
}

/**
 * Title and body for a fired rung. Free text: the screen contract fixes the
 * interval label and the target-role label verbatim (LDR-008), not this
 * copy, so it is written plainly rather than quoted from anywhere.
 */
export function contentFor(
  rung: Rung,
  subject: { shortTitle: string; ownerName: string },
  unresolvedDepartment: Department | null,
): { title: string; body: string } {
  const title = `${subject.shortTitle}: ${rung.intervalLabel}`
  if (rung.kind === 'reminder') {
    return { title, body: `Owed by ${subject.ownerName}, ${rung.intervalLabel}.` }
  }
  if (unresolvedDepartment) {
    const label = DEPARTMENT_LABEL[unresolvedDepartment]
    return {
      title,
      body: `${subject.ownerName} is ${rung.intervalLabel}. ${label} has no department head on record, so this was escalated to the compliance escalation owner instead.`,
    }
  }
  return {
    title,
    body: `${subject.ownerName} is ${rung.intervalLabel}. Escalated to ${rung.targetRoleLabel}.`,
  }
}
