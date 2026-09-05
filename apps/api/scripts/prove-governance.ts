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
import { SetupService } from '../src/setup/setup.service'
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
  const setup = app.get(SetupService)

  const actorFor = async (email: string): Promise<Actor> => {
    const p = await prisma.person.findUniqueOrThrow({
      where: { email }, include: { roles: true },
    })
    return {
      personId: p.id, fullName: p.fullName, department: p.department,
      lineOfDefence: p.lineOfDefence, roles: p.roles.map((r) => r.roleCode),
    }
  }

  console.log('\n--- sample purge, unblocked ---')
  // Run first, before anything below gives a sample person provenance: this
  // is the one point in the script where the purge can genuinely succeed.
  // Best-effort, because a database that already has provenance from a prior
  // run of this script correctly refuses here too (E2, S00-181, S00-182).
  {
    const before = await setup.sampleStatus()
    const result = await setup.purgeSampleData()
    if (result.blockedBy.length === 0) {
      check('the purge deletes exactly what sampleStatus() counted', result.purged === before.total)
      const after = await setup.sampleStatus()
      check('sampleStatus() reports zero after a successful purge', after.total === 0)
    } else {
      console.log('  SKIP  purge is blocked by prior provenance; run against a fresh database to exercise this')
    }
    // Sample people are the actors every test below resolves by email.
    await setup.loadSamplePeople()
  }

  const anjali = await actorFor('compliance-head@sample.invalid')   // COMPLIANCE_MGR, Compliance dept
  const deepa = await actorFor('tax-lead@sample.invalid')           // COMPLIANCE_ANALYST, Finance
  const priya = await actorFor('dpo@sample.invalid') // COMPLIANCE_MGR, Data Protection
  const meera = await actorFor('cro@sample.invalid')                // EXEC, Risk

  const countAudit = async () => prisma.auditEntry.count()
  // Clause 3, not 6(2): the deterministic classifier reads 6(2) as
  // Unclassified against the current fixture, so it is never promotable and
  // a clause by that ref does not exist on a freshly ingested database.
  // Clause 3 is a Duty, bindsUs yes, with no unresolved blocking flag.
  const clause = await prisma.sourceClause.findFirstOrThrow({
    where: { instrumentId: 'INST-001', clauseRef: '3' },
  })

  console.log('\n--- authority ---')

  // Wrong role: an analyst cannot decide that a clause binds the firm.
  let before = await countAudit()
  try {
    await governed.run({ actor: deepa, action: 'clause.save', entityType: 'SourceClause',
      entityId: clause.id, expectedVersion: clause.version, work: async () => 'x' })
    check('wrong role is refused', false, '(it was allowed)')
  } catch (e) {
    check('wrong role is refused', /requires one of/.test(String(e)))
  }
  check('a refused action writes no audit row', (await countAudit()) === before)

  // Right role, wrong department: clause authority is department-gated.
  try {
    await governed.run({ actor: priya, action: 'clause.save', entityType: 'SourceClause',
      entityId: clause.id, expectedVersion: clause.version, work: async () => 'x' })
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
      entityId: clause.id, expectedVersion: clause.version,
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
  // The deliberate failure above ran inside the same transaction as the
  // version bump, so it rolled back too: the clause's version is unchanged.
  check('a rolled-back mutation does not bump the version either', after.version === clause.version)

  console.log(''); console.log('--- optimistic lock, the second writer (SLICE-01D) ---')
  {
    // Anjali writes once, successfully, at the version she read.
    before = await countAudit()
    const firstWrite = await governed.run({
      actor: anjali, action: 'clause.save', entityType: 'SourceClause', entityId: clause.id,
      expectedVersion: clause.version,
      work: (tx) => tx.sourceClause.update({ where: { id: clause.id }, data: { decisionBasis: 'proof run, first writer' } }),
    })
    check('the first writer succeeds at the version she read', !!firstWrite.auditId)
    check('the first writer writes exactly one audit row', (await countAudit()) === before + 1)

    // A second writer, still holding the STALE version Anjali read before
    // the first write landed, is refused (CON-004 to CON-007).
    before = await countAudit()
    try {
      await governed.run({
        actor: anjali, action: 'clause.save', entityType: 'SourceClause', entityId: clause.id,
        expectedVersion: clause.version,
        work: (tx) => tx.sourceClause.update({ where: { id: clause.id }, data: { decisionBasis: 'proof run, second writer' } }),
      })
      check('the second writer, at the stale version, is refused', false, '(it succeeded)')
    } catch (e) {
      const msg = String(e)
      check('the refusal names the person who changed it', msg.includes(anjali.fullName))
      check('the refusal says what changed', msg.includes('decisionBasis'))
      check('the refusal reads REF-25: told, and to review and try again', /Review and try again/.test(msg))
    }
    check('the refused second write commits no audit row', (await countAudit()) === before)
    const afterConflict = await prisma.sourceClause.findUniqueOrThrow({ where: { id: clause.id } })
    check('the refused second write does not touch the record', afterConflict.decisionBasis === 'proof run, first writer')

    // Reading again, at the current version, the same actor succeeds: the
    // rule is about staleness, not about who (CON-032).
    const secondAttempt = await governed.run({
      actor: anjali, action: 'clause.save', entityType: 'SourceClause', entityId: clause.id,
      expectedVersion: afterConflict.version,
      work: (tx) => tx.sourceClause.update({ where: { id: clause.id }, data: { decisionBasis: 'proof run, second writer, current version' } }),
    })
    check('re-reading the current version and writing again succeeds', !!secondAttempt.auditId)
  }

  console.log('\n--- audit immutability ---')
  {
    // The audit entry Anjali's earlier approval wrote is guaranteed to exist
    // by this point, so there is always at least one row to attack.
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "AuditEntry" SET "action" = $1 WHERE "seq" = (SELECT MAX("seq") FROM "AuditEntry")',
        'tampered',
      )
      check('the database refuses to update the audit log', false, '(it succeeded)')
    } catch (e) {
      check('the database refuses to update the audit log', /append only/i.test(String(e)))
    }

    try {
      await prisma.$executeRawUnsafe('DELETE FROM "AuditEntry" WHERE "seq" = (SELECT MAX("seq") FROM "AuditEntry")')
      check('the database refuses to delete from the audit log', false, '(it succeeded)')
    } catch (e) {
      check('the database refuses to delete from the audit log', /append only/i.test(String(e)))
    }
  }

  console.log('\n--- provenance ---')
  {
    // Anjali's approval above put her behind an audit entry, so deleting her
    // must be refused by the database itself, not merely by the purge's own
    // check (S00-021, S00-148, D-041).
    try {
      await prisma.$executeRawUnsafe('DELETE FROM "Person" WHERE "id" = $1', anjali.personId)
      check('deleting a person carrying provenance is refused by the database', false, '(it succeeded)')
    } catch (e) {
      check('deleting a person carrying provenance is refused by the database', /foreign key constraint/i.test(String(e)))
    }
  }

  console.log('\n--- sample purge, blocked ---')
  {
    // Anjali is a sample person and now carries an audit entry, so the purge
    // must refuse and name it, and delete nothing (E2, S00-181, S00-182).
    const before2 = await setup.sampleStatus()
    const blocked = await setup.purgeSampleData()
    check('a purge blocked by provenance deletes nothing', blocked.purged === 0)
    check('a purge blocked by provenance names what blocked it', blocked.blockedBy.some((b) => b.includes('audit actor')))
    const after2 = await setup.sampleStatus()
    check('a blocked purge leaves sample data untouched', after2.total === before2.total)
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  await app.close()
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
