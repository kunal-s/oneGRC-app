// Map an entity id to its detail route + a human label, for cross-references.
import {
  getRisk, getControl, getObligation, getIncident, getPolicy, getIssue,
  getEvidence, getAudit, getRegChange, getDsar, getSource, getInstrument, getVendor, getReport, getFraudCase,
} from '@/data'

export interface EntityRef {
  id: string
  route: string
  label: string
  type: string
}

export function resolveEntity(id: string): EntityRef {
  if (id.startsWith('RISK-')) return { id, route: `/risks/${id}`, label: getRisk(id)?.title ?? id, type: 'Risk' }
  if (id.startsWith('CTRL-')) return { id, route: `/controls/${id}`, label: getControl(id)?.title ?? id, type: 'Control' }
  if (id.startsWith('OBL-')) return { id, route: `/obligations/${id}`, label: getObligation(id)?.title ?? id, type: 'Obligation' }
  if (id.startsWith('INC-')) return { id, route: `/incidents/${id}`, label: getIncident(id)?.title ?? id, type: 'Incident' }
  if (id.startsWith('POL-')) return { id, route: `/policies/${id}`, label: getPolicy(id)?.title ?? id, type: 'Policy' }
  if (id.startsWith('ISS-')) return { id, route: `/issues/${id}`, label: getIssue(id)?.title ?? id, type: 'Issue' }
  if (id.startsWith('EVD-')) return { id, route: `/evidence/${id}`, label: getEvidence(id)?.title ?? id, type: 'Evidence' }
  if (id.startsWith('TSK-')) return { id, route: `/tasks/${id}`, label: id, type: 'Task' }
  if (id.startsWith('AUD-')) return { id, route: `/audits/${id}`, label: getAudit(id)?.title ?? id, type: 'Audit' }
  if (id.startsWith('RCM-')) return { id, route: `/reg-change/${id}`, label: getRegChange(id)?.summary ?? id, type: 'Reg-change' }
  if (id.startsWith('DSAR-')) return { id, route: `/dpdp/dsar/${id}`, label: getDsar(id)?.type ?? id, type: 'DSAR' }
  // A speak-up reference resolves to the case, never to its contents — the
  // label is the id itself so a cross-reference cannot leak a category.
  if (id.startsWith('WB-')) return { id, route: `/whistleblower/${id}`, label: getReport(id)?.reference ?? id, type: 'Speak-up report' }
  if (id.startsWith('FRD-')) return { id, route: `/fraud/${id}`, label: getFraudCase(id)?.title ?? id, type: 'Fraud case' }
  if (id.startsWith('VND-')) return { id, route: `/vendors/${id}`, label: getVendor(id)?.name ?? id, type: 'Vendor' }
  if (id.startsWith('DA-')) return { id, route: '/dpdp', label: id, type: 'Data asset' }
  // Instruments and their sections both have full-page routes in the Source
  // Library; the Epic 1 drawer (SourceRef) remains the quick view.
  if (id.startsWith('INST-')) return { id, route: `/sources/${id}`, label: getInstrument(id)?.title ?? id, type: 'Instrument' }
  if (id.startsWith('SRC-')) return { id, route: `/sources/section/${id}`, label: getSource(id)?.title ?? id, type: 'Section' }
  return { id, route: '/', label: id, type: 'Item' }
}
