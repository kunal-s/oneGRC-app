import { describe, expect, it } from 'vitest'
import { computeRungs } from './rungs'
import { resolveRecipients, type DepartmentHeadRow } from './recipients'

const asOf = new Date('2026-01-01T00:00:00Z')

const heads: DepartmentHeadRow[] = [
  { department: 'FinanceAndTax', personId: 'deepa', effectiveFrom: new Date('2020-01-01') },
  { department: 'ComplianceAndSecretarial', personId: 'anjali', effectiveFrom: new Date('2020-01-01') },
  { department: 'Risk', personId: 'meera', effectiveFrom: new Date('2020-01-01') },
]

const rungs = computeRungs(new Date('2026-08-28T00:00:00Z'), 'Asia/Kolkata')
const reminder = rungs.find((r) => r.offsetDays === -7)!
const day1 = rungs.find((r) => r.offsetDays === 1)!
const day3 = rungs.find((r) => r.offsetDays === 3)!
const day7 = rungs.find((r) => r.offsetDays === 7)!

describe('resolveRecipients (LDR-013 to LDR-019, the department-head map)', () => {
  it('a reminder rung reaches the owner alone', () => {
    const result = resolveRecipients(reminder, { ownerId: 'rohit', ownerDepartment: 'FinanceAndTax' }, heads)
    expect(result).toEqual({ recipientIds: ['rohit'], unresolvedDepartment: null })
  })

  it('rung 4 reaches the owner and their department head (BR-ESC-04)', () => {
    const result = resolveRecipients(day1, { ownerId: 'rohit', ownerDepartment: 'FinanceAndTax' }, heads)
    expect(result).toEqual({ recipientIds: ['rohit', 'deepa'], unresolvedDepartment: null })
  })

  it('rung 4 notifies once, not twice, where the owner is already their own department head (LDR-018)', () => {
    const result = resolveRecipients(day1, { ownerId: 'deepa', ownerDepartment: 'FinanceAndTax' }, heads)
    expect(result).toEqual({ recipientIds: ['deepa'], unresolvedDepartment: null })
  })

  it('rung 4 falls back to the compliance escalation owner where the department has no head, and names it (LDR-019)', () => {
    const result = resolveRecipients(day1, { ownerId: 'arvind', ownerDepartment: 'InvestmentCompliance' }, heads)
    expect(result).toEqual({ recipientIds: ['arvind', 'anjali'], unresolvedDepartment: 'InvestmentCompliance' })
  })

  it('rung 5 reaches the Head of Compliance and Company Secretarial (LDR-016)', () => {
    const result = resolveRecipients(day3, { ownerId: 'rohit', ownerDepartment: 'FinanceAndTax' }, heads)
    expect(result).toEqual({ recipientIds: ['anjali'], unresolvedDepartment: null })
  })

  it('rung 6 reaches the head of Risk (DN-033)', () => {
    const result = resolveRecipients(day7, { ownerId: 'rohit', ownerDepartment: 'FinanceAndTax' }, heads)
    expect(result).toEqual({ recipientIds: ['meera'], unresolvedDepartment: null })
  })

  it('resolves against the map as it stood at the rung\'s own moment, not today (LDR-014)', () => {
    const laterHeads: DepartmentHeadRow[] = [
      { department: 'FinanceAndTax', personId: 'deepa', effectiveFrom: new Date('2020-01-01') },
      { department: 'FinanceAndTax', personId: 'successor', effectiveFrom: new Date('2099-01-01') },
    ]
    const result = resolveRecipients(day1, { ownerId: 'rohit', ownerDepartment: 'FinanceAndTax' }, laterHeads)
    expect(result.recipientIds).toContain('deepa')
    expect(result.recipientIds).not.toContain('successor')
  })
})
