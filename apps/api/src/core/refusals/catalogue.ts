/**
 * ENG-15, the one refusal catalogue (REFU-001, `platform.md` section 6).
 *
 * One row per REF identifier, holding the exact message `platform.md`
 * section 6 gives it, the parameters that message interpolates, the rule it
 * enforces and the HTTP status it is thrown with. A handler names a row and
 * supplies its parameters; it never writes a sentence (REFU-009). The
 * catalogue holds text and nothing else: no rule, no check, no validation.
 * The rule stays where it decides the refusal fires; this module only knows
 * how to say it.
 *
 * Fifteen rows have a real caller today (REFU-020). Sixteen do not, because
 * the write that would throw them does not exist yet (REFU-021): they are
 * written in as text with no caller, so the handler that first needs one
 * takes the wording rather than inventing it. REF-24 is raised by a database
 * trigger and REF-31 by a screen after a redirect; neither can call this
 * module, so both are recorded here only for a test to assert their text
 * against (REFU-003).
 */

export type RefusalId =
  | 'REF-01' | 'REF-02' | 'REF-03' | 'REF-04' | 'REF-05'
  | 'REF-06' | 'REF-07' | 'REF-08' | 'REF-09' | 'REF-10'
  | 'REF-11' | 'REF-12' | 'REF-13' | 'REF-14' | 'REF-15'
  | 'REF-16' | 'REF-17' | 'REF-18' | 'REF-19' | 'REF-20'
  | 'REF-21' | 'REF-22' | 'REF-23' | 'REF-24' | 'REF-25'
  | 'REF-26' | 'REF-27' | 'REF-28' | 'REF-29' | 'REF-30' | 'REF-31'

type Params = Record<string, string | number | undefined>

export interface RefusalDefinition {
  id: RefusalId
  /** The rule cited in `platform.md` section 6, e.g. `BR-AUT-01`. */
  rule: string
  /**
   * The HTTP status this refusal is thrown with. `null` for REF-31, whose
   * surface is a screen reached after a redirect that carries no response
   * body at all (REFU-003).
   */
  status: number | null
  /**
   * REFU-020 / REFU-021: whether this row has a real path today. True for
   * REF-24 and REF-31, which have no TypeScript handler to call this module
   * but are still raised, by a database trigger and a screen respectively
   * (REFU-003).
   */
  hasCaller: boolean
  render(params?: Params): string
}

function define(id: RefusalId, rule: string, status: number | null, hasCaller: boolean, render: (params: Params) => string): RefusalDefinition {
  return { id, rule, status, hasCaller, render: (params: Params = {}) => render(params) }
}

const s = (v: string | number | undefined, fallback = ''): string => (v === undefined ? fallback : String(v))

export const REFUSALS: Record<RefusalId, RefusalDefinition> = {
  'REF-01': define('REF-01', 'BR-AUT-01', 403, true,
    ({ action }) => `No authority is defined for "${s(action)}".`),

  'REF-02': define('REF-02', 'BR-AUT-03', 403, true,
    ({ action, allowed, held }) => `${s(action)} requires one of [${s(allowed)}]; you hold [${s(held)}].`),

  'REF-03': define('REF-03', 'BR-AUT-02', 403, true,
    ({ action, needDepartment, actorDepartment }) =>
      `${s(action)} is reserved to the ${s(needDepartment)} department; you are in ${s(actorDepartment)}.`),

  'REF-04': define('REF-04', 'BR-AUT-05', 403, true,
    ({ action }) => `${s(action)} enforces separation of duties: you submitted this, so you cannot approve it.`),

  'REF-05': define('REF-05', 'BR-AUT-10', 403, true,
    ({ action, line }) => `${s(action)} requires a checker outside the ${s(line)} line.`),

  'REF-06': define('REF-06', 'BR-EVD-01', 400, true,
    // DN-048: where the duty carries no stated evidence requirement, the
    // message stops rather than naming one no record holds.
    ({ requirement }) =>
      requirement
        ? `This duty cannot be submitted without evidence: ${s(requirement)}.`
        : 'This duty cannot be submitted without evidence.'),

  'REF-07': define('REF-07', 'BR-EVD-02', 403, false,
    () => `Verification is the checker's step and cannot be done by whoever attached the evidence.`),

  'REF-08': define('REF-08', 'BR-AI-04', 400, false,
    () => `Generated text is never evidence. Attach the artifact itself.`),

  'REF-09': define('REF-09', 'BR-LFC-01', 400, true,
    ({ entity, requiredState, action, currentState }) =>
      `A ${s(entity)} must be ${s(requiredState)} to be ${s(action)}; this one is ${s(currentState)}.`),

  'REF-10': define('REF-10', 'BR-AI-03', 400, true,
    ({ flagKind }) => `This provision cannot be tracked while ${s(flagKind)} is unresolved.`),

  'REF-11': define('REF-11', 'BR-LFC-03', 400, false,
    ({ n }) => `This plan cannot be submitted while ${s(n)} remediation actions are open.`),

  'REF-12': define('REF-12', 'BR-LFC-05', 400, false,
    ({ regulator }) => `This incident cannot close while the ${s(regulator)} track is unfiled.`),

  'REF-13': define('REF-13', 'BR-LFC-08', 400, false,
    ({ n }) => `This change cannot close while ${s(n)} impacted records are unacknowledged.`),

  'REF-14': define('REF-14', 'BR-LFC-07', 400, false,
    () => `A finding closes only when the auditor has verified the remediation.`),

  'REF-15': define('REF-15', 'BR-LFC-12', 400, false,
    () => `A report closes only with an outcome and substantive feedback to the reporter.`),

  'REF-16': define('REF-16', 'BR-AUT-11', 403, false,
    ({ n }) => `A second renewal requires the Executive. This exception has been renewed ${s(n)} times.`),

  'REF-17': define('REF-17', 'BR-SCP-05', 403, false,
    () => `This case is restricted. You are not on its access list.`),

  'REF-18': define('REF-18', 'BR-SCP-06', 403, false,
    ({ basis }) => `You are recused from this case: ${s(basis)}.`),

  'REF-19': define('REF-19', 'BR-LFC-09', 400, true,
    ({ decision }) => `Record why. A decision of "${s(decision)}" is kept as part of the trail.`),

  'REF-20': define('REF-20', 'BR-LFC-10', 400, false,
    () => `A return carries its reason, so the maker knows what to change.`),

  'REF-21': define('REF-21', '§5.11', 400, false,
    () => `A recovery cannot exceed the loss and turn it into a gain.`),

  'REF-22': define('REF-22', 'BR-DAT-03', 400, false,
    ({ n, rule, citation }) => `${s(n)} records cannot be erased: ${s(rule)}, ${s(citation)}.`),

  'REF-23': define('REF-23', '§14.2', 400, false,
    ({ field, inputs }) => `${s(field)} is computed from ${s(inputs)} and cannot be set.`),

  // REFU-003, REFU-020: raised by a database trigger, not a TypeScript
  // handler, but it is one of the fifteen rows with a real path today.
  'REF-24': define('REF-24', 'BR-AUD-02', 500, true,
    () => `The audit log is append only.`),

  'REF-25': define('REF-25', '§17.5', 409, true,
    ({ person, time, whatChanged }) => `${s(person)} changed this record at ${s(time)}: ${s(whatChanged)}. Review and try again.`),

  'REF-26': define('REF-26', '§5.16', 400, false,
    ({ n }) => `This cycle cannot close while ${s(n)} tasks are outstanding.`),

  'REF-27': define('REF-27', '§7.3', 400, false,
    () => `Retire this duty once its open cycle is filed.`),

  'REF-28': define('REF-28', 'G-13', 400, true,
    ({ type, size }) => `${s(type)} files up to ${s(size)} are accepted.`),

  'REF-29': define('REF-29', 'BR-DAT-06', 403, true,
    () => `An export carries the same scope as the screen it came from.`),

  'REF-30': define('REF-30', 'BR-SCP-08', 404, true,
    ({ id }) => `${s(id)} does not exist, or you cannot open it.`),

  'REF-31': define('REF-31', 'Rule 7, GAP-SCR-011-020', null, true,
    () => `You are signed in, but this platform has no record for you. Ask your administrator to add you.`),
}

export function renderRefusal(id: RefusalId, params?: Params): string {
  return REFUSALS[id].render(params)
}
