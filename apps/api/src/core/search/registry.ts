import { Prisma } from '@prisma/client'
import type { PrismaService } from '../prisma/prisma.service'

/**
 * ENG-16, the one search index (SRCH-001, SRCH-002).
 *
 * Modelled on `core/ladder/registry.ts`, which solves the same problem for
 * deadlines: one provider per kind, not a monolithic index. Adding a kind
 * means adding a provider here and nowhere else.
 *
 * THE PROVIDER CONTRACT
 *
 * A provider declares:
 *   - `kind`, its name for logging and tests.
 *   - `group`, the SCR-081-052 heading its hits render under. The five
 *     providers below are also listed in SCR-081-052's own fixed order,
 *     which `search.service.ts` relies on rather than re-deriving.
 *   - `hasIdentifier`, whether SRCH-021's identifier lookup applies to this
 *     kind at all. `SourceProvision` is the one kind that answers false: it
 *     carries no user-facing identifier (SRCH-022, data-model.md section 4).
 *   - `findByIdentifier`, an exact, case-insensitive, UNSCOPED lookup
 *     (SRCH-030, BR-SCP-03). Returns the hit or null; never throws for a
 *     miss.
 *   - `termSearch`, full text plus an identifier/short-title prefix match
 *     (SRCH-023), over the tsvector SRCH-008 materialises. Scoped through
 *     `department`: `undefined` means unscoped, either because the caller
 *     sees all (SRCH-031) or because this kind carries no department at all
 *     yet (SRCH-034). Returns the ranked hits, already limited to `limit`,
 *     and the total count over the same query and the same boundary
 *     (SCR-081-060).
 *
 * A RESTRICTED CASE NEVER REGISTERS (SRCH-006). FRD §4.12 names this surface
 * directly: the reporter's identity is not a field, so no search index can
 * leak what the platform does not hold. No case entity has a table yet
 * (AUTH-G2 belongs to SLICE-26), so this is a rule for whoever writes that
 * provider, not runtime code today: a case kind must never appear in
 * SEARCH_PROVIDERS below, under any department resolution, however
 * plausible the identifier lookup would otherwise be.
 */

export interface SearchHit {
  /** The record's own id (SourceProvision's is its internal cuid, SRCH-022, never rendered). */
  id: string
  /** SCR-081-054, D-020: shortTitle, never title. SourceProvision has no shortTitle of its own (it is not yet a tracked record); its heading is the only text a person reads, so it is used as the label instead of inventing a shortTitle. */
  label: string
  /** SCR-081-055. */
  subLabel: string
  /** SCR-081-058: the route comes from the server, on the hit. */
  route: string
}

export interface SearchProvider {
  kind: 'Instrument' | 'SourceProvision' | 'SourceClause' | 'Obligation' | 'Control'
  group: 'Obligations' | 'Controls' | 'Clauses' | 'Instruments' | 'Provisions'
  hasIdentifier: boolean
  findByIdentifier(prisma: PrismaService, identifier: string): Promise<SearchHit | null>
  termSearch(
    prisma: PrismaService,
    query: string,
    department: string | undefined,
    limit: number,
  ): Promise<{ hits: SearchHit[]; total: number }>
}

const obligationProvider: SearchProvider = {
  kind: 'Obligation',
  group: 'Obligations',
  hasIdentifier: true,
  async findByIdentifier(prisma, identifier) {
    const o = await prisma.obligation.findUnique({
      where: { id: identifier },
      select: { id: true, shortTitle: true, regulator: true },
    })
    if (!o) return null
    return { id: o.id, label: o.shortTitle, subLabel: `${o.id} · ${o.regulator}`, route: `/obligations/${o.id}` }
  },
  async termSearch(prisma, query, department, limit) {
    const prefix = `${query}%`
    const rows = await prisma.$queryRaw<Array<{ id: string; shortTitle: string; regulator: string }>>(Prisma.sql`
      SELECT o.id, o."shortTitle", o.regulator
      FROM "Obligation" o
      JOIN "Person" p ON p.id = o."ownerId"
      WHERE (
        o."searchVector" @@ plainto_tsquery('english', ${query})
        OR o.id ILIKE ${prefix}
        OR o."shortTitle" ILIKE ${prefix}
      )
      AND (${department}::text IS NULL OR p."department"::text = ${department}::text)
      ORDER BY ts_rank_cd(o."searchVector", plainto_tsquery('english', ${query})) DESC, o."shortTitle" ASC
      LIMIT ${limit}
    `)
    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT count(*)::bigint AS n
      FROM "Obligation" o
      JOIN "Person" p ON p.id = o."ownerId"
      WHERE (
        o."searchVector" @@ plainto_tsquery('english', ${query})
        OR o.id ILIKE ${prefix}
        OR o."shortTitle" ILIKE ${prefix}
      )
      AND (${department}::text IS NULL OR p."department"::text = ${department}::text)
    `)
    return {
      hits: rows.map((o) => ({ id: o.id, label: o.shortTitle, subLabel: `${o.id} · ${o.regulator}`, route: `/obligations/${o.id}` })),
      total: Number(n),
    }
  },
}

const controlProvider: SearchProvider = {
  kind: 'Control',
  group: 'Controls',
  hasIdentifier: true,
  async findByIdentifier(prisma, identifier) {
    const c = await prisma.control.findUnique({ where: { id: identifier }, select: { id: true, shortTitle: true } })
    if (!c) return null
    return { id: c.id, label: c.shortTitle, subLabel: c.id, route: `/controls/${c.id}` }
  },
  async termSearch(prisma, query, department, limit) {
    const prefix = `${query}%`
    const rows = await prisma.$queryRaw<Array<{ id: string; shortTitle: string }>>(Prisma.sql`
      SELECT c.id, c."shortTitle"
      FROM "Control" c
      JOIN "Person" p ON p.id = c."ownerId"
      WHERE (
        c."searchVector" @@ plainto_tsquery('english', ${query})
        OR c.id ILIKE ${prefix}
        OR c."shortTitle" ILIKE ${prefix}
      )
      AND (${department}::text IS NULL OR p."department"::text = ${department}::text)
      ORDER BY ts_rank_cd(c."searchVector", plainto_tsquery('english', ${query})) DESC, c."shortTitle" ASC
      LIMIT ${limit}
    `)
    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT count(*)::bigint AS n
      FROM "Control" c
      JOIN "Person" p ON p.id = c."ownerId"
      WHERE (
        c."searchVector" @@ plainto_tsquery('english', ${query})
        OR c.id ILIKE ${prefix}
        OR c."shortTitle" ILIKE ${prefix}
      )
      AND (${department}::text IS NULL OR p."department"::text = ${department}::text)
    `)
    return {
      hits: rows.map((c) => ({ id: c.id, label: c.shortTitle, subLabel: c.id, route: `/controls/${c.id}` })),
      total: Number(n),
    }
  },
}

const sourceClauseProvider: SearchProvider = {
  kind: 'SourceClause',
  group: 'Clauses',
  hasIdentifier: true,
  async findByIdentifier(prisma, identifier) {
    const c = await prisma.sourceClause.findUnique({ where: { id: identifier }, select: { id: true, shortTitle: true } })
    if (!c) return null
    return { id: c.id, label: c.shortTitle, subLabel: c.id, route: `/sources/clause/${c.id}` }
  },
  async termSearch(prisma, query, _department, limit) {
    // SRCH-034: SourceClause carries no department yet. Always unscoped,
    // whatever the caller's own scope is.
    const prefix = `${query}%`
    const rows = await prisma.$queryRaw<Array<{ id: string; shortTitle: string }>>(Prisma.sql`
      SELECT c.id, c."shortTitle"
      FROM "SourceClause" c
      WHERE (
        c."searchVector" @@ plainto_tsquery('english', ${query})
        OR c.id ILIKE ${prefix}
        OR c."clauseRef" ILIKE ${prefix}
        OR c."shortTitle" ILIKE ${prefix}
      )
      ORDER BY ts_rank_cd(c."searchVector", plainto_tsquery('english', ${query})) DESC, c."shortTitle" ASC
      LIMIT ${limit}
    `)
    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT count(*)::bigint AS n
      FROM "SourceClause" c
      WHERE (
        c."searchVector" @@ plainto_tsquery('english', ${query})
        OR c.id ILIKE ${prefix}
        OR c."clauseRef" ILIKE ${prefix}
        OR c."shortTitle" ILIKE ${prefix}
      )
    `)
    return {
      hits: rows.map((c) => ({ id: c.id, label: c.shortTitle, subLabel: c.id, route: `/sources/clause/${c.id}` })),
      total: Number(n),
    }
  },
}

const instrumentProvider: SearchProvider = {
  kind: 'Instrument',
  group: 'Instruments',
  hasIdentifier: true,
  async findByIdentifier(prisma, identifier) {
    const i = await prisma.instrument.findUnique({ where: { id: identifier }, select: { id: true, shortTitle: true } })
    if (!i) return null
    return { id: i.id, label: i.shortTitle, subLabel: i.id, route: `/sources/${i.id}` }
  },
  async termSearch(prisma, query, _department, limit) {
    // SRCH-034: Instrument carries no department yet. Always unscoped.
    const prefix = `${query}%`
    const rows = await prisma.$queryRaw<Array<{ id: string; shortTitle: string }>>(Prisma.sql`
      SELECT i.id, i."shortTitle"
      FROM "Instrument" i
      WHERE (
        i."searchVector" @@ plainto_tsquery('english', ${query})
        OR i.id ILIKE ${prefix}
        OR i."shortTitle" ILIKE ${prefix}
      )
      ORDER BY ts_rank_cd(i."searchVector", plainto_tsquery('english', ${query})) DESC, i."shortTitle" ASC
      LIMIT ${limit}
    `)
    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT count(*)::bigint AS n
      FROM "Instrument" i
      WHERE (
        i."searchVector" @@ plainto_tsquery('english', ${query})
        OR i.id ILIKE ${prefix}
        OR i."shortTitle" ILIKE ${prefix}
      )
    `)
    return {
      hits: rows.map((i) => ({ id: i.id, label: i.shortTitle, subLabel: i.id, route: `/sources/${i.id}` })),
      total: Number(n),
    }
  },
}

const sourceProvisionProvider: SearchProvider = {
  kind: 'SourceProvision',
  group: 'Provisions',
  // SRCH-022: a provision has no user-facing identifier at all.
  hasIdentifier: false,
  async findByIdentifier() {
    return null
  },
  async termSearch(prisma, query, _department, limit) {
    // SRCH-034: SourceProvision carries no department. Always unscoped.
    const prefix = `${query}%`
    const rows = await prisma.$queryRaw<Array<{ id: string; heading: string; clauseRef: string; instrumentShortTitle: string }>>(Prisma.sql`
      SELECT p.id, p.heading, p."clauseRef", i."shortTitle" AS "instrumentShortTitle"
      FROM "SourceProvision" p
      JOIN "Instrument" i ON i.id = p."instrumentId"
      WHERE (
        p."searchVector" @@ plainto_tsquery('english', ${query})
        OR p."clauseRef" ILIKE ${prefix}
      )
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('english', ${query})) DESC, p."clauseRef" ASC
      LIMIT ${limit}
    `)
    const [{ n }] = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT count(*)::bigint AS n
      FROM "SourceProvision" p
      WHERE (
        p."searchVector" @@ plainto_tsquery('english', ${query})
        OR p."clauseRef" ILIKE ${prefix}
      )
    `)
    return {
      hits: rows.map((p) => ({
        id: p.id,
        // SRCH-022: no identifier to show, so heading stands in for the
        // shortTitle no provision carries (D-020 applies to records that
        // have one; a provision does not, by design, until it is promoted).
        label: p.heading,
        subLabel: `${p.instrumentShortTitle} ${p.clauseRef}`,
        route: `/sources/provision/${p.id}`,
      })),
      total: Number(n),
    }
  },
}

/** SCR-081-052's fixed order, Pages excluded (SRCH-003, SRCH-005: Pages is not a registered kind). */
export const SEARCH_PROVIDERS: SearchProvider[] = [
  obligationProvider,
  controlProvider,
  sourceClauseProvider,
  instrumentProvider,
  sourceProvisionProvider,
]
