/**
 * Replay the audit chain and prove it has not been altered (BR-AUD-02).
 * Exit 0 when intact, 1 when broken. Suitable for CI and for an operator.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { AuditService } from '../src/core/audit/audit.service'

async function main() {
  const prisma = new PrismaClient()
  const entries = await prisma.auditEntry.findMany({ orderBy: { seq: 'asc' } })

  if (entries.length === 0) {
    console.log('audit chain: empty (0 entries)')
    await prisma.$disconnect()
    return
  }

  let prevHash: string | null = null
  let expectedSeq = entries[0]!.seq
  const problems: string[] = []

  for (const e of entries) {
    if (e.seq !== expectedSeq) {
      problems.push(`gap: expected seq ${expectedSeq}, found ${e.seq} (${e.id}) - an entry was removed`)
      expectedSeq = e.seq
    }
    if ((e.prevHash ?? null) !== prevHash) {
      problems.push(`${e.id}: prevHash does not match the preceding entry`)
    }
    const recomputed = AuditService.hashOf({
      seq: e.seq,
      at: e.at,
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      detail: e.detail ?? null,
      prevHash: e.prevHash ?? null,
    })
    if (recomputed !== e.hash) {
      problems.push(`${e.id}: content does not hash to its recorded value - the row was edited`)
    }
    prevHash = e.hash
    expectedSeq = e.seq + 1n
  }

  await prisma.$disconnect()

  if (problems.length === 0) {
    console.log(`audit chain: INTACT (${entries.length} entries, seq ${entries[0]!.seq}..${entries[entries.length - 1]!.seq})`)
    return
  }
  console.error(`audit chain: BROKEN (${problems.length} problem(s))`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
