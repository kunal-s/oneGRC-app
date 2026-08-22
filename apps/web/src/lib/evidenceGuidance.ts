// Expected-evidence guidance (E3.3). What "good proof" looks like for a duty, so
// a maker knows what to attach — acceptance criteria, worked examples, and a few
// mock sample templates. Keyed by the control the evidence proves, with a
// fallback by evidence type. Scripted/deterministic; samples are mocked artifacts.
import type { Evidence } from '@/types'

export interface EvidenceSample {
  filename: string
  label: string
}
export interface EvidenceGuidance {
  criteria: string
  examples: string[]
  samples: EvidenceSample[]
}

// Per-control guidance for the worked compliance controls.
const BY_CONTROL: Record<string, EvidenceGuidance> = {
  'CTRL-COMP-PT-01': {
    criteria: 'Proof that profession tax was deducted at the Schedule I slabs, deposited with the State by the due date, and the return filed.',
    examples: [
      'Monthly PT challan (payment acknowledgement) showing the CIN and amount paid',
      'Payroll PT deduction register for the period at the Schedule I slabs',
      'Filed PT return acknowledgement from the MahaGST portal',
    ],
    samples: [
      { filename: 'PT-challan-sample.pdf', label: 'PT challan (sample)' },
      { filename: 'PT-deduction-register-sample.xlsx', label: 'Deduction register (sample)' },
    ],
  },
  'CTRL-COMP-DPB-01': {
    criteria: 'Proof the breach-notification runbook can operate — intimation to the DPDP Board and to CERT-In within their windows, with timestamps.',
    examples: [
      'Signed breach-notification runbook with the CERT-In 6-hour and DPDP Board steps',
      'Tabletop / drill record showing the intimation drafted within the window',
    ],
    samples: [{ filename: 'breach-runbook-sample.pdf', label: 'Breach runbook (sample)' }],
  },
  'CTRL-COMP-SEC-01': {
    criteria: 'Proof that subscriber personal data is encrypted with access controlled and monitored on the CRA / KYC stores.',
    examples: ['Encryption & access-control configuration export', 'Access recertification attestation for the period'],
    samples: [{ filename: 'kyc-encryption-config-sample.json', label: 'Config export (sample)' }],
  },
  'CTRL-COMP-INV-01': {
    criteria: 'Proof the approved-universe and exposure limits were checked and the review minuted at the Investment Committee.',
    examples: ['Investment Committee minutes recording the holdings review', 'Exposure-limit monitoring report for the period'],
    samples: [{ filename: 'invcom-minutes-sample.pdf', label: 'Committee minutes (sample)' }],
  },
  'CTRL-COMP-LOG-01': {
    criteria: 'Proof of 180-day in-India log retention and NTP clock synchronisation across the SIEM and EDR feeds.',
    examples: ['Log-retention configuration export (180-day, in-region)', 'NTP synchronisation attestation'],
    samples: [{ filename: 'log-retention-config-sample.txt', label: 'Retention config (sample)' }],
  },
}

// Fallback by the evidence type when the control has no specific guidance.
const BY_TYPE: Record<Evidence['type'], EvidenceGuidance> = {
  'Filing ack': {
    criteria: 'The regulator or portal acknowledgement for the filing — reference number, date and the filing entity.',
    examples: ['Portal acknowledgement / receipt showing the reference number and date'],
    samples: [{ filename: 'filing-acknowledgement-sample.pdf', label: 'Filing acknowledgement (sample)' }],
  },
  Attestation: {
    criteria: 'A signed attestation by the accountable owner that the control operated for the period, with the date.',
    examples: ['Signed attestation naming the control, period and owner'],
    samples: [{ filename: 'attestation-sample.pdf', label: 'Attestation (sample)' }],
  },
  Log: {
    criteria: 'A log export covering the period that demonstrates the control operated, with timestamps.',
    examples: ['Time-stamped log export for the period from the source system'],
    samples: [{ filename: 'log-export-sample.csv', label: 'Log export (sample)' }],
  },
  'Config export': {
    criteria: 'A configuration export showing the control setting is in place, dated and from the named system.',
    examples: ['Configuration baseline export from the source system'],
    samples: [{ filename: 'config-export-sample.json', label: 'Config export (sample)' }],
  },
  Screenshot: {
    criteria: 'A dated console screenshot evidencing the control state, with the system and user visible.',
    examples: ['Console screenshot showing the setting and the date'],
    samples: [{ filename: 'screenshot-sample.png', label: 'Screenshot (sample)' }],
  },
}

/** Guidance for what evidence should look like, given the control it proves and
 *  (as a fallback) the evidence type. */
export function expectedEvidence(opts: { controlId?: string; type?: Evidence['type'] }): EvidenceGuidance {
  if (opts.controlId && BY_CONTROL[opts.controlId]) return BY_CONTROL[opts.controlId]
  if (opts.type && BY_TYPE[opts.type]) return BY_TYPE[opts.type]
  return BY_TYPE['Filing ack']
}
