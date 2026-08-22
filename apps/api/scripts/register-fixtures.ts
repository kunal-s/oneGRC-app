/**
 * Register the development fixture instruments (P0-15).
 *
 * These are official government publications used to develop and test
 * ingestion. They are NOT seed data: no customer deployment loads them
 * (ADR-012). Idempotent — re-running reports what already exists.
 */
import 'dotenv/config'
import 'reflect-metadata'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { InstrumentService } from '../src/instruments/instrument.service'
import { PrismaService } from '../src/core/prisma/prisma.service'

const FIXTURES = resolve(__dirname, '../../../fixtures/instruments')

interface Entry {
  key: string
  file: string
  sha256: string
  title: string
  shortTitle: string
  citation?: string
  authority: string
  jurisdiction: string
  type: string
  issuedOn?: string
  status?: string
  sourceUrl?: string
  retrievalMethod: string
  textLayer?: string
  pages?: number
  madeUnder?: string
}

async function main() {
  const log = new Logger('register-fixtures')
  const manifest = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'))
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
  const service = app.get(InstrumentService)
  const prisma = app.get(PrismaService)

  const idByKey = new Map<string, string>()

  for (const e of manifest.instruments as Entry[]) {
    const bytes = readFileSync(join(FIXTURES, e.file))
    try {
      const { id, sha256 } = await service.register(
        {
          title: e.title,
          shortTitle: e.shortTitle,
          citation: e.citation,
          authority: e.authority,
          jurisdiction: e.jurisdiction,
          type: e.type as never,
          issuedOn: e.issuedOn ? new Date(e.issuedOn) : undefined,
          status: (e.status ?? 'InForce') as never,
          sourceUrl: e.sourceUrl,
          retrievalMethod: (e.retrievalMethod === 'fetched' ? 'fetched' : 'manualUpload') as never,
          textLayer: (e.textLayer ?? 'native') as never,
          pageCount: e.pages,
        },
        bytes,
      )
      if (sha256 !== e.sha256) throw new Error(`checksum drift for ${e.file}`)
      idByKey.set(e.key, id)
      log.log(`registered ${id}  ${e.shortTitle}`)
    } catch (err) {
      const existing = await prisma.instrument.findFirst({ where: { documentSha256: e.sha256 } })
      if (!existing) throw err
      idByKey.set(e.key, existing.id)
      log.log(`already present ${existing.id}  ${e.shortTitle}`)
    }
  }

  for (const e of manifest.instruments as Entry[]) {
    if (!e.madeUnder) continue
    const from = idByKey.get(e.key)
    const to = idByKey.get(e.madeUnder)
    if (from && to) {
      await service.relate(from, to, 'madeUnder', 'Subordinate legislation')
      log.log(`relation ${from} madeUnder ${to}`)
    }
  }

  await app.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
