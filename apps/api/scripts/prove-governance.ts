/**
 * Proves the governance floor against the real database (P0-06).
 * Every assertion here is one REVIEW.md invariant 8 or 9 requires.
 */
import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/core/prisma/prisma.service'
import { GovernedMutationService } from '../src/core/governed/governed-mutation.service'
import type { Actor } from '../src/core/identity/identity.types'

let pass = 0
let fail = 0
function check(name: string, ok: boolean, extra = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`) }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] })
  const prisma = app.get(PrismaService)
  const governed = app.get(GovernedMutationService)

  const actorFor = async (email: string): Promise<Actor> => {
    const p = await prisma.person.findUniqueOrThrow({
      where: { email }, include: { roles: true },
    })
    return {
      personId: p.id, fullName: p.fullName, department: p.department,
      lineOfDefence: p.lineOfDefence, roles: p.roles.map((r) => r.roleCode),
    }
  }

  const anjali = await actorFor('compliance-head@sample.invalid')   // COMPLIANCE_MGR, Compliance dept
  const deepa = await actorFor('tax-lead@sample.invalid')           // COMPLIANCE_ANALYST, Finance
  const priya = await actorFor('dpo@sample.invalid') // COMPLIANCE_MGR, Data Protection
  const meera = await actorFor('cro@sample.invalid')                // EXEC, Risk

  const countAudit = async () => prisma.auditEntry.count()
  const clause = await prisma.sourceClause.findFirstOrThrow({
    where: { instrumentId: 'INST-001', clauseRef: '6(2)' },
  })

  console.log('\n--- authority ---')

  // Wrong role: an analyst cannot decide that a clause binds the firm.
  let before = await countAudit()
  try {
    await governed.run({ actor: deepa, action: 'clause.save', entityType: 'SourceClause',
      entityId: clause.id, work: async () => 'x' })
    check('wrong role is refused', false, '(it was allowed)')
  } catch (e) {
    check('wrong role is refused', /requires one of/.test(String(e)))
  }
  check('a refused action writes no audit row', (await countAudit()) === before)

  // Right role, wrong department: clause authority is department-gated.
  try {
    await governed.run({ actor: priya, action: 'clause.save', entityType: 'SourceClause',
      entityId: clause.id, work: async () => 'x' })
    check('right role but wrong department is refused', false, '(it was allowed)')
  } catch (e) {
    check('right role but wrong department is refused', /reserved to the/.test(String(e)))
  }

  // Separation of duties: the maker may not approve their own item.
  try {
    await governed.run({ actor: anjali, action: 'obligation.approve', entityType: 'Obligation',
      entityId: 'OBL-0001', makerId: anjali.personId, work: async () => 'x' })
    check('maker cannot approve own submission', false, '(it was allowed)')
  } catch (e) {
    check('maker cannot approve own submission', /separation of duties/.test(String(e)))
  }

  // A different checker is allowed.
  before = await countAudit()
  const ok = await governed.run({ actor: anjali, action: 'obligation.approve', entityType: 'Obligation',
    entityId: 'OBL-0001', makerId: deepa.personId, detail: { note: 'proof run' }, work: async () => 'approved' })
  check('a different checker is allowed', ok.result === 'approved')
  check('success writes exactly one audit row', (await countAudit()) === before + 1)

  console.log('\n--- atomicity ---')
  before = await countAudit()
  const clausesBefore = await prisma.sourceClause.count()
  try {
    await governed.run({ actor: anjali, action: 'clause.save', entityType: 'SourceClause',
      entityId: clause.id,
      work: async (tx) => {
        await tx.sourceClause.update({ where: { id: clause.id }, data: { shortTitle: 'MUTATED' } })
        throw new Error('deliberate failure after the write')
      } })
    check('a failing mutation is refused', false, '(it succeeded)')
  } catch {
    check('a failing mutation is refused', true)
  }
  const after = await prisma.sourceClause.findUniqueOrThrow({ where: { id: clause.id } })
  check('a failing mutation rolls back the record change', after.shortTitle !== 'MUTATED')
  check('a failing mutation writes no audit row', (await countAudit()) === before)
  check('no clause was created or lost', (await prisma.sourceClause.count()) === clausesBefore)

  console.log(`\n${pass} passed, ${fail} failed`)
  await app.close()
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
