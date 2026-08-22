import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ArrowUpRight, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'
import { fmtDate } from '@/lib/time'
import { assuranceState, assuranceTone, currentAssurance, vendorDdDelta, vendorDdGaps } from '@/lib/vendors'
import type { Vendor, VendorCriticality, VendorDdResponse } from '@/types'

const CRITICALITIES: VendorCriticality[] = ['Material', 'Important', 'Standard']
const RECOMMENDATIONS: VendorDdResponse['recommendation'][] = ['Continue', 'Continue with conditions', 'Remediate', 'Exit']

/**
 * The annual review of one outsourcing arrangement. Every question is prefilled
 * from the register, so the reviewer is confirming or contradicting a fact the
 * platform already holds rather than filling in a blank form from memory.
 */
export function VendorDdForm({
  vendor,
  value,
  onChange,
}: {
  vendor: Vendor
  value: VendorDdResponse
  onChange: (r: VendorDdResponse) => void
}) {
  const navigate = useNavigate()
  const set = (patch: Partial<VendorDdResponse>) => onChange({ ...value, ...patch })
  const gaps = vendorDdGaps(value, vendor)
  const a = currentAssurance(vendor)
  const as = assuranceState(vendor)

  return (
    <div className="space-y-4">
      <Step n={1} title="The arrangement">
        <button
          onClick={() => navigate(`/vendors/${vendor.id}`)}
          className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/30"
        >
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-foreground">{vendor.name}</div>
            <div className="truncate text-2xs text-muted-foreground">
              {vendor.contractRef} · {vendor.jurisdiction} · ₹{vendor.annualSpendLakh.toLocaleString('en-IN')} lakh p.a. ·{' '}
              {vendor.services.length} service{vendor.services.length === 1 ? '' : 's'}
            </div>
          </div>
          <StatusChip status={vendor.criticality} tone={vendor.criticality === 'Material' ? 'danger' : vendor.criticality === 'Important' ? 'warn' : 'neutral'} />
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      </Step>

      <Step n={2} title="Counterparty and assurance">
        <Toggle
          label="Financial standing of the counterparty reviewed for the period"
          value={value.financialsReviewed}
          onChange={(v) => set({ financialsReviewed: v })}
        />
        <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
          <span className="text-2xs text-muted-foreground">On record</span>
          {a ? (
            <>
              <span className="text-2xs text-foreground">{a.kind}</span>
              <span className="font-mono text-2xs text-muted-foreground">{a.reference}</span>
              <StatusChip status={as} tone={assuranceTone(as)} />
              <span className="ml-auto text-2xs tnum text-muted-foreground">{as === 'Expired' ? 'expired' : 'expires'} {fmtDate(a.expiresOn)}</span>
            </>
          ) : (
            <span className="text-2xs text-critical">No independent assurance held.</span>
          )}
        </div>
        <Toggle label="Independent assurance is current for the period" value={value.assuranceCurrent} onChange={(v) => set({ assuranceCurrent: v })} />
        {!value.assuranceCurrent && (
          <input
            value={value.assuranceGap ?? ''}
            onChange={(e) => set({ assuranceGap: e.target.value })}
            placeholder="What is being done about the gap, and by when. Required."
            className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </Step>

      <Step n={3} title="Data, sub-outsourcing and exit">
        <Toggle
          label={
            vendor.dataAccess.length
              ? `Data-processing agreement in place (${vendor.dataAccess.join(', ')})`
              : 'Data-processing agreement in place'
          }
          value={value.dataProcessingAgreement}
          onChange={(v) => set({ dataProcessingAgreement: v })}
          warn={vendor.dataAccess.length > 0 && !value.dataProcessingAgreement}
        />
        <Toggle label="Sub-outsourcing disclosed and unchanged" value={value.subOutsourcingDisclosed} onChange={(v) => set({ subOutsourcingDisclosed: v })} />
        <input
          value={value.subOutsourcingNotes ?? ''}
          onChange={(e) => set({ subOutsourcingNotes: e.target.value })}
          placeholder="Fourth parties relied on"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <Toggle
          label={`Exit plan walked through${vendor.exitPlan.testedOn ? ` (last ${fmtDate(vendor.exitPlan.testedOn)})` : ' — never tested'}`}
          value={value.exitPlanTested}
          onChange={(v) => set({ exitPlanTested: v })}
          warn={vendor.criticality === 'Material' && !value.exitPlanTested}
        />
      </Step>

      <Step n={4} title="Performance in the period">
        <div className="grid grid-cols-2 gap-3">
          <Num label="Incidents attributable to the vendor" value={value.incidentsInPeriod} onChange={(v) => set({ incidentsInPeriod: v })} />
          <Num label="SLA breaches" value={value.slaBreaches} onChange={(v) => set({ slaBreaches: v })} />
        </div>
      </Step>

      <Step n={5} title="Rating and recommendation">
        <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Criticality</div>
        <div className="flex flex-wrap gap-1.5">
          {CRITICALITIES.map((c) => (
            <Choice key={c} active={value.proposedCriticality === c} onClick={() => set({ proposedCriticality: c })}>
              {c}
              {c !== vendor.criticality && value.proposedCriticality === c && <span className="ml-1 opacity-80">was {vendor.criticality}</span>}
            </Choice>
          ))}
        </div>
        <div className="mb-1 mt-2.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Recommendation</div>
        <div className="flex flex-wrap gap-1.5">
          {RECOMMENDATIONS.map((rec) => (
            <Choice key={rec} active={value.recommendation === rec} onClick={() => set({ recommendation: rec })} tone={rec === 'Exit' || rec === 'Remediate' ? 'danger' : undefined}>
              {rec}
            </Choice>
          ))}
        </div>
        {(value.recommendation === 'Continue with conditions' || value.recommendation === 'Exit' || value.recommendation === 'Remediate') && (
          <textarea
            value={value.conditions ?? ''}
            onChange={(e) => set({ conditions: e.target.value })}
            rows={2}
            placeholder={value.recommendation === 'Exit' ? 'Exit trigger and timetable.' : 'The conditions being imposed, and by when.'}
            className="mt-1.5 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </Step>

      <Step n={6} title="Conclusion">
        <textarea
          value={value.rationale}
          onChange={(e) => set({ rationale: e.target.value })}
          rows={3}
          placeholder="What the review found, and why the recommendation follows from it."
          className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
      </Step>

      <DdDeltaPanel delta={vendorDdDelta(vendor, value)} />

      {gaps.length > 0 && (
        <ul className="space-y-0.5 rounded-md border border-medium/40 bg-medium-soft/30 px-2.5 py-2">
          {gaps.map((g) => (
            <li key={g} className="flex items-start gap-1.5 text-2xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-medium" /> {g}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DdDeltaPanel({ delta, className }: { delta: ReturnType<typeof vendorDdDelta>; className?: string }) {
  return (
    <div className={cn('rounded-md border border-info/30 bg-info-soft/30 px-2.5 py-2', className)}>
      <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-info">On approval, the register changes</div>
      <ul className="space-y-0.5">
        {delta.map((c) => (
          <li key={c.field} className="flex items-center gap-1.5 text-2xs text-foreground">
            <span className="w-32 shrink-0 text-muted-foreground">{c.field}</span>
            <span className="tnum">{c.from}</span>
            <ArrowRight className="size-3 text-muted-foreground" />
            <span className="font-semibold tnum">{c.to}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Read-only rendering of a submitted review — the checker's view. */
export function VendorDdSummary({ vendor, response }: { vendor: Vendor; response: VendorDdResponse }) {
  const rows: { label: string; ok: boolean; note?: string }[] = [
    { label: 'Financial standing reviewed', ok: response.financialsReviewed },
    { label: 'Independent assurance current', ok: response.assuranceCurrent, note: response.assuranceGap },
    { label: 'Data-processing agreement', ok: response.dataProcessingAgreement },
    { label: 'Sub-outsourcing disclosed', ok: response.subOutsourcingDisclosed, note: response.subOutsourcingNotes },
    { label: 'Exit plan walked through', ok: response.exitPlanTested },
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <Attr label="Recommendation">
          <StatusChip
            status={response.recommendation}
            tone={response.recommendation === 'Continue' ? 'ok' : response.recommendation === 'Exit' || response.recommendation === 'Remediate' ? 'danger' : 'warn'}
          />
        </Attr>
        <Attr label="Criticality">
          {response.proposedCriticality}
          {response.proposedCriticality !== vendor.criticality && <span className="ml-1 text-2xs text-muted-foreground">was {vendor.criticality}</span>}
        </Attr>
        <Attr label="Incidents">{response.incidentsInPeriod}</Attr>
        <Attr label="SLA breaches">{response.slaBreaches}</Attr>
      </div>

      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className={cn('rounded-md border px-2.5 py-1.5', r.ok ? 'border-border' : 'border-medium/50 bg-medium-soft/20')}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-2xs text-foreground">{r.label}</span>
              <StatusChip status={r.ok ? 'Yes' : 'No'} tone={r.ok ? 'ok' : 'danger'} />
            </div>
            {r.note && <p className="mt-0.5 text-2xs text-muted-foreground">{r.note}</p>}
          </div>
        ))}
      </div>

      {response.conditions && (
        <div>
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Conditions</div>
          <p className="rounded-md border border-medium/40 bg-medium-soft/30 px-2.5 py-1.5 text-xs text-foreground">{response.conditions}</p>
        </div>
      )}

      {response.rationale && (
        <div>
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Conclusion</div>
          <p className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground">{response.rationale}</p>
        </div>
      )}

      <DdDeltaPanel delta={vendorDdDelta(vendor, response)} />
    </div>
  )
}

// ── bits ─────────────────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-muted text-2xs font-semibold tnum text-muted-foreground">{n}</span>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  )
}

function Toggle({ label, value, onChange, warn }: { label: string; value: boolean; onChange: (v: boolean) => void; warn?: boolean }) {
  return (
    <label
      className={cn(
        'mt-1.5 flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-1.5 first:mt-0',
        warn ? 'border-medium/50 bg-medium-soft/20' : 'border-border',
      )}
    >
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-3.5 accent-primary" />
      <span className="text-2xs text-foreground">{label}</span>
    </label>
  )
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs tnum outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}

function Choice({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'danger' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1 text-2xs font-medium transition-colors',
        active
          ? tone === 'danger'
            ? 'border-critical bg-critical-soft text-critical'
            : 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs text-foreground">{children}</div>
    </div>
  )
}
