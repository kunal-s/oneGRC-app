/**
 * What a file actually is, read from its bytes (FIL-005). A client can assert
 * anything in a filename or a Content-Type header, and a rule that trusts the
 * client is not a rule.
 *
 * No third-party sniffing library: the accepted set is seven types, five of
 * them identified by a fixed magic-byte prefix, and the two Office Open XML
 * types by a marker that is never compressed inside their zip container (a
 * zip entry's own path is stored literally, so `word/` or `xl/` is found in
 * the raw bytes without a zip reader). Plain text and CSV carry no magic
 * bytes at all and are accepted together as readable text.
 */

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff])
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const WORD_MARKER = Buffer.from('word/')
const XL_MARKER = Buffer.from('xl/')

const EXTENSION_FOR: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'text/csv': 'csv',
  'text/plain': 'txt',
  [DOCX_MIME]: 'docx',
  [XLSX_MIME]: 'xlsx',
}

/** True when the bytes are readable text: no NUL byte, and valid UTF-8. */
function looksLikeText(bytes: Buffer): boolean {
  if (bytes.length === 0) return false
  const sample = bytes.subarray(0, Math.min(bytes.length, 16_000))
  if (sample.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample)
    return true
  } catch {
    return false
  }
}

/**
 * The MIME type the bytes actually are, or null where nothing in the
 * accepted set matches. CSV and plain text are indistinguishable by content
 * alone, so both sniff to `text/plain`; the caller treats either accepted
 * row as satisfied by that result.
 */
export function sniffType(bytes: Buffer): string | null {
  if (bytes.length === 0) return null
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  if (bytes.subarray(0, 8).equals(PNG_MAGIC)) return 'image/png'
  if (bytes.subarray(0, 3).equals(JPEG_MAGIC)) return 'image/jpeg'
  if (bytes.subarray(0, 4).equals(ZIP_MAGIC)) {
    if (bytes.includes(WORD_MARKER)) return DOCX_MIME
    if (bytes.includes(XL_MARKER)) return XLSX_MIME
    return null
  }
  if (looksLikeText(bytes)) return 'text/plain'
  return null
}

/** The extension REF-28's neighbour, `Content-Disposition`, names (FIL-047). */
export function extensionFor(mimeType: string): string {
  return EXTENSION_FOR[mimeType] ?? 'bin'
}
