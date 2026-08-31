import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../core/prisma/prisma.service'
import { AuditService } from '../core/audit/audit.service'
import { AUTHORITY, RETENTION_FLOORS, ROLES } from './reference-data'
import { SAMPLE_PEOPLE, sampleEmail } from './sample-people'

export interface SampleStatus {
  present: boolean
  counts: Record<string, number>
  total: number
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
    // A floor cannot be applied backwards to data already deleted, so it
    // ships from the first migration even though nothing reads it yet
    // (AUD-09, D-040). The database itself refuses to lower a value already
    // on record; this upsert only ever raises or holds it steady.
    for (const f of RETENTION_FLOORS) {
      await this.prisma.retentionFloor.upsert({
        where: { storeKey: f.storeKey },
        create: { storeKey: f.storeKey, minimumYears: f.minimumYears, note: f.note },
        update: { minimumYears: f.minimumYears, note: f.note },
      })
    }
    await this.prisma.organization.upsert({
      where: { id: 'org' },
      create: { id: 'org', name: 'Organisation', shortName: 'Organisation' },
      update: {},
    })
    this.logger.log(
      `reference data: ${ROLES.length} roles, ${AUTHORITY.length} governed actions, ${RETENTION_FLOORS.length} retention floors`,
    )
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
   * nothing (BR-LNK-10), so the purge stops and names what blocks it, and the
   * customer reassigns first. Silent cascade here would corrupt an audit trail.
   *
   * Ownership (BR-LNK-10, already restricted at the database layer) and the
   * ten provenance keys of S00-021 (D-041) are both checked here first, so the
   * refusal names every record by identifier rather than surfacing as a raw
   * constraint error partway through the transaction.
   *
   * An audit entry is written when the purge actually deletes something,
   * recording the counts, and never on a refusal, matching the rule that a
   * refused action leaves no trace beyond the refusal itself.
   */
  async purgeSampleData(): Promise<{ purged: number; blockedBy: string[] }> {
    const samplePeople = await this.prisma.person.findMany({
      where: { origin: 'sample' },
      select: { id: true, fullName: true },
    })
    const ids = samplePeople.map((p) => p.id)
    const blockedBy: string[] = []

    if (ids.length > 0) {
      const notSample = { not: 'sample' as const }
      const [
        ownedControls,
        ownedObligations,
        assignedTasks,
        decidedClauses,
        promotedProvisions,
        checkedObligations,
        checkedTasks,
        capturedEvidence,
        verifiedEvidence,
        ownedFlags,
        raisedFlags,
        resolvedFlags,
        auditEntries,
      ] = await Promise.all([
        this.prisma.control.findMany({
          where: { ownerId: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.obligation.findMany({
          where: { ownerId: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.task.findMany({
          where: { assigneeId: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        // The ten provenance keys of S00-021 (D-041): deleting a sample
        // person may never remove the record of what they decided, promoted,
        // checked, captured, verified, raised, resolved or owned.
        this.prisma.sourceClause.findMany({
          where: { decidedById: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.sourceProvision.findMany({
          where: { promotedById: { in: ids }, origin: notSample },
          select: { id: true, clauseRef: true, instrumentId: true },
        }),
        this.prisma.obligation.findMany({
          where: { checkerId: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.task.findMany({
          where: { checkerId: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.evidence.findMany({
          where: { capturedById: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.evidence.findMany({
          where: { verifiedById: { in: ids }, origin: notSample },
          select: { id: true, shortTitle: true },
        }),
        this.prisma.provisionFlag.findMany({
          where: { ownerId: { in: ids }, origin: notSample },
          select: { id: true, kind: true },
        }),
        this.prisma.provisionFlag.findMany({
          where: { raisedById: { in: ids }, origin: notSample },
          select: { id: true, kind: true },
        }),
        this.prisma.provisionFlag.findMany({
          where: { resolvedById: { in: ids }, origin: notSample },
          select: { id: true, kind: true },
        }),
        // AuditEntry carries no origin (S00-177): it can only ever be earned,
        // so there is no sample-to-sample exemption here at all.
        this.prisma.auditEntry.findMany({
          where: { actorId: { in: ids } },
          select: { id: true, action: true },
        }),
      ])

      for (const r of ownedControls) blockedBy.push(`${r.id} ${r.shortTitle} (owner)`)
      for (const r of ownedObligations) blockedBy.push(`${r.id} ${r.shortTitle} (owner)`)
      for (const r of assignedTasks) blockedBy.push(`${r.id} ${r.shortTitle} (assignee)`)
      for (const r of decidedClauses) blockedBy.push(`${r.id} ${r.shortTitle} (decided by)`)
      for (const r of promotedProvisions) blockedBy.push(`${r.instrumentId} ${r.clauseRef} (promoted by, provision)`)
      for (const r of checkedObligations) blockedBy.push(`${r.id} ${r.shortTitle} (checker)`)
      for (const r of checkedTasks) blockedBy.push(`${r.id} ${r.shortTitle} (checker)`)
      for (const r of capturedEvidence) blockedBy.push(`${r.id} ${r.shortTitle} (captured by)`)
      for (const r of verifiedEvidence) blockedBy.push(`${r.id} ${r.shortTitle} (verified by)`)
      for (const r of ownedFlags) blockedBy.push(`${r.id} ${r.kind} (flag owner)`)
      for (const r of raisedFlags) blockedBy.push(`${r.id} ${r.kind} (flag raised by)`)
      for (const r of resolvedFlags) blockedBy.push(`${r.id} ${r.kind} (flag resolved by)`)
      for (const r of auditEntries) blockedBy.push(`${r.id} ${r.action} (audit actor)`)
    }

    if (blockedBy.length > 0) return { purged: 0, blockedBy }

    // What is counted and what is deleted are the same set (S00-181): every
    // entity sampleStatus() counts, and nothing else.
    const status = await this.sampleStatus()

    let purged = 0
    await this.prisma.$transaction(async (tx) => {
      purged += (await tx.task.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.evidence.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.obligation.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.control.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.sourceClause.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.instrument.deleteMany({ where: { origin: 'sample' } })).count
      purged += (await tx.person.deleteMany({ where: { origin: 'sample' } })).count

      // A system event: nobody is signed in when this script runs, so the
      // actor is null (AUD-04, S00-151), never routed through
      // GovernedMutationService because there is no session to check.
      await this.audit.append(tx, {
        actorId: null,
        actorLabel: 'system',
        action: 'sample.purge',
        entityType: 'SetupService',
        detail: { counts: status.counts, total: purged },
      })
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
