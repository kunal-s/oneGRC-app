import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ClipboardCheck, Paperclip, ShieldCheck } from 'lucide-react'
import { EvidenceList } from '@/components/EvidenceList'
import { StatusChip } from '@/components/StatusChip'
import { cn } from '@/lib/utils'
import { fmtDate, NOW_MS } from '@/lib/time'
import { closureMemosForRisk, controlAssuranceForRisk, evidenceForRisk } from '@/lib/riskWorkflow'
import { useApp } from '@/store'
import type { Risk } from '@/types'

export function RiskEvidenceTab({ risk }: { risk: Risk }) {
  const navigate = useNavigate()
  const getAnyEvidence = useApp((s) => s.getAnyEvidence)
  const evidence = evidenceForRisk(risk, getAnyEvidence)
  const controls = controlAssuranceForRisk(risk)
  const memos = closureMemosForRisk(risk)
  const actionEvidenceIds = new Set(risk.lifecycle.treatment.actions.flatMap((a) => a.evidenceIds))

  return (
    <div className="space-y-4">
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Paperclip className="size-4 text-muted-foreground" /> Supporting evidence
          </h3>
          <span className="text-2xs tnum text-muted-foreground">
            {evidence.length} items · {actionEvidenceIds.size} attached to remediation actions
          </span>
        </div>
        {evidence.length > 0 ? (
          <EvidenceList items={evidence} max={12} />
        ) : (
          <p className="text-xs text-muted-foreground">
            No evidence filed yet — evidence appears here once a remediation action completes or a mitigating control is tested.
          </p>
        )}
        {evidence.length > 12 && (
          <button onClick={() => navigate('/evidence')} className="mt-2 text-2xs font-medium text-info hover:underline">
            View all {evidence.length} in the Evidence Vault →
          </button>
        )}
      </div>

      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-muted-foreground" /> Control test results
          </h3>
          <span className="text-2xs tnum text-muted-foreground">
            {controls.filter((c) => c.result === 'Pass').length}/{controls.length} passing
          </span>
        </div>
        {controls.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Control</th>
                  <th className="px-3 py-2 w-24">Automation</th>
                  <th className="px-3 py-2 w-28">Last tested</th>
                  <th className="px-3 py-2 w-24">Next due</th>
                  <th className="px-3 py-2 w-20">Result</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((c) => {
                  const overdue = c.nextDue && new Date(c.nextDue).getTime() < NOW_MS
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/controls/${c.id}`)}
                      className="group cursor-pointer border-b border-border/70 last:border-0 hover:bg-info-soft/30"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
                          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-2xs text-muted-foreground">{c.automation}</td>
                      <td className="px-3 py-2 text-xs tnum text-muted-foreground">{fmtDate(c.lastTested)}</td>
                      <td className={cn('px-3 py-2 text-xs tnum', overdue ? 'font-medium text-critical' : 'text-muted-foreground')}>
                        {c.nextDue ? fmtDate(c.nextDue) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <StatusChip status={c.result} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No controls are currently mapped to this risk.</p>
        )}
      </div>

      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ClipboardCheck className="size-4 text-muted-foreground" /> Audit closure
          </h3>
          <span className="text-2xs tnum text-muted-foreground">{memos.length} findings</span>
        </div>
        {memos.length > 0 ? (
          <div className="space-y-1">
            {memos.map((m) => (
              <button
                key={m.findingId}
                onClick={() => navigate(`/audits/${m.auditId}`)}
                className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
              >
                <span className="font-mono text-2xs font-semibold text-info">{m.findingId}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{m.title}</span>
                {m.issueId && <span className="shrink-0 font-mono text-2xs text-muted-foreground">{m.issueId}</span>}
                <StatusChip status={m.status} tone={m.status === 'Closed' ? 'ok' : m.status === 'Remediation' ? 'progress' : 'warn'} />
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No audit findings are tracked against this risk's controls.</p>
        )}
      </div>
    </div>
  )
}
