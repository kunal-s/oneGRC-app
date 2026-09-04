import { ROLES } from '../../setup/reference-data'
import type { ViewOption } from './identity.types'

const COMMITTEE_ROLES = new Set(['AUDIT_CTTEE', 'RISK_CTTEE'])

/**
 * SCR-082-050 to 057, D-045: the views the signed-in person's own roles give
 * them, computed from E-05 PersonRole. Never a static list (SCR-082-051).
 *
 * A committee role is always its own view: a governance hat is a distinct
 * altitude, never merged with the operating one. Every other (functional)
 * role the person holds collapses into ONE view, carrying every functional
 * role code so the nav and the queue at that altitude are the union FRD 4.2
 * requires (SCR-082-057), not the first role alone. The merged view's label
 * is the first functional role in catalogue order, EXEC first, which is why
 * a person holding both Executive and Risk Manager reads simply "Executive".
 *
 * The Company Secretary view is not a tenth role (SCR-082-053, SCR-082-054).
 * It is the same Compliance Manager functional view, relabelled for the
 * person whose job title is literally Company Secretary. jobTitle is real,
 * stored data on E-03 Person, not an invented distinction.
 */
export function computeViews(person: { jobTitle: string; roles: string[] }): ViewOption[] {
  const held = new Set(person.roles)
  const functional = ROLES.filter((r) => held.has(r.code) && !COMMITTEE_ROLES.has(r.code))
  const committee = ROLES.filter((r) => held.has(r.code) && COMMITTEE_ROLES.has(r.code))

  const views: ViewOption[] = []
  if (functional.length > 0) {
    const primary = functional[0]
    const isCompanySecretary = primary.code === 'COMPLIANCE_MGR' && person.jobTitle === 'Company Secretary'
    views.push({
      key: isCompanySecretary ? 'COMPANY_SECRETARY' : primary.code,
      roleCodes: functional.map((r) => r.code),
      label: isCompanySecretary ? 'Company Secretary' : primary.name,
    })
  }
  for (const c of committee) {
    views.push({ key: c.code, roleCodes: [c.code], label: c.name, group: 'Committee' })
  }
  return views
}
