/**
 * Identifier allocation.
 *
 * Ids are never reused, including after deletion (§7.4), so allocation is a
 * monotonic counter per prefix — per prefix AND year for event ids, because
 * their sequence restarts each year.
 *
 * The counter lives behind `SequenceSource` so this module stays pure and
 * testable. P0-03 supplies the Postgres-backed implementation, which must
 * take its row lock inside the caller's transaction: an id handed out by a
 * mutation that then rolls back must not survive, and two concurrent
 * mutations must never receive the same id.
 */

import { formatId } from './format.js'
import { specFor, type PrefixKey } from './prefixes.js'

export interface SequenceSource {
  /**
   * Atomically increment and return the next sequence for this counter.
   * `scope` is the prefix for catalogue ids, `PREFIX:YYYY` for event ids.
   */
  next(scope: string): Promise<number>
}

export function scopeFor(prefix: PrefixKey, year?: number): string {
  return specFor(prefix).shape === 'event' ? `${prefix}:${year}` : prefix
}

export class IdAllocator {
  constructor(private readonly source: SequenceSource) {}

  /**
   * Allocate the next id for a prefix.
   * @param year required for event prefixes; the year the record belongs to.
   */
  async allocate(prefix: PrefixKey, year?: number): Promise<string> {
    const spec = specFor(prefix)
    if (spec.shape === 'event' && year === undefined) {
      throw new Error(`${prefix} is an event id and requires a year`)
    }
    const sequence = await this.source.next(scopeFor(prefix, year))
    return formatId(prefix, sequence, year)
  }
}

/**
 * In-memory counters. For tests and for the seed transformer, which allocates
 * the whole world in one pass before anything is written.
 */
export class InMemorySequenceSource implements SequenceSource {
  private readonly counters = new Map<string, number>()

  async next(scope: string): Promise<number> {
    const n = (this.counters.get(scope) ?? 0) + 1
    this.counters.set(scope, n)
    return n
  }

  /** Current value without incrementing — for assertions. */
  peek(scope: string): number {
    return this.counters.get(scope) ?? 0
  }
}
