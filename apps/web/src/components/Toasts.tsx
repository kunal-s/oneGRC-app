import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'

const VARIANT = {
  default: { icon: Info, cls: 'border-border', accent: 'text-foreground' },
  success: { icon: CheckCircle2, cls: 'border-ok/30', accent: 'text-ok' },
  info: { icon: Info, cls: 'border-info/30', accent: 'text-info' },
  critical: { icon: AlertTriangle, cls: 'border-critical/30', accent: 'text-critical' },
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const v = VARIANT[t.variant ?? 'default']
        const Icon = v.icon
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-background p-3 shadow-lg animate-slide-up',
              v.cls,
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', v.accent)} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{t.title}</div>
              {t.description && <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
