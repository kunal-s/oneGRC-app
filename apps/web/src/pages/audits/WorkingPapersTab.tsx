import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, FlaskConical, Wrench } from 'lucide-react'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/ui/Button'
import { EvidenceList } from '@/components/EvidenceList'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { getControl } from '@/data'
import { fmtDate, fmtIST } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { useEffectiveWorkingPapers } from '@/lib/effective'
import type { WorkingPaper } from '@/types'

const RESULT_TONE = { Pass: 'ok', Fail: 'danger', Partial: 'warn', 'Not applicable': 'neutral' } as const
const RESULT_ORDER = { Fail: 0, Partial: 1, Pass: 2, 'Not applicable': 3 } as const

/** The execution layer of an audit: one row per test step, with the population,
 *  the sample, the evidence and the tester's conclusion. A failed paper is where
 *  a finding gets raised from. */
export function WorkingPapersTab({ auditId }: { auditId: string }) {
  const papers = useEffectiveWorkingPapers(auditId)
  const [open, setOpen] = React.useState<WorkingPaper | null>(null)

  // Keep the drawer in step with the store after a finding is raised.
  const live = open ? papers.find((p) => p.id === open.id) ?? open : null

  if (papers.length === 0) {
    return (
      <div className="card-surface p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Working papers</h3>
        <p className="text-xs text-muted-foreground">
          No test steps recorded — this audit is planned but fieldwork has not started.
        </p>
      </div>
    )
  }

  const failed = papers.filter((p) => p.result === 'Fail')
  const unescalated = failed.filter((p) => !p.findingId)

  const columns: Column<WorkingPaper>[] = [
    {
      key: 'reference',
      header: 'Ref',
      className: 'w-16',
      sortValue: (p) => p.reference,
      render: (p) => <span className="font-mono text-xs font-semibold text-info">{p.reference}</span>,
    },
    {
      key: 'objective',
      header: 'Objective',
      className: 'max-w-[280px]',
      sortValue: (p) => p.objective,
      render: (p) => (
        <div className="min-w-0">
          <div className="truncate text-xs text-foreground">{p.objective}</div>
          {p.controlTested && <div className="font-mono text-2xs text-muted-foreground">{p.controlTested}</div>}
        </div>
      ),
    },
    {
      key: 'sample',
      header: 'Population / sample',
      className: 'w-36',
      sortValue: (p) => p.sampleSize ?? 0,
      render: (p) =>
        p.populationSize === undefined ? (
          <span className="text-2xs text-muted-foreground">—</span>
        ) : (
          <div className="min-w-0">
            <div className="text-xs tnum text-foreground">
              {p.sampleSize} of {p.populationSize}
            </div>
            <div className="truncate text-2xs text-muted-foreground">{p.sampleBasis}</div>
          </div>
        ),
    },
    {
      key: 'result',
      header: 'Result',
      className: 'w-24',
      sortValue: (p) => RESULT_ORDER[p.result],
      render: (p) => <StatusChip status={p.result} tone={RESULT_TONE[p.result]} />,
    },
    {
      key: 'tester',
      header: 'Tester',
      sortValue: (p) => personName(p.tester),
      render: (p) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={p.tester} size={18} />
          <span className="truncate text-xs text-foreground">{personName(p.tester)}</span>
        </span>
      ),
    },
    {
      key: 'testedOn',
      header: 'Tested',
      className: 'w-24',
      sortValue: (p) => new Date(p.testedOn).getTime(),
      render: (p) => <span className="text-xs tnum text-muted-foreground">{fmtDate(p.testedOn)}</span>,
    },
    {
      key: 'evidence',
      header: 'Evidence',
      align: 'center',
      className: 'w-20',
      sortValue: (p) => p.evidenceIds.length,
      render: (p) => <span className="text-2xs tnum text-muted-foreground">{p.evidenceIds.length || '—'}</span>,
    },
    {
      key: 'finding',
      header: 'Finding',
      className: 'w-32',
      sortValue: (p) => p.findingId ?? '',
      render: (p) =>
        p.findingId ? (
          <span className="font-mono text-2xs font-semibold text-info">{p.findingId}</span>
        ) : p.result === 'Fail' ? (
          <span className="rounded bg-critical-soft px-1.5 py-0.5 text-2xs font-semibold text-critical">not raised</span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
  ]

  const filters: TableFilter<WorkingPaper>[] = [
    { key: 'result', label: 'Result', options: ['Pass', 'Fail', 'Partial', 'Not applicable'], predicate: (p, v) => p.result === v },
    { key: 'basis', label: 'Sample basis', options: ['Random', 'Judgemental', 'Full population'], predicate: (p, v) => p.sampleBasis === v },
    { key: 'tester', label: 'Tester', options: Array.from(new Set(papers.map((p) => personName(p.tester)))).sort(), predicate: (p, v) => personName(p.tester) === v },
    { key: 'escalation', label: 'Escalation', options: ['Finding raised', 'Failure not raised'], predicate: (p, v) => (v === 'Finding raised' ? !!p.findingId : p.result === 'Fail' && !p.findingId) },
  ]

  return (
    <>
      {unescalated.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-critical/30 bg-critical-soft/40 px-3.5 py-2.5 text-xs">
          <FlaskConical className="size-4 shrink-0 text-critical" />
          <span className="text-foreground">
            <span className="font-medium">
              {unescalated.length} failed test {unescalated.length === 1 ? 'step has' : 'steps have'} no finding raised.
            </span>{' '}
            Open the paper to escalate it into the findings and remediation chain.
          </span>
        </div>
      )}

      <DataTable
        data={papers}
        columns={columns}
        searchKeys={['reference', 'objective', 'conclusion', (p) => personName(p.tester)]}
        searchPlaceholder="Search reference, objective or conclusion…"
        filters={filters}
        initialSort={{ key: 'reference', dir: 'asc' }}
        onRowClick={(p) => setOpen(p)}
        pageSize={20}
        rightSlot={
          <span className="text-2xs tnum text-muted-foreground">
            {papers.filter((p) => p.result === 'Pass').length} pass · {failed.length} fail ·{' '}
            {papers.filter((p) => p.result === 'Partial').length} partial
          </span>
        }
      />

      <PaperDrawer paper={live} onClose={() => setOpen(null)} />
    </>
  )
}

function PaperDrawer({ paper: p, onClose }: { paper: WorkingPaper | null; onClose: () => void }) {
  const navigate = useNavigate()
  const raiseFinding = useApp((s) => s.raiseFindingFromPaper)
  const pushToast = useApp((s) => s.pushToast)
  // Raising a finding is an auditor's act — the same authority that resolves one.
  const canRaise = useCanAct({ kind: 'issue.resolve' })
  if (!p) return null

  const control = p.controlTested ? getControl(p.controlTested) : undefined
  const coverage = p.populationSize && p.sampleSize ? Math.round((p.sampleSize / p.populationSize) * 1000) / 10 : undefined

  return (
    <Drawer
      open={!!p}
      onClose={onClose}
      width="max-w-2xl"
      title={<span className="font-mono text-sm">{p.reference}</span>}
      subtitle={p.objective}
      footer={
        p.result === 'Fail' && !p.findingId ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">Creates a finding on this audit and a remediation issue against the control owner.</span>
            <Button
              size="sm"
              disabled={!canRaise}
              title={canRaise ? undefined : 'Raising a finding is done by the Auditor, Control Owner or Compliance Manager.'}
              onClick={() => {
                const id = raiseFinding(p.id)
                if (id) pushToast({ title: 'Finding raised', description: `${id} created with a tracked remediation issue.`, variant: 'success' })
              }}
            >
              <Wrench className="size-4" /> Raise finding
            </Button>
          </div>
        ) : p.findingId ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">Escalated — this paper is the test behind the finding.</span>
            <Button variant="outline" size="sm" onClick={() => { onClose(); navigate(`/audits/${p.auditId}`) }}>
              <ArrowUpRight className="size-4" /> View finding {p.findingId}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Attr label="Result">
            <StatusChip status={p.result} tone={RESULT_TONE[p.result]} />
          </Attr>
          <Attr label="Tester">
            <span className="inline-flex items-center gap-1.5">
              <Avatar id={p.tester} size={20} /> {personName(p.tester)}
            </span>
          </Attr>
          <Attr label="Tested on">{fmtIST(p.testedOn)}</Attr>
          <Attr label="Sample basis">{p.sampleBasis ?? '—'}</Attr>
        </div>

        {p.populationSize !== undefined && (
          <div className="rounded-lg border border-border p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Population &amp; sample</span>
              <span className="text-2xs tnum text-muted-foreground">
                {p.sampleSize} of {p.populationSize}
                {coverage !== undefined ? ` · ${coverage}% coverage` : ''}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-info" style={{ width: `${Math.min(100, coverage ?? 0)}%` }} />
            </div>
          </div>
        )}

        <Block label="Procedure">{p.procedure}</Block>
        <Block label="Conclusion" tone={p.result === 'Fail' ? 'danger' : undefined}>
          {p.conclusion}
        </Block>

        {control && (
          <div>
            <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Control tested</div>
            <button
              onClick={() => { onClose(); navigate(`/controls/${control.id}`) }}
              className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/40"
            >
              <span className="font-mono text-2xs font-semibold text-info">{control.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{control.title}</span>
              <StatusChip status={control.result} />
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence examined</div>
          {p.evidenceIds.length > 0 ? (
            <EvidenceList ids={p.evidenceIds} />
          ) : (
            <p className="text-xs text-muted-foreground">No evidence attached to this paper.</p>
          )}
        </div>
      </div>
    </Drawer>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

function Block({ label, children, tone }: { label: string; children: React.ReactNode; tone?: 'danger' }) {
  return (
    <div>
      <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <p
        className={cn(
          'rounded-md border px-3 py-2 text-xs leading-relaxed',
          tone === 'danger' ? 'border-critical/30 bg-critical-soft/30 text-foreground' : 'border-border bg-muted/30 text-foreground',
        )}
      >
        {children}
      </p>
    </div>
  )
}
