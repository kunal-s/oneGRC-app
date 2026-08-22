import { addMonths, addDays } from 'date-fns'
import type { Obligation } from '@/types'
import { NOW_MS } from './time'

/**
 * Recurring obligation lifecycle (Epic 2.2 / spec 5.4). When a recurring duty is
 * approved and filed, the next cycle is scheduled automatically - generated as an
 * appended session instance (never a seed mutation). Non-periodic duties
 * (event-based / continuous / daily) are not auto-scheduled.
 */
const MONTHS: Record<string, number> = {
  Monthly: 1,
  Quarterly: 3,
  'Half-yearly': 6,
  'Half yearly': 6,
  Annual: 12,
  Annually: 12,
  Yearly: 12,
}

let recurSeq = 0

export function nextInstance(o: Obligation): Obligation | null {
  const f = o.frequency
  // Base the next due on the later of this cycle's due date and the frozen "now",
  // then add the cadence, so the new instance reads as genuinely upcoming.
  const from = new Date(Math.max(new Date(o.dueDate).getTime(), NOW_MS))
  let nextDue: Date
  if (MONTHS[f]) nextDue = addMonths(from, MONTHS[f])
  else if (f === 'Weekly') nextDue = addDays(from, 7)
  else if (f === 'Fortnightly') nextDue = addDays(from, 14)
  else return null

  recurSeq += 1
  const base = o.id.replace(/-R\d+$/, '')
  return {
    ...o,
    id: `${base}-R${recurSeq}`,
    dueDate: nextDue.toISOString(),
    status: 'Due',
    makerChecker: { ...o.makerChecker, state: 'Drafted' },
    evidence: [],
    linkedRegChange: undefined,
  }
}
