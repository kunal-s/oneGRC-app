/**
 * Ingest registered instruments into clauses (P0-16).
 * Usage: pnpm --filter api ingest [INST-001 ...]   (default: all)
 */
import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { IngestionService } from '../src/ingestion/ingestion.service'
import { PrismaService } from '../src/core/prisma/prisma.service'

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
  const ingest = app.get(IngestionService)
  const prisma = app.get(PrismaService)

  const argv = process.argv.slice(2)
  const ids = argv.length
    ? argv
    : (await prisma.instrument.findMany({ orderBy: { id: 'asc' }, select: { id: true } })).map((i) => i.id)

  for (const id of ids) {
    const r = await ingest.ingest(id)
    console.log(
      `${r.instrumentId}  pages=${String(r.pages).padStart(2)}  sections=${String(r.clauses).padStart(3)}` +
        `  sub=${String(r.subClauses).padStart(3)}  flags=${String(r.flags).padStart(3)}` +
        `  confidence=${r.confidence.toFixed(2)}  method=${r.method}`,
    )
  }
  await app.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
