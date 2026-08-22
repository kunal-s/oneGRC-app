/**
 * Formatting, parsing and validation for OneGRC identifiers (ADR-003, §7.4).
 *
 * Identifiers are user-facing: people quote them in email, in committee
 * minutes and to regulators. They are short, typeable and stable, and they
 * are NEVER reused — including after deletion (§7.4).
 */

import { ID_MAX_LENGTH, PREFIXES, type PrefixKey, specFor } from './prefixes.js'

export class IdFormatError extends Error {}

export interface ParsedId {
  prefix: PrefixKey
  /** Two-digit year, event ids only. */
  year?: number
  sequence: number
}

/** A recurring duty's cycle: `<dutyId>.<period>`, e.g. OBL-0142.2026Q1. */
export interface ParsedCycleId {
  dutyId: string
  period: string
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

/**
 * Build an identifier.
 *
 * @param year full year (e.g. 2026) for event prefixes; ignored for catalogue.
 */
export function formatId(prefix: PrefixKey, sequence: number, year?: number): string {
  const spec = specFor(prefix)

  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new IdFormatError(`sequence must be a positive integer, got ${sequence}`)
  }
  const max = 10 ** spec.digits - 1
  if (sequence > max) {
    // Widening the field would change every existing id, so this is a real
    // capacity ceiling, not a formatting detail. Surface it loudly.
    throw new IdFormatError(
      `${prefix} sequence ${sequence} exceeds the ${spec.digits}-digit field (max ${max})`,
    )
  }

  let id: string
  if (spec.shape === 'catalogue') {
    id = `${spec.prefix}-${pad(sequence, spec.digits)}`
  } else {
    if (year === undefined) {
      throw new IdFormatError(`${prefix} is an event id and requires a year`)
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2099) {
      throw new IdFormatError(`year must be between 2000 and 2099, got ${year}`)
    }
    id = `${spec.prefix}-${pad(year % 100, 2)}-${pad(sequence, spec.digits)}`
  }

  if (id.length > ID_MAX_LENGTH) {
    throw new IdFormatError(`generated id "${id}" exceeds ${ID_MAX_LENGTH} characters`)
  }
  return id
}

const CATALOGUE_RE = /^([A-Z]{3,4})-(\d+)$/
const EVENT_RE = /^([A-Z]{3,4})-(\d{2})-(\d+)$/

/** Parse an identifier, or throw. Rejects anything not in the two shapes. */
export function parseId(id: string): ParsedId {
  if (id.length > ID_MAX_LENGTH) {
    throw new IdFormatError(`"${id}" exceeds ${ID_MAX_LENGTH} characters`)
  }

  const event = EVENT_RE.exec(id)
  if (event) {
    const [, prefix, yy, seq] = event as unknown as [string, string, string, string]
    const spec = PREFIXES[prefix as PrefixKey]
    if (!spec) throw new IdFormatError(`unknown prefix "${prefix}"`)
    if (spec.shape !== 'event') throw new IdFormatError(`${prefix} is not an event id`)
    if (seq.length !== spec.digits) {
      throw new IdFormatError(`${prefix} sequence must be ${spec.digits} digits, got "${seq}"`)
    }
    return { prefix: prefix as PrefixKey, year: 2000 + Number(yy), sequence: Number(seq) }
  }

  const cat = CATALOGUE_RE.exec(id)
  if (cat) {
    const [, prefix, seq] = cat as unknown as [string, string, string]
    const spec = PREFIXES[prefix as PrefixKey]
    if (!spec) throw new IdFormatError(`unknown prefix "${prefix}"`)
    if (spec.shape !== 'catalogue') throw new IdFormatError(`${prefix} requires a year segment`)
    if (seq.length !== spec.digits) {
      throw new IdFormatError(`${prefix} sequence must be ${spec.digits} digits, got "${seq}"`)
    }
    return { prefix: prefix as PrefixKey, sequence: Number(seq) }
  }

  throw new IdFormatError(
    `"${id}" is not a valid identifier — expected TYPE-NNNNN or TYPE-YY-NNNN`,
  )
}

export function isValidId(id: string): boolean {
  try {
    parseId(id)
    return true
  } catch {
    return false
  }
}

// --- recurring cycles -------------------------------------------------------

const PERIOD_RE = /^\d{4}(Q[1-4]|H[12]|M(0[1-9]|1[0-2])|W(0[1-9]|[1-4]\d|5[0-3])|A)$/

/**
 * A cycle id is the duty id plus a period suffix: `OBL-0142.2026Q1`.
 *
 * These exceed ID_MAX_LENGTH by design and are NEVER rendered inline — the UI
 * shows the duty id with a separate period chip (ADR-003, ADR-004).
 */
export function formatCycleId(dutyId: string, period: string): string {
  const parsed = parseId(dutyId)
  if (parsed.prefix !== 'OBL') {
    throw new IdFormatError(`cycles derive from an obligation id, got "${dutyId}"`)
  }
  if (!PERIOD_RE.test(period)) {
    throw new IdFormatError(
      `"${period}" is not a period — expected e.g. 2026Q1, 2026H1, 2026M03, 2026W07, 2026A`,
    )
  }
  return `${dutyId}.${period}`
}

export function parseCycleId(cycleId: string): ParsedCycleId {
  const dot = cycleId.indexOf('.')
  if (dot === -1) throw new IdFormatError(`"${cycleId}" is not a cycle id`)
  const dutyId = cycleId.slice(0, dot)
  const period = cycleId.slice(dot + 1)
  formatCycleId(dutyId, period) // reuse the validation
  return { dutyId, period }
}

export function isCycleId(id: string): boolean {
  try {
    parseCycleId(id)
    return true
  } catch {
    return false
  }
}
