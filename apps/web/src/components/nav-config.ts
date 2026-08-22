import type { LucideIcon } from 'lucide-react'
import type { RoleKey } from '@/types'
import {
  LayoutDashboard, Inbox, ShieldAlert, Library, Activity, FileText,
  Siren, CalendarClock, GitPullRequestArrow, Landmark, DatabaseZap,
  ClipboardCheck, Wrench, FolderArchive, Plug, Settings, Scale, Megaphone, Building2, SearchCheck, MessageSquareWarning,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}
export interface NavGroup {
  header?: string
  items: NavItem[]
}

// EXACT order & grouping from A5. Group headers are literal.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/queue', label: 'My Queue', icon: Inbox },
    ],
  },
  {
    header: 'RISK & CONTROL',
    items: [
      { to: '/risks', label: 'Risk Register', icon: ShieldAlert },
      { to: '/controls', label: 'Control Library', icon: Library },
      { to: '/ccm', label: 'Continuous Control Monitoring', icon: Activity },
      { to: '/policies', label: 'Policies', icon: FileText },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/vendors', label: 'Third Parties', icon: Building2 },
    ],
  },
  {
    header: 'INCIDENTS',
    items: [
      { to: '/incidents', label: 'Incidents', icon: Siren },
      { to: '/fraud', label: 'Fraud Cases', icon: SearchCheck },
      { to: '/whistleblower', label: 'Speak-up', icon: MessageSquareWarning },
    ],
  },
  {
    header: 'COMPLIANCE',
    items: [
      { to: '/obligations', label: 'Obligations', icon: CalendarClock },
      { to: '/reg-change', label: 'Regulatory Change', icon: GitPullRequestArrow },
      { to: '/sources', label: 'Source Library', icon: Scale },
      { to: '/pfrda', label: 'PFRDA Pack', icon: Landmark },
      { to: '/dpdp', label: 'DPDP / Data Governance', icon: DatabaseZap },
    ],
  },
  {
    header: 'AUDIT & ASSURANCE',
    items: [
      { to: '/audits', label: 'Audits', icon: ClipboardCheck },
      { to: '/issues', label: 'Issues & Remediation', icon: Wrench },
      { to: '/evidence', label: 'Evidence Vault', icon: FolderArchive },
    ],
  },
]

export const NAV_BOTTOM: NavItem[] = [
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...NAV_BOTTOM,
]

// Persona-aware navigation. A route is listed against the personas for whom it is
// primary or secondary (the role-relevance matrix in docs/onegrc-ux-audit.md).
// Personas not listed have the item hard-hidden from their sidebar (still reachable
// via command search + deep links). Routes absent from this map are visible to all.
const ALL: RoleKey[] = ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR', 'ADMIN', 'ARC', 'RMC']

// Board committees see only their own remit. The Audit Committee reviews the
// assurance chain — audits, findings, issues (incl. the exception register) and
// the evidence behind them. The Risk Committee reviews exposure — the register,
// the controls that mitigate it, and the incidents that realised it. Neither
// operates the platform, so the working screens (sources, clause pipeline, CCM,
// DPDP casework, integrations) are not offered to them.

export const NAV_VISIBILITY: Record<string, RoleKey[]> = {
  '/': ALL,
  '/queue': ALL,
  '/risks': ['EXEC', 'RISK', 'CCO', 'CTRLOWNER', 'AUDITOR', 'RMC'],
  '/controls': ['EXEC', 'RISK', 'CCO', 'CTRLOWNER', 'AUDITOR', 'RMC'],
  '/ccm': ['EXEC', 'CTRLOWNER', 'AUDITOR'],
  '/policies': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR'],
  // Both committees have a stake: the RCSA cycle is the Risk Committee's
  // re-assessment of exposure, the attestation cycle is an assurance artefact
  // the Audit Committee is reported on.
  '/campaigns': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR', 'ARC', 'RMC'],
  // Outsourcing exposure is a Risk Committee item; the Audit Committee reads it
  // through the audits and findings over the same arrangements.
  '/vendors': ['EXEC', 'RISK', 'CCO', 'CTRLOWNER', 'AUDITOR', 'RMC'],
  '/incidents': ['EXEC', 'RISK', 'CCO', 'CTRLOWNER', 'AUDITOR', 'RMC'],
  // Fraud and speak-up are listed for the personas who could hold a case; what
  // any of them can actually open is decided per case by accessTo(), and the
  // Executive is absent from speak-up because the CRO may be its subject.
  '/fraud': ['RISK', 'CCO', 'CTRLOWNER', 'AUDITOR', 'ARC', 'EXEC'],
  '/whistleblower': ['CCO', 'AUDITOR', 'ARC'],
  '/obligations': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR'],
  '/reg-change': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'AUDITOR'],
  '/sources': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'AUDITOR'],
  '/pfrda': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR', 'ARC', 'RMC'],
  '/dpdp': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR'],
  '/audits': ['EXEC', 'RISK', 'CCO', 'CTRLOWNER', 'AUDITOR', 'ARC'],
  '/issues': ['EXEC', 'RISK', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR', 'ARC'],
  '/evidence': ['EXEC', 'CCO', 'ANALYST', 'CTRLOWNER', 'AUDITOR', 'ARC'],
  '/integrations': ['EXEC', 'ADMIN'],
  '/settings': ALL, // Settings is always in the menu (read-only for non-admins)
}

function visibleTo(to: string, role: RoleKey): boolean {
  // The administrator has full access to every screen.
  if (role === 'ADMIN') return true
  const v = NAV_VISIBILITY[to]
  return v ? v.includes(role) : true
}

/** Sidebar groups filtered to a persona; groups with no visible item are dropped. */
export function navGroupsForRole(role: RoleKey): NavGroup[] {
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => visibleTo(i.to, role)) }))
    .filter((g) => g.items.length > 0)
}

/** Bottom-pinned items filtered to a persona. */
export function navBottomForRole(role: RoleKey): NavItem[] {
  return NAV_BOTTOM.filter((i) => visibleTo(i.to, role))
}
