import * as React from 'react'
import { IndianRupee, Save, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { LOSS_CATEGORIES, inrExact, netLoss } from '@/lib/lossEvents'
import type { Incident, LossEvent, LossEventCategory } from '@/types'

const BLANK: LossEvent = {
  isLossEvent: true,
  grossLoss: 0,
  recovery: 0,
  currency: 'INR',
  category: 'Business disruption & system failures',
}

/** Financial impact of an incident — the operational-risk loss record.
 *  Net loss is computed from gross and recovery and is never an input. */
export function FinancialImpact({ inc }: { inc: Incident }) {
  const setLossEvent = useApp((s) => s.setIncidentLossEvent)
  const pushToast = useApp((s) => s.pushToast)
  // Recognising a loss is a first-line responder action on the incident record,
  // the same authority that files a regulator track.
  const canEdit = useCanAct({ kind: 'incident.fileTrack' })

  const saved = inc.lossEvent
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<LossEvent>(saved ?? BLANK)

  // Re-seed the form when navigating between incidents.
  React.useEffect(() => {
    setDraft(inc.lossEvent ?? BLANK)
    setEditing(false)
  }, [inc.id, inc.lossEvent])

  const net = netLoss(draft)
  const recoveryExceeds = draft.recovery > draft.grossLoss

  if (!saved?.isLossEvent && !editing) {
    return (
      <div className="card-surface p-4">
        <Header />
        <p className="mb-3 text-xs text-muted-foreground">No operational-risk loss has been recognised on this incident.</p>
        <Button
          variant="outline"
          size="sm"
          disabled={!canEdit}
          title={canEdit ? undefined : 'Recognising a loss event is done by the Control Owner or Executive persona.'}
          onClick={() => {
            setDraft(BLANK)
            setEditing(true)
          }}
        >
          Record as operational-risk loss event
        </Button>
      </div>
    )
  }

  if (!editing && saved) {
    return (
      <div className="card-surface p-4">
        <Header
          right={
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              title={canEdit ? undefined : 'Editing a loss event is done by the Control Owner or Executive persona.'}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Field label="Gross loss">{inrExact(saved.grossLoss)}</Field>
          <Field label="Recovery">{saved.recovery > 0 ? inrExact(saved.recovery) : '—'}</Field>
          <Field label="Net loss" strong>
            <span className="text-critical">{inrExact(netLoss(saved))}</span>
          </Field>
          <Field label="Recognised">{saved.recognisedOn ? fmtDate(saved.recognisedOn) : '—'}</Field>
          <Field label="Event category" wide>
            {saved.category}
          </Field>
          <Field label="Accounting reference">{saved.accountingRef ?? '—'}</Field>
        </div>
      </div>
    )
  }

  return (
    <div className="card-surface p-4">
      <Header />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Money label="Gross loss (₹)" value={draft.grossLoss} onChange={(grossLoss) => setDraft({ ...draft, grossLoss })} />
        <Money label="Recovery (₹)" value={draft.recovery} onChange={(recovery) => setDraft({ ...draft, recovery })} />
        <label className="block">
          <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Event category</span>
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as LossEventCategory })}
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-info focus:outline-none"
          >
            {LOSS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Accounting reference</span>
          <input
            value={draft.accountingRef ?? ''}
            onChange={(e) => setDraft({ ...draft, accountingRef: e.target.value || undefined })}
            placeholder="JV-FY27-0418"
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none"
          />
        </label>
      </div>

      <div
        className={cn(
          'mt-3 flex items-center justify-between rounded-md px-3 py-2',
          recoveryExceeds ? 'bg-medium-soft' : 'bg-muted/50',
        )}
      >
        <span className="text-xs font-medium text-foreground">
          Net loss <span className="font-normal text-muted-foreground">· gross − recovery, computed</span>
        </span>
        <span className={cn('text-sm font-semibold tnum', recoveryExceeds ? 'text-medium' : 'text-critical')}>{inrExact(net)}</span>
      </div>
      {recoveryExceeds && (
        <p className="mt-1.5 text-2xs text-medium">Recovery exceeds gross loss — net is floored at ₹0; check the figures.</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          disabled={draft.grossLoss <= 0}
          title={draft.grossLoss <= 0 ? 'Enter a gross loss before saving.' : undefined}
          onClick={() => {
            const rec: LossEvent = { ...draft, isLossEvent: true, recognisedOn: draft.recognisedOn ?? new Date().toISOString() }
            setLossEvent(inc.id, rec)
            setEditing(false)
            pushToast({ title: 'Loss event recorded', description: `${inc.id} — net ${inrExact(netLoss(rec))}.`, variant: 'success' })
          }}
        >
          <Save className="size-4" /> Save loss event
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(saved ?? BLANK)
            setEditing(false)
          }}
        >
          Cancel
        </Button>
        {saved?.isLossEvent && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => {
              setLossEvent(inc.id, undefined)
              setEditing(false)
              pushToast({ title: 'Loss event withdrawn', description: `${inc.id} no longer carries a recognised loss.`, variant: 'default' })
            }}
          >
            <Undo2 className="size-4" /> Withdraw
          </Button>
        )}
      </div>
    </div>
  )
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <IndianRupee className="size-4 text-muted-foreground" /> Financial impact
      </h3>
      {right}
    </div>
  )
}

function Field({ label, children, strong, wide }: { label: string; children: React.ReactNode; strong?: boolean; wide?: boolean }) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 text-sm tnum text-foreground', strong && 'font-semibold')}>{children}</div>
    </div>
  )
}

function Money({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        inputMode="numeric"
        value={value === 0 ? '' : String(value)}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
        placeholder="0"
        className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs tnum text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none"
      />
    </label>
  )
}
