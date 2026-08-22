/**
 * Access-control regression checks (Settings → Users & Roles).
 *
 * Run with: npm run check:access
 *
 * These guard the defect that took the whole Settings route down: a column
 * renderer dereferenced admin metadata that the roster had outgrown. The checks
 * cover the fixture, the table's tolerance of a malformed row, the section
 * boundary, and that the role matrix / SoD panel report real enforced authority.
 *
 * Error boundaries only engage in a DOM (they are inert under renderToString),
 * so this mounts against jsdom rather than server-rendering.
 */
import * as React from 'react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
;(globalThis as { window?: unknown }).window = dom.window
;(globalThis as { document?: unknown }).document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { MemoryRouter } from 'react-router-dom'
import { DataTable, type Column } from '@/components/DataTable'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PEOPLE, ROLES, PERSONAS, personaFor } from '@/data/people'
import { usersMissingMeta, userMeta } from '@/pages/settings/settingsData'
import { roleMatrix, sodRules } from '@/pages/settings/roleMatrix'
import { navGroupsForRole } from '@/components/nav-config'
import { canAct, type GrcAction } from '@/lib/gating'
import { Settings } from '@/pages/Settings'
import { useApp } from '@/store'
import type { RoleKey } from '@/types'

// React's act() advice and router future-flag notices fire asynchronously, so a
// scoped silence cannot catch them all — filter them at source instead.
const NOISE = /not wrapped in act|IS_REACT_ACT_ENVIRONMENT|Future Flag|useLayoutEffect does nothing/
const realError = console.error
const realWarn = console.warn
console.error = (...a: unknown[]) => {
  if (!NOISE.test(String(a[0]))) realError(...(a as []))
}
console.warn = (...a: unknown[]) => {
  if (!NOISE.test(String(a[0]))) realWarn(...(a as []))
}

/** React logs caught errors to the console; silence while provoking failures. */
const quiet = <T,>(fn: () => T): T => {
  const e = console.error
  const w = console.warn
  console.error = () => {}
  console.warn = () => {}
  try {
    return fn()
  } finally {
    console.error = e
    console.warn = w
  }
}

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

function mount(el: React.ReactElement): string {
  const host = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<MemoryRouter>{el}</MemoryRouter>))
  return host.innerHTML
}

// 1 · Every roster member has admin metadata. This is the root cause: the map
//     covered 15 of 23 people after the research analysts joined.
const missing = usersMissingMeta(PEOPLE.map((p) => p.id))
check('every roster user has admin metadata', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${PEOPLE.length} users`)

// 2 · An unknown id degrades rather than throwing.
check('unknown user id returns a neutral record', !!userMeta('__nobody__')?.status)

// 3 · A deliberately malformed row renders a placeholder, not a crash.
type Row = { id: string; name: string; meta?: { status: string } }
const malformed: Row[] = [
  { id: 'U1', name: 'WellFormedRow', meta: { status: 'Active' } },
  { id: 'U2', name: 'MalformedRow' }, // no meta — the renderer below will throw on it
]
const cols: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => <span>{r.name}</span> },
  { key: 'status', header: 'Status', render: (r) => <span>{(r.meta as { status: string }).status}</span> },
]
let tableHtml = ''
let tableThrew = false
quiet(() => {
  try {
    tableHtml = mount(<DataTable data={malformed} columns={cols} />)
  } catch {
    tableThrew = true
  }
})
check('malformed row does not throw', !tableThrew)
check('well-formed row still renders', tableHtml.includes('WellFormedRow'))
check('malformed row still renders with a placeholder', tableHtml.includes('MalformedRow') && tableHtml.includes('—'))

// 4 · A forced error inside a section shows the fallback; siblings survive.
function Boom(): React.ReactElement {
  throw new Error('forced section failure')
}
const boundaryHtml = quiet(() =>
  mount(
    <div>
      <p>SIBLING_A</p>
      <ErrorBoundary label="Users and Roles">
        <Boom />
      </ErrorBoundary>
      <p>SIBLING_B</p>
    </div>,
  ),
)
check('failed section shows the fallback panel', boundaryHtml.includes('could not be loaded'))
check('sibling content survives the failure', boundaryHtml.includes('SIBLING_A') && boundaryHtml.includes('SIBLING_B'))
check('fallback offers a retry', boundaryHtml.includes('Retry'))

// 5 · Settings mounts in every persona with no section falling back.
const ROLE_KEYS: RoleKey[] = ROLES.map((r) => r.key)
for (const role of ROLE_KEYS) {
  useApp.getState().setRole(role)
  let html = ''
  let threw = ''
  quiet(() => {
    try {
      html = mount(<Settings />)
    } catch (e) {
      threw = (e as Error).message
    }
  })
  check(`Settings renders for ${role}`, !threw && !html.includes('could not be loaded'), threw)
}

// 6 · The matrix and SoD panel report real, enforced authority.
const matrix = roleMatrix()
check('role matrix covers every persona', matrix.length === ROLES.length, `${matrix.length} rows`)

// 7 · Board committees: one person may hold a functional persona and a
//     governance hat, and the hat must be read-only across every module.
check('committee personas are distinct switcher entries', PERSONAS.filter((p) => p.group === 'Committee').length === 2)
check('a person\'s two hats resolve to different personas', personaFor('sunita', 'AUDITOR').key !== personaFor('sunita', 'ARC').key)
const WRITE_KINDS: GrcAction['kind'][] = [
  'clause.save', 'obligation.submit', 'obligation.approve', 'control.retest', 'incident.fileTrack',
  'issue.resolve', 'regchange.acknowledge', 'dsar.advance', 'admin.configure', 'risk.submit',
  'risk.approve', 'risk.accept', 'risk.action.advance', 'exception.raise', 'exception.approve',
  'exception.renew', 'exception.close',
]
for (const role of ['ARC', 'RMC'] as RoleKey[]) {
  const rep = ROLES.find((r) => r.key === role)!.person
  const writes = WRITE_KINDS.filter((k) => canAct(role, rep, { kind: k } as GrcAction))
  check(`${role} holds no write action`, writes.length === 0, writes.join(', '))
  const row = matrix.find((m) => m.role === role)!
  check(`${role} matrix is View-only`, row.cells.every((c) => c.level === 'View'))
  const items = navGroupsForRole(role).flatMap((g) => g.items)
  const execItems = navGroupsForRole('EXEC').flatMap((g) => g.items)
  check(`${role} nav is scoped below the Executive's`, items.length < execItems.length, `${items.length} vs ${execItems.length}`)
}
check('administrator holds Administer on Settings', matrix.find((r) => r.role === 'ADMIN')?.cells.some((c) => c.module === 'settings' && c.level === 'Administer') === true)
check('auditor cannot approve risk treatment', matrix.find((r) => r.role === 'AUDITOR')?.cells.find((c) => c.module === 'risk')?.level === 'View')

const sod = sodRules()
for (const rule of sod) check(`SoD enforced — ${rule.label}`, rule.enforced)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
