import { describe, expect, it } from 'vitest'
import { isOverdueOn } from './overdue'

describe('isOverdueOn (DRV-17, CLK-006, CLK-007)', () => {
  it('a duty due today is not overdue at any hour of today', () => {
    const dueDate = { year: 2026, month: 9, day: 8 }
    expect(isOverdueOn(dueDate, { year: 2026, month: 9, day: 8 })).toBe(false)
  })

  it('is overdue from the first instant of the day after it is due', () => {
    const dueDate = { year: 2026, month: 9, day: 8 }
    expect(isOverdueOn(dueDate, { year: 2026, month: 9, day: 9 })).toBe(true)
  })

  it('is not overdue before the due date', () => {
    const dueDate = { year: 2026, month: 9, day: 8 }
    expect(isOverdueOn(dueDate, { year: 2026, month: 9, day: 7 })).toBe(false)
  })

  it('crosses a month boundary correctly', () => {
    const dueDate = { year: 2026, month: 8, day: 31 }
    expect(isOverdueOn(dueDate, { year: 2026, month: 9, day: 1 })).toBe(true)
    expect(isOverdueOn(dueDate, { year: 2026, month: 8, day: 31 })).toBe(false)
  })

  it('crosses a year boundary correctly', () => {
    const dueDate = { year: 2026, month: 12, day: 31 }
    expect(isOverdueOn(dueDate, { year: 2027, month: 1, day: 1 })).toBe(true)
    expect(isOverdueOn(dueDate, { year: 2026, month: 12, day: 31 })).toBe(false)
  })
})
