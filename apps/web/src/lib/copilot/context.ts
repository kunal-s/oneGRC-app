// Copilot/agent context provider (design seam — Epic 1; panel wired in Epic 5).
// Serializes a record, its linked records and its sources into a plain object so
// a scripted responder now — or a real model later — can answer grounded
// questions without touching screens.
import {
  getRisk, getControl, getObligation, getIncident, getPolicy, getSource, getInstrument,
} from '@/data'
import { resolveEntity } from '@/lib/entity'
import { refDisplayTitle, provisionsForInstrument, awaitingDecision } from '@/lib/sources'
import type { SourceProvision } from '@/types'

export interface ContextLink {
  id: string
  type: string
  label: string
  route: string
  relation: string
}

export interface ContextSource {
  id: string
  documentTitle: string
  citation: string
  snippet: string
}

export interface RecordContext {
  id: string
  type: string
  title: string
  summary: string
  fields: Record<string, string | number | boolean>
  links: ContextLink[]
  sources: ContextSource[]
}

function link(id: string, relation: string): ContextLink {
  const e = resolveEntity(id)
  return { id, type: e.type, label: e.label, route: e.route, relation }
}

function toSources(ids: string[] = []): ContextSource[] {
  return ids
    .map((id) => getSource(id))
    .filter((s): s is SourceProvision => Boolean(s))
    .map((s) => ({ id: s.id, documentTitle: refDisplayTitle(s), citation: s.citation, snippet: s.sourceExtract }))
}

/** Serialize any supported record (id-prefixed) into copilot context, or null. */
export function buildRecordContext(entityId: string): RecordContext | null {
  if (entityId.startsWith('OBL-')) {
    const o = getObligation(entityId)
    if (!o) return null
    const links: ContextLink[] = [
      ...o.evidence.map((e) => link(e, 'Evidence')),
      ...(o.linkedRegChange ? [link(o.linkedRegChange, 'Regulatory change')] : []),
    ]
    return {
      id: o.id, type: 'Obligation', title: o.title,
      summary: `${o.frequency} obligation to ${o.regulator}, owned by ${o.owner}; status ${o.status}, due ${o.dueDate}.`,
      fields: { regulator: o.regulator, frequency: o.frequency, status: o.status, owner: o.owner, dueDate: o.dueDate, reference: o.reference },
      links, sources: toSources(o.sourceRefs),
    }
  }
  if (entityId.startsWith('POL-')) {
    const p = getPolicy(entityId)
    if (!p) return null
    return {
      id: p.id, type: 'Policy', title: p.title,
      summary: `${p.category} policy ${p.version}, owned by ${p.owner}, ${p.status}; enforced by ${p.mappedControls.length} controls.`,
      fields: { category: p.category, version: p.version, status: p.status, owner: p.owner, nextReview: p.nextReview },
      links: p.mappedControls.map((c) => link(c, 'Mapped control')),
      sources: toSources(p.sourceRefs),
    }
  }
  if (entityId.startsWith('CTRL-')) {
    const c = getControl(entityId)
    if (!c) return null
    return {
      id: c.id, type: 'Control', title: c.title,
      summary: `${c.type} control (${c.automation}); last result ${c.result}; satisfies ${c.frameworks.join(', ')}.`,
      fields: { type: c.type, automation: c.automation, result: c.result, owner: c.owner, frequency: c.frequency },
      links: [
        ...c.linkedRisks.map((r) => link(r, 'Risk mitigated')),
        ...c.linkedIssues.map((i) => link(i, 'Open issue')),
      ],
      sources: toSources(c.sourceRefs),
    }
  }
  if (entityId.startsWith('RISK-')) {
    const r = getRisk(entityId)
    if (!r) return null
    return {
      id: r.id, type: 'Risk', title: r.title,
      summary: `${r.domain} risk, ${r.treatment}; inherent ${r.inherent}, residual ${r.residual}; status ${r.status}.`,
      fields: { domain: r.domain, treatment: r.treatment, inherent: r.inherent, residual: r.residual, status: r.status, owner: r.owner },
      links: [
        ...r.linkedControls.map((c) => link(c, 'Mitigating control')),
        ...r.linkedIncidents.map((i) => link(i, 'Realised incident')),
        ...r.linkedIssues.map((i) => link(i, 'Open issue')),
      ],
      sources: [],
    }
  }
  if (entityId.startsWith('INST-')) {
    const inst = getInstrument(entityId)
    if (!inst) return null
    const clauses = provisionsForInstrument(inst.id)
    const saved = clauses.filter((c) => c.status === 'Saved')
    const awaiting = clauses.filter((c) => c.status && awaitingDecision(c.status))
    const controlIds = Array.from(new Set(saved.map((c) => c.linkedControlId).filter((x): x is string => Boolean(x))))
    const links: ContextLink[] = [
      ...clauses.map((c) => link(c.id, 'Clause')),
      ...controlIds.map((cid) => link(cid, 'Satisfying control')),
      ...(inst.supersedesId ? [link(inst.supersedesId, 'Prior version')] : []),
      ...(inst.supersededById ? [link(inst.supersededById, 'Superseded by')] : []),
    ]
    return {
      id: inst.id, type: 'Act', title: inst.title,
      summary: inst.summary ?? `${inst.instrumentType} issued by ${inst.authority}; ${clauses.length} clause${clauses.length === 1 ? '' : 's'}.`,
      fields: {
        authority: inst.authority,
        type: inst.instrumentType,
        status: inst.status,
        version: inst.version ?? '—',
        clauses: clauses.length,
        awaitingDecision: awaiting.length,
        savedToControls: saved.length,
      },
      links,
      // The act's own clauses are its cited sources; cap so a grounded answer stays readable.
      sources: clauses.slice(0, 6).map((s) => ({ id: s.id, documentTitle: refDisplayTitle(s), citation: s.citation, snippet: s.sourceExtract })),
    }
  }
  if (entityId.startsWith('SRC-')) {
    const s = getSource(entityId)
    if (!s) return null
    return {
      id: s.id, type: 'Clause', title: s.nameOfCompliance ?? s.title,
      summary: s.whatItMeans ?? s.briefDescription ?? s.provision,
      fields: { provision: s.provision, severity: s.severity ?? '—', frequency: s.frequency ?? '—', status: s.status ?? '—', applicable: s.applicable ?? true },
      links: s.linkedControlId ? [link(s.linkedControlId, 'Saved to control')] : [],
      sources: [{ id: s.id, documentTitle: refDisplayTitle(s), citation: s.citation, snippet: s.sourceExtract }],
    }
  }
  if (entityId.startsWith('INC-')) {
    const i = getIncident(entityId)
    if (!i) return null
    return {
      id: i.id, type: 'Incident', title: i.title,
      summary: `${i.classification} incident from ${i.source}; status ${i.status}; ${i.regulatorTracks.length} regulator tracks.`,
      fields: { classification: i.classification, source: i.source, status: i.status, subscriberImpacting: i.subscriberImpacting, personalDataInvolved: i.personalDataInvolved },
      links: [
        ...i.linkedControls.map((c) => link(c, 'Control')),
        ...i.linkedRisks.map((r) => link(r, 'Risk')),
        ...i.linkedIssues.map((s) => link(s, 'Issue')),
        ...i.evidence.map((e) => link(e, 'Evidence')),
      ],
      sources: [],
    }
  }
  return null
}
