/**
 * Ingest registered instruments into classified provisions (P0-20).
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
    const cls = Object.entries(r.byClass)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')
    console.log(
      `${r.instrumentId}  pages=${String(r.pages).padStart(2)}  provisions=${String(r.provisions).padStart(3)}  ` +
        `DUTIES-BINDING-US=${String(r.dutiesBindingUs).padStart(3)}  blocking=${String(r.blockingFlags).padStart(3)}  conf=${r.confidence.toFixed(2)}`,
    )
    console.log(`            ${cls}`)
  }
  await app.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
