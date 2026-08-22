// The campaign engine — derivation and the type registry.
//
// A campaign is deliberately thin: it fans a task out per in-scope object,
// tracks who has submitted, routes each submission to a checker, and files a
// completion certificate when the cycle closes. Everything type-specific lives
// behind the registry below, so RCSA (WI-10) and policy attestation (WI-11) are
// payloads rather than parallel machinery.
//
// Nothing here schedules anything. Chasing is the shipped 7/3/1 ladder pointed
// at the campaign's due date.
import type { Campaign, CampaignTask, CampaignType, Evidence } from '@/types'
import { WORLD, getRisk, getPolicy, getVendor } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { NOW_MS } from '@/lib/time'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'
import type { QueueTask, RoleKey, Severity } from '@/types'

// ── type registry ────────────────────────────────────────────────────────────

export interface CampaignTypeSpec {
  type: CampaignType
  /** What the tasks are called in the assignee's queue. */
  taskNoun: string
  /** Which register the in-scope objects come from. */
  objectKind: 'risk' | 'policy' | 'vendor'
  /** Resolve an object id to something displayable. */
  objectLabel: (id: string) => string
  objectRoute: (id: string) => string
  /** One-line summary of a submitted response, for the tracker. */
  summarise: (task: CampaignTask) => string
  /** Whether the module backing this type exists yet. */
  available: boolean
}

export const CAMPAIGN_TYPES: CampaignTypeSpec[] = [
  {
    type: 'RCSA',
    taskNoun: 'risk self-assessment',
    objectKind: 'risk',
    objectLabel: (id) => getRisk(id)?.title ?? id,
    objectRoute: (id) => `/risks/${id}`,
    summarise: (t) => {
      const r = t.response as {
        proposedResidual?: number
        priorResidual?: number
        proposedTreatment?: string
        stillRelevant?: boolean
        controls?: { effectiveness: string }[]
      }
      if (r.stillRelevant === false) return 'Proposed for retirement — no longer relevant'
      if (r.proposedResidual === undefined) return '—'
      const prior = r.priorResidual ?? getRisk(t.objectId)?.residual
      const move = prior === undefined || prior === r.proposedResidual ? 'unchanged' : `${prior} → ${r.proposedResidual}`
      const weak = (r.controls ?? []).filter((c) => c.effectiveness !== 'Effective').length
      const controls = r.controls?.length
        ? ` · ${weak > 0 ? `${weak} of ${r.controls.length} controls not fully effective` : `${r.controls.length} controls effective`}`
        : ''
      return `Residual ${move}${controls}`
    },
    available: true,
  },
  {
    type: 'Policy attestation',
    taskNoun: 'policy acknowledgement',
    objectKind: 'policy',
    objectLabel: (id) => getPolicy(id)?.title ?? id,
    objectRoute: (id) => `/policies/${id}`,
    summarise: (t) => {
      const r = t.response as {
        acknowledged?: boolean
        version?: string
        comprehensionScore?: number
        declaration?: { kind: string }
      }
      if (r.acknowledged === undefined) return '—'
      if (!r.acknowledged) return 'Not acknowledged'
      const current = getPolicy(t.objectId)?.version
      const version = r.version ? (current && r.version !== current ? `${r.version} — superseded by ${current}` : r.version) : ''
      return [
        `Signed${version ? ` ${version}` : ''}`,
        r.comprehensionScore !== undefined ? `${r.comprehensionScore}% comprehension` : undefined,
        r.declaration?.kind,
      ]
        .filter(Boolean)
        .join(' · ')
    },
    available: true,
  },
  {
    type: 'Vendor due diligence',
    taskNoun: 'due-diligence review',
    objectKind: 'vendor',
    objectLabel: (id) => getVendor(id)?.name ?? id,
    objectRoute: (id) => `/vendors/${id}`,
    summarise: (t) => {
      const r = t.response as {
        recommendation?: string
        proposedCriticality?: string
        assuranceCurrent?: boolean
        slaBreaches?: number
      }
      if (!r.recommendation) return '—'
      const v = getVendor(t.objectId)
      const rerate = r.proposedCriticality && v && r.proposedCriticality !== v.criticality ? ` · re-rate to ${r.proposedCriticality}` : ''
      const flags = [r.assuranceCurrent === false ? 'assurance not current' : undefined, r.slaBreaches ? `${r.slaBreaches} SLA breaches` : undefined]
        .filter(Boolean)
        .join(', ')
      return `${r.recommendation}${rerate}${flags ? ` · ${flags}` : ''}`
    },
    available: true,
  },
]

export const campaignType = (t: CampaignType): CampaignTypeSpec =>
  CAMPAIGN_TYPES.find((x) => x.type === t) ?? CAMPAIGN_TYPES[0]

export const availableCampaignTypes = () => CAMPAIGN_TYPES.filter((t) => t.available)

// ── derivation ───────────────────────────────────────────────────────────────

/** A task is overdue when the campaign's due date has passed and it is not in.
 *  Derived, so a stored status can never claim otherwise. */
export function isTaskOverdue(task: CampaignTask, campaign: Campaign): boolean {
  return (task.status === 'Not started' || task.status === 'Returned') && new Date(campaign.dueOn).getTime() < NOW_MS
}

export function taskStatusLabel(task: CampaignTask, campaign: Campaign): CampaignTask['status'] {
  return isTaskOverdue(task, campaign) ? 'Overdue' : task.status
}

export interface CampaignProgress {
  total: number
  notStarted: number
  submitted: number
  approved: number
  returned: number
  overdue: number
  /** Approved as a share of all tasks — the completion figure the tracker shows. */
  completePct: number
  /** Submitted or better — how much of the fan-out has come back at all. */
  respondedPct: number
}

export function campaignProgress(c: Campaign): CampaignProgress {
  const total = c.tasks.length
  const count = (s: CampaignTask['status']) => c.tasks.filter((t) => taskStatusLabel(t, c) === s).length
  const approved = count('Approved')
  const submitted = count('Submitted')
  return {
    total,
    notStarted: count('Not started'),
    submitted,
    approved,
    returned: count('Returned'),
    overdue: count('Overdue'),
    completePct: total ? Math.round((approved / total) * 100) : 0,
    respondedPct: total ? Math.round(((approved + submitted) / total) * 100) : 0,
  }
}

/** Assignees with work outstanding, worst first — who the tracker chases. */
export function outstandingBy(c: Campaign): { assignee: string; open: number; overdue: number }[] {
  const map = new Map<string, { open: number; overdue: number }>()
  for (const t of c.tasks) {
    const label = taskStatusLabel(t, c)
    if (label === 'Approved') continue
    const cur = map.get(t.assignee) ?? { open: 0, overdue: 0 }
    cur.open++
    if (label === 'Overdue') cur.overdue++
    map.set(t.assignee, cur)
  }
  return [...map.entries()]
    .map(([assignee, v]) => ({ assignee, ...v }))
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)
}

/** Distribution of submitted outcomes, using the type's own summariser. */
export function outcomeDistribution(c: Campaign): { label: string; count: number }[] {
  const spec = campaignType(c.type)
  const map = new Map<string, number>()
  for (const t of c.tasks) {
    if (t.status === 'Not started') continue
    const key = spec.summarise(t)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

export const campaignsOfType = (t: CampaignType, all: Campaign[] = WORLD.campaigns) => all.filter((c) => c.type === t)

/** Campaigns touching a given object — shown on the risk / policy record itself. */
export function campaignsForObject(objectId: string, all: Campaign[] = WORLD.campaigns): { campaign: Campaign; task: CampaignTask }[] {
  const out: { campaign: Campaign; task: CampaignTask }[] = []
  for (const c of all) for (const t of c.tasks) if (t.objectId === objectId) out.push({ campaign: c, task: t })
  return out.sort((a, b) => new Date(b.campaign.launchedOn).getTime() - new Date(a.campaign.launchedOn).getTime())
}

// ── chasing (shipped ladder, no new scheduler) ───────────────────────────────

export function campaignLadder(c: Campaign): ReminderEvent[] {
  if (c.status === 'Closed' || c.status === 'Draft') return []
  const firstOutstanding = c.tasks.find((t) => taskStatusLabel(t, c) !== 'Approved')
  if (!firstOutstanding) return []
  return ladderFor(c.id, c.dueOn, firstOutstanding.assignee, c.launchedBy)
}

export const campaignFollowUp = (c: Campaign) => latestFired(campaignLadder(c))

/** Fired rungs across every open campaign, in the audit log's row shape. */
export function campaignAuditRows(): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const c of WORLD.campaigns) {
    const p = campaignProgress(c)
    for (const e of campaignLadder(c)) {
      if (!e.fired) continue
      rows.push({
        id: `LOG-CMP-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action:
          e.kind === 'reminder'
            ? `${c.id} — ${e.intervalLabel} reminder to outstanding assignees`
            : `${c.id} past due — escalated to ${e.targetRole}, ${e.intervalLabel}`,
        object: c.id,
        detail: `${c.title} · ${p.approved}/${p.total} approved · ${p.overdue} overdue`,
      })
    }
  }
  return rows
}

// ── queue ────────────────────────────────────────────────────────────────────

const severityForCampaign = (c: Campaign, overdue: boolean): Severity =>
  overdue ? 'High' : new Date(c.dueOn).getTime() - NOW_MS < 14 * 86400000 ? 'Medium' : 'Low'

/**
 * Campaign work items for the shipped My Queue. Assignees get their submission;
 * reviewers get what is waiting on them. Reuses the existing 'Approval' and
 * 'Evidence request' kinds so `QueueTask['kind']` stays closed.
 */
export function campaignQueueItems(role: RoleKey, all: Campaign[] = WORLD.campaigns): QueueTask[] {
  const out: QueueTask[] = []
  const push = (t: Omit<QueueTask, 'id'>) => out.push({ ...t, id: `Q-CMP-${out.length + 1}` })

  for (const c of all) {
    if (c.status === 'Closed' || c.status === 'Draft') continue
    const spec = campaignType(c.type)
    for (const t of c.tasks) {
      const label = taskStatusLabel(t, c)
      const overdue = label === 'Overdue'

      // The assignee owes a submission.
      if ((label === 'Not started' || label === 'Overdue' || label === 'Returned') && PEOPLE_BY_ID[t.assignee]?.role === role) {
        push({
          role,
          kind: 'Evidence request',
          title: `${label === 'Returned' ? 'Re-submit' : 'Complete'} ${spec.taskNoun} — ${spec.objectLabel(t.objectId)}`,
          ref: c.id,
          route: `/campaigns/${c.id}`,
          due: c.dueOn,
          priority: severityForCampaign(c, overdue),
        })
      }

      // The reviewer owes a decision.
      if (label === 'Submitted' && t.reviewer && PEOPLE_BY_ID[t.reviewer]?.role === role) {
        push({
          role,
          kind: 'Approval',
          title: `Review ${spec.taskNoun} — ${spec.objectLabel(t.objectId)}`,
          ref: c.id,
          route: `/campaigns/${c.id}`,
          due: c.dueOn,
          priority: severityForCampaign(c, false),
        })
      }
    }
  }
  return out
}

// ── evidence ─────────────────────────────────────────────────────────────────

/** The completion certificate filed when a campaign closes. */
export function certificateTitle(c: Campaign): string {
  const p = campaignProgress(c)
  return `${c.type} completion certificate — ${c.title} (${p.approved}/${p.total} approved)`
}

export function campaignEvidence(c: Campaign, resolve: (id: string) => Evidence | undefined): Evidence | undefined {
  return c.evidenceId ? resolve(c.evidenceId) : undefined
}
