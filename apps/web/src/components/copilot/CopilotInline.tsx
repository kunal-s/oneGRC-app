import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowUpRight, ScrollText, ShieldCheck, CornerDownLeft, Bot, Check, CircleDot, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { buildRecordContext, type RecordContext } from '@/lib/copilot/context'
import { groundedResponder, type CopilotAnswer } from '@/lib/copilot/response'
import { clauseMappingRun, sourceScanRun, type AgentRunResult, type ProposedAction } from '@/lib/agents'

const SUGGESTIONS: Record<string, string[]> = {
  Act: ['What does this act require of us?', 'Which controls satisfy this act?', 'Which clauses still need a decision?', "What's the penalty for non-compliance?"],
  Clause: ['What does this clause require?', "What's the penalty if it's missed?", 'Which control satisfies it?'],
  Risk: ['What controls mitigate this risk?', 'Why is the residual rating what it is?', 'Has this risk been realised?'],
  Control: ['Which frameworks does this satisfy?', 'When was it last tested?', 'What does it derive from?'],
  Obligation: ['What is the source of this duty?', 'What evidence proves it?', 'When is it next due?'],
  Incident: ['Which regulators must be notified?', 'What controls and risks does it touch?', 'What evidence is captured?'],
  Policy: ['Which controls enforce this policy?', 'What does it derive from?', 'When is it next reviewed?'],
}

type Tab = 'ask' | 'agents'
type AgentRun = 'mapping' | 'scan'

interface Turn {
  q: string
  a: CopilotAnswer
  steps: string[]
  phase: 'thinking' | 'done'
  step: number // index of the step currently in flight (steps.length === all done)
}

const THINK_MS = 460 // per-step dwell; total ≈ steps × THINK_MS (~1.8s)

interface Props {
  /** The record this Copilot is grounded on — taken straight from the host page. */
  entityId: string
  /** Which tabs to surface. Single-tab embeds hide the tab bar. */
  tabs?: Tab[]
  defaultTab?: Tab
  /** When the Agents tab is shown, which run to host (clause→control vs source scan). */
  agentRun?: AgentRun
  /** Render the header as a disclosure toggle so the panel can be folded away. */
  collapsible?: boolean
  /** Start folded (only meaningful with `collapsible`). */
  defaultCollapsed?: boolean
  /** Override the built-in suggestion chips with host-scoped questions. */
  suggestedQuestions?: string[]
  /**
   * Fire one suggested question by index as soon as the panel mounts, so the
   * guided tour can show a grounded answer without a presenter clicking. Asking
   * is a read: it composes a scripted, cited answer in local state and mutates
   * nothing in the store. Out-of-range values are ignored.
   */
  autoAskIndex?: number
}

export function CopilotInline({ entityId, tabs = ['ask'], defaultTab, agentRun = 'mapping', collapsible = false, defaultCollapsed = false, suggestedQuestions, autoAskIndex }: Props) {
  const navigate = useNavigate()
  const ctx: RecordContext | null = React.useMemo(() => buildRecordContext(entityId), [entityId])

  const [collapsed, setCollapsed] = React.useState(collapsible && defaultCollapsed)
  const [tab, setTab] = React.useState<Tab>(defaultTab ?? tabs[0])
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [draft, setDraft] = React.useState('')
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const autoAsked = React.useRef<string | null>(null)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // Reset the thread (and any in-flight thinking) whenever the grounding record changes.
  React.useEffect(() => {
    clearTimers()
    setTurns([])
    setDraft('')
    autoAsked.current = null
    return clearTimers
  }, [entityId])

  const go = (route: string) => navigate(route)

  // Staged, agent-like reveal: read → gather → parse → compose, then the answer.
  const ask = (q: string) => {
    const question = q.trim()
    if (!question || !ctx) return
    const a = groundedResponder.ask(question, ctx)
    const steps = [
      `Reading ${ctx.id} — ${ctx.title}`,
      `Gathering ${ctx.links.length} linked record${ctx.links.length === 1 ? '' : 's'} and ${ctx.sources.length} source${ctx.sources.length === 1 ? '' : 's'}`,
      ctx.sources.length ? `Parsing ${ctx.sources[0].citation}` : 'Cross-referencing the linked records',
      'Composing a grounded answer',
    ]
    setDraft('')
    setTurns((t) => {
      const idx = t.length
      // Advance one step at a time, then settle the turn to 'done'.
      for (let s = 1; s <= steps.length; s++) {
        timers.current.push(
          setTimeout(() => {
            setTurns((cur) =>
              cur.map((turn, i) =>
                i === idx ? { ...turn, step: s, phase: s >= steps.length ? 'done' : 'thinking' } : turn,
              ),
            )
          }, s * THINK_MS),
        )
      }
      return [...t, { q: question, a, steps, phase: 'thinking', step: 0 }]
    })
  }

  const suggestions = suggestedQuestions ?? (ctx ? SUGGESTIONS[ctx.type] ?? [] : [])
  const showTabs = tabs.length > 1

  // Guided tour: fire exactly one suggested question, once per grounding record.
  React.useEffect(() => {
    if (autoAskIndex == null || !Number.isInteger(autoAskIndex) || autoAskIndex < 0) return
    const question = suggestions[autoAskIndex]
    if (!ctx || !question) return
    const token = `${entityId}:${autoAskIndex}`
    if (autoAsked.current === token) return
    autoAsked.current = token
    ask(question)
    // `ask` is stable enough for this one-shot; the token guard prevents repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAskIndex, entityId, ctx, suggestions])

  const header = (
    <>
      <Sparkles className="size-4 shrink-0 text-info" />
      <h3 className="text-sm font-semibold text-foreground">OneGRC Copilot</h3>
      <span className="truncate text-2xs text-muted-foreground">
        {tabs.includes('ask') && tabs.includes('agents')
          ? 'Grounded answers and approve-to-apply agent runs'
          : tab === 'agents'
            ? 'Scripted, approve-to-apply agent run'
            : 'Grounded answers, cited to the record'}
      </span>
      {collapsible && (
        <ChevronDown className={cn('ml-auto size-4 shrink-0 text-muted-foreground transition-transform', collapsed && '-rotate-90')} />
      )}
    </>
  )

  return (
    <div className="card-surface p-4">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className={cn(
            'flex w-full items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !collapsed && 'mb-3',
          )}
        >
          {header}
        </button>
      ) : (
        <div className="mb-3 flex items-center gap-2">{header}</div>
      )}

      {!collapsed && showTabs && (
        <div className="mb-3 flex items-center rounded-md border border-border p-0.5 text-xs">
          {tabs.includes('ask') && <TabBtn active={tab === 'ask'} onClick={() => setTab('ask')} icon={<Sparkles className="size-3.5" />} label="Ask" />}
          {tabs.includes('agents') && <TabBtn active={tab === 'agents'} onClick={() => setTab('agents')} icon={<Bot className="size-3.5" />} label="Agents" />}
        </div>
      )}

      {!collapsed &&
        (tab === 'agents' ? (
        <AgentsPanel runType={agentRun} scope={entityId} onNavigate={go} />
      ) : (
        <div className="space-y-4">
          {/* Grounding record */}
          {ctx ? (
            <div className="rounded-lg border border-info/30 bg-info-soft/40 p-3">
              <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-info">
                <ShieldCheck className="size-3.5" /> Grounded on {ctx.type}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-mono text-2xs font-semibold text-info">{ctx.id}</span>
                <span className="text-sm font-medium text-foreground">{ctx.title}</span>
              </div>
              <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{ctx.summary}</p>
              <div className="mt-1.5 flex items-center gap-3 text-2xs text-muted-foreground">
                <span>{ctx.links.length} linked record{ctx.links.length === 1 ? '' : 's'}</span>
                <span>{ctx.sources.length} cited source{ctx.sources.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              No grounded context for this record yet.
            </div>
          )}

          {/* Suggestions */}
          {ctx && turns.length === 0 && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-2xs text-foreground transition-colors hover:border-info/40 hover:bg-info-soft/40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Thread */}
          {turns.map((t, i) => (
            <div key={i} className="space-y-1.5">
              <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground">{t.q}</div>

              {t.phase === 'thinking' ? (
                <ThinkingSteps steps={t.steps} step={t.step} />
              ) : (
                <div className="rounded-lg rounded-bl-sm border border-border bg-muted/30 p-2.5">
                  <p className="text-xs leading-relaxed text-foreground">{t.a.text}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', t.a.confidence === 'high' ? 'bg-ok-soft text-ok' : 'bg-medium-soft text-medium')}>
                      {t.a.confidence} confidence
                    </span>
                  </div>
                  {/* citations */}
                  {(t.a.sourceIds.length > 0 || t.a.citedIds.length > 0) && (
                    <div className="mt-2 space-y-1 border-t border-border/70 pt-2">
                      {ctx?.sources.filter((s) => t.a.sourceIds.includes(s.id)).map((s) => (
                        <SourceCite key={s.id} sourceId={s.id} title={s.documentTitle} citation={s.citation} />
                      ))}
                      {ctx?.links.filter((l) => t.a.citedIds.includes(l.id)).slice(0, 6).map((l) => (
                        <button
                          key={l.id}
                          onClick={() => go(l.route)}
                          className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-background"
                        >
                          <span className="rounded bg-muted px-1 py-0 text-[10px] text-muted-foreground">{l.relation}</span>
                          <span className="font-mono text-2xs font-semibold text-info">{l.id}</span>
                          <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">{l.label}</span>
                          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask(draft)}
              disabled={!ctx}
              placeholder={ctx ? `Ask about ${ctx.id}…` : 'No record to ask about'}
              className="h-9 flex-1 rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-info/50 disabled:opacity-50"
            />
            <Button size="sm" disabled={!ctx || !draft.trim()} onClick={() => ask(draft)}>
              <CornerDownLeft className="size-4" /> Ask
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

/** A citation row that opens the source viewer in the generic drawer host. */
function SourceCite({ sourceId, title, citation }: { sourceId: string; title: string; citation: string }) {
  const openDrawer = useApp((s) => s.openDrawer)
  return (
    <button
      onClick={() => openDrawer({ kind: 'source-viewer', title, payload: { sourceId } })}
      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-background"
    >
      <ScrollText className="size-3 shrink-0 text-info" />
      <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{citation}</span>
      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </button>
  )
}

/** The live "agent is working" view for an Ask turn. */
function ThinkingSteps({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="rounded-lg rounded-bl-sm border border-info/30 bg-info-soft/20 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-info">
        <Loader2 className="size-3.5 animate-spin" /> Working…
      </div>
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const done = i < step
          const active = i === step
          if (!done && !active) return null
          return (
            <li key={i} className={cn('flex items-center gap-2 text-xs', done ? 'text-foreground' : 'text-muted-foreground')}>
              {done ? <Check className="size-3.5 text-ok" /> : <CircleDot className="size-3.5 animate-pulse text-info" />}
              {s}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
    >
      {icon} {label}
    </button>
  )
}

// ── Agents panel ──────────────────────────────────────────────────────────────
// A single scripted, deterministic run hosted in-page. The run type and scope are
// fixed by the host page (clause→control for a clause; source scan for an act), so
// there is no global run-selector or stray demo-clause chips — it is page-aligned.
const RUN_BLURB: Record<AgentRun, string> = {
  mapping: 'Reads this clause and proposes how to satisfy it — attach to an existing control or create a new one.',
  scan: 'Sweeps the source library for newly-arrived instruments, assesses impact, and proposes a regulatory change that alerts the affected owner.',
}

function AgentsPanel({ runType, scope, onNavigate }: { runType: AgentRun; scope: string; onNavigate: (route: string) => void }) {
  const clauseOverrides = useApp((s) => s.clauseOverrides)
  const sessionControls = useApp((s) => s.sessionControls)
  const recordAgentRun = useApp((s) => s.recordAgentRun)
  const approveAgentAction = useApp((s) => s.approveAgentAction)
  const canClause = useCanAct({ kind: 'clause.save' })
  const canReg = useCanAct({ kind: 'regchange.acknowledge' })
  const gateFor = (a: ProposedAction) => (a.apply.op === 'addInstrumentChange' ? canReg : canClause)

  const [phase, setPhase] = React.useState<'running' | 'done'>('running')
  const [applied, setApplied] = React.useState<Record<string, boolean>>({})

  const result: AgentRunResult | null = React.useMemo(
    () => (runType === 'mapping' ? clauseMappingRun(scope, clauseOverrides, sessionControls) : sourceScanRun()),
    [runType, scope, clauseOverrides, sessionControls],
  )

  // Staged reveal, then record the run to the audit trail (once per run/scope).
  React.useEffect(() => {
    setPhase('running')
    setApplied({})
    const t = setTimeout(() => {
      setPhase('done')
      if (result) recordAgentRun(result)
    }, 900)
    return () => clearTimeout(t)
  }, [runType, scope, result, recordAgentRun])

  const approve = (action: ProposedAction) => {
    if (!result) return
    approveAgentAction(result, action)
    setApplied((s) => ({ ...s, [action.id]: true }))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-info/30 bg-info-soft/40 p-2.5 text-2xs text-muted-foreground">
        {RUN_BLURB[runType]} You approve; nothing changes until you do.
      </div>

      {!result ? (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No clause in scope.</div>
      ) : (
        <>
          {/* steps */}
          <div className="rounded-lg border border-border p-3">
            <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{result.agent}</div>
            <ol className="space-y-1">
              {result.steps.map((st, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                  {phase === 'done' ? <Check className="size-3.5 text-ok" /> : <CircleDot className="size-3.5 animate-pulse text-info" />}
                  {st.label}
                </li>
              ))}
            </ol>
          </div>

          {phase === 'done' && (
            <>
              {/* findings */}
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Findings</div>
                <div className="space-y-1">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-2xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{f.label}</span>
                      {f.route ? (
                        <button onClick={() => onNavigate(f.route!)} className="min-w-0 flex-1 truncate text-left font-medium text-info hover:underline">{f.value}</button>
                      ) : (
                        <span className="min-w-0 flex-1 text-foreground">{f.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* proposed actions */}
              <div className="space-y-1.5">
                <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed actions · approve to apply</div>
                {result.proposedActions.map((a) => (
                  <div key={a.id} className={cn('rounded-lg border p-2.5', a.recommended ? 'border-info/40 bg-info-soft/30' : 'border-border bg-background')}>
                    <div className="flex items-center gap-2">
                      <Bot className="size-3.5 shrink-0 text-info" />
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                      {a.recommended && <span className="rounded bg-info-soft px-1.5 py-0 text-[10px] font-medium text-info">recommended</span>}
                      <span className="ml-auto inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-info" style={{ width: `${a.confidence}%` }} /></span>
                        <span className="text-[10px] font-semibold tnum text-info">{a.confidence}%</span>
                      </span>
                    </div>
                    <p className="mt-1 text-2xs text-muted-foreground">{a.detail}</p>
                    <div className="mt-1.5">
                      {applied[a.id] ? (
                        <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok"><Check className="size-3" /> Applied</span>
                      ) : (
                        <Button size="sm" variant={a.recommended ? 'primary' : 'outline'} disabled={!gateFor(a)} title={gateFor(a) ? undefined : 'You do not have the role to approve this action.'} onClick={() => approve(a)}>
                          Approve &amp; apply
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
