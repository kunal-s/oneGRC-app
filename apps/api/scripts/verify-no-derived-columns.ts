/**
 * Runs verify-no-derived-columns.sql against the live database and exits
 * non-zero on any row (BR-DRV-*, ADR-008, S00-018, S00-019, S00-020, S00-212).
 *
 * The SQL asserts the rule against the schema as it actually stands, not as
 * schema.prisma claims it stands, so it catches a column a migration added by
 * hand as readily as one Prisma generated.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from 'pg'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (see .env)')

  const sql = readFileSync(join(__dirname, 'verify-no-derived-columns.sql'), 'utf8')
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const { rows } = await client.query(sql)
    if (rows.length === 0) {
      console.log('derived columns: none found')
      return
    }
    console.error(`derived columns: ${rows.length} violation(s)`)
    for (const r of rows) {
      console.error(`  ${r.table_name}.${r.column_name}: ${r.reason}`)
    }
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
