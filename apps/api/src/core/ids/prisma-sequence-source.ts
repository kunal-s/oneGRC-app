import { Injectable } from '@nestjs/common'
import type { SequenceSource } from '@onegrc/domain'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Postgres-backed identifier counters (ADR-003).
 *
 * The counter row is incremented with `UPDATE ... RETURNING`, which takes a row
 * lock for the remainder of the enclosing transaction. Two consequences the
 * platform depends on:
 *
 *   1. Two concurrent mutations cannot receive the same id — the second waits.
 *   2. An id handed to a mutation that then rolls back is rolled back with it,
 *      so a failed action does not silently burn an identifier.
 *
 * Pass the transaction client when allocating inside a governed mutation; the
 * default client is only for one-off registration scripts.
 */
@Injectable()
export class PrismaSequenceSource implements SequenceSource {
  constructor(private readonly prisma: PrismaService) {}

  async next(scope: string): Promise<number> {
    return this.nextIn(this.prisma, scope)
  }

  /** Allocate inside a caller-supplied transaction. */
  async nextIn(client: Prisma.TransactionClient | PrismaService, scope: string): Promise<number> {
    const rows = await client.$queryRaw<Array<{ value: number }>>`
      INSERT INTO "IdSequence" ("scope", "value") VALUES (${scope}, 1)
      ON CONFLICT ("scope") DO UPDATE SET "value" = "IdSequence"."value" + 1
      RETURNING "value"
    `
    const value = rows[0]?.value
    if (value === undefined) throw new Error(`failed to allocate a sequence for ${scope}`)
    return value
  }
}
