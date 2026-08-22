import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, FileSpreadsheet, FileText, Scale, Send, Undo2 } from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtIST, fmtDate, NOW_MS } from '@/lib/time'
import { ORG } from '@/pages/settings/settingsData'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import {
  useEffectiveObligations,
  useEffectiveControls,
  useEffectiveIssues,
  useEffectiveAudits,
  useEffectiveRisks,
  useEffectiveIncidents,
} from '@/lib/effective'
import { tasksForObligation } from '@/lib/tasks'
import {
  PACK_SECTIONS,
  composePack,
  draftNarrative,
  packTemplate,
  sectionsForAudience,
  type PackAudience,
  type PackContext,
  type PackFormat,
  type PackRow,
} from '@/lib/packs'

const AUDIENCES: PackAudience[] = ['Board', 'Risk Management Committee', 'Audit Committee', 'Management']
const PERIODS = ['Q1 FY2026-27', 'Q2 FY2026-27', 'H1 FY2026-27', 'FY2025-26'] as const

/**
 * One button, one artefact. The dialog composes the pack from live sections,
 * drafts an executive narrative, routes that narrative through maker-checker,
 * and only then issues — filing the result as evidence against the
 * committee-meeting obligation it discharges.
 */
export function PackGenerator({
  open,
  onClose,
  defaultAudience = 'Board',
}: {
  open: boolean
  onClose: () => void
  defaultAudience?: PackAudience
}) {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const draftPack = useApp((s) => s.draftPack)
  const approvePackNarrative = useApp((s) => s.approvePackNarrative)
  const issuePack = useApp((s) => s.issuePack)
  const packs = useApp((s) => s.packs)
  const taskWorkflow = useApp((s) => s.taskWorkflow)
  const selfId = useApp((s) => s.personId)

  const risks = useEffectiveRisks()
  const issues = useEffectiveIssues()
  const incidents = useEffectiveIncidents()
  const obligations = useEffectiveObligations()
  const controls = useEffectiveControls()
  const audits = useEffectiveAudits()
  const ctx: PackContext = { risks, issues, incidents, obligations, controls, audits }

  const [audience, setAudience] = React.useState<PackAudience>(defaultAudience)
  const [period, setPeriod] = React.useState<string>(PERIODS[1])
  const [format, setFormat] = React.useState<PackFormat>('PDF')
  const [selected, setSelected] = React.useState<string[]>(() => sectionsForAudience(defaultAudience).map((s) => s.id))
  const [packId, setPackId] = React.useState<string | null>(null)
  const [narrative, setNarrative] = React.useState('')

  const pack = packId ? packs.find((p) => p.id === packId) : undefined
  const template = packTemplate(audience)

  // Changing audience re-ticks the default section set and drops any draft — a
  // pack composed for one committee is not a pack for another.
  React.useEffect(() => {
    setSelected(sectionsForAudience(audience).map((s) => s.id))
    setPackId(null)
  }, [audience])

  React.useEffect(() => {
    if (open) return
    setPackId(null)
    setNarrative('')
  }, [open])

  const composed = React.useMemo(() => composePack(audience, period, selected, ctx), [audience, period, selected, ctx])

  // The recurring committee-meeting obligation this pack is filed against, and
  // its open task — the duty the pack discharges.
  const target = React.useMemo(() => {
    const candidates = obligations
      .filter((o) => o.title.startsWith(template.obligationTitle) && o.status !== 'Filed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const obligation = candidates.find((o) => new Date(o.dueDate).getTime() >= NOW_MS) ?? candidates[0]
    if (!obligation) return undefined
    const task = tasksForObligation(obligation, taskWorkflow).find((t) => t.status !== 'Done')
    return { obligation, task }
  }, [obligations, template.obligationTitle, taskWorkflow])

  const canApprove = useCanAct({ kind: 'obligation.approve', makerId: pack?.preparedBy })

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      title="Generate reporting pack"
      subtitle={`${ORG.name} · ${audience} · ${period}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-2xs text-muted-foreground">
            {pack?.issuedAt
              ? `Issued ${fmtIST(pack.issuedAt)}`
              : pack
                ? pack.narrativeState === 'Approved'
                  ? 'Narrative approved — ready to issue'
                  : pack.narrativeState === 'Returned'
                    ? 'Narrative returned to the preparer'
                    : 'Narrative awaiting approval'
                : `${selected.length} of ${PACK_SECTIONS.length} sections selected`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {!pack && (
              <Button
                size="sm"
                disabled={selected.length === 0}
                title={selected.length === 0 ? 'Select at least one section.' : undefined}
                onClick={() => {
                  const text = draftNarrative(composed, ctx)
                  setNarrative(text)
                  const id = draftPack({
                    audience,
                    period,
                    sectionIds: selected,
                    format,
                    narrative: text,
                    obligationId: target?.obligation.id,
                    taskId: target?.task?.id,
                    evidencedControls: composed.evidencedControls,
                  })
                  setPackId(id)
                  pushToast({ title: 'Pack drafted', description: `${id} — narrative awaiting approval.`, variant: 'info' })
                }}
              >
                <FileText className="size-4" /> Generate draft
              </Button>
            )}
            {pack && !pack.issuedAt && pack.narrativeState !== 'Approved' && (
              <>
                <Button
                  size="sm"
                  disabled={!canApprove}
                  title={canApprove ? undefined : 'The preparer cannot approve their own narrative. Switch to the Compliance Manager or Executive persona.'}
                  onClick={() => {
                    approvePackNarrative(pack.id, true)
                    pushToast({ title: 'Narrative approved', description: 'The pack can now be issued.', variant: 'success' })
                  }}
                >
                  <CheckCircle2 className="size-4" /> Approve narrative
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canApprove}
                  title={canApprove ? undefined : 'Only a checker other than the preparer may decide this.'}
                  onClick={() => {
                    approvePackNarrative(pack.id, false)
                    pushToast({ title: 'Narrative returned', description: 'Returned to the preparer.', variant: 'default' })
                  }}
                >
                  <Undo2 className="size-4" /> Return
                </Button>
              </>
            )}
            {pack && !pack.issuedAt && pack.narrativeState === 'Approved' && (
              <Button
                size="sm"
                onClick={() => {
                  issuePack(pack.id)
                  pushToast({
                    title: 'Pack issued',
                    description: target?.obligation
                      ? `Filed as evidence against ${target.obligation.id}.`
                      : 'Filed to the Evidence Vault.',
                    variant: 'success',
                  })
                }}
              >
                <Send className="size-4" /> Issue pack
              </Button>
            )}
            {pack?.issuedAt && pack.evidenceId && (
              <Button size="sm" onClick={() => { onClose(); navigate(`/evidence/${pack.evidenceId}`) }}>
                <ArrowUpRight className="size-4" /> Open evidence
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* cover */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <Cover label="Entity">{ORG.name}</Cover>
            <Cover label="Audience">{audience}</Cover>
            <Cover label="Period">{period}</Cover>
            <Cover label="Generated">{fmtIST(new Date(NOW_MS).toISOString())}</Cover>
            <Cover label="Preparer">
              <span className="inline-flex items-center gap-1.5">
                <Avatar id={pack?.preparedBy ?? selfId} size={18} />
                {personName(pack?.preparedBy ?? selfId)}
              </span>
            </Cover>
            <Cover label="Format">{format}</Cover>
          </div>
          <div className="mt-2.5 flex items-start gap-1.5 border-t border-border pt-2.5">
            <Scale className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-2xs font-medium text-foreground">{template.basis}</div>
              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">{template.basisNote}</p>
            </div>
          </div>
        </div>

        {!pack && (
          <>
            <Field label="Audience">
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      a === audience ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Period">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {PERIODS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Format">
                <div className="flex gap-1.5">
                  {(['PDF', 'Excel'] as PackFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={cn(
                        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                        f === format ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {f === 'PDF' ? <FileText className="size-3.5" /> : <FileSpreadsheet className="size-3.5" />} {f}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label={`Sections · ${selected.length} selected`}>
              <div className="space-y-1">
                {PACK_SECTIONS.map((s) => {
                  const on = selected.includes(s.id)
                  const isDefault = s.audiences.includes(audience)
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-1.5',
                        on ? 'border-info/40 bg-info-soft/30' : 'border-border bg-background',
                      )}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="mt-0.5 size-3.5 accent-[hsl(var(--primary))]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">{s.heading}</span>
                          {!isDefault && <span className="rounded bg-muted px-1 py-0 text-2xs text-muted-foreground">not standard for this audience</span>}
                        </div>
                        {s.basis && <div className="truncate text-2xs text-muted-foreground">{s.basis}</div>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </Field>
          </>
        )}

        {/* narrative + preview */}
        {pack && (
          <>
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Executive narrative</h4>
                <StatusChip
                  status={pack.narrativeState === 'Approved' ? 'Approved' : pack.narrativeState === 'Returned' ? 'Returned' : 'Awaiting approval'}
                  tone={pack.narrativeState === 'Approved' ? 'ok' : pack.narrativeState === 'Returned' ? 'warn' : 'progress'}
                />
              </div>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                readOnly={pack.narrativeState === 'Approved' || !!pack.issuedAt}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring read-only:bg-muted/40"
              />
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Drafted from the composed sections. It is a proposal: the pack cannot be issued until a checker other than the preparer
                approves it.
              </p>
              {pack.approvedBy && (
                <p className="mt-1 text-2xs text-muted-foreground">
                  {pack.narrativeState === 'Approved' ? 'Approved' : 'Returned'} by {personName(pack.approvedBy)}
                  {pack.approvedOn ? ` · ${fmtIST(pack.approvedOn)}` : ''}
                </p>
              )}
            </div>

            {target && (
              <div className="rounded-lg border border-border p-3">
                <h4 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Files against</h4>
                <button
                  onClick={() => { onClose(); navigate(`/obligations/${target.obligation.id}`) }}
                  className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                >
                  <span className="font-mono text-2xs font-semibold text-info">{target.obligation.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{target.obligation.title}</span>
                  <StatusChip status={target.obligation.status} />
                  <span className="shrink-0 text-2xs tnum text-muted-foreground">due {fmtDate(target.obligation.dueDate)}</span>
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                {target.task && (
                  <p className="mt-1.5 text-2xs text-muted-foreground">
                    Issuing attaches the pack as evidence on task{' '}
                    <span className="font-mono font-semibold text-info">{target.task.id}</span> ({personName(target.task.maker)} →{' '}
                    {personName(target.task.checker)}).
                  </p>
                )}
                {composed.evidencedControls.length > 0 && (
                  <p className="mt-1 text-2xs text-muted-foreground">
                    Evidences: <span className="font-mono">{composed.evidencedControls.join(', ')}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {composed.sections.map((s) => (
                <div key={s.id} className="rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/40 px-3 py-1.5">
                    <div className="text-xs font-semibold text-foreground">{s.heading}</div>
                    {s.basis && <div className="text-2xs text-muted-foreground">{s.basis}</div>}
                  </div>
                  <div className="divide-y divide-border/70">
                    {s.rows.map((r, i) => (
                      <PackRowLine key={i} row={r} onOpen={() => { if (r.route) { onClose(); navigate(r.route) } }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}

function PackRowLine({ row, onOpen }: { row: PackRow; onOpen: () => void }) {
  const clickable = !!row.route
  return (
    <button
      onClick={onOpen}
      disabled={!clickable}
      className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left', clickable && 'hover:bg-info-soft/30')}
    >
      {row.ref && <span className="shrink-0 font-mono text-2xs font-semibold text-info">{row.ref}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-foreground">{row.label}</span>
        {row.detail && <span className="block truncate text-2xs text-muted-foreground">{row.detail}</span>}
      </span>
      <span
        className={cn(
          'shrink-0 text-xs font-semibold tnum',
          row.tone === 'danger' ? 'text-critical' : row.tone === 'warn' ? 'text-medium' : row.tone === 'ok' ? 'text-ok' : 'text-foreground',
        )}
      >
        {row.value}
      </span>
      {clickable && <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />}
    </button>
  )
}

function Cover({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs text-foreground">{children}</div>
    </div>
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
