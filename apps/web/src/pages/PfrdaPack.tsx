import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, Users, ShieldCheck, Siren, FileText, ArrowUpRight, Download,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD, MARQUEE } from '@/data'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative, daysFromNow, NOW } from '@/lib/time'
import { inCrore, inGroup } from '@/lib/format'
import { useApp } from '@/store'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import { COMMITTEES } from '@/data/committees'

const TEMPLATES = [
  'PFRDA Quarterly Compliance Return (Annexure)',
  'ICS Incident Intimation (48-hour)',
  'Annual Cyber-Security Audit Submission',
  'Exposure-Limit Breach Report',
  'Investment Committee Minutes',
  'Half-yearly ICS Self-Assessment',
]

export function PfrdaPack() {
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const addArtifact = useApp((s) => s.addArtifact)

  // Generating any PFRDA template records a session artifact, then previews it.
  const generatePack = (title: string, filename: string) => {
    addArtifact({ kind: 'report', title, createdAt: NOW.toISOString(), payload: { module: 'PFRDA', filename } })
    openDrawer({ kind: 'export-pdf', title, payload: { filename } })
  }

  const pfrdaObls = WORLD.obligations.filter((o) => o.regulator === 'PFRDA')
  const returns = pfrdaObls.slice(0, 8)
  const exposureControls = WORLD.controls.filter((c) =>
    /exposure|investment limit|maker-checker|nav|reconciliation of subscriber|scheme-wise/i.test(c.title),
  )
  const quarterly = pfrdaObls.find((o) => /quarterly compliance/i.test(o.title))
  const annual = pfrdaObls.find((o) => /annual cyber/i.test(o.title))

  return (
    <div>
      <PageHeader
        eyebrow="Compliance · PFRDA"
        title="PFRDA Pack"
        description="Periodical returns, committee cadence, exposure-limit controls and ICS incident reporting."
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('PFRDA')} />
            <Button variant="outline" size="sm" onClick={() => generatePack('PFRDA board pack', 'PFRDA-pack-Q1-FY27.pdf')}>
              <Download className="size-4" /> Export PFRDA pack
            </Button>
          </div>
        }
      />

      {/* mandate context */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ctx label="AUM" value={inCrore(324718)} />
        <Ctx label="Subscribers" value={inGroup(4186902)} />
        <Ctx label="PFRDA obligations" value={String(pfrdaObls.length)} />
        <Ctx label="Schemes" value="E / C / G / A · Tier I & II" small />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* periodical returns */}
        <Section title="Periodical & compliance returns" icon={<CalendarClock className="size-4 text-info" />} sub="to PFRDA / NPS Trust">
          <div className="space-y-1">
            {returns.map((o) => (
              <button key={o.id} onClick={() => navigate(`/obligations/${o.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                <span className="font-mono text-2xs font-semibold text-info">{o.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o.title}</span>
                <span className="hidden text-2xs text-muted-foreground sm:inline">{o.frequency}</span>
                <StatusChip status={o.status} />
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/obligations')} className="mt-2 text-2xs font-medium text-info hover:underline">
            View all {pfrdaObls.length} PFRDA obligations on the calendar →
          </button>
        </Section>

        {/* committee cadence */}
        <Section title="Committee cadence" icon={<Users className="size-4 text-info" />} sub="IISC · Risk · Audit · NRC · Compliance">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COMMITTEES.map((c) => (
              <div key={c.name} className="rounded-md border border-border bg-background p-2.5">
                <div className="text-xs font-medium text-foreground">{c.name}</div>
                <div className="mt-0.5 text-2xs text-muted-foreground">{c.cadence}</div>
                {(c.quorum || c.members) && (
                  <div className="mt-0.5 text-2xs text-muted-foreground">
                    {c.members ? `${c.members.length} members` : null}
                    {c.members && c.quorum ? ' · ' : null}
                    {c.quorum ? `quorum ${c.quorum}` : null}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Avatar id={c.chair} size={18} />
                  <span className="text-2xs text-foreground">Chair {personName(c.chair)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-2xs text-muted-foreground">
                  <span>Last {fmtDate(daysFromNow(c.lastDays))}</span>
                  <span className="text-foreground">Next {fmtRelative(daysFromNow(c.nextDays))}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* exposure-limit controls */}
        <Section title="Exposure-limit monitoring controls" icon={<ShieldCheck className="size-4 text-ok" />} sub="investment compliance">
          <div className="space-y-1">
            {exposureControls.map((c) => (
              <button key={c.id} onClick={() => navigate(`/controls/${c.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
                {c.automation === 'CCM' && <span className="rounded bg-ok-soft px-1 text-2xs font-medium text-ok">CCM</span>}
                <StatusChip status={c.result} />
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            {exposureControls.length === 0 && <p className="text-xs text-muted-foreground">Exposure controls mapped under PFRDA ICS.</p>}
          </div>
        </Section>

        {/* ICS incident obligations */}
        <Section title="ICS incident reporting" icon={<Siren className="size-4 text-critical" />} sub="quarterly · 48-hour · annual">
          <div className="space-y-2">
            <button onClick={() => navigate(`/incidents/${MARQUEE.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-critical/30 bg-critical-soft/30 px-2.5 py-2 text-left hover:bg-critical-soft/50">
              <span className="rounded bg-critical px-1.5 py-0.5 text-2xs font-semibold text-white">48-HOUR</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-foreground">Subscriber-impacting incident intimation</div>
                <div className="text-2xs text-muted-foreground">Live now · {MARQUEE.id} ransomware · PFRDA track running</div>
              </div>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
            {quarterly && <IcsRow tag="QUARTERLY" o={quarterly} onClick={() => navigate(`/obligations/${quarterly.id}`)} />}
            {annual && <IcsRow tag="ANNUAL" o={annual} onClick={() => navigate(`/obligations/${annual.id}`)} />}
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-2xs text-muted-foreground">
              ICS taxonomy (Critical/High/Medium/Low) per circular PFRDA/2025/05/ICS/01.
            </div>
          </div>
        </Section>
      </div>

      {/* report templates */}
      <div className="mt-4 card-surface p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FileText className="size-4 text-muted-foreground" /> Report templates
          <span className="ml-2 rounded-full bg-muted px-1.5 py-0 text-2xs font-semibold tnum text-muted-foreground">{TEMPLATES.length}</span>
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => generatePack(t, `${t.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`)}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
            >
              <FileText className="size-3.5 shrink-0 text-info" />
              <span className="min-w-0 flex-1 truncate">{t}</span>
              <Download className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

function IcsRow({ tag, o, onClick }: { tag: string; o: { id: string; title: string; status: string; dueDate: string }; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/40">
      <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground">{tag}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-foreground">{o.title}</div>
        <div className="text-2xs text-muted-foreground">{o.id} · due {fmtDate(o.dueDate)}</div>
      </div>
      <StatusChip status={o.status} />
      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

function Section({ title, icon, sub, children }: { title: string; icon: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-4">
      <div className="mb-2.5 flex items-center gap-1.5">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <span className="ml-auto text-2xs text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

function Ctx({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="card-surface p-3">
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 font-semibold tnum text-foreground', small ? 'text-xs' : 'text-lg')}>{value}</div>
    </div>
  )
}
