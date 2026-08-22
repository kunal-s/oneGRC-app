import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Bot, User, FileText, FileCode, Image, ShieldCheck, ReceiptText, Layers } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { FrameworkPills } from '@/components/FrameworkPill'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { fmtIST, fmtRelative } from '@/lib/time'
import { inGroup } from '@/lib/format'
import { useApp } from '@/store'
import type { Evidence } from '@/types'

const TYPE_ICON: Record<Evidence['type'], React.ComponentType<{ className?: string }>> = {
  Screenshot: Image,
  Log: FileText,
  'Config export': FileCode,
  Attestation: ShieldCheck,
  'Filing ack': ReceiptText,
}
const TYPES: Evidence['type'][] = ['Screenshot', 'Log', 'Config export', 'Attestation', 'Filing ack']

export function EvidenceVault() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const setEvidenceDraft = useApp((s) => s.setEvidenceDraft)
  const evidenceWorkflow = useApp((s) => s.evidenceWorkflow)
  const sessionEvidence = useApp((s) => s.sessionEvidence)
  // Session-uploaded evidence appears alongside the seeded vault.
  const allEvidence = React.useMemo(() => [...sessionEvidence, ...WORLD.evidence], [sessionEvidence])
  // Seed evidence is historical (Verified); session evidence carries its workflow.
  const statusOf = (e: Evidence): 'Submitted' | 'Verified' => evidenceWorkflow[e.id]?.status ?? 'Verified'

  const auto = WORLD.evidence.filter((e) => e.auto).length
  const autoPct = Math.round((auto / WORLD.evidence.length) * 100)
  const linkedToObl = WORLD.evidence.filter((e) => e.linkedObligations.length > 0).length
  const sources = React.useMemo(() => Array.from(new Set(WORLD.evidence.map((e) => e.source))).sort(), [])

  const columns: Column<Evidence>[] = [
    {
      key: 'id',
      header: 'Evidence ID',
      sortValue: (e) => e.id,
      render: (e) => <span className="font-mono text-xs font-semibold text-info">{e.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (e) => e.title,
      className: 'max-w-[260px]',
      render: (e) => {
        const Icon = TYPE_ICON[e.type]
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-sm text-foreground">{e.title}</span>
          </span>
        )
      },
    },
    { key: 'type', header: 'Type', sortValue: (e) => e.type, render: (e) => <span className="text-xs text-foreground">{e.type}</span> },
    {
      key: 'capturedBy',
      header: 'Captured by',
      sortValue: (e) => (e.auto ? 'CCM' : personName(e.capturedBy)),
      render: (e) =>
        e.auto ? (
          <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">
            <Bot className="size-3" /> CCM (auto)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-foreground">
            <User className="size-3 text-muted-foreground" /> {personName(e.capturedBy)}
          </span>
        ),
    },
    { key: 'source', header: 'Source', className: 'max-w-[160px]', sortValue: (e) => e.source, render: (e) => <span className="block truncate text-xs text-muted-foreground" title={e.source}>{e.source}</span> },
    {
      key: 'capturedAt',
      header: 'Captured',
      sortValue: (e) => new Date(e.capturedAt).getTime(),
      render: (e) => <span className="text-xs text-muted-foreground" title={fmtIST(e.capturedAt)}>{fmtRelative(e.capturedAt)}</span>,
    },
    {
      key: 'links',
      header: 'Linked to (walk upstream)',
      render: (e) => (
        <span className="inline-flex items-center gap-1.5 text-2xs">
          {e.linkedObligations.length > 0 && (
            <button
              onClick={() => navigate(`/obligations/${e.linkedObligations[0]}`)}
              title={`Up to obligation ${e.linkedObligations[0]}`}
              className="rounded bg-medium-soft px-1.5 py-0.5 font-medium text-medium hover:underline"
            >
              {e.linkedObligations.length} obl
            </button>
          )}
          {e.linkedControls.length > 0 && (
            <button
              onClick={() => navigate(`/controls/${e.linkedControls[0]}`)}
              title={`Up to control ${e.linkedControls[0]}`}
              className="rounded bg-info-soft px-1.5 py-0.5 font-medium text-info hover:underline"
            >
              {e.linkedControls.length} ctrl
            </button>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (e) => statusOf(e),
      render: (e) => <StatusChip status={statusOf(e)} />,
    },
    {
      key: 'frameworks',
      header: 'Frameworks',
      sortValue: (e) => e.frameworkRefs.length,
      render: (e) => <FrameworkPills frameworks={e.frameworkRefs} max={4} />,
    },
  ]

  const filters: TableFilter<Evidence>[] = [
    { key: 'status', label: 'Status', options: ['Submitted', 'Verified'], predicate: (e, v) => statusOf(e) === v },
    { key: 'type', label: 'Type', options: TYPES, predicate: (e, v) => e.type === v },
    { key: 'capture', label: 'Capture', options: ['CCM (auto)', 'Manual'], predicate: (e, v) => (v === 'CCM (auto)' ? e.auto : !e.auto) },
    { key: 'source', label: 'Source', options: sources, predicate: (e, v) => e.source === v },
    { key: 'framework', label: 'Framework', options: ['ISO 27001', 'NIST CSF', 'PCI DSS', 'PFRDA ICS'], predicate: (e, v) => e.frameworkRefs.includes(v as Evidence['frameworkRefs'][number]) },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Audit & Assurance"
        title="Evidence Vault"
        description={
          <>
            {inGroup(WORLD.evidence.length)} evidence items — <span className="font-medium text-foreground">{autoPct}% auto-captured</span> by
            CCM. Each linked to the controls, obligations and framework clauses it satisfies.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEvidenceDraft(null); navigate('/evidence/new') }}>
              Attach
            </Button>
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Evidence index exported', description: 'evidence-vault-index.csv.', variant: 'success' })}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
          <Layers className="size-3.5 text-muted-foreground" /> {inGroup(WORLD.evidence.length)} items
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok-soft px-2.5 py-1 text-ok">
          <Bot className="size-3.5" /> {autoPct}% auto-captured
        </span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1">Linked to obligations <span className="font-semibold tnum text-foreground">{inGroup(linkedToObl)}</span></span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1">All linked to ≥1 control</span>
      </div>

      <DataTable
        data={allEvidence}
        columns={columns}
        searchKeys={['id', 'title', 'source']}
        searchPlaceholder="Search evidence id, title or source…"
        filters={filters}
        initialSort={{ key: 'capturedAt', dir: 'desc' }}
        onRowClick={(e) => navigate(`/evidence/${e.id}`)}
      />
    </div>
  )
}
