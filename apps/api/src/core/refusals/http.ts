import { HttpException } from '@nestjs/common'
import { REFUSALS, renderRefusal, type RefusalId } from './catalogue'

/**
 * REFU-007: a refusal carries its identifier on the wire, beside the
 * message, so a client can tell REF-25 (recoverable by reloading) apart from
 * REF-02 (it is not) without matching on the message string. Neither the
 * status code nor the message text changes: `HttpException`'s own
 * `createBody` returns an object response verbatim, so this only adds `ref`
 * to the body Nest already sends.
 */
export function httpRefusal(status: number, message: string, ref?: RefusalId): HttpException {
  return new HttpException(ref ? { statusCode: status, message, ref } : { statusCode: status, message }, status)
}

/** The common case: render a catalogue row and throw it at its own recorded status. */
export function throwRefusal(id: RefusalId, params?: Record<string, string | number | undefined>): never {
  const row = REFUSALS[id]
  throw httpRefusal(row.status ?? 500, renderRefusal(id, params), id)
}
