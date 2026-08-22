// Seeded campaigns.
//
// Four RCSA cycles (three closed, covering the register by domain across the
// year, plus one in flight) and three attestation cycles — one in flight, one
// closed and still current, and one closed against a version the policy has
// since moved past. Both the completed and the mid-cycle states are
// demonstrable, and no tracker is ever empty. The third payload — vendor due
// diligence — runs on the same container over the material outsourcing
// arrangements in the third-party register.
import type {
  AttestationDeclaration,
  Campaign,
  CampaignTask,
  Control,
  ControlEffectiveness,
  Obligation,
  Policy,
  Risk,
  RiskDomain,
  Vendor,
  VendorDdResponse,
} from '@/types'
import { Rand } from './rng'
import { NOW_MS } from '@/lib/time'
import { PEOPLE, checkerFor, CRO } from './people'
import { questionsFor, scoreAnswers } from '@/lib/attestation'

const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => iso(new Date(NOW_MS - n * 86400000))

// Reasons an owner gives when a control is not holding. Non-generic on purpose
// — a bare "needs improvement" is what makes an RCSA unusable at inspection.
const PARTIAL_REASONS = [
  'Operating as designed but tested on a sample of 25 of 118 — coverage is too thin to call it effective.',
  'Design is sound; two of the six monthly runs in the period were completed late.',
  'Compensating manual review is holding the gap while the automated check is rebuilt.',
  'Exceptions are being approved outside the documented threshold in about one case a month.',
]
const INEFFECTIVE_REASONS = [
  'Last two tests failed on the same root cause; the remediation action is open and past due.',
  'Control has not run since the platform migration — no evidence produced this quarter.',
  'Ownership moved twice in the period and the procedure was not re-performed.',
]
const CONCERNS = [
  'Concentration building with the single custodian for Scheme C settlement — worth a separate risk.',
  'Attrition in the fund-accounting team is eroding the four-eyes check on NAV sign-off.',
  'Vendor for the e-KYC feed has not produced a SOC 2 report for two cycles.',
]

/**
 * A complete self-assessment for one risk: re-score plus a rating for every
 * mapped control. `landed` means the cycle already approved it and the register
 * carries the result, so the response records where it came *from*; otherwise
 * the response proposes a change the checker has still to decide.
 */
function rcsaFor(
  risk: Risk,
  byId: Map<string, Control>,
  r: Rand,
  opts: { landed: boolean; drift: number; concern?: string },
): Record<string, unknown> {
  const proposedResidual = opts.landed ? risk.residual : Math.max(1, Math.min(risk.inherent, risk.residual + opts.drift))
  const priorResidual = opts.landed ? Math.max(1, Math.min(risk.inherent, risk.residual - opts.drift)) : risk.residual

  const controls = risk.linkedControls.map((controlId) => {
    const c = byId.get(controlId)
    const fromTest: ControlEffectiveness =
      !c ? 'Not tested' : c.result === 'Pass' ? 'Effective' : c.result === 'Partial' ? 'Partially effective' : 'Ineffective'
    // The first line sometimes marks a control down that the last test passed —
    // the disagreement between tested and self-assessed is the signal the
    // second line reads.
    const effectiveness: ControlEffectiveness =
      fromTest === 'Effective' && r.int(1, 100) <= 18 ? 'Partially effective' : fromTest
    const comment =
      effectiveness === 'Partially effective'
        ? PARTIAL_REASONS[r.int(0, PARTIAL_REASONS.length - 1)]
        : effectiveness === 'Ineffective'
          ? INEFFECTIVE_REASONS[r.int(0, INEFFECTIVE_REASONS.length - 1)]
          : effectiveness === 'Not tested'
            ? 'No test on record for the period.'
            : undefined
    return { controlId, effectiveness, comment }
  })

  const worse = proposedResidual > priorResidual
  const better = proposedResidual < priorResidual
  return {
    stillRelevant: true,
    proposedLikelihood: risk.likelihood,
    proposedImpact: risk.impact,
    proposedResidual,
    priorResidual,
    proposedTreatment: risk.treatment,
    controls,
    rationale: worse
      ? `Exposure re-scored upward: ${controls.filter((c) => c.effectiveness !== 'Effective').length} of ${controls.length} mapped controls are not fully effective this period.`
      : better
        ? 'Remediation actions completed in the period have taken effect; the control test results support the lower score.'
        : 'Position re-confirmed against the current control test results and open remediation actions.',
    emergingConcern: opts.concern,
    evidenceIds: [],
  }
}

/** The version immediately before this one — `v1.6` → `v1.5`, `v2.0` → `v1.9`. */
function previousVersion(v: string): string {
  const m = /^v(\d+)\.(\d+)$/.exec(v)
  if (!m) return v
  const major = Number(m[1])
  const minor = Number(m[2])
  return minor > 0 ? `v${major}.${minor - 1}` : major > 1 ? `v${major - 1}.9` : v
}

/**
 * One person's acknowledgement of one policy version. The comprehension answers
 * are real answers to the real question bank, so a wrong one shows up in the
 * cycle's weakest-question roll-up rather than being a number with nothing
 * behind it.
 */
function attestationFor(
  policy: Policy,
  r: Rand,
  opts: { version?: string; declaration?: AttestationDeclaration } = {},
): Record<string, unknown> {
  const questions = questionsFor(policy)
  // Most people get everything right; roughly one in five slips on a question.
  const wrongIndex = r.int(1, 100) <= 22 ? r.int(0, questions.length - 1) : -1
  const answers = questions.map((q, i) => {
    const correct = i !== wrongIndex
    const chosen = correct ? q.answer : (q.answer + 1) % q.options.length
    return { questionId: q.id, chosen, correct }
  })
  return {
    version: opts.version ?? policy.version,
    acknowledged: true,
    answers,
    comprehensionScore: scoreAnswers(answers, questions.length),
    declaration: opts.declaration,
  }
}

/**
 * One vendor's annual due-diligence review. Prefilled from what the register
 * already knows so the reviewer is confirming or contradicting facts, and the
 * recommendation follows from those facts rather than floating free of them.
 */
function vendorDdFor(v: Vendor, r: Rand, opts: { landed: boolean }): Record<string, unknown> {
  const assuranceOk = new Date(currentAssuranceExpiry(v)).getTime() > NOW_MS
  const exitOk = !!v.exitPlan.testedOn
  const dpaOk = v.dataAccess.length === 0 || v.dataProcessingAgreement
  const slaBreaches = v.criticality === 'Material' ? r.int(0, 3) : r.int(0, 1)

  // A review that finds a lapsed report and still says "continue" is the thing
  // the checker exists to catch, so the seed never produces one.
  const recommendation: VendorDdResponse['recommendation'] = !assuranceOk || !dpaOk
    ? v.criticality === 'Material'
      ? 'Remediate'
      : 'Continue with conditions'
    : !exitOk && v.criticality === 'Material'
      ? 'Continue with conditions'
      : v.status === 'Exiting'
        ? 'Exit'
        : 'Continue'

  const conditions =
    recommendation === 'Continue with conditions'
      ? !assuranceOk
        ? `Renewed ${v.assurance[0]?.kind ?? 'assurance report'} to be furnished within 60 days; quarterly service review in the interim.`
        : 'Exit plan to be documented and walked through with the business before the next review.'
      : recommendation === 'Exit'
        ? 'Records recalled and destruction certificate obtained; exit to complete before contract end.'
        : recommendation === 'Remediate'
          ? 'Escalated to the Risk Committee — a material arrangement cannot run on lapsed assurance.'
          : undefined

  return {
    financialsReviewed: true,
    assuranceCurrent: assuranceOk,
    assuranceGap: assuranceOk ? undefined : `${v.assurance[0]?.kind ?? 'Assurance report'} expired; renewal requested from the counterparty.`,
    dataProcessingAgreement: v.dataProcessingAgreement,
    subOutsourcingDisclosed: true,
    subOutsourcingNotes: v.subOutsourcing.length ? v.subOutsourcing.join(', ') : 'No sub-outsourcing disclosed for the period.',
    exitPlanTested: exitOk,
    incidentsInPeriod: v.linkedIncidents.length,
    slaBreaches,
    // An approved review has already re-rated the vendor, so the response
    // agrees with the register; a pending one may not.
    proposedCriticality: opts.landed ? v.criticality : slaBreaches >= 3 && v.criticality === 'Important' ? 'Material' : v.criticality,
    recommendation,
    conditions,
    rationale:
      recommendation === 'Continue'
        ? `Service delivered within the agreed levels across the period; assurance current and the exit plan walked through. ${slaBreaches === 0 ? 'No SLA breaches.' : `${slaBreaches} SLA breach${slaBreaches === 1 ? '' : 'es'}, all remedied within the credit window.`}`
        : recommendation === 'Exit'
          ? 'Uncontrolled access to physical files at the last inspection; the arrangement is being wound down.'
          : !assuranceOk
            ? `Independent assurance has lapsed on an arrangement carrying ${v.services.filter((s) => s.criticality === 'Material').length || 1} service(s) the fund depends on. Continuation is only defensible against a dated renewal commitment.`
            : 'Exit plan has never been walked through, which leaves the fund without a demonstrated route out of a material arrangement.',
  }
}

const currentAssuranceExpiry = (v: Vendor): string =>
  [...v.assurance].sort((a, b) => new Date(b.expiresOn).getTime() - new Date(a.expiresOn).getTime())[0]?.expiresOn ?? daysAgo(1)

export function buildCampaigns(
  risks: Risk[],
  policies: Policy[],
  obligations: Obligation[],
  controls: Control[],
  vendors: Vendor[],
): Campaign[] {
  const r = new Rand(9091)
  const out: Campaign[] = []
  const byId = new Map(controls.map((c) => [c.id, c]))

  const selfAssessment = obligations.find((o) => /self-assessment/i.test(o.title) && o.status !== 'Filed')
  const codeOfConduct = policies.find((p) => p.id === 'POL-018') ?? policies.find((p) => /code of conduct/i.test(p.title))

  // ── 1 · the completed cycles ────────────────────────────────────────────────
  // The register is assessed by domain across the year rather than all at once
  // — the pattern a firm of this size actually runs, and the reason coverage is
  // a real number instead of 100%. Every risk sits in exactly one cycle, so a
  // record's assessment history reads as a clean chain rather than two cycles
  // claiming to have arrived at the same score from different places.
  const inFlightScope = risks
    .filter((x) => x.domain === 'Operational' || x.domain === 'Investment')
    .sort((a, b) => b.residual - a.residual)
    .slice(0, 22)
  const inFlightIds = new Set(inFlightScope.map((x) => x.id))

  const closedCycles: { id: string; title: string; period: string; scope: Risk[]; domains: RiskDomain[]; closedDaysAgo: number }[] = [
    {
      id: 'CMP-RCSA-03',
      title: 'FY2025-26 RCSA — IT & Cyber',
      period: 'H1 FY2025-26',
      scope: risks.filter((x) => x.domain === 'IT' || x.domain === 'Cyber'),
      domains: ['IT', 'Cyber'],
      closedDaysAgo: 334,
    },
    {
      id: 'CMP-RCSA-01',
      title: 'H2 FY2025-26 RCSA — Operational & Investment',
      period: 'H2 FY2025-26',
      scope: risks.filter((x) => (x.domain === 'Operational' || x.domain === 'Investment') && !inFlightIds.has(x.id)),
      domains: ['Operational', 'Investment'],
      closedDaysAgo: 185,
    },
    {
      id: 'CMP-RCSA-04',
      title: 'FY2026-27 RCSA — Compliance & Third-party',
      period: 'Q1 FY2026-27',
      scope: risks.filter((x) => x.domain === 'Compliance' || x.domain === 'ThirdParty'),
      domains: ['Compliance', 'ThirdParty'],
      closedDaysAgo: 137,
    },
  ]

  for (const cyc of closedCycles) {
    const tasks: CampaignTask[] = cyc.scope.map((risk, i) => ({
      id: `CMPT-${cyc.id}-${String(i + 1).padStart(2, '0')}`,
      campaignId: cyc.id,
      assignee: risk.owner,
      objectId: risk.id,
      status: 'Approved',
      submittedOn: daysAgo(cyc.closedDaysAgo + r.int(15, 55)),
      reviewer: checkerFor(risk.owner),
      reviewedOn: daysAgo(cyc.closedDaysAgo + r.int(4, 13)),
      response: rcsaFor(risk, byId, r, {
        landed: true,
        drift: r.weighted<number>([[0, 5], [-1, 3], [-2, 2], [1, 1]]),
        concern: i === 3 ? CONCERNS[0] : undefined,
      }),
      evidenceIds: [],
    }))
    out.push({
      id: cyc.id,
      type: 'RCSA',
      title: cyc.title,
      scope: { domains: cyc.domains, objectIds: cyc.scope.map((x) => x.id) },
      period: cyc.period,
      launchedOn: daysAgo(cyc.closedDaysAgo + 83),
      dueOn: daysAgo(cyc.closedDaysAgo + 3),
      launchedBy: 'meera',
      status: 'Closed',
      tasks,
      obligationId: selfAssessment?.id,
      closedOn: daysAgo(cyc.closedDaysAgo),
      // Closed campaigns carry their certificate; the id is bound in world.ts
      // once the evidence pool exists.
      evidenceId: undefined,
    })
  }

  // ── 2 · RCSA, in flight — the current half, partially returned ─────────────
  {
    const scope = inFlightScope
    const tasks: CampaignTask[] = scope.map((risk, i) => {
      const reviewer = checkerFor(risk.owner)
      // 78% complete, a handful outstanding — the worked example in WI-10.
      const status = r.weighted<CampaignTask['status']>([
        ['Approved', 11],
        ['Submitted', 3],
        ['Not started', 4],
        ['Returned', 1],
      ])
      const submitted = status !== 'Not started'
      return {
        id: `CMPT-CMP-RCSA-02-${String(i + 1).padStart(2, '0')}`,
        campaignId: 'CMP-RCSA-02',
        assignee: risk.owner,
        objectId: risk.id,
        status,
        submittedOn: submitted ? daysAgo(r.int(4, 30)) : undefined,
        reviewer,
        reviewedOn: status === 'Approved' || status === 'Returned' ? daysAgo(r.int(1, 3)) : undefined,
        reviewNote: status === 'Returned' ? 'Returned — the proposed re-score is not supported by the control evidence attached.' : undefined,
        response: submitted
          ? rcsaFor(risk, byId, r, {
              // Approved tasks have already written back; submitted and
              // returned ones still hold a delta for the checker to decide.
              landed: status === 'Approved',
              drift: status === 'Approved' ? r.weighted<number>([[-2, 4], [-1, 3], [0, 2], [1, 1]]) : r.weighted<number>([[-3, 3], [-1, 3], [0, 2], [2, 2]]),
              concern: i === 1 ? CONCERNS[1] : i === 6 ? CONCERNS[2] : undefined,
            })
          : {},
        evidenceIds: [],
      }
    })
    out.push({
      id: 'CMP-RCSA-02',
      type: 'RCSA',
      title: 'H1 FY2026-27 RCSA — Operational & Investment',
      scope: { domains: ['Operational', 'Investment'], objectIds: scope.map((x) => x.id) },
      period: 'H1 FY2026-27',
      launchedOn: daysAgo(94),
      // Six days past its deadline: assessments still outstanding are Overdue,
      // and the 7/3/1-before / 1/3/7-after ladder has fired rungs on both sides.
      // A cycle that has just slipped is when the chasing engine matters.
      dueOn: daysAgo(6),
      launchedBy: 'meera',
      status: 'In progress',
      tasks,
      obligationId: selfAssessment?.id,
    })
  }

  // ── 3 · Policy attestation, in flight — Code of Conduct to all staff ───────
  if (codeOfConduct) {
    // Every roster member acknowledges; the policy owner reviews.
    const reviewer = codeOfConduct.owner
    const tasks: CampaignTask[] = PEOPLE.map((person, i) => {
      const status = r.weighted<CampaignTask['status']>([
        ['Approved', 8],
        ['Submitted', 2],
        ['Not started', 3],
      ])

      // Three declarations across the cycle, one of each kind, all placed on
      // submitted tasks so the reviewer has something real to decide — the
      // 'Cannot comply' becomes an exception the moment it is approved.
      const declaration =
        i === 5
          ? {
              kind: 'Cannot comply' as const,
              detail:
                'Dealing-desk staff cannot meet the 24-hour personal-trade disclosure window while the pre-clearance form is offline; disclosures are being logged by email.',
            }
          : i === 9
            ? {
                kind: 'Conflict of interest' as const,
                detail: 'Immediate family member is a director at a firm on the custodian shortlist; recused from the selection.',
              }
            : i === 14
              ? { kind: 'Clarification needed' as const, detail: 'Unclear whether the gifts threshold applies per gift or per counterparty per year.' }
              : undefined
      // A declaration always lands as Submitted — it is a decision the reviewer
      // owes, and it must not be pre-approved out of the demo path.
      const finalStatus: CampaignTask['status'] = declaration ? 'Submitted' : status
      const signed = finalStatus !== 'Not started'
      return {
        id: `CMPT-CMP-ATT-01-${String(i + 1).padStart(2, '0')}`,
        campaignId: 'CMP-ATT-01',
        assignee: person.id,
        objectId: codeOfConduct.id,
        status: finalStatus,
        submittedOn: signed ? daysAgo(r.int(2, 26)) : undefined,
        reviewer: reviewer === person.id ? CRO : reviewer,
        reviewedOn: finalStatus === 'Approved' ? daysAgo(r.int(1, 2)) : undefined,
        response: signed ? attestationFor(codeOfConduct, r, { declaration }) : {},
        evidenceIds: [],
      }
    })
    out.push({
      id: 'CMP-ATT-01',
      type: 'Policy attestation',
      title: `${codeOfConduct.title} ${codeOfConduct.version} — annual acknowledgement`,
      scope: { objectIds: [codeOfConduct.id] },
      period: 'FY2026-27',
      launchedOn: daysAgo(29),
      dueOn: iso(new Date(NOW_MS + 33 * 86400000)),
      launchedBy: codeOfConduct.owner,
      status: 'In progress',
      tasks,
    })
  }

  // ── 4 · Policy attestation, closed — but the policy has moved on ───────────
  // The worked example of the version rule: everyone signed, the cycle closed
  // clean, and then the policy was republished. Coverage against the version in
  // force is now zero, which is exactly the state a bare "attested: true" flag
  // would hide.
  {
    const secPolicy =
      policies.find((p) => /information security/i.test(p.title) && p.status === 'Published') ??
      policies.find((p) => p.status === 'Published')!
    const reviewer = secPolicy.owner
    const audience = PEOPLE.filter((p) => p.department === 'IT and Information Security' || p.department === 'Risk')
    const signedVersion = previousVersion(secPolicy.version)
    const tasks: CampaignTask[] = audience.map((person, i) => ({
      id: `CMPT-CMP-ATT-02-${String(i + 1).padStart(2, '0')}`,
      campaignId: 'CMP-ATT-02',
      assignee: person.id,
      objectId: secPolicy.id,
      status: 'Approved',
      submittedOn: daysAgo(r.int(120, 150)),
      reviewer: reviewer === person.id ? CRO : reviewer,
      reviewedOn: daysAgo(r.int(112, 118)),
      response: attestationFor(secPolicy, r, { version: signedVersion }),
      evidenceIds: [],
    }))
    out.push({
      id: 'CMP-ATT-02',
      type: 'Policy attestation',
      title: `${secPolicy.title} ${signedVersion} — acknowledgement`,
      scope: { departments: ['IT and Information Security', 'Risk'], objectIds: [secPolicy.id] },
      period: 'H2 FY2025-26',
      launchedOn: daysAgo(168),
      dueOn: daysAgo(118),
      launchedBy: secPolicy.owner,
      status: 'Closed',
      tasks,
      closedOn: daysAgo(110),
      evidenceId: undefined,
    })
  }

  // ── 5 · Policy attestation, closed and still current ───────────────────────
  {
    const aup = policies.find((p) => /acceptable use/i.test(p.title) && p.status === 'Published')
    if (aup) {
      const reviewer = aup.owner
      const tasks: CampaignTask[] = PEOPLE.map((person, i) => ({
        id: `CMPT-CMP-ATT-03-${String(i + 1).padStart(2, '0')}`,
        campaignId: 'CMP-ATT-03',
        assignee: person.id,
        objectId: aup.id,
        status: 'Approved',
        submittedOn: daysAgo(r.int(252, 278)),
        reviewer: reviewer === person.id ? CRO : reviewer,
        reviewedOn: daysAgo(r.int(244, 250)),
        response: attestationFor(aup, r, {
          declaration:
            i === 2
              ? {
                  kind: 'Conflict of interest' as const,
                  detail: 'Runs a personal blog on security topics; cleared with the policy owner before publication.',
                }
              : undefined,
        }),
        evidenceIds: [],
      }))
      out.push({
        id: 'CMP-ATT-03',
        type: 'Policy attestation',
        title: `${aup.title} ${aup.version} — acknowledgement`,
        scope: { objectIds: [aup.id] },
        period: 'H1 FY2025-26',
        launchedOn: daysAgo(300),
        dueOn: daysAgo(250),
        launchedBy: aup.owner,
        status: 'Closed',
        tasks,
        closedOn: daysAgo(242),
        evidenceId: undefined,
      })
    }
  }

  // ── 6 · Vendor due diligence, in flight — the material arrangements ────────
  // The annual review of everything the fund cannot operate without, plus the
  // arrangements the register has already flagged. Scoped by exposure, not by
  // alphabet.
  {
    const scope = vendors
      .filter((v) => v.status !== 'Terminated')
      .filter((v) => v.criticality !== 'Standard' || v.dataAccess.length > 0)
      .slice(0, 14)
    if (scope.length > 0) {
      // Fixed rather than weighted: a mid-cycle tracker has to show every state
      // at once, and an RNG that happens to leave nothing unstarted takes the
      // "someone still owes a review" case off the screen.
      const PATTERN: CampaignTask['status'][] = [
        'Approved', 'Approved', 'Submitted', 'Not started', 'Approved', 'Returned', 'Approved',
        'Not started', 'Submitted', 'Approved', 'Not started', 'Approved', 'Submitted', 'Not started',
      ]
      const tasks: CampaignTask[] = scope.map((vendor, i) => {
        const status = PATTERN[i % PATTERN.length]
        const submitted = status !== 'Not started'
        return {
          id: `CMPT-CMP-VDD-01-${String(i + 1).padStart(2, '0')}`,
          campaignId: 'CMP-VDD-01',
          assignee: vendor.owner,
          objectId: vendor.id,
          status,
          submittedOn: submitted ? daysAgo(r.int(3, 34)) : undefined,
          reviewer: checkerFor(vendor.owner),
          reviewedOn: status === 'Approved' || status === 'Returned' ? daysAgo(r.int(1, 4)) : undefined,
          reviewNote:
            status === 'Returned'
              ? 'Returned — the recommendation to continue is not supportable while the assurance report is lapsed. Impose a condition or route it to remediation.'
              : undefined,
          response: submitted ? vendorDdFor(vendor, r, { landed: status === 'Approved' }) : {},
          evidenceIds: [],
        }
      })
      out.push({
        id: 'CMP-VDD-01',
        type: 'Vendor due diligence',
        title: 'FY2026-27 outsourcing due diligence — material & data-bearing arrangements',
        scope: { objectIds: scope.map((v) => v.id) },
        period: 'FY2026-27',
        launchedOn: daysAgo(61),
        dueOn: iso(new Date(NOW_MS + 19 * 86400000)),
        launchedBy: 'imran',
        status: 'In progress',
        tasks,
      })
    }
  }

  return out
}

/** Bind completion certificates to real evidence items for closed campaigns. */
export function bindCampaignCertificates(campaigns: Campaign[], evidence: { id: string; type: string }[]): void {
  const attestations = evidence.filter((e) => e.type === 'Attestation')
  let i = 0
  for (const c of campaigns) {
    if (c.status !== 'Closed') continue
    c.evidenceId = attestations[i % Math.max(1, attestations.length)]?.id
    i++
  }
}
