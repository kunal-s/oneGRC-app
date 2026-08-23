/**
 * Install-time setup.
 *   pnpm --filter api setup            reference data only (production shape)
 *   pnpm --filter api setup --sample   reference data + sample people
 *   pnpm --filter api setup --purge    remove all sample records
 */
import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { SetupService } from '../src/setup/setup.service'

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
  const setup = app.get(SetupService)
  const argv = process.argv.slice(2)

  if (argv.includes('--purge')) {
    const r = await setup.purgeSampleData()
    if (r.blockedBy.length) {
      console.log('PURGE REFUSED — real records are owned by sample people:')
      for (const b of r.blockedBy) console.log(`   ${b}`)
      console.log('Reassign these first; deleting would orphan their provenance.')
    } else {
      console.log(`purged ${r.purged} sample records`)
    }
    await app.close()
    return
  }

  await setup.loadReferenceData()
  await setup.loadOrganisationProfile()
  if (argv.includes('--sample')) await setup.loadSamplePeople()

  const s = await setup.sampleStatus()
  console.log('reference data loaded')
  console.log(`sample data: ${s.total} records ${s.present ? '(PRESENT — purge before go-live)' : '(none)'}`)
  if (s.present) console.log('  ', JSON.stringify(s.counts))
  await app.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
