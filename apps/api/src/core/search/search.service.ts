import { Injectable } from '@nestjs/common'
import type { Department } from '@prisma/client'
import type { Actor } from '../identity/identity.types'
import { computeScope } from '../identity/scope'
import { PrismaService } from '../prisma/prisma.service'
import { SEARCH_PROVIDERS, type SearchHit } from './registry'

/** SCR-081-062: the prototype's own `slice(0, 24)`. */
export const SEARCH_PAGE_SIZE = 24

export interface SearchGroupResult {
  group: string
  hits: SearchHit[]
}

export interface SearchResult {
  groups: SearchGroupResult[]
  /** Over the same query and the same boundary as the rows beside it (SCR-081-060). */
  total: number
}

/**
 * SRCH-030 to SRCH-032, the boundary itself, extracted as a pure function so
 * it can be proven without a database, the way `computeScope()` and
 * `evaluateAuthority()` are (`search.spec.ts`).
 *
 * An identifier lookup takes no department at all: BR-SCP-03 says a record
 * stays reachable by its identifier regardless of who is asking, so there is
 * nothing here to resolve. A term search is scoped through `computeScope()`,
 * never a second resolver, and never by a client-supplied parameter: this
 * function does not accept one, which is how SRCH-037 holds structurally
 * rather than by a check somewhere that could be missed.
 */
export function resolveSearchDepartment(
  mode: 'identifier' | 'term',
  actor: { department: Department; roles: string[] },
): Department | undefined {
  if (mode === 'identifier') return undefined
  const scope = computeScope(actor)
  return scope.seesAll ? undefined : actor.department
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * R-006. `rawQuery` is the caller's own text, untouched: SRCH-021's test is
   * equality against the column, not a guess at the shape from a regular
   * expression, so every provider with an identifier gets a chance to match
   * it exactly before any term search runs (SRCH-036: a miss here and a hit
   * the caller may not open must look identical, and under SRCH-030 the only
   * kind search ever holds back is a restricted case, which SRCH-006 keeps
   * out of the registry entirely).
   */
  async search(actor: Actor, rawQuery: string): Promise<SearchResult> {
    const trimmed = rawQuery.trim()
    if (!trimmed) return { groups: [], total: 0 }

    const identifier = trimmed.toUpperCase()
    // BR-SCP-03: unscoped by construction. `resolveSearchDepartment` always
    // answers `undefined` for 'identifier'; `findByIdentifier` does not even
    // accept a department, so there is nothing here that could widen it.
    const idProviders = SEARCH_PROVIDERS.filter((p) => p.hasIdentifier)
    const candidates = await Promise.all(idProviders.map((p) => p.findByIdentifier(this.prisma, identifier)))
    const foundIndex = candidates.findIndex((h) => h !== null)
    if (foundIndex !== -1) {
      const hit = candidates[foundIndex] as SearchHit
      return { groups: [{ group: idProviders[foundIndex].group, hits: [hit] }], total: 1 }
    }

    const targetDepartment = resolveSearchDepartment('term', actor)
    const results = await Promise.all(
      SEARCH_PROVIDERS.map((p) => p.termSearch(this.prisma, trimmed, targetDepartment, SEARCH_PAGE_SIZE)),
    )

    let budget = SEARCH_PAGE_SIZE
    const groups: SearchGroupResult[] = []
    let total = 0
    SEARCH_PROVIDERS.forEach((p, i) => {
      const { hits, total: providerTotal } = results[i]
      total += providerTotal
      if (budget <= 0) return
      const taken = hits.slice(0, budget)
      budget -= taken.length
      if (taken.length > 0) groups.push({ group: p.group, hits: taken })
    })

    return { groups, total }
  }
}
