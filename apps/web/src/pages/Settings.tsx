import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, Layers, Timer, GitMerge, Plug, Database, Bell, ScrollText,
  Pencil, UserPlus, CheckCircle2, ShieldCheck, ShieldAlert, ExternalLink, Server, X,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPill } from '@/components/FrameworkPill'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/Drawer'
import { cn } from '@/lib/utils'
import { PEOPLE, personName, DEFAULT_DEPARTMENT_HEADS } from '@/data/people'
import { DEPARTMENTS } from '@/lib/access'
import { fmtRelative, fmtIST, minsFromNow } from '@/lib/time'
import { inCrore, inGroup } from '@/lib/format'
import { resolveEntity } from '@/lib/entity'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { reminderAuditRows } from '@/lib/reminders'
import { riskReminderAuditRows } from '@/lib/riskWorkflow'
import { exceptionAuditRows } from '@/lib/exceptions'
import { kriAuditRows } from '@/lib/kri'
import { campaignAuditRows } from '@/lib/campaigns'
import { vendorAuditRows } from '@/lib/vendors'
import { wbAuditRows } from '@/lib/whistleblower'
import { fraudAuditRows } from '@/lib/fraud'
import type { Person } from '@/types'
import {
  ORG, ROLE_DEFS, ROLE_LABEL, FRAMEWORKS, TOTAL_CONTROLS, REG_CLOCKS, MC_ROWS,
  INTEGRATIONS, RETENTION_CARDS, DEFAULT_NOTIFS, buildAuditLog, userMeta, usersMissingMeta,
  type AuditLogRow,
} from './settings/settingsData'
import { MODULES, roleMatrix, sodRules, type PermissionLevel } from './settings/roleMatrix'

// Hoisted above the sections that read it — the users table counts a person's
// trail entries from here.
const AUDIT_LOG = buildAuditLog()

const LOD_LABEL: Record<string, string> = { '1LoD': '1st line', '2LoD': '2nd line', '3LoD': '3rd line' }

const SECTIONS = [
  { key: 'org', label: 'Organisation', icon: Building2 },
  { key: 'users', label: 'Users & Roles', icon: Users },
  { key: 'frameworks', label: 'Frameworks & Libraries', icon: Layers },
  { key: 'regulators', label: 'Regulators & Clocks', icon: Timer },
  { key: 'workflow', label: 'Maker-Checker & Workflow', icon: GitMerge },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'retention', label: 'Data Retention & Privacy', icon: Database },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'audit', label: 'Audit Log', icon: ScrollText },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

// ── small UI atoms ──────────────────────────────────────────────────────────
function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      title={disabled ? 'Only the Administrator persona can change platform configuration.' : undefined}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50', on ? 'bg-primary' : 'bg-border')}
    >
      <span className={cn('inline-block size-4 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

const NOT_ADMIN_TITLE = 'Only the Administrator persona can change platform configuration.'

function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('card-surface p-4', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  )
}

// ── 1 · Organisation ────────────────────────────────────────────────────────
function OrganisationSection() {
  const pushToast = useApp((s) => s.pushToast)
  const canConfig = useCanAct({ kind: 'admin.configure' })
  const [edit, setEdit] = React.useState(false)
  return (
    <>
      <Card
        title="Organisation profile"
        action={
          <Button variant="outline" size="sm" disabled={!canConfig} title={canConfig ? undefined : NOT_ADMIN_TITLE} onClick={() => setEdit(true)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Legal entity" value={ORG.name} />
          <Field label="Entity type" value={ORG.entityType} />
          <Field label="Parent" value={ORG.parent} />
          <Field label="PFRDA registration" value={<span className="font-mono">{ORG.pfrdaReg}</span>} />
          <Field label="CIN" value={<span className="font-mono">{ORG.cin}</span>} />
          <Field label="PAN" value={<span className="font-mono">{ORG.pan}</span>} />
          <Field label="GSTIN" value={<span className="font-mono">{ORG.gstin}</span>} />
          <Field label="Registered office" value={ORG.office} />
          <Field label="Financial-year close" value={ORG.fyClose} />
          <Field label="NPS schemes managed" value={ORG.schemes} />
          <Field label="Assets under management" value={inCrore(ORG.aumCrore)} />
          <Field label="Subscribers" value={inGroup(ORG.subscribers)} />
        </div>
      </Card>
      <Drawer
        open={edit}
        onClose={() => setEdit(false)}
        title="Edit organisation profile"
        subtitle={ORG.name}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdit(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { pushToast({ title: 'Saved', description: 'Organisation profile updated.', variant: 'success' }); setEdit(false) }}>Save changes</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {[
            ['Legal entity', ORG.name],
            ['Registered office', ORG.office],
            ['PFRDA registration', ORG.pfrdaReg],
            ['Financial-year close', ORG.fyClose],
          ].map(([l, v]) => (
            <label key={l} className="block">
              <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{l}</span>
              <input defaultValue={v} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
          ))}
          <p className="text-2xs text-muted-foreground">AUM and subscriber counts are synced from NPS Trust / CRA and are read-only here.</p>
        </div>
      </Drawer>
    </>
  )
}

// ── 2 · Users & Roles ───────────────────────────────────────────────────────
function UsersRolesSection() {
  const pushToast = useApp((s) => s.pushToast)
  const recordAction = useApp((s) => s.recordAction)
  const canConfig = useCanAct({ kind: 'admin.configure' })
  const [invite, setInvite] = React.useState(false)
  const [selected, setSelected] = React.useState<string | null>(null)
  const sessionLog = useApp((s) => s.auditLog)

  // How many trail entries name this person — the "access control AND audit
  // trail" link, counted across the seeded history and the session log.
  const auditCountFor = React.useCallback(
    (personId: string) =>
      AUDIT_LOG.filter((r) => r.actor === personId).length + sessionLog.filter((e) => e.actor === personId).length,
    [sessionLog],
  )

  const changeHead = (dept: string) => {
    recordAction({ action: `Department-head change requested · ${dept}`, detail: 'Routed to maker-checker; current head retained until approved.' })
    pushToast({ title: 'Sent for approval', description: `Department-head change for ${dept} routed to maker-checker.`, variant: 'success' })
  }

  const columns: Column<Person>[] = [
    {
      key: 'name', header: 'Name', sortValue: (p) => p.name,
      render: (p) => <span className="inline-flex items-center gap-2"><Avatar id={p.id} size={22} /><span className="text-sm text-foreground">{p.name}</span></span>,
    },
    { key: 'title', header: 'Title', sortValue: (p) => p.title, render: (p) => <span className="text-xs text-foreground">{p.title}</span> },
    {
      key: 'department', header: 'Department', sortValue: (p) => p.department,
      render: (p) => (
        <span className="inline-flex items-center gap-1 text-xs text-foreground">
          {p.department}
          {DEFAULT_DEPARTMENT_HEADS[p.department] === p.id && <span className="rounded bg-accent/15 px-1 py-0 text-2xs font-medium text-accent-foreground">head</span>}
        </span>
      ),
    },
    {
      key: 'role', header: 'Access role', sortValue: (p) => ROLE_LABEL[p.role],
      render: (p) => <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">{ROLE_LABEL[p.role]}</span>,
    },
    { key: 'email', header: 'Email', sortValue: (p) => p.email, render: (p) => <span className="text-2xs text-muted-foreground">{p.email}</span> },
    { key: 'lod', header: 'Line of defence', sortValue: (p) => p.lod, render: (p) => <span className="text-xs text-muted-foreground">{LOD_LABEL[p.lod]}</span> },
    {
      key: 'mfa', header: 'MFA', align: 'center', sortValue: (p) => (userMeta(p.id).mfa ? 0 : 1),
      render: (p) =>
        userMeta(p.id).mfa ? (
          <ShieldCheck className="mx-auto size-3.5 text-ok" aria-label="MFA enabled" />
        ) : (
          <ShieldAlert className="mx-auto size-3.5 text-critical" aria-label="MFA not enabled" />
        ),
    },
    {
      key: 'status', header: 'Status', sortValue: (p) => userMeta(p.id).status,
      render: (p) => {
        const s = userMeta(p.id).status
        return <StatusChip status={s} tone={s === 'Active' ? 'ok' : s === 'Suspended' ? 'danger' : s === 'Away' ? 'warn' : 'info'} />
      },
    },
    {
      key: 'last', header: 'Last login (IST)', sortValue: (p) => userMeta(p.id).lastMins,
      render: (p) => {
        const at = minsFromNow(-userMeta(p.id).lastMins)
        return <span className="text-xs text-muted-foreground" title={fmtIST(at)}>{fmtRelative(at)}</span>
      },
    },
    {
      key: 'activity', header: 'Audit trail', align: 'right',
      sortValue: (p) => -auditCountFor(p.id),
      render: (p) => <span className="text-2xs tnum text-info">{auditCountFor(p.id)} entries</span>,
    },
  ]

  const missingMeta = usersMissingMeta(PEOPLE.map((p) => p.id))
  const mfaGaps = PEOPLE.filter((p) => !userMeta(p.id).mfa).length
  const suspended = PEOPLE.filter((p) => userMeta(p.id).status === 'Suspended').length

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Users <span className="font-normal text-muted-foreground">· {PEOPLE.length} on the platform</span>
          </h3>
          <div className="flex items-center gap-2 text-2xs">
            {mfaGaps > 0 && (
              <span className="rounded border border-critical/30 bg-critical-soft px-2 py-1 font-medium tnum text-critical">{mfaGaps} without MFA</span>
            )}
            {suspended > 0 && (
              <span className="rounded border border-border bg-muted px-2 py-1 font-medium tnum text-muted-foreground">{suspended} suspended</span>
            )}
            <Button variant="outline" size="sm" disabled={!canConfig} title={canConfig ? undefined : NOT_ADMIN_TITLE} onClick={() => setInvite(true)}>
              <UserPlus className="size-3.5" /> Invite user
            </Button>
          </div>
        </div>
        {missingMeta.length > 0 && (
          <div className="mb-2 rounded-md border border-medium/40 bg-medium-soft px-3 py-2 text-2xs text-medium">
            {missingMeta.length} roster {missingMeta.length === 1 ? 'user has' : 'users have'} no admin metadata and will read as Unknown:{' '}
            {missingMeta.join(', ')}
          </div>
        )}
        <DataTable
          data={PEOPLE}
          columns={columns}
          searchKeys={['name', 'title', 'email', (p) => ROLE_LABEL[p.role]]}
          searchPlaceholder="Search name, title, email or role…"
          filters={[
            { key: 'role', label: 'Role', options: Object.values(ROLE_LABEL), predicate: (p, v) => ROLE_LABEL[p.role] === v },
            { key: 'lod', label: 'Line of defence', options: ['1st line', '2nd line', '3rd line'], predicate: (p, v) => LOD_LABEL[p.lod] === v },
            { key: 'status', label: 'Status', options: ['Active', 'Away', 'Invited', 'Suspended'], predicate: (p, v) => userMeta(p.id).status === v },
            { key: 'mfa', label: 'MFA', options: ['Enabled', 'Not enabled'], predicate: (p, v) => userMeta(p.id).mfa === (v === 'Enabled') },
          ]}
          initialSort={{ key: 'name', dir: 'asc' }}
          onRowClick={(p) => setSelected(p.id)}
          pageSize={25}
        />
      </div>

      <UserPanel personId={selected} onClose={() => setSelected(null)} />

      <Card title="Role matrix · permissions by module">
        <RoleMatrixTable />
      </Card>

      <Card title="Segregation of duties">
        <SodPanel />
      </Card>

      <Card title="Department heads · master authority">
        <p className="mb-3 text-2xs text-muted-foreground">
          Each department has a named head — the master authority who sees every record in the department and may act on any of them
          (including stepping in on the owner's behalf), with the action audit-trailed. Each head is selectable from the persona switcher for validation.
        </p>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {DEPARTMENTS.map((d) => {
            const head = DEFAULT_DEPARTMENT_HEADS[d]
            return (
              <div key={d} className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-3">
                <Avatar id={head} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">{d}</div>
                  <div className="text-2xs text-muted-foreground">Head: {personName(head)}</div>
                </div>
                <button
                  disabled={!canConfig}
                  title={canConfig ? undefined : NOT_ADMIN_TITLE}
                  onClick={() => changeHead(d)}
                  className="text-2xs font-medium text-info hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  Change head
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Platform roles">
        <p className="mb-3 text-2xs text-muted-foreground">
          Access is role-based across the three lines of defence. Personas — one per department head, plus the Executive and the Administrator — are
          selectable from the top bar and change the landing dashboard, My Queue, the department-scoped views and which approvals appear.
        </p>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {ROLE_DEFS.map((r) => (
            <div key={r.key} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <span className="rounded bg-muted px-1.5 py-0 text-2xs text-muted-foreground">{r.lod}</span>
                {r.switcher && <span className="rounded bg-info-soft px-1.5 py-0 text-2xs font-medium text-info">persona switcher</span>}
                <span className="ml-auto text-2xs text-muted-foreground">{r.members} {r.members === 1 ? 'member' : 'members'}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.summary}</p>
              <button
                disabled={!canConfig}
                title={canConfig ? undefined : NOT_ADMIN_TITLE}
                onClick={() => pushToast({ title: 'Sent for approval', description: `Role change for ${r.label} routed to maker-checker.`, variant: 'success' })}
                className="mt-1.5 text-2xs font-medium text-info hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                Edit role
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Drawer
        open={invite}
        onClose={() => setInvite(false)}
        title="Invite user"
        subtitle="Sankalp Pension Funds"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setInvite(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { pushToast({ title: 'Invitation sent', description: 'User invited and routed for access approval.', variant: 'success' }); setInvite(false) }}>Send invite</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block"><span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Full name</span>
            <input placeholder="e.g. Ananya Nair" className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="block"><span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Work email</span>
            <input placeholder="name@sankalppf.in" className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="block"><span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Access role</span>
            <select className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
              {ROLE_DEFS.map((r) => <option key={r.key}>{r.label}</option>)}
            </select></label>
          <p className="text-2xs text-muted-foreground">New access is subject to maker-checker approval before it takes effect.</p>
        </div>
      </Drawer>
    </div>
  )
}

// The selected user's access and their own audit-log activity — access control
// and audit trail answered on one screen.
function UserPanel({ personId, onClose }: { personId: string | null; onClose: () => void }) {
  const navigate = useNavigate()
  const sessionLog = useApp((s) => s.auditLog)
  if (!personId) return null
  const p = PEOPLE.find((x) => x.id === personId)
  if (!p) return null

  const meta = userMeta(p.id)
  const matrix = roleMatrix().find((m) => m.role === p.role)
  const rows = [
    ...sessionLog.filter((e) => e.actor === p.id).map((e) => ({ id: e.id, at: e.at, action: e.action, object: e.entityId ?? '', detail: e.detail ?? '' })),
    ...AUDIT_LOG.filter((r) => r.actor === p.id).map((r) => ({ id: r.id, at: r.at, action: r.action, object: r.object, detail: r.detail })),
  ].slice(0, 8)

  return (
    <Card>
      <div className="mb-3 flex items-start gap-3">
        <Avatar id={p.id} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
            <StatusChip status={meta.status} tone={meta.status === 'Active' ? 'ok' : meta.status === 'Suspended' ? 'danger' : meta.status === 'Away' ? 'warn' : 'info'} />
          </div>
          <div className="text-2xs text-muted-foreground">
            {p.title} · {p.department} · {LOD_LABEL[p.lod]} · {p.email}
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Module permissions · {ROLE_LABEL[p.role]}
          </h4>
          <div className="flex flex-wrap gap-1">
            {matrix?.cells.map((c) => (
              <span key={c.module} className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-2xs">
                <span className="text-muted-foreground">{MODULES.find((m) => m.key === c.module)?.label}</span>
                <LevelChip level={c.level} />
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-2xs">
            {meta.mfa ? (
              <><ShieldCheck className="size-3.5 text-ok" /> <span className="text-ok">MFA enabled</span></>
            ) : (
              <><ShieldAlert className="size-3.5 text-critical" /> <span className="text-critical">MFA not enabled</span></>
            )}
            <span className="ml-2 text-muted-foreground" title={fmtIST(minsFromNow(-meta.lastMins))}>
              Last login {fmtRelative(minsFromNow(-meta.lastMins))}
            </span>
          </div>
        </div>

        <div>
          <h4 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity in the audit log
          </h4>
          {rows.length > 0 ? (
            <ol className="space-y-1">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => r.object && navigate(resolveEntity(r.object).route)}
                    disabled={!r.object}
                    className="flex w-full items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left enabled:hover:border-info/40 enabled:hover:bg-info-soft/40 disabled:cursor-default"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-2xs text-foreground">{r.action}</div>
                      <div className="text-2xs text-muted-foreground" title={fmtIST(r.at)}>{fmtRelative(r.at)}</div>
                    </div>
                    {r.object && <span className="shrink-0 font-mono text-2xs font-semibold text-info">{r.object}</span>}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-2xs text-muted-foreground">No audit-log entries recorded against this user.</p>
          )}
        </div>
      </div>
    </Card>
  )
}

const LEVEL_STYLE: Record<PermissionLevel, string> = {
  None: 'bg-muted text-muted-foreground',
  View: 'bg-muted text-muted-foreground',
  Edit: 'bg-info-soft text-info',
  Approve: 'bg-ok-soft text-ok',
  Administer: 'bg-accent/20 text-accent-foreground',
}

function LevelChip({ level }: { level: PermissionLevel }) {
  return <span className={cn('rounded px-1 py-0 text-2xs font-semibold', LEVEL_STYLE[level])}>{level}</span>
}

/** Roles x modules. Derived from lib/gating, so it shows enforced authority. */
function RoleMatrixTable() {
  const rows = roleMatrix()
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 bg-background px-2 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </th>
            {MODULES.map((m) => (
              <th key={m.key} className="px-2 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.role} className="border-b border-border/70 last:border-0">
              <td className="sticky left-0 bg-background px-2 py-1.5 text-xs font-medium text-foreground">{r.label}</td>
              {r.cells.map((c) => (
                <td key={c.module} className="px-2 py-1.5">
                  <LevelChip level={c.level} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Each rule is probed against the live gating function, so this reports what
 *  the platform enforces rather than what it claims. */
function SodPanel() {
  const rules = sodRules()
  return (
    <div className="space-y-1.5">
      {rules.map((r) => (
        <div key={r.label} className="flex items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2">
          {r.enforced ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" />
          ) : (
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-critical" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground">{r.label}</div>
            <div className="text-2xs text-muted-foreground">{r.detail}</div>
          </div>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold', r.enforced ? 'bg-ok-soft text-ok' : 'bg-critical-soft text-critical')}>
            {r.enforced ? 'Enforced' : 'Not enforced'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── 3 · Frameworks & Libraries ──────────────────────────────────────────────
function FrameworksSection() {
  const pushToast = useApp((s) => s.pushToast)
  const canConfig = useCanAct({ kind: 'admin.configure' })
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(Object.fromEntries(FRAMEWORKS.map((f) => [f.framework, f.enabled])))
  return (
    <Card title="Frameworks & control libraries">
      <p className="mb-3 text-2xs tnum text-muted-foreground">
        {TOTAL_CONTROLS} controls in the unified library, each mapped to the clauses it satisfies.
      </p>
      <div className="space-y-2">
        {FRAMEWORKS.map((f) => (
          <div key={f.framework} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            {f.framework !== 'COBIT' ? <FrameworkPill framework={f.framework} /> : <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">COBIT</span>}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{f.name} <span className="font-normal text-muted-foreground">{f.version}</span></div>
              <div className="text-2xs text-muted-foreground">
                {f.crosswalk ? `${f.mapped} controls mapped via crosswalk` : `${f.mapped} controls mapped`} · library updated {f.lastUpdate}
              </div>
            </div>
            <Toggle on={enabled[f.framework]} disabled={!canConfig} onChange={(v) => { setEnabled((s) => ({ ...s, [f.framework]: v })); pushToast({ title: 'Saved', description: `${f.name} ${v ? 'enabled' : 'disabled'}.`, variant: 'success' }) }} label={f.name} />
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 4 · Regulators & Clocks ─────────────────────────────────────────────────
function RegulatorsSection() {
  return (
    <Card title="Regulator clock configuration">
      <p className="mb-3 text-2xs text-muted-foreground">Thresholds below drive the live countdowns on regulator clock tracking and the regulator tracks on each incident. Read-only configuration.</p>
      <div className="space-y-2">
        {REG_CLOCKS.map((r) => (
          <div key={r.regulator} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-info" />
              <span className="text-sm font-semibold text-foreground">{r.regulator}</span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {r.thresholds.map((t) => (
                <li key={t} className="flex items-start gap-1.5 text-xs text-foreground"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-ok" />{t}</li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-2 sm:grid-cols-4">
              <Field label="Retention" value={r.retention} />
              {r.sync && <Field label="Time sync" value={r.sync} />}
              <Field label="Owner" value={r.owner} />
              <Field label="Escalation" value={r.escalation} />
            </div>
            {r.note && <div className="mt-2 rounded bg-medium-soft/50 px-2 py-1 text-2xs text-medium">{r.note}</div>}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 5 · Maker-Checker & Workflow ────────────────────────────────────────────
function WorkflowSection() {
  const pushToast = useApp((s) => s.pushToast)
  const canConfig = useCanAct({ kind: 'admin.configure' })
  const [rows, setRows] = React.useState(MC_ROWS)
  return (
    <Card title="Maker-checker & approval workflow">
      <p className="mb-3 text-2xs text-muted-foreground">Which object types require a second-person check before they take effect, the default approver, and the escalation SLA.</p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Object type</th>
              <th className="px-3 py-2">Maker-checker</th>
              <th className="px-3 py-2">Default approver</th>
              <th className="px-3 py-2">Escalation SLA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.object} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 text-xs font-medium text-foreground">{r.object}</td>
                <td className="px-3 py-2">
                  <Toggle on={r.required} label={r.object} disabled={!canConfig} onChange={(v) => { setRows((s) => s.map((x, j) => j === i ? { ...x, required: v } : x)); pushToast({ title: 'Saved', description: `Maker-checker ${v ? 'required' : 'optional'} for ${r.object}.`, variant: 'success' }) }} />
                </td>
                <td className="px-3 py-2 text-xs text-foreground">{r.approver}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.sla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── 6 · Integrations ────────────────────────────────────────────────────────
function IntegrationsSection() {
  const navigate = useNavigate()
  return (
    <Card title="Connected systems" action={<Button variant="outline" size="sm" onClick={() => navigate('/integrations')}><ExternalLink className="size-3.5" /> Open diagram</Button>}>
      <p className="mb-3 text-2xs tnum text-muted-foreground">{INTEGRATIONS.length} connected systems.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {INTEGRATIONS.map((it) => (
          <div key={it.name} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
            <Server className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{it.name}</span>
                <span className="inline-flex items-center gap-1 text-2xs text-ok"><span className="size-1.5 rounded-full bg-ok" />{it.status}</span>
              </div>
              <div className="truncate text-2xs text-muted-foreground">{it.detail} · last sync {fmtRelative(minsFromNow(-it.syncMins))}</div>
            </div>
            <button onClick={() => navigate('/integrations')} className="text-2xs font-medium text-info hover:underline">Manage</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 7 · Data Retention & Privacy ────────────────────────────────────────────
function RetentionSection() {
  return (
    <Card title="Data retention & privacy">
      <p className="mb-3 text-2xs text-muted-foreground">Statutory retention floors are enforced platform-wide and override data-principal erasure where a law requires retention.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RETENTION_CARDS.map((c) => (
          <div key={c.title} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-ok" />
              <span className="text-sm font-medium text-foreground">{c.title}</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-foreground">{c.rule}</div>
            <div className="text-2xs text-muted-foreground">{c.basis}</div>
            <p className="mt-1 text-2xs text-muted-foreground">{c.note}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 8 · Notifications ───────────────────────────────────────────────────────
function NotificationsSection() {
  const pushToast = useApp((s) => s.pushToast)
  const role = useApp((s) => s.role)
  const [prefs, setPrefs] = React.useState(DEFAULT_NOTIFS)
  const set = (i: number, ch: 'inApp' | 'email', v: boolean) => {
    setPrefs((s) => s.map((p, j) => j === i ? { ...p, [ch]: v } : p))
    pushToast({ title: 'Saved', description: 'Notification preference updated.', variant: 'success' })
  }
  return (
    <Card title="Notification preferences">
      <p className="mb-3 text-2xs text-muted-foreground">Per-event delivery for your current role ({ROLE_LABEL[role]}). Changes apply to your account only.</p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2 text-center">In-app</th>
              <th className="px-3 py-2 text-center">Email</th>
            </tr>
          </thead>
          <tbody>
            {prefs.map((p, i) => (
              <tr key={p.event} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 text-xs font-medium text-foreground">{p.event}</td>
                <td className="px-3 py-2"><div className="flex justify-center"><Toggle on={p.inApp} onChange={(v) => set(i, 'inApp', v)} label={`${p.event} in-app`} /></div></td>
                <td className="px-3 py-2"><div className="flex justify-center"><Toggle on={p.email} onChange={(v) => set(i, 'email', v)} label={`${p.event} email`} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── 9 · Audit Log ───────────────────────────────────────────────────────────
// Fired reminders + escalations (E0.2) — derived deterministically from due dates
// vs the frozen NOW, written into the trail with actor/action/timestamp/interval.
const REMINDER_LOG = reminderAuditRows()
// The same ladder, fired against risk remediation actions.
const RISK_REMINDER_LOG = riskReminderAuditRows()
// The same ladder again, on exception expiry dates.
const EXCEPTION_LOG = exceptionAuditRows()
// And again on breached indicators awaiting their next refresh.
const KRI_LOG = kriAuditRows()
// And on campaign cycles that have slipped past their deadline.
const CAMPAIGN_LOG = campaignAuditRows()
// And on outsourcing diligence dates and assurance expiry.
const VENDOR_LOG = vendorAuditRows()
// Speak-up rows name the case and its stage, never its contents.
const WB_LOG = wbAuditRows()
const FRAUD_LOG = fraudAuditRows()
function AuditLogSection() {
  const navigate = useNavigate()
  // Session events (Epic 1.3) appear above the seeded history - the audit log is
  // append-on-action, not a static fixture.
  const sessionLog = useApp((s) => s.auditLog)
  const rows: AuditLogRow[] = React.useMemo(
    () => [
      ...sessionLog.map((e) => ({ id: e.id, at: e.at, actor: e.actor, action: e.action, object: e.entityId ?? 'SYSTEM', detail: e.detail ?? '' })),
      ...AUDIT_LOG,
      ...REMINDER_LOG,
      ...RISK_REMINDER_LOG,
      ...EXCEPTION_LOG,
      ...KRI_LOG,
      ...CAMPAIGN_LOG,
      ...VENDOR_LOG,
      ...WB_LOG,
      ...FRAUD_LOG,
    ],
    [sessionLog],
  )
  const columns: Column<AuditLogRow>[] = [
    { key: 'at', header: 'When (IST)', sortValue: (r) => new Date(r.at).getTime(), render: (r) => <span className="text-xs text-muted-foreground" title={fmtRelative(r.at)}>{fmtIST(r.at)}</span> },
    { key: 'actor', header: 'Actor', sortValue: (r) => personName(r.actor), render: (r) => <span className="inline-flex items-center gap-1.5"><Avatar id={r.actor} size={20} /><span className="text-xs text-foreground">{personName(r.actor)}</span></span> },
    { key: 'action', header: 'Action', sortValue: (r) => r.action, render: (r) => <span className="text-xs text-foreground">{r.action}</span> },
    { key: 'object', header: 'Object', sortValue: (r) => r.object, render: (r) => <span className="font-mono text-2xs font-semibold text-info">{r.object}</span> },
    { key: 'detail', header: 'Detail', className: 'max-w-[320px]', render: (r) => <span className="block truncate text-xs text-muted-foreground">{r.detail}</span> },
  ]
  return (
    <Card title="System audit log" action={<span className="text-2xs text-muted-foreground">tamper-evident</span>}>
      <DataTable
        data={rows}
        columns={columns}
        searchKeys={['action', 'object', 'detail', (r) => personName(r.actor)]}
        searchPlaceholder="Search audit log…"
        initialSort={{ key: 'at', dir: 'desc' }}
        onRowClick={(r) => navigate(resolveEntity(r.object).route)}
        pageSize={22}
      />
    </Card>
  )
}

// ── shell ───────────────────────────────────────────────────────────────────
export function Settings() {
  const [active, setActive] = React.useState<SectionKey>('org')
  const canConfig = useCanAct({ kind: 'admin.configure' })

  return (
    <div>
      <PageHeader
        eyebrow="OneGRC"
        title="Settings"
        description="Administer the OneGRC instance for Sankalp Pension Funds — organisation profile, access, frameworks, regulator clocks, workflow, integrations, retention and the system audit log."
      />
      <div className="grid grid-cols-[210px_minmax(0,1fr)] gap-5">
        <nav className="sticky top-0 h-fit space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const isActive = s.key === active
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                {s.label}
              </button>
            )
          })}
          <div className={cn('mt-3 rounded-md border px-2.5 py-2 text-2xs', canConfig ? 'border-border bg-muted/30 text-muted-foreground' : 'border-medium/30 bg-medium-soft/40 text-medium')}>
            {canConfig
              ? 'Changes route through maker-checker. Access role determines what you can edit.'
              : 'Read-only — switch to the Administrator persona to change platform configuration.'}
          </div>
        </nav>

        {/* Each section is contained: a fault in one can never unmount the
            route, which is what made a single missing field fatal before.
            Keyed by section so switching tabs clears a previous failure. */}
        <div className="min-w-0">
          <ErrorBoundary key={active} label={SECTIONS.find((s) => s.key === active)?.label ?? active}>
            {active === 'org' && <OrganisationSection />}
            {active === 'users' && <UsersRolesSection />}
            {active === 'frameworks' && <FrameworksSection />}
            {active === 'regulators' && <RegulatorsSection />}
            {active === 'workflow' && <WorkflowSection />}
            {active === 'integrations' && <IntegrationsSection />}
            {active === 'retention' && <RetentionSection />}
            {active === 'notifications' && <NotificationsSection />}
            {active === 'audit' && <AuditLogSection />}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
