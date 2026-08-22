import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BadgeCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { fmtDate, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveCampaigns } from '@/lib/effective'
import { PASS_MARK, attestationsFor, coverageTone, hasAttested, openAttestation, policyCoverage } from '@/lib/attestation'
import type { Policy } from '@/types'

/**
 * Who has acknowledged this policy — against the version in force, not against
 * "some version at some point". Republishing resets the count, which is the
 * whole reason the panel reads the way it does.
 */
export function PolicyAttestationPanel({ policy, className }: { policy: Policy; className?: string }) {
  const navigate = useNavigate()
  const selfId = useApp((s) => s.personId)
  const campaigns = useEffectiveCampaigns()
  const cov = policyCoverage(policy, campaigns)
  const open = openAttestation(policy.id, campaigns)
  const records = attestationsFor(policy.id, campaigns)
  const mine = hasAttested(policy.id, selfId, campaigns)

  if (cov.audience === 0 && !open) {
    return (
      <div className={cn('card-surface p-4', className)}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <BadgeCheck className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Attestation</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          This policy has never been put to an attestation cycle. Its controls carry the assurance instead.
        </p>
      </div>
    )
  }

  // Everyone the policy has ever been put to, split by whether their
  // acknowledgement covers the version in force.
  const byPerson = new Map<string, { at: string; version: string; current: boolean; score: number }>()
  for (const rec of records) {
    if (byPerson.has(rec.task.assignee)) continue
    byPerson.set(rec.task.assignee, {
      at: rec.at,
      version: rec.response.version,
      current: rec.currentVersion,
      score: rec.response.comprehensionScore,
    })
  }
  const stale = [...byPerson.entries()].filter(([, v]) => !v.current)

  return (
    <div className={cn('card-surface p-4', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <BadgeCheck className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Attestation</h3>
        <StatusChip status={cov.state} tone={coverageTone(cov.state)} />
        <span className="ml-auto font-mono text-2xs font-semibold text-foreground">{policy.version}</span>
      </div>

      <div className="mb-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <span className="h-full bg-ok" style={{ width: `${(cov.attested / Math.max(1, cov.audience)) * 100}%` }} />
        <span className="h-full bg-medium" style={{ width: `${(cov.stale / Math.max(1, cov.audience)) * 100}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs tnum text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" /> {cov.attested} of {cov.audience} on {policy.version}
        </span>
        {cov.stale > 0 && <span className="text-medium">{cov.stale} on an earlier version</span>}
        <span className="ml-auto font-medium text-foreground">{cov.coveragePct}%</span>
      </div>

      {mine ? (
        <p className="mt-2 rounded-md border border-ok/30 bg-ok-soft/40 px-2.5 py-1.5 text-2xs text-ok">
          You acknowledged {mine.response.version} on {fmtDate(mine.at)} · {mine.response.comprehensionScore}% comprehension
        </p>
      ) : (
        cov.audience > 0 && (
          <p className="mt-2 rounded-md border border-medium/40 bg-medium-soft/30 px-2.5 py-1.5 text-2xs text-foreground">
            You have not acknowledged {policy.version}.
          </p>
        )
      )}

      {open && (
        <button
          onClick={() => navigate(`/campaigns/${open.campaign.id}`)}
          className="group mt-2 flex w-full items-center gap-2 rounded-md border border-info/40 bg-info-soft/30 px-2.5 py-1.5 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-2xs text-foreground">
            <span className="font-mono font-semibold text-info">{open.campaign.id}</span> is collecting acknowledgements ·{' '}
            {open.outstanding} outstanding
          </span>
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      )}

      {stale.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Needs re-acknowledgement · {stale.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {stale.slice(0, 10).map(([id, v]) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded border border-medium/40 bg-medium-soft/30 px-1.5 py-0.5"
                title={`${personName(id)} · ${PEOPLE_BY_ID[id]?.department ?? ''} · signed ${v.version} ${fmtRelative(v.at)}`}
              >
                <Avatar id={id} size={14} />
                <span className="text-2xs text-foreground">{personName(id).split(' ')[0]}</span>
                <span className="font-mono text-2xs text-medium">{v.version}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="mt-2 border-t border-border pt-1.5">
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Cycles</div>
          {Array.from(new Set(records.map((rec) => rec.campaign.id))).slice(0, 3).map((cid) => {
            const rows = records.filter((rec) => rec.campaign.id === cid)
            const c = rows[0].campaign
            const mean = Math.round(rows.reduce((n, x) => n + x.response.comprehensionScore, 0) / rows.length)
            return (
              <button
                key={cid}
                onClick={() => navigate(`/campaigns/${cid}`)}
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-info-soft/30"
              >
                <span className="font-mono text-2xs font-semibold text-info">{cid}</span>
                <span className="truncate text-2xs text-muted-foreground">{c.period}</span>
                <span className="ml-auto shrink-0 text-2xs tnum text-muted-foreground">
                  {rows.length} signed · <span className={mean >= PASS_MARK ? '' : 'text-medium'}>{mean}%</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
