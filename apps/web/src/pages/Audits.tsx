import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { WORLD } from '@/data'
import { Tabs } from '@/components/ui/Tabs'
import { AuditPlanTab } from './audits/AuditPlanTab'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { useEffectiveAudits } from '@/lib/effective'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import type { Audit } from '@/types'

export function Audits() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)

  const audits = useEffectiveAudits()
  const plan = WORLD.auditPlan
  const [tab, setTab] = React.useState('audits')
  const totalFindings = audits.reduce((s, a) => s + a.findings.length, 0)
  const openFindings = audits.reduce((s, a) => s + a.findings.filter((f) => f.status !== 'Closed').length, 0)

  const columns: Column<Audit>[] = [
    {
      key: 'id',
      header: 'Audit ID',
      sortValue: (a) => a.id,
      render: (a) => <span className="font-mono text-xs font-semibold text-info">{a.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (a) => a.title,
      className: 'max-w-[280px]',
      render: (a) => <span className="block truncate text-sm text-foreground">{a.title}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortValue: (a) => a.type,
      render: (a) => (
        <span className={cn('rounded border px-1.5 py-0.5 text-2xs font-medium', a.type === 'PFRDA' ? 'bg-[#f0fdfa] text-[#0f766e] border-[#99f6e4]' : a.type.startsWith('IS') ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]' : 'bg-muted text-muted-foreground border-border')}>
          {a.type}
        </span>
      ),
    },
    { key: 'auditor', header: 'Auditor', sortValue: (a) => a.auditor, render: (a) => <span className="text-xs text-foreground">{a.auditor}</span> },
    { key: 'period', header: 'Period', sortValue: (a) => a.period, render: (a) => <span className="text-xs text-muted-foreground">{a.period}</span> },
    {
      key: 'findings',
      header: 'Findings',
      align: 'right',
      sortValue: (a) => a.findings.filter((f) => f.status !== 'Closed').length,
      render: (a) => {
        const open = a.findings.filter((f) => f.status !== 'Closed').length
        return (
          <span className="text-xs tnum">
            <span className={cn(open > 0 ? 'font-medium text-critical' : 'text-muted-foreground')}>{open} open</span>
            <span className="text-muted-foreground"> / {a.findings.length}</span>
          </span>
        )
      },
    },
    { key: 'status', header: 'Status', sortValue: (a) => a.status, render: (a) => <StatusChip status={a.status} /> },
  ]

  const filters: TableFilter<Audit>[] = [
    { key: 'type', label: 'Type', options: ['IS audit (CERT-In empanelled)', 'Internal', 'PFRDA'], predicate: (a, v) => a.type === v },
    { key: 'status', label: 'Status', options: ['Planned', 'Fieldwork', 'Reporting', 'Closed'], predicate: (a, v) => a.status === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Audit & Assurance"
        title="Audits"
        description={`${audits.length} audits — CERT-In empanelled IS audits, internal audits and PFRDA reviews. Every finding spawns a tracked remediation issue.`}
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('Audit')} />
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Audit register exported', description: 'audit-register-fy26.csv.', variant: 'success' })}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
          <ClipboardCheck className="size-3.5 text-muted-foreground" /> {audits.length} audits
        </span>
        <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">Open findings <span className="font-semibold tnum">{openFindings}</span></span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1">Total findings <span className="font-semibold tnum text-foreground">{totalFindings}</span></span>
      </div>

      <Tabs
        className="mb-3"
        tabs={[
          { key: 'audits', label: 'Audits', count: audits.length },
          { key: 'plan', label: `Plan · ${plan[0]?.fy ?? ''}`, count: plan.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'plan' ? <AuditPlanTab /> : (
      <DataTable
        data={audits}
        columns={columns}
        searchKeys={['id', 'title', 'auditor']}
        searchPlaceholder="Search audit id, title or auditor…"
        filters={filters}
        initialSort={{ key: 'id', dir: 'asc' }}
        onRowClick={(a) => navigate(`/audits/${a.id}`)}
      />
      )}
    </div>
  )
}
