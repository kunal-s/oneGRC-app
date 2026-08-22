import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Check, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'
import { fmtDate } from '@/lib/time'
import { personName } from '@/data/people'
import { PASS_MARK, attestationGaps, questionsFor, scoreAnswers } from '@/lib/attestation'
import type { AttestationDeclarationKind, AttestationResponse, Policy } from '@/types'

const DECLARATIONS: AttestationDeclarationKind[] = ['None', 'Conflict of interest', 'Cannot comply', 'Clarification needed']

/**
 * The acknowledgement a member of staff signs against one published version of
 * one policy: read it, answer the comprehension check, declare anything that
 * stops you complying, sign.
 */
export function AttestationForm({
  policy,
  value,
  onChange,
}: {
  policy: Policy
  value: AttestationResponse
  onChange: (r: AttestationResponse) => void
}) {
  const navigate = useNavigate()
  const questions = questionsFor(policy)
  const set = (patch: Partial<AttestationResponse>) => onChange({ ...value, ...patch })
  const gaps = attestationGaps(value, policy)

  const answer = (questionId: string, chosen: number, correct: boolean) => {
    const answers = [...value.answers.filter((a) => a.questionId !== questionId), { questionId, chosen, correct }]
    set({ answers, comprehensionScore: scoreAnswers(answers, questions.length) })
  }

  return (
    <div className="space-y-4">
      {/* 1 · the document, at a stated version */}
      <Step n={1} title="The document">
        <button
          onClick={() => navigate(`/policies/${policy.id}`)}
          className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/30"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-foreground">{policy.title}</div>
            <div className="text-2xs text-muted-foreground">
              {policy.id} · approved {fmtDate(policy.approvedOn)} by {personName(policy.approvedBy)} · owner {personName(policy.owner)}
            </div>
          </div>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-2xs font-semibold text-foreground">{policy.version}</span>
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md border border-border px-2.5 py-2">
          <input
            type="checkbox"
            checked={value.acknowledged}
            onChange={(e) => set({ acknowledged: e.target.checked, version: policy.version })}
            className="mt-0.5 size-3.5 accent-primary"
          />
          <span className="text-2xs text-foreground">
            I have read and understood <span className="font-medium">{policy.title}</span>{' '}
            <span className="font-mono font-semibold">{policy.version}</span> and will comply with it.
          </span>
        </label>
        {value.version !== policy.version && (
          <p className="mt-1.5 inline-flex items-start gap-1.5 rounded-md border border-critical/40 bg-critical-soft/40 px-2.5 py-1.5 text-2xs text-foreground">
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-critical" />
            This response was started against {value.version}. The policy has since been republished at {policy.version} — re-read and
            acknowledge the current version.
          </p>
        )}
      </Step>

      {/* 2 · comprehension */}
      <Step n={2} title={`Comprehension check · ${value.answers.length}/${questions.length}`}>
        <div className="space-y-2">
          {questions.map((q, qi) => {
            const given = value.answers.find((a) => a.questionId === q.id)
            return (
              <div key={q.id} className="rounded-md border border-border px-2.5 py-2">
                <div className="flex gap-1.5">
                  <span className="text-2xs font-semibold tnum text-muted-foreground">{qi + 1}.</span>
                  <p className="text-2xs text-foreground">{q.prompt}</p>
                </div>
                <div className="mt-1.5 space-y-1">
                  {q.options.map((opt, oi) => {
                    const chosen = given?.chosen === oi
                    const right = oi === q.answer
                    return (
                      <button
                        key={oi}
                        onClick={() => answer(q.id, oi, right)}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded border px-2 py-1 text-left text-2xs transition-colors',
                          chosen
                            ? right
                              ? 'border-ok bg-ok-soft text-ok'
                              : 'border-critical bg-critical-soft text-critical'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {chosen ? right ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" /> : <span className="size-3 shrink-0" />}
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        {value.answers.length === questions.length && (
          <p
            className={cn(
              'mt-1.5 rounded-md px-2.5 py-1.5 text-2xs',
              value.comprehensionScore >= PASS_MARK ? 'bg-ok-soft text-ok' : 'bg-medium-soft text-medium',
            )}
          >
            {value.comprehensionScore}% — {value.comprehensionScore >= PASS_MARK ? 'pass' : `below the ${PASS_MARK}% pass mark; change the answers marked wrong`}
          </p>
        )}
      </Step>

      {/* 3 · declaration */}
      <Step n={3} title="Declaration">
        <div className="flex flex-wrap gap-1.5">
          {DECLARATIONS.map((k) => {
            const active = k === 'None' ? !value.declaration : value.declaration?.kind === k
            return (
              <button
                key={k}
                onClick={() =>
                  set({ declaration: k === 'None' ? undefined : { kind: k, detail: value.declaration?.detail ?? '' } })
                }
                className={cn(
                  'rounded-md border px-2.5 py-1 text-2xs font-medium transition-colors',
                  active
                    ? k === 'Cannot comply'
                      ? 'border-critical bg-critical-soft text-critical'
                      : k === 'None'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-medium bg-medium-soft text-medium'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {k === 'None' ? 'Nothing to declare' : k}
              </button>
            )
          })}
        </div>
        {value.declaration && (
          <>
            <textarea
              value={value.declaration.detail}
              onChange={(e) => set({ declaration: { ...value.declaration!, detail: e.target.value } })}
              rows={2}
              placeholder={
                value.declaration.kind === 'Cannot comply'
                  ? 'Which requirement, and why it cannot be met today.'
                  : value.declaration.kind === 'Conflict of interest'
                    ? 'The interest, and the activity it touches.'
                    : 'What needs clarifying.'
              }
              className="mt-1.5 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            {value.declaration.kind === 'Cannot comply' && (
              <p className="mt-1 inline-flex items-start gap-1.5 rounded-md border border-critical/40 bg-critical-soft/30 px-2.5 py-1.5 text-2xs text-foreground">
                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-critical" />
                On approval this is raised as a time-boxed exception in the register, owned by you and expiring in 90 days.
              </p>
            )}
          </>
        )}
      </Step>

      {gaps.length > 0 && (
        <ul className="space-y-0.5 rounded-md border border-medium/40 bg-medium-soft/30 px-2.5 py-2">
          {gaps.map((g) => (
            <li key={g} className="flex items-start gap-1.5 text-2xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-medium" /> {g}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Read-only rendering of a submitted acknowledgement — the reviewer's view. */
export function AttestationSummary({ policy, response }: { policy: Policy; response: AttestationResponse }) {
  const questions = questionsFor(policy)
  const stale = response.version !== policy.version
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <Attr label="Acknowledged">{response.acknowledged ? 'Yes' : 'No'}</Attr>
        <Attr label="Version read">
          <span className={cn('font-mono text-xs font-semibold', stale ? 'text-critical' : 'text-foreground')}>{response.version}</span>
          {stale && <span className="ml-1 text-2xs text-critical">policy now {policy.version}</span>}
        </Attr>
        <Attr label="Comprehension">
          <StatusChip
            status={`${response.comprehensionScore}%`}
            tone={response.comprehensionScore >= PASS_MARK ? 'ok' : 'warn'}
          />
        </Attr>
        <Attr label="Declaration">
          {response.declaration ? (
            <StatusChip status={response.declaration.kind} tone={response.declaration.kind === 'Cannot comply' ? 'danger' : 'warn'} />
          ) : (
            'None'
          )}
        </Attr>
      </div>

      {response.declaration && (
        <div>
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{response.declaration.kind}</div>
          <p
            className={cn(
              'rounded-md border px-2.5 py-1.5 text-xs text-foreground',
              response.declaration.kind === 'Cannot comply' ? 'border-critical/40 bg-critical-soft/30' : 'border-medium/40 bg-medium-soft/30',
            )}
          >
            {response.declaration.detail}
          </p>
          {response.declaration.issueId && (
            <p className="mt-1 text-2xs text-muted-foreground">
              Raised as <span className="font-mono font-semibold text-info">{response.declaration.issueId}</span> in the exception register.
            </p>
          )}
        </div>
      )}

      {response.answers.length > 0 && (
        <div>
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Answers</div>
          <div className="space-y-1">
            {questions.map((q, i) => {
              const a = response.answers.find((x) => x.questionId === q.id)
              if (!a) return null
              return (
                <div key={q.id} className="flex items-start gap-1.5 rounded-md border border-border px-2.5 py-1.5">
                  {a.correct ? <Check className="mt-0.5 size-3 shrink-0 text-ok" /> : <X className="mt-0.5 size-3 shrink-0 text-critical" />}
                  <div className="min-w-0">
                    <p className="text-2xs text-muted-foreground">
                      {i + 1}. {q.prompt}
                    </p>
                    <p className={cn('text-2xs', a.correct ? 'text-foreground' : 'text-critical')}>{q.options[a.chosen]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-muted text-2xs font-semibold tnum text-muted-foreground">{n}</span>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs text-foreground">{children}</div>
    </div>
  )
}
