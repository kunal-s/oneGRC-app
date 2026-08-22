import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { useApp } from '@/store'
import type { SourceProvision } from '@/types'

/**
 * Save a clause to a control — attach to an existing control or create a new
 * one. One control can satisfy several clauses across acts; attaching adds the
 * clause to the control's "Satisfies" list (Control Library).
 */
export function SaveClauseChooser({ clause, onClose }: { clause: SourceProvision; onClose: () => void }) {
  const navigate = useNavigate()
  const sessionControls = useApp((s) => s.sessionControls)
  const currentPerson = useApp((s) => s.personId)
  const saveClauseToControl = useApp((s) => s.saveClauseToControl)
  const createControlForClause = useApp((s) => s.createControlForClause)
  const pushToast = useApp((s) => s.pushToast)

  const existing = [...WORLD.controls.filter((c) => c.id.startsWith('CTRL-COMP')), ...sessionControls]

  const attach = (controlId: string, title: string) => {
    saveClauseToControl(clause.id, controlId)
    pushToast({ title: 'Saved to control', description: `${clause.id} added to ${controlId} — ${title}.`, variant: 'success' })
    onClose()
    navigate(`/controls/${controlId}`)
  }
  const createNew = () => {
    const id = createControlForClause(clause.id, {
      title: clause.nameOfCompliance ?? clause.title,
      owner: currentPerson,
      frequency: clause.frequency ?? 'Continuous',
      nextDue: clause.nextDue,
      description: clause.whatItMeans ?? clause.briefDescription,
    })
    pushToast({ title: 'Control created & clause saved', description: `${id} created in the Control Library from ${clause.id}.`, variant: 'success' })
    onClose()
    navigate(`/controls/${id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Save clause to a control</h3>
            <p className="text-2xs text-muted-foreground">{clause.id} · {clause.title}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </div>

        <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Attach to an existing control</div>
        <div className="scrollbar-thin max-h-56 space-y-1 overflow-y-auto">
          {existing.map((c) => (
            <button key={c.id} onClick={() => attach(c.id, c.title)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left transition-colors hover:border-info/40 hover:bg-info-soft/40">
              <ShieldCheck className="size-3.5 shrink-0 text-info" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">{c.title}</span>
                <span className="block text-2xs text-muted-foreground">{c.id} · {personName(c.owner)} · {c.frequency}</span>
              </span>
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <Button size="sm" className="w-full" onClick={createNew}><Plus className="size-4" /> Create a new control from this clause</Button>
          <p className="mt-1.5 text-2xs text-muted-foreground">One control can satisfy several clauses across acts — attaching adds this clause to the control’s “Satisfies” list.</p>
        </div>
      </div>
    </div>
  )
}
