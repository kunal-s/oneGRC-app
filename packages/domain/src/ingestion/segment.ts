/**
 * Clause segmentation for Indian statutory text (P0-16).
 *
 * Structural, not intelligent. It finds section headings and their sub-clauses
 * and records exactly where each sits in the source, so the app can open the
 * PDF at the clause. What it cannot place confidently it leaves alone.
 *
 * Three properties of real statute drove this design, each found in the
 * fixture set rather than anticipated:
 *
 * 1. A naive "line begins with N." rule matches numbered LIST ITEMS. Rule 2 of
 *    the PT Rules lists State Bank of India branches as 1..9. A real heading
 *    has a distinctive shape - a short Capitalised title closed by a full stop
 *    and introduced by a dash:
 *        6. Returns.-- (1) Every employer registered under this Act shall ...
 *    A list item ("1. any branch of the State Bank of India; or") has none of
 *    that and begins lower-case. A contents entry ("6.    Returns.") has the
 *    title but no dash.
 *
 * 2. An amended section is wrapped in brackets or quotes, so the heading does
 *    not start at the number: "[7. Assessment and collection of tax.--".
 *
 * 3. A consolidated Act is preceded by amendment schedules that carry their
 *    OWN section numbering. Taking the first heading found yields a body that
 *    starts inside the notes. The body is instead the longest run of
 *    non-decreasing section numbers, which needs no per-document tuning.
 */

export interface SegmentedClause {
  /** Section or rule number as cited: "6", "4A", "11". */
  ref: string
  title: string
  /** Verbatim body text, exactly as extracted. */
  body: string
  charStart: number
  charEnd: number
  pageNumber: number
  ordinal: number
  /** Set for sub-clauses: the ref of the section they sit in. */
  parentRef?: string
  /** How the clause was found. Callers record this against the clause. */
  method: 'titledSection' | 'numberedParagraph'
}

export interface PageText {
  pageNumber: number
  text: string
}

/**
 * A titled heading: low indentation, an optional amendment bracket or quote,
 * a number (optionally letter-suffixed such as 4A), a short Capitalised title
 * with no internal full stop, then a dash introducing the body.
 */
const TITLED =
  /^[ \t]{0,14}(?:\[\d+\][ \t]*)*[\[“"]?(\d{1,3}[A-Z]?)\.[ \t]*([A-Z][^.\n:]{2,90}?)[.:][ \t]*[-–—]{1,2}/gm

/**
 * A numbered paragraph, as circulars and notifications use: a number, a full
 * stop, then a capitalised sentence. Requiring the capital is what keeps the
 * SBI branch list out, since those items begin lower-case.
 */
const NUMBERED = /^[ \t]{0,6}(\d{1,2})\.[ \t]+(?=[A-Z“"])/gm

/** Sub-clause openers: (1) (2) ... and (a) (b) ... */
const SUBCLAUSE = /(?:^|\n)[ \t]*(?:\[\d+\][ \t]*)*\[?\((\d{1,2}|[a-z])\)[ \t]+/g

export function joinPages(pages: PageText[]): { text: string; offsets: number[]; numbers: number[] } {
  let text = ''
  const offsets: number[] = []
  const numbers: number[] = []
  for (const p of pages) {
    offsets.push(text.length)
    numbers.push(p.pageNumber)
    text += p.text
    if (!p.text.endsWith('\n')) text += '\n'
  }
  return { text, offsets, numbers }
}

export function pageAt(offset: number, offsets: number[], numbers: number[]): number {
  let page = numbers[0] ?? 1
  for (let i = 0; i < offsets.length; i++) {
    if ((offsets[i] ?? 0) <= offset) page = numbers[i] ?? page
    else break
  }
  return page
}

interface Head {
  ref: string
  title: string
  start: number
  bodyStart: number
}

/** Numeric part of a ref: "4A" -> 4. */
function refNumber(ref: string): number {
  return parseInt(ref, 10)
}

/**
 * The main body is the longest run of headings whose section numbers do not
 * decrease. Amendment schedules restart their numbering, so they form separate
 * shorter runs and fall away without hardcoding anything about this document.
 */
function longestAscendingRun(heads: Head[]): Head[] {
  if (heads.length === 0) return []
  let bestStart = 0
  let bestLen = 1
  let runStart = 0

  for (let i = 1; i <= heads.length; i++) {
    const broken =
      i === heads.length ||
      refNumber(heads[i]!.ref) < refNumber(heads[i - 1]!.ref)
    if (broken) {
      const len = i - runStart
      if (len > bestLen) {
        bestLen = len
        bestStart = runStart
      }
      runStart = i
    }
  }
  return heads.slice(bestStart, bestStart + bestLen)
}

function subClausesOf(
  head: Head,
  body: string,
  offsets: number[],
  numbers: number[],
  method: SegmentedClause['method'],
  startOrdinal: number,
): SegmentedClause[] {
  const out: SegmentedClause[] = []
  const marks: Array<{ label: string; at: number }> = []
  SUBCLAUSE.lastIndex = 0
  let s: RegExpExecArray | null
  while ((s = SUBCLAUSE.exec(body)) !== null) {
    marks.push({ label: s[1] as string, at: s.index + (s[0].startsWith('\n') ? 1 : 0) })
  }

  let ordinal = startOrdinal
  const seen = new Set<string>()
  for (let j = 0; j < marks.length; j++) {
    const mk = marks[j]!
    const end = j + 1 < marks.length ? marks[j + 1]!.at : body.length
    const text = body.slice(mk.at, end).trim()
    if (text.length < 12) continue
    // A section restates (1),(2) inside provisos; keep only the first of each
    // label, so a clause reference stays unique and citable.
    const ref = `${head.ref}(${mk.label})`
    if (seen.has(ref)) continue
    seen.add(ref)

    const absStart = head.bodyStart + mk.at
    out.push({
      ref,
      title: `${head.title} — sub-clause (${mk.label})`,
      body: text,
      charStart: absStart,
      charEnd: head.bodyStart + end,
      pageNumber: pageAt(absStart, offsets, numbers),
      ordinal: ordinal++,
      parentRef: head.ref,
      method,
    })
  }
  return out
}

/**
 * Split an instrument into sections and sub-clauses.
 *
 * Titled sections are preferred. Where a document has none - a circular is
 * numbered paragraphs without titles - it falls back to paragraph mode, and
 * says so through `method`, so the caller can record lower confidence rather
 * than presenting a guess as a finding.
 */
export function segment(pages: PageText[]): SegmentedClause[] {
  const { text, offsets, numbers } = joinPages(pages)

  const titled: Head[] = []
  TITLED.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TITLED.exec(text)) !== null) {
    titled.push({
      ref: m[1] as string,
      title: (m[2] as string).trim().replace(/\s+/g, ' '),
      start: m.index,
      bodyStart: m.index + m[0].length,
    })
  }

  let heads = longestAscendingRun(titled)
  let method: SegmentedClause['method'] = 'titledSection'

  if (heads.length < 2) {
    const paras: Head[] = []
    NUMBERED.lastIndex = 0
    while ((m = NUMBERED.exec(text)) !== null) {
      paras.push({
        ref: m[1] as string,
        title: `Paragraph ${m[1]}`,
        start: m.index,
        bodyStart: m.index + m[0].length,
      })
    }
    heads = longestAscendingRun(paras)
    method = 'numberedParagraph'
  }

  const out: SegmentedClause[] = []
  let ordinal = 0

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]!
    const end = i + 1 < heads.length ? heads[i + 1]!.start : text.length
    const body = text.slice(h.bodyStart, end).trimEnd()

    out.push({
      ref: h.ref,
      title: h.title,
      body,
      charStart: h.start,
      charEnd: end,
      pageNumber: pageAt(h.start, offsets, numbers),
      ordinal: ordinal++,
      method,
    })

    if (method === 'titledSection') {
      const subs = subClausesOf(h, body, offsets, numbers, method, ordinal)
      out.push(...subs)
      ordinal += subs.length
    }
  }

  return out
}
