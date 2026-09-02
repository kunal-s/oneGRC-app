import { Injectable, Logger } from '@nestjs/common'
import { Issuer, generators } from 'openid-client'
import type { BaseClient } from 'openid-client'

export interface OidcConfig {
  issuerUrl: string
  clientId: string
  clientSecret?: string
  callbackUrl: string
  /** The claim in the assertion that carries the subject, resolved against Person.email. */
  subjectClaim: string
}

/** Thrown whenever the identity provider cannot be reached or is not configured. GAP-SCR-011-030. */
export class OidcUnavailableError extends Error {}

interface PendingAuth {
  codeVerifier: string
  nonce: string
  returnTo: string
  expiresAt: number
}

const STATE_TTL_MS = 10 * 60_000

function readConfig(): OidcConfig | null {
  const issuerUrl = process.env.OIDC_ISSUER_URL
  const clientId = process.env.OIDC_CLIENT_ID
  const callbackUrl = process.env.OIDC_CALLBACK_URL
  if (!issuerUrl || !clientId || !callbackUrl) return null
  return {
    issuerUrl,
    clientId,
    clientSecret: process.env.OIDC_CLIENT_SECRET || undefined,
    callbackUrl,
    subjectClaim: process.env.OIDC_SUBJECT_CLAIM || 'email',
  }
}

/**
 * The exchange that turns an assertion from the customer's identity provider
 * into claims the callback resolves to a Person. D-044, GAP-SCR-011-002.
 *
 * Configuration only becomes a code path when OIDC_ISSUER_URL, OIDC_CLIENT_ID
 * and OIDC_CALLBACK_URL are all set. The platform holds no identity provider
 * of its own to fall back to (GAP-SCR-011-001).
 *
 * PKCE verifier, nonce and the route to return to are held server side, keyed
 * by the state value round-tripped through the provider. This is transient
 * sign-in traffic, not domain data, so it lives in memory with a short TTL
 * rather than a table.
 */
@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name)
  private client: Promise<BaseClient> | null = null
  private readonly pending = new Map<string, PendingAuth>()

  isConfigured(): boolean {
    return readConfig() !== null
  }

  subjectClaimName(): string {
    return readConfig()?.subjectClaim ?? 'email'
  }

  private async getClient(): Promise<BaseClient> {
    const config = readConfig()
    if (!config) throw new OidcUnavailableError('OIDC is not configured')
    if (!this.client) {
      this.client = Issuer.discover(config.issuerUrl)
        .then(
          (issuer) =>
            new issuer.Client({
              client_id: config.clientId,
              client_secret: config.clientSecret,
              redirect_uris: [config.callbackUrl],
              response_types: ['code'],
            }),
        )
        .catch((err: unknown) => {
          this.client = null
          throw new OidcUnavailableError(err instanceof Error ? err.message : String(err))
        })
    }
    return this.client
  }

  private sweepExpired(): void {
    const now = Date.now()
    for (const [state, entry] of this.pending) {
      if (entry.expiresAt < now) this.pending.delete(state)
    }
  }

  /** Builds the redirect to the provider. GAP-SCR-011-002, GAP-SCR-011-004. */
  async authorizationUrl(returnTo: string): Promise<string> {
    const client = await this.getClient()
    this.sweepExpired()

    const codeVerifier = generators.codeVerifier()
    const nonce = generators.nonce()
    const state = generators.state()
    this.pending.set(state, { codeVerifier, nonce, returnTo, expiresAt: Date.now() + STATE_TTL_MS })

    return client.authorizationUrl({
      scope: 'openid email profile',
      code_challenge: generators.codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      nonce,
      state,
    })
  }

  /** Exchanges the callback for claims. GAP-SCR-011-003. Throws on an unreachable provider. */
  async handleCallback(query: {
    code?: string
    state?: string
    error?: string
    error_description?: string
  }): Promise<{ claims: Record<string, unknown>; returnTo: string }> {
    if (query.error) {
      throw new OidcUnavailableError(query.error_description ?? query.error)
    }
    if (!query.state) throw new OidcUnavailableError('the provider returned no state')

    const entry = this.pending.get(query.state)
    if (!entry) throw new OidcUnavailableError('this sign-in attempt has expired or was never started here')
    this.pending.delete(query.state)

    const config = readConfig()
    if (!config) throw new OidcUnavailableError('OIDC is not configured')

    const client = await this.getClient()
    const params = client.callbackParams(`${config.callbackUrl}?${new URLSearchParams(query as Record<string, string>).toString()}`)
    const tokenSet = await client.callback(config.callbackUrl, params, {
      code_verifier: entry.codeVerifier,
      nonce: entry.nonce,
      state: query.state,
    })

    const claims = tokenSet.claims() as unknown as Record<string, unknown>
    return { claims, returnTo: entry.returnTo }
  }
}
