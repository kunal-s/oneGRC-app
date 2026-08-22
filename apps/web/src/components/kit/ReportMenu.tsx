import * as React from 'react'
import { FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'
import { useGenerateReport, type ReportTemplate } from './reports'

/**
 * A "Generate report" button with a dropdown of the relevant templates. Each
 * choice records a session artifact and opens the export preview drawer.
 */
export function ReportMenu({
  templates,
  label = 'Generate report',
  align = 'right',
}: {
  templates: ReportTemplate[]
  label?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const generate = useGenerateReport()

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (templates.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <FileText className="size-3.5" />
        {label}
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div className={cn('absolute top-full z-50 mt-1 w-80 rounded-lg border border-border bg-background p-1 shadow-lg animate-slide-up', align === 'right' ? 'right-0' : 'left-0')}>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                generate(t)
                setOpen(false)
              }}
              className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <span className="text-xs font-medium text-foreground">{t.title}</span>
              <span className="text-2xs text-muted-foreground">{t.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
