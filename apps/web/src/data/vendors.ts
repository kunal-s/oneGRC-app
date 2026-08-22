// The third-party register.
//
// Named after the arrangements a PFRDA-registered pension fund manager actually
// runs: the CRAs and the NPS Trust sit on the critical path to every subscriber
// transaction, the custodian and fund accountant on every NAV, and a tail of
// technology and professional firms behind those. Material outsourcing is the
// small set at the top — those are the ones with annual diligence, a tested
// exit plan and board visibility.
//
// Nothing here stores a risk tier. `vendorRating` derives it from criticality,
// data access, assurance currency and incident history, so a vendor cannot read
// "low" while its SOC 2 is a year expired.
import type { Control, Incident, Risk, Vendor, VendorAssurance } from '@/types'
import { Rand } from './rng'
import { NOW_MS } from '@/lib/time'

const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => iso(new Date(NOW_MS - n * 86400000))
const daysAhead = (n: number) => iso(new Date(NOW_MS + n * 86400000))

interface Spec {
  name: string
  category: Vendor['category']
  criticality: Vendor['criticality']
  owner: string
  jurisdiction: string
  services: { name: string; criticality: Vendor['criticality']; rto: string }[]
  dataAccess: Vendor['dataAccess']
  subOutsourcing: string[]
  spend: number
  status?: Vendor['status']
  /** Days until the current assurance report expires; negative = already lapsed. */
  assuranceIn: number
  assurance: VendorAssurance['kind'][]
  /** Days since the last completed due diligence; undefined = never. */
  ddDaysAgo?: number
  exitTestedDaysAgo?: number
  rightToAudit?: boolean
  dpa?: boolean
  note?: string
}

// 24 arrangements. The four material ones are deliberately the four a PFM
// cannot operate without.
const SPECS: Spec[] = [
  {
    name: 'Protean eGov Technologies (CRA)',
    category: 'Registrar & CRA',
    criticality: 'Material',
    owner: 'imran',
    jurisdiction: 'India — Mumbai',
    services: [
      { name: 'Central recordkeeping — Tier I & II', criticality: 'Material', rto: '4 hours' },
      { name: 'Subscriber contribution processing', criticality: 'Material', rto: '4 hours' },
      { name: 'PRAN issuance and KYC verification', criticality: 'Important', rto: '8 hours' },
    ],
    dataAccess: ['PRAN', 'KYC', 'Nominee', 'Bank'],
    subOutsourcing: ['AWS Mumbai (ap-south-1)', 'Karvy Data Management (scanning)'],
    spend: 1842,
    assuranceIn: 214,
    assurance: ['ISAE 3402 Type II', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 96,
    exitTestedDaysAgo: 210,
  },
  {
    name: 'KFin Technologies (CRA)',
    category: 'Registrar & CRA',
    criticality: 'Material',
    owner: 'imran',
    jurisdiction: 'India — Hyderabad',
    services: [
      { name: 'Central recordkeeping — Corporate & Government sectors', criticality: 'Material', rto: '4 hours' },
      { name: 'Subscriber servicing and grievance intake', criticality: 'Important', rto: '1 business day' },
    ],
    dataAccess: ['PRAN', 'KYC', 'Nominee'],
    subOutsourcing: ['Microsoft Azure (Central India)'],
    spend: 1176,
    assuranceIn: 41,
    assurance: ['ISAE 3402 Type II', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 148,
    exitTestedDaysAgo: 388,
  },
  {
    name: 'Deutsche Bank AG — Custody Services',
    category: 'Custodian & banking',
    criticality: 'Material',
    owner: 'arvind',
    jurisdiction: 'India — Mumbai',
    services: [
      { name: 'Securities custody — Scheme E / C / G / A', criticality: 'Material', rto: '2 hours' },
      { name: 'Trade settlement and corporate actions', criticality: 'Material', rto: '4 hours' },
      { name: 'Daily NAV reconciliation feed', criticality: 'Important', rto: '8 hours' },
    ],
    dataAccess: ['Financial'],
    subOutsourcing: ['Clearing Corporation of India (CCIL)'],
    spend: 2314,
    assuranceIn: 168,
    assurance: ['ISAE 3402 Type II', 'SOC 2 Type II'],
    ddDaysAgo: 71,
    exitTestedDaysAgo: 154,
  },
  {
    name: 'Amazon Web Services India',
    category: 'Technology & cloud',
    criticality: 'Material',
    owner: 'rohan',
    jurisdiction: 'India — ap-south-1 (Mumbai)',
    services: [
      { name: 'Production hosting — fund accounting and portal', criticality: 'Material', rto: '2 hours' },
      { name: 'Backup and disaster recovery — ap-south-2', criticality: 'Material', rto: '6 hours' },
      { name: 'Managed database and object storage', criticality: 'Important', rto: '4 hours' },
    ],
    dataAccess: ['PRAN', 'KYC', 'Financial', 'Bank'],
    subOutsourcing: [],
    spend: 1493,
    assuranceIn: 121,
    assurance: ['SOC 2 Type II', 'ISO/IEC 27001:2022', 'PCI DSS AoC'],
    ddDaysAgo: 118,
    exitTestedDaysAgo: 265,
    note: '78% of the estate sits in a single region — the concentration KRI reads off this arrangement.',
  },
  {
    name: 'Sundaram Fund Accounting Services',
    category: 'Professional services',
    criticality: 'Important',
    owner: 'deepa',
    jurisdiction: 'India — Chennai',
    services: [
      { name: 'Daily NAV computation and validation', criticality: 'Material', rto: '4 hours' },
      { name: 'Scheme financial statement preparation', criticality: 'Standard', rto: '3 business days' },
    ],
    dataAccess: ['Financial'],
    subOutsourcing: [],
    spend: 638,
    assuranceIn: -47,
    assurance: ['ISAE 3402 Type II'],
    ddDaysAgo: 402,
    exitTestedDaysAgo: undefined,
    note: 'Assurance lapsed and diligence overdue on a vendor carrying a material service.',
  },
  {
    name: 'Splunk Services India',
    category: 'Security services',
    criticality: 'Important',
    owner: 'karthik',
    jurisdiction: 'India — Bengaluru',
    services: [{ name: 'SIEM platform and log retention (180 days, in-India)', criticality: 'Important', rto: '8 hours' }],
    dataAccess: [],
    subOutsourcing: ['AWS Mumbai (ap-south-1)'],
    spend: 412,
    assuranceIn: 233,
    assurance: ['SOC 2 Type II', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 132,
  },
  {
    name: 'CrowdStrike India',
    category: 'Security services',
    criticality: 'Important',
    owner: 'karthik',
    jurisdiction: 'United States — with in-India telemetry store',
    services: [{ name: 'Endpoint detection and response', criticality: 'Important', rto: '4 hours' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 287,
    assuranceIn: 289,
    assurance: ['SOC 2 Type II', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 74,
  },
  {
    name: 'Qualys India',
    category: 'Security services',
    criticality: 'Standard',
    owner: 'rohan',
    jurisdiction: 'India — Pune',
    services: [{ name: 'Vulnerability scanning and patch reporting', criticality: 'Standard', rto: '1 business day' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 96,
    assuranceIn: 176,
    assurance: ['SOC 2 Type II'],
    ddDaysAgo: 208,
  },
  {
    name: 'Okta Identity India',
    category: 'Technology & cloud',
    criticality: 'Important',
    owner: 'rohan',
    jurisdiction: 'Singapore — regional tenancy',
    services: [{ name: 'Workforce identity and MFA', criticality: 'Material', rto: '2 hours' }],
    dataAccess: [],
    subOutsourcing: ['AWS Singapore (ap-southeast-1)'],
    spend: 218,
    assuranceIn: 19,
    assurance: ['SOC 2 Type II', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 163,
    note: 'Identity outside India for an in-India regulated entity — the localisation question sits on this one.',
  },
  {
    name: 'OneTrust Technology India',
    category: 'Technology & cloud',
    criticality: 'Standard',
    owner: 'priya',
    jurisdiction: 'India — Bengaluru',
    services: [{ name: 'Consent management and DSAR workflow', criticality: 'Important', rto: '8 hours' }],
    dataAccess: ['PRAN', 'KYC'],
    subOutsourcing: [],
    spend: 154,
    assuranceIn: 198,
    assurance: ['SOC 2 Type II', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 87,
  },
  {
    name: 'TeamLease RegTech',
    category: 'Data & market feeds',
    criticality: 'Standard',
    owner: 'anjali',
    jurisdiction: 'India — Bengaluru',
    services: [{ name: 'Statutory obligation and compliance-change feed', criticality: 'Important', rto: '1 business day' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 74,
    assuranceIn: 147,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 121,
  },
  {
    name: 'Lexplosion Solutions (Komrisk)',
    category: 'Data & market feeds',
    criticality: 'Standard',
    owner: 'farhan',
    jurisdiction: 'India — Kolkata',
    services: [{ name: 'Labour and secretarial compliance tracking', criticality: 'Standard', rto: '2 business days' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 47,
    assuranceIn: 63,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 244,
  },
  {
    name: 'IRIS Business Services (GST)',
    category: 'Professional services',
    criticality: 'Standard',
    owner: 'deepa',
    jurisdiction: 'India — Navi Mumbai',
    services: [{ name: 'GSTR-1 / 3B preparation and filing', criticality: 'Important', rto: '1 business day' }],
    dataAccess: ['Financial'],
    subOutsourcing: [],
    spend: 63,
    assuranceIn: 91,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 154,
  },
  {
    name: 'Aneja Associates — Internal Audit co-source',
    category: 'Professional services',
    criticality: 'Important',
    owner: 'sunita',
    jurisdiction: 'India — Mumbai',
    services: [{ name: 'Co-sourced internal audit execution', criticality: 'Important', rto: 'n/a' }],
    dataAccess: ['Financial'],
    subOutsourcing: [],
    spend: 212,
    assuranceIn: 172,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 108,
  },
  {
    name: 'Netrika Consulting — CERT-In empanelled auditor',
    category: 'Professional services',
    criticality: 'Important',
    owner: 'rajesh',
    jurisdiction: 'India — Gurugram',
    services: [{ name: 'Annual IS audit under CERT-In empanelment', criticality: 'Important', rto: 'n/a' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 138,
    assuranceIn: 256,
    assurance: ['CERT-In empanelled audit', 'ISO/IEC 27001:2022'],
    ddDaysAgo: 62,
  },
  {
    name: 'CAMS Insurance Repository — printing & dispatch',
    category: 'BPO & facilities',
    criticality: 'Standard',
    owner: 'imran',
    jurisdiction: 'India — Chennai',
    services: [{ name: 'Statement printing and physical dispatch', criticality: 'Standard', rto: '3 business days' }],
    dataAccess: ['PRAN', 'Nominee'],
    subOutsourcing: ['Blue Dart Express (logistics)'],
    spend: 118,
    assuranceIn: -122,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 318,
    note: 'Handles subscriber PII in physical form with lapsed assurance.',
  },
  {
    name: 'Tata Communications — MPLS & connectivity',
    category: 'Technology & cloud',
    criticality: 'Important',
    owner: 'rohan',
    jurisdiction: 'India — Mumbai',
    services: [{ name: 'Primary and secondary network connectivity', criticality: 'Material', rto: '4 hours' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 336,
    assuranceIn: 204,
    assurance: ['ISO/IEC 27001:2022', 'SOC 2 Type II'],
    ddDaysAgo: 139,
    exitTestedDaysAgo: 96,
  },
  {
    name: 'Sify Technologies — DR co-location',
    category: 'Technology & cloud',
    criticality: 'Important',
    owner: 'rohan',
    jurisdiction: 'India — Noida',
    services: [{ name: 'Disaster-recovery co-location', criticality: 'Material', rto: '6 hours' }],
    dataAccess: ['Financial'],
    subOutsourcing: [],
    spend: 264,
    assuranceIn: 87,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 191,
    exitTestedDaysAgo: 47,
  },
  {
    name: 'Karvy Data Management — document scanning',
    category: 'BPO & facilities',
    criticality: 'Standard',
    owner: 'imran',
    jurisdiction: 'India — Hyderabad',
    services: [{ name: 'Subscriber form digitisation', criticality: 'Standard', rto: '3 business days' }],
    dataAccess: ['PRAN', 'KYC', 'Nominee', 'Bank'],
    subOutsourcing: [],
    spend: 89,
    assuranceIn: 34,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 176,
  },
  {
    name: 'CRISIL — benchmark and valuation feeds',
    category: 'Data & market feeds',
    criticality: 'Important',
    owner: 'sanjay',
    jurisdiction: 'India — Mumbai',
    services: [{ name: 'Debt valuation and benchmark indices', criticality: 'Material', rto: '4 hours' }],
    dataAccess: ['Financial'],
    subOutsourcing: [],
    spend: 291,
    assuranceIn: 226,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 84,
  },
  {
    name: 'ICRA Analytics — credit research',
    category: 'Data & market feeds',
    criticality: 'Standard',
    owner: 'sanjay',
    jurisdiction: 'India — Gurugram',
    services: [{ name: 'Issuer credit research and ratings feed', criticality: 'Standard', rto: '1 business day' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 108,
    assuranceIn: 143,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 231,
  },
  {
    name: 'Randstad India — contract staffing',
    category: 'BPO & facilities',
    criticality: 'Standard',
    owner: 'farhan',
    jurisdiction: 'India — Mumbai',
    services: [{ name: 'Contract operations staffing', criticality: 'Standard', rto: 'n/a' }],
    dataAccess: [],
    subOutsourcing: [],
    spend: 176,
    assuranceIn: 112,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 267,
    rightToAudit: false,
  },
  {
    name: 'Zeta Cloud Payments',
    category: 'Technology & cloud',
    criticality: 'Standard',
    owner: 'rohan',
    jurisdiction: 'India — Bengaluru',
    services: [{ name: 'Contribution payment gateway', criticality: 'Important', rto: '4 hours' }],
    dataAccess: ['Bank', 'PRAN'],
    subOutsourcing: ['Google Cloud (Mumbai)'],
    spend: 143,
    status: 'Onboarding',
    assuranceIn: 302,
    assurance: ['PCI DSS AoC', 'SOC 2 Type II'],
    ddDaysAgo: undefined,
    note: 'In onboarding — diligence has not yet been completed.',
  },
  {
    name: 'Mahindra Logistics — records archival',
    category: 'BPO & facilities',
    criticality: 'Standard',
    owner: 'imran',
    jurisdiction: 'India — Pune',
    services: [{ name: 'Off-site physical records archival', criticality: 'Standard', rto: '5 business days' }],
    dataAccess: ['PRAN', 'KYC'],
    subOutsourcing: [],
    spend: 52,
    status: 'Exiting',
    assuranceIn: -18,
    assurance: ['ISO/IEC 27001:2022'],
    ddDaysAgo: 289,
    note: 'Exit in progress after the last diligence flagged uncontrolled access to physical files.',
  },
]

const ASSURANCE_REF: Record<VendorAssurance['kind'], (r: Rand) => string> = {
  'SOC 2 Type II': (r) => `SOC2-II-${r.int(2024, 2026)}-${r.int(1000, 9999)}`,
  'ISO/IEC 27001:2022': (r) => `IS ${r.int(600000, 799999)}`,
  'ISAE 3402 Type II': (r) => `ISAE3402-${r.int(2024, 2026)}-${r.int(100, 999)}`,
  'CERT-In empanelled audit': (r) => `CERTIN/EMP/${r.int(2024, 2026)}/${r.int(100, 999)}`,
  'PCI DSS AoC': (r) => `AOC-${r.int(2024, 2026)}-${r.int(10000, 99999)}`,
}

export function buildVendors(risks: Risk[], controls: Control[], incidents: Incident[]): Vendor[] {
  const r = new Rand(7731)
  const tprRisks = risks.filter((x) => x.domain === 'ThirdParty')
  const vendorControls = controls.filter((c) => /vendor|third.?party|outsourc|supplier|contract/i.test(c.title))
  const vendorIncidents = incidents.filter((i) => /vendor|supplier|third.?party|portal credential/i.test(i.title))

  return SPECS.map((s, i) => {
    const id = `VND-${String(i * 3 + 11).padStart(4, '0')}`
    // Older reports sit behind the current one, so a vendor has a history, not
    // a single certificate.
    const assurance: VendorAssurance[] = s.assurance.map((kind, k) => {
      const expiresIn = s.assuranceIn - k * 30
      return {
        kind,
        reference: ASSURANCE_REF[kind](r),
        issuedOn: iso(new Date(NOW_MS + (expiresIn - 365) * 86400000)),
        expiresOn: expiresIn >= 0 ? daysAhead(expiresIn) : daysAgo(-expiresIn),
        qualifications:
          k === 0 && expiresIn < 60
            ? 'Two exceptions carried forward on logical access review; management response accepted.'
            : undefined,
      }
    })

    // Every vendor links to at least one third-party risk and one control, so
    // no record is an island.
    const linkedRisks = tprRisks.length ? [tprRisks[i % tprRisks.length].id, ...(s.criticality === 'Material' ? [tprRisks[(i + 5) % tprRisks.length].id] : [])] : []
    const linkedControls = vendorControls.length
      ? Array.from(new Set([vendorControls[i % vendorControls.length].id, controls[(i * 17) % controls.length].id]))
      : [controls[(i * 17) % controls.length].id]
    const linkedIncidents = vendorIncidents.length && i % 4 === 1 ? [vendorIncidents[i % vendorIncidents.length].id] : []

    return {
      id,
      name: s.name,
      category: s.category,
      criticality: s.criticality,
      status: s.status ?? 'Active',
      owner: s.owner,
      services: s.services.map((svc) => ({ ...svc, linkedControls: linkedControls.slice(0, 1) })),
      contractRef: `SPF/OUT/${2023 + (i % 3)}/${String(i * 7 + 19).padStart(3, '0')}`,
      contractStart: daysAgo(r.int(420, 1240)),
      contractEnd: daysAhead(r.int(38, 880)),
      annualSpendLakh: s.spend,
      jurisdiction: s.jurisdiction,
      dataAccess: s.dataAccess,
      subOutsourcing: s.subOutsourcing,
      assurance,
      exitPlan: {
        // Material outsourcing must carry a documented exit plan; the gap on
        // the fund accountant is a real finding, not an oversight in the seed.
        documented: s.criticality === 'Material' || s.exitTestedDaysAgo !== undefined,
        testedOn: s.exitTestedDaysAgo !== undefined ? daysAgo(s.exitTestedDaysAgo) : undefined,
        rto: s.services[0]?.rto ?? 'n/a',
      },
      rightToAudit: s.rightToAudit ?? true,
      dataProcessingAgreement: s.dataAccess.length > 0 ? s.name !== 'CAMS Insurance Repository — printing & dispatch' : true,
      linkedRisks,
      linkedIncidents,
      linkedControls,
      onboardedOn: daysAgo(r.int(430, 2100)),
      lastDueDiligenceOn: s.ddDaysAgo !== undefined ? daysAgo(s.ddDaysAgo) : undefined,
      dueDiligenceFrequency: s.criticality === 'Material' ? 'Annual' : s.criticality === 'Important' ? 'Annual' : 'Biennial',
    }
  })
}

/** Attach the current assurance reports to real Evidence Vault items. */
export function bindVendorAssurance(vendors: Vendor[], evidence: { id: string; type: string }[]): void {
  const attestations = evidence.filter((e) => e.type === 'Attestation' || e.type === 'Config export')
  let i = 0
  for (const v of vendors) {
    for (const a of v.assurance) {
      a.evidenceId = attestations[i % Math.max(1, attestations.length)]?.id
      i += 3
    }
  }
}
