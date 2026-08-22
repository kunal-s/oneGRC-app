import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Building2,
  Download,
  FileCheck2,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { CrossRefPanel } from '@/components/CrossRefPanel'
import { CampaignsForObject } from '@/components/CampaignsForObject'
import { EvidenceList } from '@/components/EvidenceList'
import { cn } from '@/lib/utils'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { fmtDate, fmtIST, fmtRelative, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveVendor } from '@/lib/effective'
import {
  assuranceState,
  concentration,
  currentAssurance,
  diligenceState,
  nextDueDiligenceOn,
  tierTone,
  vendorFlags,
  vendorLadder,
  vendorRating,
} from '@/lib/vendors'
import { WORLD } from '@/data'
import { ComingSoon } from './ComingSoon'
import type { Vendor } from '@/types'

const CRIT_TONE = { Material: 'danger', Important: 'warn', Standard: 'neutral' } as const
const STATUS_TONE = { Active: 'ok', Onboarding: 'progress', 'Under review': 'warn', Exiting: 'danger', Terminated: 'neutral' } as const

const inr = (lakh: number) => (lakh >= 100 ? `₹${(lakh / 100).toFixed(2)} cr` : `₹${lakh.toLocaleString('en-IN')} lakh`)

export function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const auditLog = useApp((s) => s.auditLog)
  const vendor = useEffectiveVendor(id ?? '')

  if (!vendor) return <ComingSoon title="Third party not found" />

  const rating = vendorRating(vendor)
  const flags = vendorFlags(vendor)
  const a = currentAssurance(vendor)
  const as = assuranceState(vendor)
  const ds = diligenceState(vendor)
  const next = nextDueDiligenceOn(vendor)
  const ladder = vendorLadder(vendor)
  const fired = ladder.filter((e) => e.fired)
  const owner = PEOPLE_BY_ID[vendor.owner]
  const trail = auditLog.filter((e) => e.entityId === vendor.id)
  const sharedFourth = concentration(WORLD.vendors).fourthParty
  const contractDays = Math.round((new Date(vendor.contractEnd).getTime() - NOW_MS) / 86400000)

  return (
    <div>
      <button
        onClick={() => navigate('/vendors')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Third parties
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-info">{vendor.id}</span>
            <span className="text-muted-foreground">· {vendor.category}</span>
          </span>
        }
        title={vendor.name}
        description={`${vendor.contractRef} · ${vendor.jurisdiction} · ${inr(vendor.annualSpendLakh)} per annum · onboarded ${fmtDate(vendor.onboardedOn)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={vendor.criticality} tone={CRIT_TONE[vendor.criticality]} />
            <StatusChip status={vendor.status} tone={STATUS_TONE[vendor.status]} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Vendor pack exported', description: `${vendor.id}-due-diligence-pack.pdf.`, variant: 'success' })}
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      {flags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-medium/40 bg-medium-soft/30 px-3 py-2">
          <AlertTriangle className="size-3.5 shrink-0 text-medium" />
          {flags.map((f) => (
            <span key={f} className="rounded bg-background px-1.5 py-0.5 text-2xs font-medium text-medium">
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* the derived tier, with its working shown */}
          <div className="card-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Risk tier</h2>
              <StatusChip status={rating.tier} tone={tierTone(rating.tier)} />
              <span className="text-2xs tnum text-muted-foreground">score {rating.score}</span>
              <span className="ml-auto text-2xs text-muted-foreground">derived, not assigned</span>
            </div>
            <div className="space-y-1">
              {rating.drivers.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{d.label}</span>
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn('block h-full', d.points >= 4 ? 'bg-critical' : d.points >= 2 ? 'bg-medium' : 'bg-info')}
                      style={{ width: `${Math.min(100, (d.points / 6) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-2xs tnum text-muted-foreground">+{d.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* the outsourcing controls a regulator asks about */}
          <div className="card-surface p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-muted-foreground" /> Outsourcing controls
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Gate
                label="Independent assurance"
                ok={as === 'Active'}
                warn={as === 'Expiring soon'}
                detail={a ? `${a.kind} ${a.reference} · ${as === 'Expired' ? 'expired' : 'expires'} ${fmtDate(a.expiresOn)}` : 'None held'}
              />
              <Gate
                label="Due diligence"
                ok={ds === 'Current'}
                warn={ds === 'Due soon'}
                detail={vendor.lastDueDiligenceOn ? `Last ${fmtDate(vendor.lastDueDiligenceOn)}${next ? ` · next ${fmtDate(next)}` : ''}` : 'Never completed'}
              />
              <Gate
                label="Exit plan"
                ok={vendor.exitPlan.documented && !!vendor.exitPlan.testedOn}
                warn={vendor.exitPlan.documented && !vendor.exitPlan.testedOn}
                detail={
                  !vendor.exitPlan.documented
                    ? 'Not documented'
                    : vendor.exitPlan.testedOn
                      ? `Walked through ${fmtDate(vendor.exitPlan.testedOn)} · RTO ${vendor.exitPlan.rto}`
                      : `Documented, never tested · RTO ${vendor.exitPlan.rto}`
                }
              />
              <Gate label="Right to audit" ok={vendor.rightToAudit} detail={vendor.rightToAudit ? 'Contractual right retained' : 'Not secured in the contract'} />
              <Gate
                label="Data-processing agreement"
                ok={vendor.dataAccess.length === 0 || vendor.dataProcessingAgreement}
                detail={
                  vendor.dataAccess.length === 0
                    ? 'No personal data accessed'
                    : vendor.dataProcessingAgreement
                      ? `In place · ${vendor.dataAccess.join(', ')}`
                      : `Missing · vendor accesses ${vendor.dataAccess.join(', ')}`
                }
              />
              <Gate
                label="Contract term"
                ok={contractDays > 90}
                warn={contractDays > 0 && contractDays <= 90}
                detail={`${fmtDate(vendor.contractStart)} → ${fmtDate(vendor.contractEnd)} · ${contractDays > 0 ? `${contractDays} days remaining` : 'expired'}`}
              />
            </div>
          </div>

          {/* services */}
          <div className="card-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Services relied on · {vendor.services.length}</h2>
            <div className="space-y-1">
              {vendor.services.map((svc) => (
                <div key={svc.name} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{svc.name}</span>
                  <span className="shrink-0 text-2xs tnum text-muted-foreground">RTO {svc.rto}</span>
                  <StatusChip status={svc.criticality} tone={CRIT_TONE[svc.criticality]} />
                </div>
              ))}
            </div>
          </div>

          {/* assurance history */}
          <div className="card-surface p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <FileCheck2 className="size-4 text-muted-foreground" /> Assurance held
            </h2>
            {vendor.assurance.length > 0 ? (
              <div className="space-y-1.5">
                {vendor.assurance.map((rep) => {
                  const lapsed = new Date(rep.expiresOn).getTime() < NOW_MS
                  return (
                    <div key={rep.reference} className={cn('rounded-md border px-2.5 py-2', lapsed ? 'border-critical/30 bg-critical-soft/20' : 'border-border')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{rep.kind}</span>
                        <span className="font-mono text-2xs text-muted-foreground">{rep.reference}</span>
                        <span className={cn('ml-auto text-2xs tnum', lapsed ? 'font-medium text-critical' : 'text-muted-foreground')}>
                          {fmtDate(rep.issuedOn)} → {fmtDate(rep.expiresOn)} {lapsed && '· lapsed'}
                        </span>
                      </div>
                      {rep.qualifications && <p className="mt-1 text-2xs text-medium">{rep.qualifications}</p>}
                      {rep.evidenceId && <EvidenceList ids={[rep.evidenceId]} className="mt-1.5" />}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-critical/40 bg-critical-soft/20 px-2.5 py-2 text-xs text-foreground">
                No independent assurance is held over this arrangement.
              </p>
            )}
          </div>

          {/* fourth parties */}
          <div className="card-surface p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Network className="size-4 text-muted-foreground" /> Sub-outsourcing
            </h2>
            {vendor.subOutsourcing.length > 0 ? (
              <div className="space-y-1">
                {vendor.subOutsourcing.map((sub) => {
                  const shared = sharedFourth.find((f) => f.name === sub)
                  return (
                    <div key={sub} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{sub}</span>
                      {shared && (
                        <span className="shrink-0 rounded bg-medium-soft px-1.5 py-0 text-2xs font-medium text-medium" title={shared.vendors.map((v) => v.name).join(', ')}>
                          also behind {shared.vendors.length - 1} other{shared.vendors.length - 1 === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No sub-outsourcing disclosed for this arrangement.</p>
            )}
          </div>

          {/* the ladder */}
          {ladder.length > 0 && (
            <div className="card-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <BellRing className="size-4 text-info" /> Reminders &amp; escalation
                </h2>
                <span className="text-2xs tnum text-muted-foreground">
                  {fired.length} of {ladder.length} rungs fired
                </span>
              </div>
              <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {ladder.map((e, i) => (
                  <li key={i} className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs', e.fired ? 'border-border bg-muted/40' : 'border-dashed border-border')}>
                    <span className={cn('rounded px-1.5 py-0 font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
                      {e.fired ? 'Fired' : 'Scheduled'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {e.kind === 'reminder' ? `Reminder to ${personName(e.target)}` : `Escalate to ${e.targetRole}`} · {e.intervalLabel}
                    </span>
                    <span className="shrink-0 tnum text-muted-foreground" title={fmtIST(e.at)}>
                      {fmtDate(e.at)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {trail.length > 0 && (
            <div className="card-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Activity this session</h2>
              <div className="space-y-1">
                {trail.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 rounded-md border border-border px-2.5 py-1.5">
                    <Avatar id={e.actor} size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-2xs text-foreground">{e.action}</p>
                      {e.detail && <p className="text-2xs text-muted-foreground">{e.detail}</p>}
                    </div>
                    <span className="shrink-0 text-2xs text-muted-foreground">{fmtRelative(e.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Relationship</h3>
            <div className="space-y-2">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar id={vendor.owner} size={20} />
                  <span className="text-xs">{owner?.name ?? personName(vendor.owner)}</span>
                </span>
                {owner && <div className="text-2xs text-muted-foreground">{owner.title}</div>}
              </Attr>
              <Attr label="Jurisdiction">{vendor.jurisdiction}</Attr>
              <Attr label="Annual spend">{inr(vendor.annualSpendLakh)}</Attr>
              <Attr label="Diligence cadence">
                {vendor.dueDiligenceFrequency}
                {next && <span className="ml-1 text-2xs text-muted-foreground">next {fmtDate(next)}</span>}
              </Attr>
              <Attr label="Personal data accessed">
                {vendor.dataAccess.length ? (
                  <span className="inline-flex flex-wrap gap-1">
                    {vendor.dataAccess.map((d) => (
                      <span key={d} className="rounded bg-muted px-1.5 py-0 text-2xs">
                        {d}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </Attr>
            </div>
          </div>

          <CampaignsForObject objectId={vendor.id} />

          <CrossRefPanel
            groups={[
              { label: 'Risks this arrangement drives', ids: vendor.linkedRisks },
              { label: 'Controls over this arrangement', ids: vendor.linkedControls },
              { label: 'Incidents involving this vendor', ids: vendor.linkedIncidents },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function Gate({ label, ok, warn, detail }: { label: string; ok: boolean; warn?: boolean; detail: string }) {
  return (
    <div className={cn('rounded-md border px-2.5 py-2', ok ? 'border-border' : warn ? 'border-medium/50 bg-medium-soft/20' : 'border-critical/40 bg-critical-soft/20')}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{label}</span>
        <StatusChip status={ok ? 'In place' : warn ? 'Attention' : 'Gap'} tone={ok ? 'ok' : warn ? 'warn' : 'danger'} />
      </div>
      <p className="mt-0.5 text-2xs text-muted-foreground">{detail}</p>
    </div>
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

export type { Vendor }
