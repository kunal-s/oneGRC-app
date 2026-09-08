import { BadRequestException, Injectable } from '@nestjs/common'
import type { Department, Prisma } from '@prisma/client'
import type { Actor } from '../core/identity/identity.types'
import { ClockService } from '../core/clock/clock.service'
import { computeScope, DEPARTMENT_LABEL, DEPARTMENTS } from '../core/identity/scope'
import { GovernedMutationService } from '../core/governed/governed-mutation.service'
import { PrismaService } from '../core/prisma/prisma.service'
import { renderRefusal } from '../core/refusals/catalogue'
import { httpRefusal } from '../core/refusals/http'

export interface ExportPreview {
  register: string
  filters: string
  scope: string
  rows: number
  format: 'CSV'
  /** CLK-008, CLK-009: the instant this preview was read, and the zone to name beside it. */
  asOf: string
  timezone: string
  filename: string
}

export interface ExportCsv {
  filename: string
  body: string
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvTable(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

/**
 * EXP-001: one function over the same server read the screen used. Not a
 * second query and not a sixteenth engine (platform.md section 8).
 *
 * Two registers only, because two registers are read from the server today
 * (EXP-010): the control library through `GET /controls`, whose boundary
 * SLICE-01C made real, and the source library through `GET /instruments`,
 * which carries no boundary yet and says so on the face of its own export
 * (EXP-011).
 */
@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governed: GovernedMutationService,
    private readonly clock: ClockService,
  ) {}

  /**
   * EXP-002, EXP-004, EXP-005: the same scope resolution `GET /controls`
   * uses, except a locked caller naming a department they cannot see is
   * refused with REF-29 rather than silently narrowed to their own. A read
   * narrows because narrowing a screen is honest; an export is a document
   * that leaves the platform, and a document that says one department on
   * its face while carrying another's rows is a lie (DN-040).
   */
  private resolveControlScope(actor: Actor, department?: string): { where: Prisma.ControlWhereInput; scopeLabel: string; filterLabel: string } {
    const scope = computeScope(actor)

    if (department && department !== 'all') {
      if (!DEPARTMENTS.includes(department as Department)) {
        throw new BadRequestException(`unknown department "${department}"`)
      }
      if (!scope.seesAll && department !== actor.department) {
        throw httpRefusal(403, renderRefusal('REF-29'), 'REF-29')
      }
      const label = DEPARTMENT_LABEL[department as Department]
      return {
        where: { owner: { department: department as Department } },
        scopeLabel: label,
        filterLabel: `department: ${label}`,
      }
    }

    if (!scope.seesAll) {
      const label = DEPARTMENT_LABEL[actor.department]
      return { where: { owner: { department: actor.department } }, scopeLabel: label, filterLabel: 'none' }
    }
    return { where: {}, scopeLabel: scope.label, filterLabel: 'none' }
  }

  async previewControlLibrary(actor: Actor, department?: string): Promise<ExportPreview> {
    const { where, scopeLabel, filterLabel } = this.resolveControlScope(actor, department)
    const rows = await this.prisma.control.count({ where })
    return {
      register: 'Control Library',
      filters: filterLabel,
      scope: scopeLabel,
      rows,
      format: 'CSV',
      asOf: this.clock.now().toISOString(),
      timezone: this.clock.timezone(),
      filename: `control-library-${slug(scopeLabel)}-${today()}.csv`,
    }
  }

  async csvControlLibrary(actor: Actor, department?: string): Promise<ExportCsv> {
    const { where, scopeLabel, filterLabel } = this.resolveControlScope(actor, department)
    const rows = await this.prisma.control.findMany({
      where, orderBy: { shortTitle: 'asc' },
      select: { id: true, shortTitle: true, title: true },
    })
    const body = this.withBasis('Control Library', filterLabel, scopeLabel, rows.length) +
      csvTable(['id', 'shortTitle', 'title'], rows.map((r) => [r.id, r.shortTitle, r.title]))

    await this.writeAudit(actor, 'Control Library', filterLabel, scopeLabel, rows.length)
    return { filename: `control-library-${slug(scopeLabel)}-${today()}.csv`, body }
  }

  /**
   * EXP-011: the source library carries no department boundary yet and the
   * export says so plainly, rather than inventing one the screen does not
   * have. SLICE-06 owns E-14's own department model.
   */
  async previewSourceLibrary(): Promise<ExportPreview> {
    const rows = await this.prisma.instrument.count()
    return {
      register: 'Source Library',
      filters: 'none',
      scope: 'All departments. No boundary is applied to this register yet.',
      rows,
      format: 'CSV',
      asOf: this.clock.now().toISOString(),
      timezone: this.clock.timezone(),
      filename: `source-library-all-departments-${today()}.csv`,
    }
  }

  async csvSourceLibrary(actor: Actor): Promise<ExportCsv> {
    const rows = await this.prisma.instrument.findMany({
      orderBy: { id: 'asc' },
      include: { document: { select: { pageCount: true } }, _count: { select: { clauses: true } } },
    })
    const scope = 'All departments. No boundary is applied to this register yet.'
    const table = rows.map((i) => [
      i.id, i.shortTitle, i.type, i.authority,
      i.document?.pageCount ?? '', i._count.clauses,
      i.textLayer === 'ocr' ? 'OCR scan' : 'Digital',
    ])
    const body = this.withBasis('Source Library', 'none', scope, rows.length) +
      csvTable(['id', 'shortTitle', 'type', 'authority', 'pageCount', 'clauseCount', 'text'], table)

    await this.writeAudit(actor, 'Source Library', 'none', scope, rows.length)
    return { filename: `source-library-all-departments-${today()}.csv`, body }
  }

  /** EXP-008: five field,value lines, then one blank line, above the table. */
  private withBasis(register: string, filters: string, scope: string, rows: number): string {
    const lines = [
      `Register,${csvCell(register)}`,
      `Filters,${csvCell(filters)}`,
      `Scope,${csvCell(scope)}`,
      `Rows,${rows}`,
      `Produced,${new Date().toISOString()}`,
      '',
    ]
    return lines.join('\n') + '\n'
  }

  /**
   * EXP-012: one audit entry naming the actor, the register, the filters,
   * the scope and the row count, and never the rows. `export.run` (EXP-013)
   * carries no department gate and no separation of duties, and no versioned
   * entity: an export names no single record to lock against.
   */
  private async writeAudit(actor: Actor, register: string, filters: string, scope: string, rows: number): Promise<void> {
    await this.governed.run({
      actor, action: 'export.run', entityType: 'Export', entityId: null,
      detail: { register, filters, scope, rows },
      work: async () => undefined,
    })
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
