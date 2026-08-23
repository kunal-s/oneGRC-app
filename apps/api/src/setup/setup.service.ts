import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../core/prisma/prisma.service'
import { AUTHORITY, ROLES } from './reference-data'
import { SAMPLE_PEOPLE, sampleEmail } from './sample-people'

export interface SampleStatus {
  present: boolean
  counts: Record<string, number>
  total: number
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent. Runs on every install, production included. */
  async loadReferenceData(): Promise<void> {
    for (const r of ROLES) {
      await this.prisma.role.upsert({
        where: { code: r.code },
        create: { code: r.code, name: r.name, description: r.description },
        update: { name: r.name, description: r.description },
      })
    }
    for (const a of AUTHORITY) {
      for (const roleCode of a.roles) {
        await this.prisma.actionAuthority.upsert({
          where: { action_roleCode: { action: a.action, roleCode } },
          create: {
            action: a.action,
            roleCode,
            separationOfDuties: a.sod ?? false,
            requiresDepartment: a.dept ?? null,
          },
          update: {
            separationOfDuties: a.sod ?? false,
            requiresDepartment: a.dept ?? null,
          },
        })
      }
    }
    await this.prisma.organization.upsert({
      where: { id: 'org' },
      create: { id: 'org', name: 'Organisation', shortName: 'Organisation' },
      update: {},
    })
    this.logger.log(`reference data: ${ROLES.length} roles, ${AUTHORITY.length} governed actions`)
  }

  /**
   * Sample people. Refuses outside development unless explicitly forced, so a
   * production install cannot acquire them by accident (ADR-012).
   */
  async loadSamplePeople(opts: { force?: boolean } = {}): Promise<number> {
    if (process.env.NODE_ENV === 'production' && !opts.force) {
      throw new Error('sample data is not loaded in production; pass force to override')
    }

    const org = await this.prisma.organization.findFirstOrThrow()

    let n = 0
    for (const p of SAMPLE_PEOPLE) {
      const person = await this.prisma.person.upsert({
        where: { email: sampleEmail(p.key) },
        create: {
          organizationId: org.id,
          fullName: p.fullName,
          jobTitle: p.jobTitle,
          email: sampleEmail(p.key),
          department: p.department,
          lineOfDefence: p.lineOfDefence,
          origin: 'sample',
        },
        update: { jobTitle: p.jobTitle, department: p.department },
      })
      for (const roleCode of p.roles) {
        await this.prisma.personRole.upsert({
          where: { personId_roleCode: { personId: person.id, roleCode } },
          create: { personId: person.id, roleCode },
          update: {},
        })
      }
      n++
    }
    this.logger.log(`sample data: ${n} people (origin=sample, no credentials)`)
    return n
  }

  /** What the "sample data present" banner reads from. */
  async sampleStatus(): Promise<SampleStatus> {
    const [people, instruments, clauses, controls, obligations, tasks, evidence] = await Promise.all([
      this.prisma.person.count({ where: { origin: 'sample' } }),
      this.prisma.instrument.count({ where: { origin: 'sample' } }),
      this.prisma.sourceClause.count({ where: { origin: 'sample' } }),
      this.prisma.control.count({ where: { origin: 'sample' } }),
      this.prisma.obligation.count({ where: { origin: 'sample' } }),
      this.prisma.task.count({ where: { origin: 'sample' } }),
      this.prisma.evidence.count({ where: { origin: 'sample' } }),
    ])
    const counts = { people, instruments, clauses, controls, obligations, tasks, evidence }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return { present: total > 0, counts, total }
  }

  /**
   * Remove every sample record in one action.
   *
   * Refuses rather than orphans. Once a customer has started real work owned by
   * a sample person, deleting that person would leave provenance pointing at
   * nothing (BR-LNK-10) — so the purge stops and names what blocks it, and the
   * customer reassigns first. Silent cascade here would corrupt an audit trail.
   */
  async purgeSampleData(): Promise<{ purged: number; blockedBy: string[] }> {
    const samplePeople = await this.prisma.person.findMany({
      where: { origin: 'sample' },
      select: { id: true, fullName: true },
    })
    const ids = samplePeople.map((p) => p.id)
    const blockedBy: string[] = []

    if (ids.length > 0) {
      const [controls, obligations, tasks] = await Promise.all([
        this.prisma.control.findMany({
          where: { ownerId: { in: ids }, origin: { not: 'sample' } },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.obligation.findMany({
          where: { ownerId: { in: ids }, origin: { not: 'sample' } },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.task.findMany({
          where: { assigneeId: { in: ids }, origin: { not: 'sample' } },
          select: { id: true, shortTitle: true },
        }),
      ])
      for (const r of [...controls, ...obligations, ...tasks]) {
        blockedBy.push(`${r.id} ${r.shortTitle}`)
      }
    }

    if (blockedBy.length > 0) return { purged: 0, blockedBy }

    let purged = 0
    await this.prisma.$transaction(async (tx) => {
      purged += (await tx.task.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.evidence.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.obligation.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.control.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.person.deleteMany({ where: { origin: 'sample' } })).count
    })
    this.logger.warn(`purged ${purged} sample records`)
    return { purged, blockedBy: [] }
  }

  /**
   * What this organisation IS. Reference-shaped, but customer-specific: it is
   * the only thing that can answer whether "every employer shall" binds us and
   * "the Authority shall" does not.
   */
  async loadOrganisationProfile(): Promise<void> {
    const org = await this.prisma.organization.findFirstOrThrow()

    await this.prisma.organisationProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        legalForm: 'Private limited company',
        jurisdictions: ['IN', 'IN-MH'],
        // The capacities the firm acts in. A duty-bearer phrase is matched
        // against these, which is how PFRDA Act s.14 is excluded: it binds the
        // Authority, a capacity no regulated firm holds.
        capacities: ['employer', 'pensionFundManager', 'entity'],
        registrations: { 'PT-MH': 'PENDING', PFRDA: 'PENDING' },
        // Answers conditional applicability. PT Rules r.11 makes the return
        // monthly above one lakh and annual below it.
        thresholds: { annualProfessionTaxLiabilityINR: 1500000, employees: 240 },
      },
      update: {},
    })
    this.logger.log('organisation profile loaded (capacities: employer, pensionFundManager)')
  }
}
