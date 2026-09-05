import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { signInAs, whoAmI } from './functions'

/**
 * Development identity switcher.
 *
 * This is the persona switcher made honest (ADR-002): it sets the SERVER
 * identity through /dev/impersonate rather than filtering the client, and the
 * chip shows what the server says you are, not what the UI assumed. In
 * production the identity arrives from the customer IdP and this bar is gone.
 */
const PEOPLE = [
  { email: 'compliance-head@sample.invalid', label: 'Anjali · Head of Compliance (CS, Mgr)' },
  { email: 'cs-analyst@sample.invalid', label: 'Nikhil · CS Analyst (right dept, analyst)' },
  { email: 'company-secretary@sample.invalid', label: 'Vikram · Company Secretary' },
  { email: 'dpo@sample.invalid', label: 'Priya · DPO (same role, other dept)' },
  { email: 'tax-lead@sample.invalid', label: 'Deepa · Finance & Tax' },
  { email: 'tax-analyst@sample.invalid', label: 'Rohit · Tax Analyst' },
  { email: 'cro@sample.invalid', label: 'Meera · CRO' },
  { email: 'ciso@sample.invalid', label: 'Rajesh · CISO' },
  { email: 'auditor@sample.invalid', label: 'Sunita · Internal Audit' },
  { email: 'admin@sample.invalid', label: 'Imran · Administrator' },
]

export function DevIdentityBar() {
  const qc = useQueryClient()
  const who = useQuery({
    queryKey: ['whoami'],
    queryFn: whoAmI,
    retry: false,
  })

  const become = useMutation({
    mutationFn: signInAs,
    onSuccess: () => void qc.invalidateQueries(),
  })

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-wrap items-center gap-2 border-t border-border bg-card px-3 py-1.5 text-2xs">
      <span className="font-semibold uppercase tracking-wide text-muted-foreground">Dev identity</span>
      {who.data ? (
        <span className="text-foreground">
          {who.data.fullName} · <span className="text-muted-foreground">{who.data.department}</span> ·{' '}
          <span className="font-mono">{who.data.roles.join(', ')}</span>
        </span>
      ) : (
        <span className="text-critical">not signed in, pick someone</span>
      )}
      <span className="flex-1" />
      <select
        className="rounded border border-input bg-background px-1.5 py-0.5"
        value=""
        onChange={(e) => e.target.value && become.mutate(e.target.value)}
      >
        <option value="">sign in as…</option>
        {PEOPLE.map((p) => (
          <option key={p.email} value={p.email}>{p.label}</option>
        ))}
      </select>
    </div>
  )
}
