import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Injectable, Logger } from '@nestjs/common'

export class DocumentIntegrityError extends Error {}

export interface StoredDocument {
  sha256: string
  byteSize: number
  /** False when an identical blob was already present — the store deduplicates. */
  written: boolean
}

/**
 * Content-addressed blob storage.
 *
 * Documents are addressed by the SHA-256 of their bytes, which gives three
 * things the platform needs and a database column cannot:
 *
 *   1. Proof. An extracted clause can be shown to have come from this exact
 *      file, unaltered (spec 5.1 provenance, G-14 evidence integrity).
 *   2. Deduplication. The same circular registered against two instruments is
 *      one blob and two references.
 *   3. Backups that stay usable. Blobs in Postgres bloat every dump.
 *
 * ONE store serves instruments now and evidence from Phase 1 — spec 2, one
 * engine per concern. Do not grow a second one.
 */
@Injectable()
export class DocumentStoreService {
  private readonly logger = new Logger(DocumentStoreService.name)
  private readonly root: string

  constructor() {
    this.root = resolve(process.env.DOCUMENT_STORE_PATH ?? './var/documents')
  }

  /** Sharded so a directory never holds hundreds of thousands of entries. */
  private pathFor(sha256: string): string {
    return join(this.root, sha256.slice(0, 2), sha256.slice(2, 4), sha256)
  }

  static hash(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex')
  }

  /** Write bytes, or recognise that they are already stored. Idempotent. */
  async put(bytes: Buffer): Promise<StoredDocument> {
    const sha256 = DocumentStoreService.hash(bytes)
    const path = this.pathFor(sha256)

    try {
      const stat = await fs.stat(path)
      return { sha256, byteSize: stat.size, written: false }
    } catch {
      // not present — fall through and write it
    }

    await fs.mkdir(dirname(path), { recursive: true })
    // Write to a temp name then rename, so a crash mid-write cannot leave a
    // truncated blob sitting under a hash that promises its content.
    const tmp = `${path}.${process.pid}.tmp`
    await fs.writeFile(tmp, bytes)
    await fs.rename(tmp, path)

    this.logger.log(`stored ${sha256.slice(0, 12)} (${bytes.length} bytes)`)
    return { sha256, byteSize: bytes.length, written: true }
  }

  /**
   * Read bytes back, verifying the content still hashes to its address.
   *
   * The verification is the point: silent bit-rot or tampering in the blob
   * store would otherwise make an evidence trail that cannot be trusted, and
   * the failure would surface only when a regulator asked.
   */
  async get(sha256: string): Promise<Buffer> {
    const bytes = await fs.readFile(this.pathFor(sha256))
    const actual = DocumentStoreService.hash(bytes)
    if (actual !== sha256) {
      throw new DocumentIntegrityError(
        `document ${sha256.slice(0, 12)} failed integrity check: content hashes to ${actual.slice(0, 12)}`,
      )
    }
    return bytes
  }

  async exists(sha256: string): Promise<boolean> {
    try {
      await fs.stat(this.pathFor(sha256))
      return true
    } catch {
      return false
    }
  }

  /** Absolute path, for a streaming download response. Verified separately. */
  locate(sha256: string): string {
    return this.pathFor(sha256)
  }

  /** Where the store lives, for the health endpoint and operator diagnostics. */
  get rootPath(): string {
    return this.root
  }
}
