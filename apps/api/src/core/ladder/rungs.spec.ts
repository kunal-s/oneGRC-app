import { describe, expect, it } from 'vitest'
import { computeRungs } from './rungs'

describe('computeRungs (LDR-001 to LDR-012, the pure ladder)', () => {
  it('produces six rungs, in order, with the reminders.ts labels verbatim (LDR-002 to LDR-008)', () => {
    const rungs = computeRungs(new Date('2026-09-20T00:00:00Z'), 'Asia/Kolkata')
    expect(rungs.map((r) => [r.offsetDays, r.kind, r.intervalLabel, r.targetRoleLabel])).toEqual([
      [-7, 'reminder', '7 days before due', 'Owner'],
      [-3, 'reminder', '3 days before due', 'Owner'],
      [-1, 'reminder', '1 day before due', 'Owner'],
      [1, 'escalation', '1 day overdue', 'Owner and line manager'],
      [3, 'escalation', '3 days overdue', 'Compliance Officer'],
      [7, 'escalation', '7 days overdue', 'CRO / executive'],
    ])
  })

  it('writes exactly four event types across the six rungs (LDR-062)', () => {
    const rungs = computeRungs(new Date('2026-09-20T00:00:00Z'), 'Asia/Kolkata')
    expect(rungs.map((r) => r.eventType)).toEqual([
      'duty.approaching', 'duty.approaching', 'duty.approaching',
      'duty.overdue.day1', 'duty.overdue.day3', 'duty.overdue.day7',
    ])
  })

  it('the singular/plural boundary reads "1 day", never "1 days" (LDR-008)', () => {
    const rungs = computeRungs(new Date('2026-09-20T00:00:00Z'), 'Asia/Kolkata')
    expect(rungs.find((r) => r.offsetDays === -1)?.intervalLabel).toBe('1 day before due')
    expect(rungs.find((r) => r.offsetDays === 1)?.intervalLabel).toBe('1 day overdue')
  })

  it('a rung 3 days before a due date of 2026-09-20 becomes due at 00:00 IST on 2026-09-17 (LDR-011)', () => {
    const rungs = computeRungs(new Date('2026-09-20T00:00:00Z'), 'Asia/Kolkata')
    const rung = rungs.find((r) => r.offsetDays === -3)!
    // 00:00 IST is 18:30 UTC the previous day (UTC+5:30).
    expect(rung.moment.toISOString()).toBe('2026-09-16T18:30:00.000Z')
  })

  it('the seven-days-overdue rung on a due date of 2026-08-28 falls due at 00:00 IST on 2026-09-04', () => {
    const rungs = computeRungs(new Date('2026-08-28T00:00:00Z'), 'Asia/Kolkata')
    const rung = rungs.find((r) => r.offsetDays === 7)!
    expect(rung.moment.toISOString()).toBe('2026-09-03T18:30:00.000Z')
  })

  it('is a pure function of the deadline: the same input always produces the same rungs (LDR-009)', () => {
    const a = computeRungs(new Date('2026-09-20T00:00:00Z'), 'Asia/Kolkata')
    const b = computeRungs(new Date('2026-09-20T00:00:00Z'), 'Asia/Kolkata')
    expect(a).toEqual(b)
  })

  it('honours a different organisation time zone (UTC), proving the zone is read rather than hard coded', () => {
    const rungs = computeRungs(new Date('2026-09-20T00:00:00Z'), 'UTC')
    const rung = rungs.find((r) => r.offsetDays === -3)!
    expect(rung.moment.toISOString()).toBe('2026-09-17T00:00:00.000Z')
  })
})
