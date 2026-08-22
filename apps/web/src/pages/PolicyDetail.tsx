import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, GitBranch, ShieldCheck, ArrowUpRight, CheckCircle2, AlertTriangle, ScrollText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPills } from '@/components/FrameworkPill'
import { SourceList } from '@/components/SourceRef'
import { ProofChain } from '@/components/ProofChain'
import { resolveProofChain } from '@/lib/proofChain'
import { CopilotInline } from '@/components/copilot/CopilotInline'
import { CampaignsForObject } from '@/components/CampaignsForObject'
import { PolicyAttestationPanel } from './policies/PolicyAttestationPanel'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getPolicy, getControl } from '@/data'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { fmtDate, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'
import type { Framework, Policy } from '@/types'

export function PolicyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const policy = id ? getPolicy(id) : undefined

  if (!policy) return <ComingSoon title="Policy not found" />

  const owner = PEOPLE_BY_ID[policy.owner]
  const controls = policy.mappedControls.map((c) => getControl(c)).filter(Boolean)
  const frameworks = Array.from(
    new Set(controls.flatMap((c) => c!.frameworks)),
  ) as Framework[]
  const versions = buildVersions(policy)
  const reviewOverdue = new Date(policy.nextReview).getTime() < NOW_MS
  const chain = resolveProofChain({ kind: 'policy', policyId: policy.id })

  return (
    <div>
      <button
        onClick={() => navigate('/policies')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Policies
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-info">{policy.id}</span>
            <span className="rounded bg-muted px-1.5 py-0 font-mono text-2xs font-semibold text-foreground">{policy.version}</span>
            <span className="text-muted-foreground">· {policy.category}</span>
          </span>
        }
        title={policy.title}
        description={`Owned by ${owner.name} (${owner.title}); approved by ${personName(policy.approvedBy)}. Operationalised through ${controls.length} mapped controls.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={policy.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDrawer({ kind: 'export-pdf', title: `${policy.title} ${policy.version}`, payload: { filename: `${policy.id}-${policy.version}.pdf` } })}
            >
              <Download className="size-4" /> Download policy
            </Button>
          </div>
        }
      />

      <ProofChain nodes={chain} className="mb-4" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* attributes */}
          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Policy details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar id={policy.owner} size={20} /> <span className="text-xs">{owner.name}</span>
                </span>
              </Attr>
              <Attr label="Approved by">{personName(policy.approvedBy)}</Attr>
              <Attr label="Approved on">{fmtDate(policy.approvedOn)}</Attr>
              <Attr label="Current version">{policy.version}</Attr>
              <Attr label="Status"><StatusChip status={policy.status} /></Attr>
              <Attr label="Next review">
                <span className={cn(reviewOverdue && 'font-medium text-critical')}>
                  {reviewOverdue && <AlertTriangle className="mr-1 inline size-3" />}
                  {fmtDate(policy.nextReview)}
                </span>
              </Attr>
            </div>
            {frameworks.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  Frameworks covered via mapped controls
                </div>
                <FrameworkPills frameworks={frameworks} />
              </div>
            )}
          </div>

          {/* version history */}
          <div className="card-surface p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <GitBranch className="size-4 text-muted-foreground" /> Version history
            </h3>
            <ol className="space-y-0">
              {versions.map((v, i) => (
                <li key={v.version} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < versions.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-border" />}
                  <span className={cn('z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold', i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {v.version.replace('v', '')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">{v.version}</span>
                      {i === 0 && <StatusChip status="Current" tone="ok" />}
                      <span className="text-2xs text-muted-foreground">{fmtDate(v.at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground">{v.note}</p>
                    <div className="mt-0.5 text-2xs text-muted-foreground">Approved by {personName(v.approver)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* approval chain */}
          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Approval chain (maker-checker)</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ApprovalStep role="Drafted by" person={policy.owner} done />
              <ApprovalArrow />
              <ApprovalStep role="Reviewed by" person={policy.owner === 'meera' ? 'anjali' : 'meera'} done />
              <ApprovalArrow />
              <ApprovalStep role="Approved by" person={policy.approvedBy} done={policy.status === 'Published'} />
            </div>
          </div>

          {/* Copilot — only on policies grounded to a source instrument (the mapped samples) */}
          {policy.sourceRefs && policy.sourceRefs.length > 0 && (
            <CopilotInline entityId={policy.id} tabs={['ask']} />
          )}
        </div>

        {/* mapped controls */}
        <div className="space-y-4">
          <PolicyAttestationPanel policy={policy} />
          <CampaignsForObject objectId={policy.id} />
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-ok" />
              <h3 className="text-sm font-semibold text-foreground">Mapped controls</h3>
              <span className="ml-auto text-2xs text-muted-foreground">{controls.length} controls</span>
            </div>
            <div className="scrollbar-thin max-h-[420px] space-y-1 overflow-y-auto">
              {controls.map((c) => (
                <button
                  key={c!.id}
                  onClick={() => navigate(`/controls/${c!.id}`)}
                  className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                >
                  <span className="font-mono text-2xs font-semibold text-info">{c!.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c!.title}</span>
                  {c!.result === 'Pass' ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-ok" />
                  ) : (
                    <StatusChip status={c!.result} />
                  )}
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
          {policy.sourceRefs && policy.sourceRefs.length > 0 && (
            <div className="card-surface p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <ScrollText className="size-4 text-info" /> Source
              </h3>
              <SourceList ids={policy.sourceRefs} />
            </div>
          )}
        </div>
      </div>
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

function ApprovalStep({ role, person, done }: { role: string; person: string; done?: boolean }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
      <Avatar id={person} size={26} />
      <div className="min-w-0">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="truncate text-xs font-medium text-foreground">{personName(person)}</div>
      </div>
      {done && <CheckCircle2 className="ml-auto size-4 text-ok" />}
    </div>
  )
}

function ApprovalArrow() {
  return <ArrowUpRight className="hidden size-4 shrink-0 rotate-45 text-muted-foreground sm:block" />
}

interface Ver {
  version: string
  at: string
  note: string
  approver: string
}

function buildVersions(policy: Policy): Ver[] {
  const [maj, min] = policy.version.replace('v', '').split('.').map(Number)
  const notes = [
    'Current published version — aligned to PFRDA ICS 2024 and DPDP Rules 2025.',
    'Updated control mappings and review cadence.',
    'Annual review — scope and roles refreshed.',
    'Initial issue approved by the board.',
  ]
  const vers: Ver[] = []
  let curMaj = maj
  let curMin = min
  for (let i = 0; i < Math.min(4, maj + 1); i++) {
    vers.push({
      version: `v${curMaj}.${curMin}`,
      at: new Date(new Date(policy.approvedOn).getTime() - i * 190 * 86400000).toISOString(),
      note: notes[i] ?? 'Revision.',
      approver: policy.approvedBy,
    })
    if (curMin > 0) curMin -= 1
    else if (curMaj > 1) {
      curMaj -= 1
      curMin = 0
    }
  }
  return vers
}
