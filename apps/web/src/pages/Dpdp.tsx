import { useNavigate } from 'react-router-dom'
import {
  Database, ShieldCheck, DatabaseZap, Siren, ArrowUpRight, Plug, Users, FileLock2, Download,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { KpiTile } from '@/components/KpiTile'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD, MARQUEE } from '@/data'
import { useEffectiveDsars } from '@/lib/effective'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import { fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import { inGroup, maskPran } from '@/lib/format'
import { useApp } from '@/store'
import type { DataAsset } from '@/types'

const STORES = ['CRA', 'KYC DB', 'Fund Accounting', 'CRM']
const PII_CLS: Record<string, string> = {
  PRAN: 'bg-[#eef2ff] text-[#4338ca]',
  KYC: 'bg-[#f5f3ff] text-[#6d28d9]',
  Nominee: 'bg-[#ecfeff] text-[#0e7490]',
  Bank: 'bg-[#fffbeb] text-[#b45309]',
  Financial: 'bg-[#f0fdfa] text-[#0f766e]',
}

export function Dpdp() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)

  const assets = WORLD.dataAssets
  const dsars = useEffectiveDsars()
  const openDsars = dsars.filter((d) => d.status !== 'Fulfilled')
  const totalRecords = assets.reduce((s, a) => s + a.records, 0)
  const consent = {
    Captured: assets.filter((a) => a.consentStatus === 'Captured').length,
    Partial: assets.filter((a) => a.consentStatus === 'Partial').length,
    Legacy: assets.filter((a) => a.consentStatus === 'Legacy').length,
  }
  const consentPct = Math.round((consent.Captured / assets.length) * 100)

  const columns: Column<DataAsset>[] = [
    { key: 'id', header: 'Asset ID', sortValue: (a) => a.id, render: (a) => <span className="font-mono text-xs font-semibold text-info">{a.id}</span> },
    {
      key: 'name',
      header: 'Data asset',
      sortValue: (a) => a.name,
      className: 'max-w-[280px]',
      render: (a) => <span className="block truncate text-sm text-foreground">{a.name}</span>,
    },
    { key: 'store', header: 'Store', sortValue: (a) => a.store, render: (a) => <span className="text-xs text-foreground">{a.store}</span> },
    {
      key: 'pii',
      header: 'PII types',
      render: (a) => (
        <div className="flex flex-wrap gap-0.5">
          {a.piiTypes.map((p) => (
            <span key={p} className={cn('rounded px-1 py-0 text-2xs font-medium', PII_CLS[p])}>{p}</span>
          ))}
        </div>
      ),
    },
    { key: 'classification', header: 'Classification', sortValue: (a) => a.classification, render: (a) => <span className="text-xs text-foreground">{a.classification}</span> },
    { key: 'retentionRule', header: 'Retention', sortValue: (a) => a.retentionRule, className: 'max-w-[180px]', render: (a) => <span className="block truncate text-2xs text-muted-foreground">{a.retentionRule}</span> },
    { key: 'consentStatus', header: 'Consent', sortValue: (a) => a.consentStatus, render: (a) => <StatusChip status={a.consentStatus} /> },
    { key: 'records', header: 'Records', align: 'right', sortValue: (a) => a.records, render: (a) => <span className="text-xs tnum text-foreground">{inGroup(a.records)}</span> },
  ]

  const filters: TableFilter<DataAsset>[] = [
    { key: 'store', label: 'Store', options: STORES, predicate: (a, v) => a.store === v },
    { key: 'classification', label: 'Classification', options: ['Restricted', 'Confidential', 'Internal'], predicate: (a, v) => a.classification === v },
    { key: 'consent', label: 'Consent', options: ['Captured', 'Partial', 'Legacy'], predicate: (a, v) => a.consentStatus === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Compliance · DPDP"
        title="DPDP / Data Governance"
        description="Data inventory, consent ledger and data-principal requests (DSARs) under the DPDP Act 2023 / Rules 2025."
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('DSAR')} />
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Data map exported', description: 'dpdp-data-inventory.csv.', variant: 'success' })}>
              <Download className="size-4" /> Export data map
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="Data assets" value={assets.length} icon={<Database className="size-3.5" />} sub="across 4 stores" />
        <KpiTile label="Records governed" value={inGroup(totalRecords)} icon={<FileLock2 className="size-3.5" />} sub="masked PRAN / KYC" />
        <KpiTile label="Open DSARs" value={openDsars.length} icon={<DatabaseZap className="size-3.5" />} tone="warn" sub="data-principal requests" onClick={() => document.getElementById('dsar-queue')?.scrollIntoView({ behavior: 'smooth' })} />
        <KpiTile label="Consent captured" value={`${consentPct}%`} icon={<ShieldCheck className="size-3.5" />} tone="ok" sub={`${consent.Legacy} legacy gaps`} />
        <KpiTile label="Breach → incident" value="1" icon={<Siren className="size-3.5" />} tone="danger" sub="routed to INC-2026-0411" onClick={() => navigate(`/incidents/${MARQUEE.id}`)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* DSAR queue */}
        <div id="dsar-queue" className="card-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <DatabaseZap className="size-4 text-medium" /> DSAR queue
            </h2>
            <span className="text-2xs text-muted-foreground">{openDsars.length} open · DPDP data-principal requests</span>
          </div>
          <div className="divide-y divide-border/70">
            {dsars.map((d) => {
              const overdue = new Date(d.dueDate).getTime() < NOW_MS && d.status !== 'Fulfilled'
              const worked = d.id === 'DSAR-2026-0047'
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/dpdp/dsar/${d.id}`)}
                  className={cn('group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-info-soft/30', worked && 'bg-medium-soft/30')}
                >
                  <span className={cn('rounded px-1.5 py-0.5 text-2xs font-semibold', d.type === 'Erasure' ? 'bg-critical-soft text-critical' : 'bg-muted text-muted-foreground')}>{d.type}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs font-semibold text-info">{d.id}</span>
                      <span className="font-mono text-2xs text-muted-foreground">PRAN {maskPran(d.pran)}</span>
                      {worked && <span className="rounded bg-medium px-1.5 py-0 text-2xs font-semibold text-white">worked case</span>}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-foreground">{d.note}</div>
                  </div>
                  <div className="hidden w-28 shrink-0 text-right text-2xs md:block">
                    <div className={cn(overdue ? 'font-medium text-critical' : 'text-muted-foreground')}>Due {fmtDate(d.dueDate)}</div>
                    <div className="text-muted-foreground">{fmtRelative(d.dueDate)}</div>
                  </div>
                  <StatusChip status={d.status} />
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )
            })}
          </div>
        </div>

        {/* right column: spokes + consent + breach */}
        <div className="space-y-4">
          <div className="card-surface p-3.5">
            <div className="mb-2 flex items-center gap-1.5">
              <Plug className="size-4 text-info" />
              <h3 className="text-sm font-semibold text-foreground">Consent &amp; Privacy platform — integrated spoke</h3>
              <span className="ml-auto inline-flex items-center gap-1 text-2xs text-ok"><span className="size-1.5 rounded-full bg-ok" /> live</span>
            </div>
            <p className="text-2xs leading-relaxed text-muted-foreground">
              Last sync {fmtRelative(new Date(NOW_MS - 37 * 60000).toISOString())}.
            </p>
          </div>

          <div className="card-surface p-3.5">
            <div className="mb-2 flex items-center gap-1.5">
              <Users className="size-4 text-info" />
              <h3 className="text-sm font-semibold text-foreground">Consent ledger</h3>
            </div>
            <div className="space-y-2">
              {(['Captured', 'Partial', 'Legacy'] as const).map((k) => {
                const n = consent[k]
                const pct = Math.round((n / assets.length) * 100)
                const color = k === 'Captured' ? 'bg-ok' : k === 'Partial' ? 'bg-medium' : 'bg-critical'
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-foreground">{k}</span>
                      <span className="tnum text-muted-foreground">{n} assets · {pct}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-border/70">
                      <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => navigate(`/incidents/${MARQUEE.id}`)}
            className="group block w-full rounded-lg border border-critical/30 bg-critical-soft/40 p-3.5 text-left transition-colors hover:bg-critical-soft/60"
          >
            <div className="flex items-center gap-1.5">
              <Siren className="size-4 text-critical" />
              <h3 className="text-sm font-semibold text-foreground">Breach signal → incident module</h3>
              <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
              {MARQUEE.id} (ransomware, personal data involved) is running its DPDP ~72-hour track alongside CERT-In and PFRDA.
            </p>
          </button>
        </div>
      </div>

      {/* data inventory */}
      <div className="mt-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Database className="size-4 text-info" /> Data inventory
          <span className="text-2xs font-normal text-muted-foreground">— {assets.length} assets · CRA / KYC DB / Fund Accounting / CRM</span>
        </h2>
        <DataTable
          data={assets}
          columns={columns}
          searchKeys={['id', 'name']}
          searchPlaceholder="Search data asset id or name…"
          filters={filters}
          initialSort={{ key: 'records', dir: 'desc' }}
        />
      </div>
    </div>
  )
}
