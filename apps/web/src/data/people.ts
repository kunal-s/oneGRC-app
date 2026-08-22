import type { Person, RoleKey, Department } from '@/types'

// The named 15-person roster (A2). ids are short, stable handles.
// Each roster person carries a primary persona (role). Multiple people back one
// persona; the switcher (ROLES below) picks one representative per persona.
export const PEOPLE: Person[] = [
  { id: 'meera', name: 'Meera Krishnan', title: 'Chief Risk Officer', role: 'EXEC', initials: 'MK', lod: '2LoD', email: 'meera.krishnan@sankalppf.in', department: 'Risk' },
  { id: 'rajesh', name: 'Rajesh Iyer', title: 'Chief Information Security Officer', role: 'CTRLOWNER', initials: 'RI', lod: '2LoD', email: 'rajesh.iyer@sankalppf.in', department: 'IT and Information Security' },
  { id: 'anjali', name: 'Anjali Deshmukh', title: 'Head of Compliance', role: 'CCO', initials: 'AD', lod: '2LoD', email: 'anjali.deshmukh@sankalppf.in', department: 'Compliance and Company Secretarial' },
  { id: 'vikram', name: 'Vikram Rao', title: 'Company Secretary', role: 'CCO', initials: 'VR', lod: '2LoD', email: 'vikram.rao@sankalppf.in', department: 'Compliance and Company Secretarial' },
  { id: 'sunita', name: 'Sunita Menon', title: 'Head of Internal Audit', role: 'AUDITOR', initials: 'SM', lod: '3LoD', email: 'sunita.menon@sankalppf.in', department: 'Internal Audit' },
  { id: 'arvind', name: 'Arvind Patel', title: 'Head of Investment Compliance', role: 'CCO', initials: 'AP', lod: '2LoD', email: 'arvind.patel@sankalppf.in', department: 'Investment Compliance' },
  { id: 'karthik', name: 'Karthik Nair', title: 'SecOps Lead', role: 'CTRLOWNER', initials: 'KN', lod: '1LoD', email: 'karthik.nair@sankalppf.in', department: 'IT and Information Security' },
  { id: 'priya', name: 'Priya Sharma', title: 'DPO / Privacy Lead', role: 'CCO', initials: 'PS', lod: '2LoD', email: 'priya.sharma@sankalppf.in', department: 'Data Protection' },
  { id: 'rohan', name: 'Rohan Gupta', title: 'IT Controls', role: 'CTRLOWNER', initials: 'RG', lod: '1LoD', email: 'rohan.gupta@sankalppf.in', department: 'IT and Information Security' },
  { id: 'deepa', name: 'Deepa Iyer', title: 'GST / Tax', role: 'ANALYST', initials: 'DI', lod: '1LoD', email: 'deepa.iyer@sankalppf.in', department: 'Finance and Tax' },
  { id: 'farhan', name: 'Farhan Ali', title: 'Labour & Secretarial', role: 'ANALYST', initials: 'FA', lod: '1LoD', email: 'farhan.ali@sankalppf.in', department: 'HR and Labour' },
  { id: 'neha', name: 'Neha Joshi', title: 'SOC Analyst', role: 'CTRLOWNER', initials: 'NJ', lod: '1LoD', email: 'neha.joshi@sankalppf.in', department: 'IT and Information Security' },
  { id: 'sanjay', name: 'Sanjay Verma', title: 'Investment Risk', role: 'RISK', initials: 'SV', lod: '1LoD', email: 'sanjay.verma@sankalppf.in', department: 'Risk' },
  { id: 'lakshmi', name: 'Lakshmi Rao', title: 'Internal Auditor', role: 'AUDITOR', initials: 'LR', lod: '3LoD', email: 'lakshmi.rao@sankalppf.in', department: 'Internal Audit' },
  { id: 'imran', name: 'Imran Sheikh', title: 'Platform Administrator', role: 'ADMIN', initials: 'IS', lod: '2LoD', email: 'imran.sheikh@sankalppf.in', department: 'Risk' },
  // ── Sector-allocated research analysts (8) ────────────────────────────────
  // The first line of defence behind the board-approved Investment Research &
  // Review Policy: each owns one sector and must evidence a research review per
  // cycle (twice-weekly for active holdings, annual for the PFRDA top-250
  // universe), tabled at the Investment Sub-Committee (IISC). They sit under the
  // Head of Investment Compliance (arvind); escalation resolves to him.
  { id: 'aditya', name: 'Aditya Kulkarni', title: 'Research Analyst — Banking & Financials', role: 'ANALYST', initials: 'AK', lod: '1LoD', email: 'aditya.kulkarni@sankalppf.in', department: 'Investment Compliance' },
  { id: 'sneha', name: 'Sneha Reddy', title: 'Research Analyst — IT & Technology', role: 'ANALYST', initials: 'SR', lod: '1LoD', email: 'sneha.reddy@sankalppf.in', department: 'Investment Compliance' },
  { id: 'vivek', name: 'Vivek Menon', title: 'Research Analyst — Energy & Utilities', role: 'ANALYST', initials: 'VM', lod: '1LoD', email: 'vivek.menon@sankalppf.in', department: 'Investment Compliance' },
  { id: 'pooja', name: 'Pooja Bhatt', title: 'Research Analyst — FMCG & Consumer', role: 'ANALYST', initials: 'PB', lod: '1LoD', email: 'pooja.bhatt@sankalppf.in', department: 'Investment Compliance' },
  { id: 'rahul', name: 'Rahul Saxena', title: 'Research Analyst — Pharma & Healthcare', role: 'ANALYST', initials: 'RS', lod: '1LoD', email: 'rahul.saxena@sankalppf.in', department: 'Investment Compliance' },
  { id: 'kavya', name: 'Kavya Iyer', title: 'Research Analyst — Auto & Industrials', role: 'ANALYST', initials: 'KI', lod: '1LoD', email: 'kavya.iyer@sankalppf.in', department: 'Investment Compliance' },
  { id: 'manish', name: 'Manish Agarwal', title: 'Research Analyst — Metals & Materials', role: 'ANALYST', initials: 'MA', lod: '1LoD', email: 'manish.agarwal@sankalppf.in', department: 'Investment Compliance' },
  { id: 'divya', name: 'Divya Pillai', title: 'Research Analyst — Infrastructure & Realty', role: 'ANALYST', initials: 'DP', lod: '1LoD', email: 'divya.pillai@sankalppf.in', department: 'Investment Compliance' },
]

export const PEOPLE_BY_ID: Record<string, Person> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
)

export function personName(id: string): string {
  return PEOPLE_BY_ID[id]?.name ?? id
}

export function departmentOfPerson(id?: string): Department | undefined {
  return id ? PEOPLE_BY_ID[id]?.department : undefined
}

// The named department head — the master authority for the department (1.5).
// Set here as the default; E0.5 makes it admin-configurable with an audit trail.
// Pure org facts (no store dependency) so the reminder/escalation engine and the
// access layer can both resolve escalation targets without an import cycle.
export const DEFAULT_DEPARTMENT_HEADS: Record<Department, string> = {
  'Compliance and Company Secretarial': 'anjali',
  'Risk': 'meera',
  'IT and Information Security': 'rajesh',
  'Investment Compliance': 'arvind',
  'Data Protection': 'priya',
  'Finance and Tax': 'deepa',
  'HR and Labour': 'farhan',
  'Internal Audit': 'sunita',
}

export function departmentHeadOf(dept?: Department): string | undefined {
  return dept ? DEFAULT_DEPARTMENT_HEADS[dept] : undefined
}

/** The line manager for escalation = the head of the person's department. */
export function lineManagerOf(personId?: string): string | undefined {
  return departmentHeadOf(departmentOfPerson(personId))
}

// The cross-department escalation owners (1.2): Compliance Officer, then CRO.
export const COMPLIANCE_OFFICER = 'anjali'
export const CRO = 'meera'

/**
 * The checker for a given maker. Line manager first; where the maker *is* the
 * head (or has no department), it falls through the escalation owners. The
 * chain is written so it can never return the maker — separation of duties is
 * a property of the pairing, not something callers have to remember to check.
 */
export function checkerFor(maker: string): string {
  const head = lineManagerOf(maker)
  if (head && head !== maker) return head
  if (maker !== CRO) return CRO
  return COMPLIANCE_OFFICER
}

// The persona switcher. Order is the demo altitude order; EXEC is the default.
// `label` is the persona; `person` is the representative whose queue/identity loads.
export const ROLES: { key: RoleKey; person: string; label: string }[] = [
  { key: 'EXEC', person: 'meera', label: 'Executive' },
  { key: 'RISK', person: 'sanjay', label: 'Risk Manager' },
  { key: 'CCO', person: 'anjali', label: 'Compliance Manager' },
  { key: 'ANALYST', person: 'deepa', label: 'Compliance Analyst' },
  { key: 'CTRLOWNER', person: 'rajesh', label: 'Control Owner' },
  { key: 'AUDITOR', person: 'sunita', label: 'Auditor' },
  { key: 'ADMIN', person: 'imran', label: 'Administrator' },
  // Board-committee audiences, chaired by people who also hold an executive
  // persona (see COMMITTEES in data/committees.ts for the constitutional record).
  { key: 'ARC', person: 'sunita', label: 'Audit Committee Chair' },
  { key: 'RMC', person: 'meera', label: 'Risk Committee Chair' },
]

// The persona switcher options (1.1 / E0.5): one selectable persona per
// department — its named head, the master authority — plus the Executive landing
// and the Administrator. This is what makes every department's scoped view and
// head authority testable in the dropdown. Each persona's RoleKey drives the
// queue/gating; its department drives the access boundary.
export interface PersonaOption {
  /** Unique switcher key. Differs from `id` where one person wears two hats. */
  key: string
  /** The roster person whose identity and department load. */
  id: string
  label: string
  /** Explicit persona role. Absent = the person's own functional role. A
   *  committee chair is the same person under a different mandate, which is why
   *  this overrides rather than forking a duplicate Person. */
  role?: RoleKey
  /** Board committees are a separate audience in the switcher. */
  group?: 'Committee'
}

export const PERSONAS: PersonaOption[] = [
  { key: 'meera', id: 'meera', label: 'Executive · CRO' },
  { key: 'anjali', id: 'anjali', label: 'Compliance Manager' },
  { key: 'arvind', id: 'arvind', label: 'Investment Compliance' },
  { key: 'priya', id: 'priya', label: 'Data Protection Officer' },
  { key: 'rajesh', id: 'rajesh', label: 'IT & Information Security' },
  { key: 'deepa', id: 'deepa', label: 'Finance & Tax' },
  { key: 'farhan', id: 'farhan', label: 'HR & Labour' },
  { key: 'sunita', id: 'sunita', label: 'Internal Audit' },
  { key: 'imran', id: 'imran', label: 'Administrator' },
  // Governance hats. Sunita runs Internal Audit and chairs the Audit Committee;
  // Meera is CRO and chairs the Risk Management Committee. Selecting the hat
  // changes the mandate — the dashboard and what the sidebar offers — not the person.
  { key: 'sunita-arc', id: 'sunita', label: 'Audit Committee Chair', role: 'ARC', group: 'Committee' },
  { key: 'meera-rmc', id: 'meera', label: 'Risk Committee Chair', role: 'RMC', group: 'Committee' },
]

/** The persona entry matching an active (person, role) pair. */
export function personaFor(personId: string, role: RoleKey): PersonaOption {
  return (
    PERSONAS.find((p) => p.id === personId && (p.role ?? PEOPLE_BY_ID[p.id]?.role) === role) ??
    PERSONAS.find((p) => p.id === personId) ??
    PERSONAS[0]
  )
}
