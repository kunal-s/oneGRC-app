import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Injectable, Logger } from '@nestjs/common'
import type { PageText } from '@onegrc/domain'

const run = promisify(execFile)

export class PdfExtractionError extends Error {}

/**
 * Text extraction from PDFs, via poppler pdftotext.
 *
 * A native binary rather than a JS library, deliberately: layout-preserving
 * extraction is markedly better, and page boundaries come free as form feeds,
 * which is what lets a clause carry the page a reviewer must open. The cost is
 * a system dependency, which the on-prem image installs (poppler-utils).
 */
@Injectable()
export class PdfTextService {
  private readonly logger = new Logger(PdfTextService.name)

  async extract(path: string): Promise<PageText[]> {
    let stdout: string
    try {
      const res = await run('pdftotext', ['-layout', '-enc', 'UTF-8', path, '-'], {
        maxBuffer: 128 * 1024 * 1024,
      })
      stdout = res.stdout
    } catch (err) {
      throw new PdfExtractionError(
        `pdftotext failed for ${path}: ${(err as Error).message}. Is poppler-utils installed?`,
      )
    }

    // pdftotext separates pages with a form feed.
    const pages = stdout.split('\f').map((text, i) => ({ pageNumber: i + 1, text }))
    // A trailing form feed yields an empty final page; drop it rather than
    // attributing clauses to a page that does not exist.
    while (pages.length > 1 && (pages[pages.length - 1]?.text.trim() ?? '') === '') pages.pop()

    this.logger.log(`extracted ${pages.length} pages from ${path.split('/').pop()}`)
    return pages
  }

  /**
   * A crude but honest confidence signal for a text layer.
   *
   * OCR output is recognisable: a raised rate of isolated single characters,
   * stray punctuation and words that no dictionary would carry. This does not
   * try to be clever — it exists so a scanned instrument is visibly less
   * trustworthy than a born-digital one, rather than silently equal to it.
   */
  static confidenceOf(pages: PageText[], textLayer: 'native' | 'ocr' | 'none'): number {
    if (textLayer === 'none') return 0
    if (textLayer === 'native') return 0.99

    const text = pages.map((p) => p.text).join('\n')
    const words = text.split(/\s+/).filter((w) => w.length > 0)
    if (words.length === 0) return 0
    const suspicious = words.filter((w) => /[^\w.,;:()\[\]"'’“”\-–—/₹%&]/.test(w)).length
    const ratio = suspicious / words.length
    // Map a 0-15% suspicious-token rate onto 0.85 down to 0.55.
    return Math.max(0.55, Math.min(0.85, 0.85 - ratio * 2))
  }
}
