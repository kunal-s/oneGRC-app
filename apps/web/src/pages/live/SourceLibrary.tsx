import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, FileText, ScanLine } from 'lucide-react'
import { listInstruments } from '@/api/functions'

/**
 * The Source Library, reading real ingested instruments.
 *
 * Colour here follows ADR-011: type and authority are text, not hues. The only
 * colour is on a genuine state signal - an OCR text layer, which means the
 * extraction beneath is less reliable.
 */
export function SourceLibrary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['instruments'],
    queryFn: listInstruments,
  })

  if (isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading instruments…</p></Shell>
  if (error) return <Shell><ErrorNote error={error} /></Shell>

  const rows = data ?? []
  // Only claim the library is empty when the API actually said so. Treating an
  // unloaded or failed query as "nothing exists" is the dishonest empty state
  // spec 17.4 forbids: empty is never faked.
  if (data !== undefined && rows.length === 0) {
    return (
      <Shell>
        <EmptyState
          title="No instruments ingested yet"
          body="Register a legal instrument to begin. Ingestion accepts a URL or a manual upload: official sources are often unfetchable, so both are first-class paths."
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-24 px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Instrument</th>
              <th className="w-28 px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Authority</th>
              <th className="w-20 px-3 py-2 text-right font-medium">Pages</th>
              <th className="w-24 px-3 py-2 text-right font-medium">Clauses</th>
              <th className="w-28 px-3 py-2 font-medium">Text</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">
                  <Link to={`/sources/${i.id}`} className="font-mono text-2xs font-semibold text-info">
                    {i.id}
                  </Link>
                </td>
                <td className="max-w-0 px-3 py-2">
                  <Link to={`/sources/${i.id}`} className="block truncate text-foreground hover:underline" title={i.title}>
                    {i.shortTitle}
                  </Link>
                  {i.citation && <span className="text-2xs text-muted-foreground">{i.citation}</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{i.type}</td>
                <td className="max-w-0 truncate px-3 py-2 text-muted-foreground" title={i.authority}>
                  {i.authority}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{i.pageCount ?? 'n/a'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{i.clauseCount}</td>
                <td className="px-3 py-2">
                  {i.textLayer === 'ocr' ? (
                    <span className="inline-flex items-center gap-1 rounded border border-medium/40 bg-medium-soft px-1.5 py-0.5 text-2xs text-medium">
                      <ScanLine className="size-3" /> OCR scan
                    </span>
                  ) : (
                    <span className="text-2xs text-muted-foreground">Digital</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Source Library</h1>
        <p className="text-sm text-muted-foreground">
          The legal instruments this firm is bound by. Every clause traces back to the page it was
          extracted from.
        </p>
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <FileText className="mx-auto mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{body}</p>
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-critical/40 bg-critical-soft px-3 py-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
      <div className="text-sm">
        <p className="font-medium text-critical">Could not load from the API</p>
        <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
      </div>
    </div>
  )
}
