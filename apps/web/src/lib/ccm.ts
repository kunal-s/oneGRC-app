import { WORLD } from '@/data'
import { Rand } from '@/data/rng'
import { minsFromNow } from './time'
import type { Control, Framework } from '@/types'

export interface FailingItem {
  ref: string // e.g. CVE id / finding id
  asset: string
  detail: string
  ageDays: number
  slaDays: number
  detectedAt: string
}

export interface CcmRule {
  ruleId: string
  controlId: string
  name: string
  feed: string
  frameworks: Framework[]
  population: number
  passed: number
  failed: number
  status: 'Passing' | 'Failing' | 'Degraded'
  lastRunIso: string
  frequency: string
  description: string
  evidenceIds: string[]
  // present on the marquee failing rule
  failingItems?: FailingItem[]
  spawnedIssueId?: string
  incidentId?: string
}

function ruleName(c: Control): string {
  const t = c.title.toLowerCase()
  if (/patch|vulnerab/.test(t)) return 'All critical vulnerabilities patched within 14 days'
  if (/mfa|authentication/.test(t)) return 'MFA enforced on all privileged access'
  if (/privileged access|access rights|access control/.test(t)) return 'Privileged access recertified within window'
  if (/backup|restoration/.test(t)) return 'Backups completed & restore-tested in last 24h'
  if (/clock/.test(t)) return 'NTP clock synchronization within tolerance'
  if (/malware/.test(t)) return 'Endpoint anti-malware active & up to date'
  if (/logging|^log/.test(t)) return 'Security logging active across critical assets'
  if (/monitor/.test(t)) return 'SIEM monitoring coverage on critical assets'
  if (/configuration|baseline/.test(t)) return 'Secure configuration baseline enforced'
  if (/encrypt|cryptograph/.test(t)) return 'Encryption enabled on subscriber data stores'
  if (/data leakage|masking/.test(t)) return 'Data-leakage controls active on PII stores'
  return c.title
}

function feedFor(c: Control): string {
  const t = c.title.toLowerCase()
  if (/patch|vulnerab/.test(t)) return 'Qualys VM'
  if (/mfa|authentication|access/.test(t)) return 'Okta / AD'
  if (/malware|endpoint/.test(t)) return 'CrowdStrike EDR'
  if (/logging|monitor|^log/.test(t)) return 'Splunk SIEM'
  if (/backup/.test(t)) return 'Sankalp ServiceDesk'
  if (/clock/.test(t)) return 'NTP / NIC'
  return 'AWS Security Hub'
}

const FAILING_ITEMS: FailingItem[] = [
  { ref: 'CVE-2026-21894', asset: 'SPF-WEB-EDGE-02 (subscriber portal edge)', detail: 'Critical RCE in web edge component — patch released, not yet applied', ageDays: 19, slaDays: 14, detectedAt: minsFromNow(-19 * 1440) },
  { ref: 'CVE-2026-20188', asset: 'SPF-FA-APP-01 (fund-accounting app)', detail: 'Critical privilege-escalation in app runtime — change window slipped', ageDays: 16, slaDays: 14, detectedAt: minsFromNow(-16 * 1440) },
  { ref: 'CVE-2025-49113', asset: 'SPF-CRA-IF-03 (CRA interface)', detail: 'Critical deserialization flaw — vendor patch under regression test', ageDays: 22, slaDays: 14, detectedAt: minsFromNow(-22 * 1440) },
]

let CACHE: CcmRule[] | null = null

export function ccmRules(): CcmRule[] {
  if (CACHE) return CACHE
  const r = new Rand(3838)
  const ccmControls = WORLD.controls.filter((c) => c.automation === 'CCM')

  const rules = ccmControls.map((c): CcmRule => {
    const isPatchFail = /patch|vulnerab/.test(c.title.toLowerCase()) && c.result === 'Fail'
    const status: CcmRule['status'] =
      c.result === 'Fail' ? 'Failing' : c.result === 'Partial' ? 'Degraded' : 'Passing'
    const population = r.int(48, 4200)
    let failed = status === 'Passing' ? 0 : status === 'Degraded' ? r.int(1, 4) : r.int(1, 6)
    const evidenceIds = WORLD.evidence.filter((e) => e.linkedControls.includes(c.id)).slice(0, 5).map((e) => e.id)

    const rule: CcmRule = {
      ruleId: c.ccmRuleId ?? c.id.replace('CTRL-', 'CCM-'),
      controlId: c.id,
      name: ruleName(c),
      feed: feedFor(c),
      frameworks: c.frameworks,
      population,
      passed: population - failed,
      failed,
      status,
      lastRunIso: minsFromNow(-r.int(3, 220)),
      frequency: r.pick(['every 15 min', 'hourly', 'every 4 hours', 'daily']),
      description: `Continuously evaluates "${ruleName(c)}" across the full population from the ${feedFor(c)} feed. Evidence is captured on every run.`,
      evidenceIds,
    }

    if (isPatchFail) {
      const issue = WORLD.issues.find((i) => i.linkedControls.includes(c.id))
      failed = FAILING_ITEMS.length
      rule.name = 'All critical vulnerabilities patched within 14 days'
      rule.feed = 'Qualys VM'
      rule.population = 1284
      rule.failed = failed
      rule.passed = rule.population - failed
      rule.lastRunIso = minsFromNow(-8)
      rule.frequency = 'every 4 hours'
      rule.failingItems = FAILING_ITEMS
      rule.spawnedIssueId = issue?.id
      rule.incidentId = 'INC-2026-0411'
      rule.description =
        'Continuously checks every asset in scope against the 14-day critical-patch SLA using the Qualys VM feed. On failure it captures evidence, opens a remediation Issue and links the active incident.'
    }
    return rule
  })

  // surface the failing patch rule first, then other failing/degraded, then passing
  const order = (s: CcmRule['status']) => (s === 'Failing' ? 0 : s === 'Degraded' ? 1 : 2)
  CACHE = rules.sort((a, b) => {
    if (a.failingItems && !b.failingItems) return -1
    if (!a.failingItems && b.failingItems) return 1
    return order(a.status) - order(b.status)
  })
  return CACHE
}

export function getCcmRule(ruleId: string): CcmRule | undefined {
  return ccmRules().find((x) => x.ruleId === ruleId || x.controlId === ruleId)
}

export function ccmStats() {
  const rules = ccmRules()
  return {
    total: rules.length,
    passing: rules.filter((r) => r.status === 'Passing').length,
    failing: rules.filter((r) => r.status === 'Failing').length,
    degraded: rules.filter((r) => r.status === 'Degraded').length,
  }
}
