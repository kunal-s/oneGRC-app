export { WORLD, METRICS } from './world'
export type { World } from './world'
export { PEOPLE, PEOPLE_BY_ID, personName, ROLES } from './people'
export { SOURCES, SOURCES_BY_ID, INSTRUMENTS, INSTRUMENTS_BY_ID, sourceForRegulator, sourceForFramework } from './sources'

import { WORLD } from './world'
import { SOURCES_BY_ID, INSTRUMENTS_BY_ID } from './sources'
import type {
  Risk, Control, Obligation, Incident, Policy, Issue, Evidence, Audit, RegulatoryChange, DataAsset, Dsar,
  SourceProvision, SourceInstrument, Vendor, WhistleblowerReport, FraudCase,
} from '@/types'

// id → entity lookups
const idx = {
  risk: new Map(WORLD.risks.map((x) => [x.id, x])),
  control: new Map(WORLD.controls.map((x) => [x.id, x])),
  obligation: new Map(WORLD.obligations.map((x) => [x.id, x])),
  incident: new Map(WORLD.incidents.map((x) => [x.id, x])),
  policy: new Map(WORLD.policies.map((x) => [x.id, x])),
  issue: new Map(WORLD.issues.map((x) => [x.id, x])),
  evidence: new Map(WORLD.evidence.map((x) => [x.id, x])),
  audit: new Map(WORLD.audits.map((x) => [x.id, x])),
  regChange: new Map(WORLD.regChanges.map((x) => [x.id, x])),
  dataAsset: new Map(WORLD.dataAssets.map((x) => [x.id, x])),
  dsar: new Map(WORLD.dsars.map((x) => [x.id, x])),
  vendor: new Map(WORLD.vendors.map((x) => [x.id, x])),
  whistleblower: new Map(WORLD.whistleblower.map((x) => [x.id, x])),
  fraud: new Map(WORLD.fraudCases.map((x) => [x.id, x])),
}

export const getRisk = (id: string): Risk | undefined => idx.risk.get(id)
export const getControl = (id: string): Control | undefined => idx.control.get(id)
export const getObligation = (id: string): Obligation | undefined => idx.obligation.get(id)
export const getIncident = (id: string): Incident | undefined => idx.incident.get(id)
export const getPolicy = (id: string): Policy | undefined => idx.policy.get(id)
export const getIssue = (id: string): Issue | undefined => idx.issue.get(id)
export const getEvidence = (id: string): Evidence | undefined => idx.evidence.get(id)
export const getAudit = (id: string): Audit | undefined => idx.audit.get(id)
export const getRegChange = (id: string): RegulatoryChange | undefined => idx.regChange.get(id)
export const getDataAsset = (id: string): DataAsset | undefined => idx.dataAsset.get(id)
export const getDsar = (id: string): Dsar | undefined => idx.dsar.get(id)
export const getVendor = (id: string): Vendor | undefined => idx.vendor.get(id)
export const getReport = (id: string): WhistleblowerReport | undefined => idx.whistleblower.get(id)
export const getFraudCase = (id: string): FraudCase | undefined => idx.fraud.get(id)
export const getSource = (id: string): SourceProvision | undefined => SOURCES_BY_ID[id]
export const getInstrument = (id: string): SourceInstrument | undefined => INSTRUMENTS_BY_ID[id]

// the marquee incident
export const MARQUEE = WORLD.incidents[0]
