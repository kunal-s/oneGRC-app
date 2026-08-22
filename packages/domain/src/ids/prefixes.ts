/**
 * The identifier prefix registry — ADR-003, spec §7.4 (v2.1).
 *
 * Two shapes, and no third:
 *   catalogue  TYPE-NNNNN      standing records; no year
 *   event      TYPE-YY-NNNN    records a regulator or an auditor cites by year
 *
 * There are deliberately no semantic middle segments. The prototype's
 * `SRC-PFRDA-INV-COMMITTEE` (23 chars) put system key, legal citation and
 * description into one string; meaning now lives in `title`, `shortTitle` and
 * `citation`, and the id is only a key (spec §23 D-11).
 *
 * Every id fits ID_MAX_LENGTH so a table's id column can be fixed-width and
 * never reflow — the layout defect that motivated the change.
 */

export const ID_MAX_LENGTH = 11

export type IdShape = 'catalogue' | 'event'

export interface PrefixSpec {
  /** The 3-4 char uppercase type prefix. */
  readonly prefix: string
  readonly shape: IdShape
  /** Zero-padded width of the sequence segment. */
  readonly digits: number
  /** What the prefix identifies, for error messages and docs. */
  readonly entity: string
}

/**
 * Two-character prefixes were promoted to three (WB→WBR, AP→APE, DA→DAS,
 * WP→WPR, DSAR→DSR) so every id column aligns.
 */
export const PREFIXES = {
  // --- catalogue: standing records ---
  INST: { prefix: 'INST', shape: 'catalogue', digits: 3, entity: 'Source instrument' },
  SRC: { prefix: 'SRC', shape: 'catalogue', digits: 5, entity: 'Source clause' },
  POL: { prefix: 'POL', shape: 'catalogue', digits: 3, entity: 'Policy' },
  CTRL: { prefix: 'CTRL', shape: 'catalogue', digits: 4, entity: 'Control' },
  OBL: { prefix: 'OBL', shape: 'catalogue', digits: 4, entity: 'Obligation (standing duty)' },
  TSK: { prefix: 'TSK', shape: 'catalogue', digits: 5, entity: 'Task' },
  EVD: { prefix: 'EVD', shape: 'catalogue', digits: 5, entity: 'Evidence' },
  RISK: { prefix: 'RISK', shape: 'catalogue', digits: 4, entity: 'Risk' },
  ACT: { prefix: 'ACT', shape: 'catalogue', digits: 4, entity: 'Remediation action' },
  KRI: { prefix: 'KRI', shape: 'catalogue', digits: 3, entity: 'Key risk indicator' },
  VND: { prefix: 'VND', shape: 'catalogue', digits: 3, entity: 'Third party' },
  CMP: { prefix: 'CMP', shape: 'catalogue', digits: 3, entity: 'Campaign' },
  DAS: { prefix: 'DAS', shape: 'catalogue', digits: 3, entity: 'Data asset' },
  WPR: { prefix: 'WPR', shape: 'catalogue', digits: 5, entity: 'Working paper' },
  PCK: { prefix: 'PCK', shape: 'catalogue', digits: 3, entity: 'Committee pack' },
  LOG: { prefix: 'LOG', shape: 'catalogue', digits: 7, entity: 'Audit log entry' },

  // --- event: cited by year ---
  INC: { prefix: 'INC', shape: 'event', digits: 4, entity: 'Incident' },
  ISS: { prefix: 'ISS', shape: 'event', digits: 4, entity: 'Issue' },
  EXC: { prefix: 'EXC', shape: 'event', digits: 3, entity: 'Exception' },
  AUD: { prefix: 'AUD', shape: 'event', digits: 3, entity: 'Audit' },
  APE: { prefix: 'APE', shape: 'event', digits: 3, entity: 'Audit plan entry' },
  FND: { prefix: 'FND', shape: 'event', digits: 3, entity: 'Audit finding' },
  RCM: { prefix: 'RCM', shape: 'event', digits: 3, entity: 'Regulatory change' },
  FRD: { prefix: 'FRD', shape: 'event', digits: 3, entity: 'Fraud case' },
  WBR: { prefix: 'WBR', shape: 'event', digits: 3, entity: 'Speak-up report' },
  DSR: { prefix: 'DSR', shape: 'event', digits: 3, entity: 'Data-subject request' },
} as const satisfies Record<string, PrefixSpec>

export type PrefixKey = keyof typeof PREFIXES

export const ALL_PREFIXES = Object.keys(PREFIXES) as PrefixKey[]

export function specFor(prefix: PrefixKey): PrefixSpec {
  return PREFIXES[prefix]
}

/** The widest id this prefix can ever produce. Asserted <= ID_MAX_LENGTH in tests. */
export function maxLengthFor(prefix: PrefixKey): number {
  const s = PREFIXES[prefix]
  // catalogue: PREFIX + '-' + digits
  // event:     PREFIX + '-' + 2 (year) + '-' + digits
  return s.shape === 'catalogue'
    ? s.prefix.length + 1 + s.digits
    : s.prefix.length + 1 + 2 + 1 + s.digits
}
