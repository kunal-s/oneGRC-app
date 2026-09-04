import type { Department, LineOfDefence } from '@prisma/client'

/**
 * Who is acting, resolved server-side on every request (ADR-002).
 *
 * The client never asserts this. A persona switcher in the UI is an affordance;
 * the server decides, and from Phase 5 the identity arrives from the customer
 * IdP through the same shape.
 */
export interface Actor {
  personId: string
  fullName: string
  jobTitle: string
  department: Department
  lineOfDefence: LineOfDefence
  roles: string[]
}

/**
 * A view over the roles a person holds (SCR-082, D-045). Not a stored entity:
 * computed on every whoami read from E-05 PersonRole, per rule 1.
 */
export interface ViewOption {
  key: string
  roleCodes: string[]
  label: string
  group?: 'Committee'
}

export const SESSION_COOKIE = 'onegrc_session'
