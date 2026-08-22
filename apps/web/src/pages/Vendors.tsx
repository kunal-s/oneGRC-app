import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Download, Network, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveVendors } from '@/lib/effective'
import {
  assuranceState,
  assuranceTone,
  byExposure,
  concentration,
  currentAssurance,
  diligenceState,
  diligenceTone,
  nextDueDiligenceOn,
  tierTone,
  tprmSummary,
  vendorFlags,
  vendorRating,
} from '@/lib/vendors'
import type { Vendor } from '@/types'

const CRIT_TONE = { Material: 'danger', Important: 'warn', Standard: 'neutral' } as const
const STATUS_TONE = { Active: 'ok', Onboarding: 'progress', 'Under review': 'warn', Exiting: 'danger', Terminated: 'neutral' } as const
const TIER_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const

const inr = (lakh: number) => (lakh >= 100 ? `₹${(lakh / 100).toFixed(2)} cr` : `₹${lakh.toLocaleString('en-IN')} lakh`)

/** The third-party register — every outsourcing arrangement, tiered by what is
 *  true about it rather than by what someone typed. */
export function Vendors() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const [params] = useSearchParams()
  const vendors = useEffectiveVendors()
  const s = tprmSummary(vendors)
  const conc = concentration(vendors)

  const columns: Column<Vendor>[] = [
    {
      key: 'name',
      header: 'Third party',
      className: 'max-w-[300px]',
      sortValue: (v) => v.name,
      render: (v) => (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground">{v.name}</div>
          <div className="truncate text-2xs text-muted-foreground">
            <span className="font-mono font-semibold text-info">{v.id}</span> · {v.category}
          </div>
        </div>
      ),
    },
    {
      key: 'criticality',
      header: 'Criticality',
      className: 'w-28',
      sortValue: (v) => (v.criticality === 'Material' ? 0 : v.criticality === 'Important' ? 1 : 2),
      render: (v) => <StatusChip status={v.criticality} tone={CRIT_TONE[v.criticality]} />,
    },
    {
      key: 'tier',
      header: 'Risk tier',
      className: 'w-32',
      sortValue: (v) => TIER_ORDER[vendorRating(v).tier],
      render: (v) => {
        const r = vendorRating(v)
        return (
          <span className="inline-flex items-center gap-1.5" title={r.drivers.map((d) => `${d.label} (+${d.points})`).join('\n')}>
            <StatusChip status={r.tier} tone={tierTone(r.tier)} />
            <span className="text-2xs tnum text-muted-foreground">{r.score}</span>
          </span>
        )
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (v) => personName(v.owner),
      render: (v) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={v.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(v.owner)}</span>
        </span>
      ),
    },
    {
      key: 'assurance',
      header: 'Assurance',
      className: 'w-40',
      sortValue: (v) => {
        const a = currentAssurance(v)
        return a ? new Date(a.expiresOn).getTime() : 0
      },
      render: (v) => {
        const a = currentAssurance(v)
        const st = assuranceState(v)
        return (
          <span className="inline-flex items-center gap-1.5" title={a ? `${a.kind} ${a.reference} · ${st === 'Expired' ? 'expired' : 'expires'} ${fmtDate(a.expiresOn)}` : 'None held'}>
            <StatusChip status={st} tone={assuranceTone(st)} />
            {a && <span className="truncate text-2xs text-muted-foreground">{a.kind.replace(' Type II', '')}</span>}
          </span>
        )
      },
    },
    {
      key: 'diligence',
      header: 'Diligence',
      className: 'w-32',
      sortValue: (v) => {
        const n = nextDueDiligenceOn(v)
        return n ? new Date(n).getTime() : 0
      },
      render: (v) => {
        const d = diligenceState(v)
        const n = nextDueDiligenceOn(v)
        return (
          <span title={v.lastDueDiligenceOn ? `Last ${fmtDate(v.lastDueDiligenceOn)}${n ? ` · next due ${fmtDate(n)}` : ''}` : 'Never completed'}>
            <StatusChip status={d} tone={diligenceTone(d)} />
          </span>
        )
      },
    },
    {
      key: 'spend',
      header: 'Annual spend',
      align: 'right',
      className: 'w-28',
      sortValue: (v) => v.annualSpendLakh,
      render: (v) => <span className="text-xs tnum text-foreground">{inr(v.annualSpendLakh)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28',
      sortValue: (v) => v.status,
      render: (v) => <StatusChip status={v.status} tone={STATUS_TONE[v.status]} />,
    },
  ]

  const filters: TableFilter<Vendor>[] = [
    { key: 'criticality', label: 'Criticality', options: ['Material', 'Important', 'Standard'], predicate: (v, x) => v.criticality === x },
    {
      key: 'category',
      label: 'Category',
      options: Array.from(new Set(vendors.map((v) => v.category))).sort(),
      predicate: (v, x) => v.category === x,
    },
    { key: 'tier', label: 'Risk tier', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (v, x) => vendorRating(v).tier === x },
    { key: 'status', label: 'Status', options: ['Active', 'Onboarding', 'Under review', 'Exiting', 'Terminated'], predicate: (v, x) => v.status === x },
    {
      key: 'attention',
      label: 'Needs attention',
      options: ['Assurance lapsed', 'Diligence overdue', 'Under-classified', 'No exit plan', 'Exit plan untested', 'No DPA', 'No right to audit', 'Contract expiring'],
      predicate: (v, x) => vendorFlags(v).includes(x),
    },
  ]

  const initialFilters = params.get('attention') ? { attention: params.get('attention')! } : undefined

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Third parties"
        description={`${s.total} outsourcing arrangements · ${s.material} material · ${inr(s.annualSpendLakh)} committed annually`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
              Due-diligence cycles
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Third-party register exported', description: 'outsourcing-register.csv.', variant: 'success' })}
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Building2 className="size-4 text-muted-foreground" /> Material outsourcing
            </h3>
            <span className="text-2xs tnum text-muted-foreground">
              {s.materialInGoodOrder} of {s.material} in good order
            </span>
          </div>
          <div className="mb-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <span className="block h-full bg-ok" style={{ width: `${s.materialCoveragePct}%` }} />
          </div>
          <p className="text-2xs text-muted-foreground">
            Assurance current, diligence current and the exit plan walked through — all three, on every material arrangement.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs tnum">
            <Flag n={s.assuranceLapsed} label="assurance lapsed" tone="danger" onClick={() => navigate('/vendors?attention=Assurance+lapsed')} />
            <Flag n={s.assuranceExpiring} label="expiring" tone="warn" />
            <Flag n={s.diligenceOverdue} label="diligence overdue" tone="danger" onClick={() => navigate('/vendors?attention=Diligence+overdue')} />
            <Flag n={s.neverAssessed} label="never assessed" tone="warn" />
          </div>
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Network className="size-4 text-muted-foreground" /> Fourth-party concentration
          </h3>
          {conc.fourthParty.length > 0 ? (
            <div className="space-y-1">
              {conc.fourthParty.slice(0, 4).map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-2xs text-foreground" title={f.vendors.map((v) => v.name).join(', ')}>
                    {f.name}
                  </span>
                  <span className="shrink-0 rounded bg-medium-soft px-1.5 py-0 text-2xs font-semibold tnum text-medium">
                    {f.vendors.length} vendors
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No fourth party is relied on by more than one vendor.</p>
          )}
          {conc.topSpendVendor && (
            <p className="mt-2 border-t border-border pt-2 text-2xs text-muted-foreground">
              Largest arrangement <span className="font-medium text-foreground">{conc.topSpendVendor.name}</span> carries{' '}
              <span className="tnum text-foreground">{conc.topSpendShare}%</span> of outsourcing spend.
            </p>
          )}
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldAlert className="size-4 text-critical" /> Highest exposure
          </h3>
          <div className="space-y-1">
            {byExposure(vendors)
              .slice(0, 4)
              .map((v) => {
                const r = vendorRating(v)
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/vendors/${v.id}`)}
                    className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-info-soft/30"
                    title={r.drivers.map((d) => `${d.label} (+${d.points})`).join('\n')}
                  >
                    <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{v.name}</span>
                    <StatusChip status={r.tier} tone={tierTone(r.tier)} />
                    <span className="w-6 shrink-0 text-right text-2xs tnum text-muted-foreground">{r.score}</span>
                  </button>
                )
              })}
          </div>
        </div>
      </div>

      <DataTable
        data={vendors}
        columns={columns}
        searchKeys={['name', 'id', 'category', 'jurisdiction', (v) => personName(v.owner), (v) => v.services.map((x) => x.name).join(' ')]}
        searchPlaceholder="Search third party, service, category or owner…"
        filters={filters}
        initialFilters={initialFilters}
        initialSort={{ key: 'tier', dir: 'asc' }}
        onRowClick={(v) => navigate(`/vendors/${v.id}`)}
        rightSlot={<span className="text-2xs tnum text-muted-foreground">{s.criticalTier} at critical tier</span>}
      />
    </div>
  )
}

function Flag({ n, label, tone, onClick }: { n: number; label: string; tone: 'danger' | 'warn'; onClick?: () => void }) {
  if (n === 0) return null
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0', tone === 'danger' ? 'bg-critical-soft text-critical' : 'bg-medium-soft text-medium')}
    >
      <span className="font-semibold">{n}</span> {label}
    </Tag>
  )
}
