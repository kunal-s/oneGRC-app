import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, Plus, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD, getRisk } from '@/data'
import { personName } from '@/data/people'
import { fmtDate, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { useEffectiveCampaigns, useEffectiveRisks } from '@/lib/effective'
import { rcsaCoverage } from '@/lib/rcsa'
import { availableCampaignTypes, campaignProgress, campaignType } from '@/lib/campaigns'
import type { Campaign, CampaignType, RiskDomain } from '@/types'

const STATUS_TONE = { Draft: 'neutral', 'In progress': 'progress', 'In review': 'warn', Closed: 'ok' } as const

/** Every assessment cycle in one place — the container RCSA and attestation
 *  both run on. */
export function Campaigns() {
  const navigate = useNavigate()
  const campaigns = useEffectiveCampaigns()
  const risks = useEffectiveRisks()
  const coverage = rcsaCoverage(risks, campaigns)
  const [launch, setLaunch] = React.useState(false)
  const canLaunch = useCanAct({ kind: 'risk.submit' })

  const open = campaigns.filter((c) => c.status === 'In progress' || c.status === 'In review')
  const overdue = open.filter((c) => new Date(c.dueOn).getTime() < NOW_MS)
  const outstanding = open.reduce((n, c) => n + campaignProgress(c).total - campaignProgress(c).approved, 0)

  const columns: Column<Campaign>[] = [
    {
      key: 'id',
      header: 'Campaign',
      sortValue: (c) => c.id,
      render: (c) => (
        <div className="min-w-0">
          <div className="font-mono text-2xs font-semibold text-info">{c.id}</div>
          <div className="truncate text-xs text-foreground">{c.title}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortValue: (c) => c.type, render: (c) => <span className="text-xs text-foreground">{c.type}</span> },
    { key: 'period', header: 'Period', sortValue: (c) => c.period, render: (c) => <span className="text-xs text-muted-foreground">{c.period}</span> },
    {
      key: 'progress',
      header: 'Completion',
      className: 'w-44',
      sortValue: (c) => campaignProgress(c).completePct,
      render: (c) => {
        const p = campaignProgress(c)
        return (
          <div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <span className="h-full bg-ok" style={{ width: `${p.completePct}%` }} />
              <span className="h-full bg-info" style={{ width: `${(p.submitted / Math.max(1, p.total)) * 100}%` }} />
              <span className="h-full bg-critical" style={{ width: `${(p.overdue / Math.max(1, p.total)) * 100}%` }} />
            </div>
            <div className="mt-0.5 text-2xs tnum text-muted-foreground">
              {p.approved}/{p.total} approved
              {p.overdue > 0 && <span className="ml-1 font-medium text-critical">{p.overdue} overdue</span>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'owner',
      header: 'Launched by',
      sortValue: (c) => personName(c.launchedBy),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={c.launchedBy} size={20} />
          <span className="truncate text-xs text-foreground">{personName(c.launchedBy)}</span>
        </span>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      className: 'w-24',
      sortValue: (c) => new Date(c.dueOn).getTime(),
      render: (c) => {
        const late = new Date(c.dueOn).getTime() < NOW_MS && c.status !== 'Closed'
        return <span className={cn('text-xs tnum', late ? 'font-medium text-critical' : 'text-muted-foreground')}>{fmtDate(c.dueOn)}</span>
      },
    },
    { key: 'status', header: 'Status', className: 'w-28', sortValue: (c) => c.status, render: (c) => <StatusChip status={c.status} tone={STATUS_TONE[c.status]} /> },
  ]

  const filters: TableFilter<Campaign>[] = [
    { key: 'type', label: 'Type', options: availableCampaignTypes().map((t) => t.type), predicate: (c, v) => c.type === v },
    { key: 'status', label: 'Status', options: ['Draft', 'In progress', 'In review', 'Closed'], predicate: (c, v) => c.status === v },
    { key: 'late', label: 'Timeliness', options: ['Past due', 'On time'], predicate: (c, v) => (v === 'Past due' ? new Date(c.dueOn).getTime() < NOW_MS && c.status !== 'Closed' : !(new Date(c.dueOn).getTime() < NOW_MS && c.status !== 'Closed')) },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Campaigns"
        description={`${campaigns.length} assessment cycles — self-assessment, policy attestation and due diligence run on one engine.`}
        actions={
          <Button
            size="sm"
            disabled={!canLaunch}
            title={canLaunch ? undefined : 'Launching a campaign is done by the Risk Manager, Control Owner or Compliance Manager.'}
            onClick={() => setLaunch(true)}
          >
            <Plus className="size-4" /> Launch campaign
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
          <Megaphone className="size-3.5 text-muted-foreground" /> {open.length} open
        </span>
        {overdue.length > 0 && (
          <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">
            Past due <span className="font-semibold tnum">{overdue.length}</span>
          </span>
        )}
        <span className="rounded-md border border-border bg-background px-2.5 py-1">
          Assessments outstanding <span className="font-semibold tnum text-foreground">{outstanding}</span>
        </span>
        <span className="rounded-md border border-ok/30 bg-ok-soft px-2.5 py-1 text-ok">
          Closed <span className="font-semibold tnum">{campaigns.filter((c) => c.status === 'Closed').length}</span>
        </span>
        <button
          onClick={() => navigate('/risks?workflow=Assessment+lapsed')}
          className={cn(
            'rounded-md border px-2.5 py-1',
            coverage.lapsed.length > 0 ? 'border-medium/40 bg-medium-soft text-medium' : 'border-border bg-background',
          )}
          title={`${coverage.current} current · ${coverage.dueSoon} due within 30 days · ${coverage.overdue} lapsed · ${coverage.never} never assessed`}
        >
          Register assessed <span className="font-semibold tnum">{coverage.coveragePct}%</span>
          {coverage.lapsed.length > 0 && <span className="ml-1 tnum">· {coverage.lapsed.length} lapsed</span>}
        </button>
      </div>

      <DataTable
        data={campaigns}
        columns={columns}
        searchKeys={['id', 'title', 'period', (c) => personName(c.launchedBy)]}
        searchPlaceholder="Search campaign, period or owner…"
        filters={filters}
        initialSort={{ key: 'due', dir: 'asc' }}
        onRowClick={(c) => navigate(`/campaigns/${c.id}`)}
      />

      <LaunchDrawer open={launch} onClose={() => setLaunch(false)} />
    </div>
  )
}

const DOMAINS: RiskDomain[] = ['IT', 'Cyber', 'Operational', 'Investment', 'Compliance', 'ThirdParty']

/** Type-agnostic launcher: pick a type, scope it, set a deadline, fan out. */
function LaunchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const launchCampaign = useApp((s) => s.launchCampaign)
  const pushToast = useApp((s) => s.pushToast)

  const [type, setType] = React.useState<CampaignType>('RCSA')
  const [title, setTitle] = React.useState('')
  const [period, setPeriod] = React.useState('H2 FY2026-27')
  const [days, setDays] = React.useState(60)
  const [domains, setDomains] = React.useState<RiskDomain[]>(['Operational'])
  const [policyId, setPolicyId] = React.useState(WORLD.policies.find((p) => p.status === 'Published')?.id ?? '')

  const spec = campaignType(type)
  const dueOn = new Date(Date.now() + days * 86400000).toISOString()

  // Scope resolves to the objects the campaign fans out over.
  const objectIds = React.useMemo(() => {
    if (type === 'RCSA') return WORLD.risks.filter((r) => domains.includes(r.domain)).map((r) => r.id)
    if (type === 'Policy attestation') return policyId ? WORLD.people.map(() => policyId) : []
    return []
  }, [type, domains, policyId])

  // An attestation fans out per PERSON over one policy; an RCSA per OBJECT.
  const assignees = type === 'Policy attestation' ? WORLD.people.map((p) => p.id) : []
  const taskCount = type === 'Policy attestation' ? assignees.length : objectIds.length

  const defaultTitle =
    type === 'RCSA'
      ? `${period} RCSA — ${domains.map((d) => (d === 'ThirdParty' ? 'Third-party' : d)).join(' & ')}`
      : `${WORLD.policies.find((p) => p.id === policyId)?.title ?? 'Policy'} — acknowledgement`

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Launch campaign"
      subtitle={`${taskCount} ${spec.taskNoun}${taskCount === 1 ? '' : 's'} will be routed to their owners`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-2xs text-muted-foreground">Due {fmtDate(dueOn)} · reminders at 7/3/1 days before, escalation after</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={taskCount === 0}
              title={taskCount === 0 ? 'Nothing in scope — widen the selection.' : undefined}
              onClick={() => {
                let i = 0
                const id = launchCampaign({
                  type,
                  title: title.trim() || defaultTitle,
                  period,
                  dueOn,
                  objectIds,
                  // RCSA routes to the risk owner; an attestation routes one task
                  // per person over the same policy.
                  assigneeFor: (objectId) =>
                    type === 'Policy attestation' ? assignees[i++] ?? assignees[0] : getRisk(objectId)?.owner ?? 'meera',
                })
                onClose()
                pushToast({ title: 'Campaign launched', description: `${id} — ${taskCount} tasks routed.`, variant: 'success' })
                navigate(`/campaigns/${id}`)
              }}
            >
              <Rocket className="size-4" /> Launch
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Type">
          <div className="flex flex-wrap gap-1.5">
            {availableCampaignTypes().map((t) => (
              <button
                key={t.type}
                onClick={() => setType(t.type)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  t.type === type ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {t.type}
              </button>
            ))}
          </div>
          <p className="mt-1 text-2xs text-muted-foreground">
            Vendor due diligence becomes available when the vendor register is built.
          </p>
        </Field>

        {type === 'RCSA' ? (
          <Field label={`Scope · ${objectIds.length} risks`}>
            <div className="flex flex-wrap gap-1.5">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomains((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))}
                  className={cn(
                    'rounded-md border px-2 py-1 text-2xs font-medium transition-colors',
                    domains.includes(d) ? 'border-info bg-info-soft text-info' : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  {d === 'ThirdParty' ? 'Third-party' : d}
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <Field label={`Policy · ${assignees.length} staff in scope`}>
            <select
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            >
              {WORLD.policies
                .filter((p) => p.status === 'Published')
                .slice(0, 40)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.title} {p.version}
                  </option>
                ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Period">
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Due in">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            >
              {[30, 45, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days — {fmtDate(new Date(Date.now() + d * 86400000).toISOString())}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
      </div>
    </Drawer>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}
