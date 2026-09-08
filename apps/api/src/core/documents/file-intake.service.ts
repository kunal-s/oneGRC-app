import { Inject, Injectable } from '@nestjs/common'
import { ACCEPTED_FILE_TYPES } from '../../setup/reference-data'
import { PdfTextService } from '../../ingestion/pdf-text.service'
import { PrismaService } from '../prisma/prisma.service'
import { DocumentStoreService } from './document-store.service'
import { FILE_SCANNER, type FileScanner } from './file-scanner'
import { sniffType } from './file-type-sniff'

/**
 * A refused upload (FIL-006, FIL-008, FIL-010, FIL-014). Nothing is stored.
 * `ref` is `'REF-28'` for a type or size refusal (REFU-028); left undefined
 * for the scanner-unreachable and scan-failed refusals beside it, which are
 * this service's own text and not a `platform.md` section 6 row (REFU-029).
 */
export class FileIntakeRefusal extends Error {
  constructor(message: string, readonly ref?: 'REF-28') {
    super(message)
  }
}

export interface AcceptedFile {
  sha256: string
  byteSize: number
  mimeType: string
  pageCount: number | null
}

/**
 * FIL-001: the one intake every file entering the platform passes. No second
 * upload path, no second store, no second hash.
 *
 * Bytes are checked and scanned here, and only stored on acceptance
 * (FIL-007): a refused upload writes nothing to the store and nothing to the
 * database, which is why this runs entirely before `GovernedMutationService`
 * opens its transaction.
 */
@Injectable()
export class FileIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: DocumentStoreService,
    private readonly pdfText: PdfTextService,
    @Inject(FILE_SCANNER) private readonly scanner: FileScanner,
  ) {}

  get scannerName(): string {
    return this.scanner.name
  }

  get scannerDescription(): string {
    return this.scanner.description
  }

  /**
   * REF-28's own text, built from the reference data actually enforced
   * (FIL-002, FIL-006), so the message can never name a set or a ceiling the
   * check does not use.
   */
  async refusalMessage(): Promise<string> {
    const [rows, limit] = await Promise.all([
      this.prisma.acceptedFileType.findMany({ select: { mimeType: true } }),
      this.prisma.fileIntakeLimit.findUniqueOrThrow({ where: { key: 'evidence' } }),
    ])
    const accepted = new Set(rows.map((r) => r.mimeType))
    // Ordered for readability from the canonical list, filtered to what the
    // database currently accepts, so an administrator narrowing the set
    // later narrows the sentence too.
    const labels = ACCEPTED_FILE_TYPES.filter((t) => accepted.has(t.mimeType)).map((t) => t.label)
    const joined = labels.length > 1
      ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
      : labels.join('')
    const mb = Math.round(limit.maxBytes / (1024 * 1024))
    return `${joined} files up to ${mb} MB are accepted.`
  }

  /**
   * Check, scan and store one file. Throws `FileIntakeRefusal` with REF-28's
   * text, or the scan's own reason, and stores nothing when it does
   * (FIL-006 to FIL-010, FIL-014).
   */
  async accept(bytes: Buffer): Promise<AcceptedFile> {
    if (bytes.length === 0) throw new FileIntakeRefusal(await this.refusalMessage(), 'REF-28')

    const limit = await this.prisma.fileIntakeLimit.findUniqueOrThrow({ where: { key: 'evidence' } })
    if (bytes.length > limit.maxBytes) throw new FileIntakeRefusal(await this.refusalMessage(), 'REF-28')

    const sniffed = sniffType(bytes)
    if (!sniffed) throw new FileIntakeRefusal(await this.refusalMessage(), 'REF-28')
    const accepted = await this.prisma.acceptedFileType.findMany({ select: { mimeType: true } })
    const acceptedSet = new Set(accepted.map((r) => r.mimeType))
    // CSV and plain text sniff to the same result (file-type-sniff.ts); either
    // accepted row satisfies it.
    const typeOk = sniffed === 'text/plain'
      ? acceptedSet.has('text/plain') || acceptedSet.has('text/csv')
      : acceptedSet.has(sniffed)
    if (!typeOk) throw new FileIntakeRefusal(await this.refusalMessage(), 'REF-28')

    // FIL-010, FIL-014: scanned before anything is written. A scanner that
    // cannot be reached is not a scanner that passed.
    let scanned: { clean: boolean; reason?: string }
    try {
      scanned = await this.scanner.scan(bytes)
    } catch (err) {
      throw new FileIntakeRefusal(
        `the ${this.scanner.name} scanner could not be reached: ${(err as Error).message}`,
      )
    }
    if (!scanned.clean) {
      throw new FileIntakeRefusal(`this file was refused by the ${this.scanner.name} scan: ${scanned.reason}`)
    }

    const stored = await this.store.put(bytes)
    const pageCount = sniffed === 'application/pdf' ? await this.pdfPageCount(stored.sha256) : null

    return { sha256: stored.sha256, byteSize: stored.byteSize, mimeType: sniffed, pageCount }
  }

  /**
   * FIL-026: read from the file, for a PDF only, null where it cannot be
   * read. `PdfTextService` already exists for instrument ingestion (poppler,
   * CON-01, CON-03); reused here rather than adding a second PDF reader.
   */
  private async pdfPageCount(sha256: string): Promise<number | null> {
    try {
      const pages = await this.pdfText.extract(this.store.locate(sha256))
      return pages.length
    } catch {
      // A scanned or malformed PDF that pdftotext cannot page-count is still
      // a stored, accepted evidence file; the count is simply unknown.
      return null
    }
  }
}
