import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveCampaigns } from '@/lib/effective'
import { campaignProgress, campaignsForObject, taskStatusLabel } from '@/lib/campaigns'
import type { Campaign, CampaignTask } from '@/types'

const TONE = { 'Not started': 'neutral', Submitted: 'progress', Approved: 'ok', Returned: 'warn', Overdue: 'danger' } as const

/**
 * The assessment cycles that have asked something of this record — shown on the
 * risk and the policy so a cycle is visible from the object, not only from the
 * campaign tracker.
 *
 * One row per cycle, not per task: an attestation fans a task out to every
 * member of staff over the same policy, and thirty rows of the same policy is
 * not a cross-reference. The row shows the reader's own task where they have
 * one, and the cycle's completion where they do not.
 */
export function CampaignsForObject({ objectId, className }: { objectId: string; className?: string }) {
  const navigate = useNavigate()
  const selfId = useApp((s) => s.personId)
  const pairs = campaignsForObject(objectId, useEffectiveCampaigns())

  // Collapse to one row per campaign, preferring the reader's own task.
  const byCampaign = new Map<string, { campaign: Campaign; task?: CampaignTask }>()
  for (const { campaign, task } of pairs) {
    const cur = byCampaign.get(campaign.id)
    if (!cur) byCampaign.set(campaign.id, { campaign, task })
    else if (task.assignee === selfId) cur.task = task
  }
  const rows = [...byCampaign.values()].slice(0, 4)
  if (rows.length === 0) return null

  return (
    <div className={cn('card-surface p-3.5', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <Megaphone className="size-4 text-info" />
        <h3 className="text-sm font-semibold text-foreground">Assessment cycles</h3>
        <span className="ml-auto text-2xs tnum text-muted-foreground">{byCampaign.size}</span>
      </div>
      <div className="space-y-1">
        {rows.map(({ campaign, task }) => {
          const mine = task && task.assignee === selfId
          const p = campaignProgress(campaign)
          const label = task ? taskStatusLabel(task, campaign) : undefined
          return (
            <button
              key={campaign.id}
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
              className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-2xs font-semibold text-info">{campaign.id}</span>
                  <span className="truncate text-2xs text-muted-foreground">{campaign.period}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {mine ? (
                    <>
                      <Avatar id={task!.assignee} size={14} />
                      <span className="shrink-0 text-2xs text-foreground">Yours</span>
                    </>
                  ) : task && byCampaign.size === pairs.length ? (
                    <>
                      <Avatar id={task.assignee} size={14} />
                      <span className="truncate text-2xs text-foreground">{personName(task.assignee)}</span>
                    </>
                  ) : (
                    <span className="shrink-0 text-2xs tnum text-foreground">
                      {p.approved}/{p.total} approved
                    </span>
                  )}
                  <span className="shrink-0 text-2xs tnum text-muted-foreground">
                    {mine && task!.submittedOn ? fmtDate(task!.submittedOn) : `due ${fmtDate(campaign.dueOn)}`}
                  </span>
                </div>
              </div>
              {mine && label ? (
                <StatusChip status={label} tone={TONE[label]} />
              ) : (
                <StatusChip status={campaign.status} tone={campaign.status === 'Closed' ? 'ok' : 'progress'} />
              )}
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
