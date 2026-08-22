// Copilot response interface (design seam — Epic 1; scripted answers in Epic 5).
// One interface, deterministic mock now, real model later — screens depend only
// on this contract, never on the implementation. No model API calls.
import type { RecordContext } from './context'
import { scriptedAnswer } from './scripts'

export interface CopilotAnswer {
  text: string
  citedIds: string[] // linked record ids referenced in the answer
  sourceIds: string[] // SourceReference ids referenced in the answer
  confidence: 'low' | 'medium' | 'high'
}

export interface CopilotResponder {
  ask(question: string, ctx: RecordContext): CopilotAnswer
}

/**
 * Deterministic fallback responder — grounds every answer in the provided
 * context (links + sources) with no external calls. Epic 5 layers scripted,
 * per-record Q&A on top of this same interface.
 */
export const mockResponder: CopilotResponder = {
  ask(_question, ctx) {
    const sourceLine = ctx.sources.length
      ? ` It derives from ${ctx.sources.map((s) => s.citation).join('; ')}.`
      : ''
    const linkLine = ctx.links.length
      ? ` It connects to ${ctx.links.length} linked record${ctx.links.length === 1 ? '' : 's'} (${ctx.links
          .slice(0, 4)
          .map((l) => l.id)
          .join(', ')}${ctx.links.length > 4 ? ', …' : ''}).`
      : ''
    return {
      text: `${ctx.title} — ${ctx.summary}${sourceLine}${linkLine}`,
      citedIds: ctx.links.map((l) => l.id),
      sourceIds: ctx.sources.map((s) => s.id),
      confidence: ctx.sources.length ? 'high' : 'medium',
    }
  },
}

/**
 * The responder the panel uses: a crafted, scripted answer for a known demo
 * question if one matches, otherwise the grounded summary above. Both paths are
 * deterministic and stay within the record's own context.
 */
export const groundedResponder: CopilotResponder = {
  ask(question, ctx) {
    return scriptedAnswer(ctx.id, question) ?? mockResponder.ask(question, ctx)
  },
}
