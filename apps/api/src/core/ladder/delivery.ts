import { connect as netConnect, type Socket } from 'node:net'
import { connect as tlsConnect } from 'node:tls'

/**
 * Delivery goes through one port with one shape, so nothing above it knows
 * which transport carried a message (LDR-080, FLR-08, FRD G-06).
 */
export interface OutboundMessage {
  recipientEmail: string | null
  title: string
  body: string
}

export interface DeliveryResult {
  ok: boolean
  error?: string
}

export interface DeliveryTransport {
  readonly name: string
  send(message: OutboundMessage): Promise<DeliveryResult>
}

/**
 * The default transport, and what runs in development (LDR-083). Writes what
 * would have been sent onto the notification row and confirms it, making no
 * network call. No message ever leaves this environment through it.
 */
export class RecordingTransport implements DeliveryTransport {
  readonly name = 'recording'

  async send(_message: OutboundMessage): Promise<DeliveryResult> {
    return { ok: true }
  }
}

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

/**
 * The real transport (LDR-082). A minimal SMTP client over a raw socket
 * rather than a new dependency, since none is needed anywhere else in this
 * repository. Built and typechecked; left unconfigured in this environment,
 * where no mail server is reachable and every sample address is at
 * `sample.invalid`, an RFC 2606 domain that can never route (LDR-084). Its
 * behaviour against a real server is not proven here, the way SLICE-01A
 * records for the identity provider.
 */
export class SmtpTransport implements DeliveryTransport {
  readonly name = 'smtp'

  constructor(private readonly config: SmtpConfig) {}

  async send(message: OutboundMessage): Promise<DeliveryResult> {
    if (!message.recipientEmail) return { ok: false, error: 'no email address on record' }
    let socket: Socket | undefined
    try {
      socket = await this.openSocket()
      await this.read(socket) // banner
      await this.command(socket, `EHLO onegrc`)
      if (this.config.user) {
        await this.command(socket, 'AUTH LOGIN')
        await this.command(socket, Buffer.from(this.config.user).toString('base64'))
        await this.command(socket, Buffer.from(this.config.pass ?? '').toString('base64'))
      }
      await this.command(socket, `MAIL FROM:<${this.config.from}>`)
      await this.command(socket, `RCPT TO:<${message.recipientEmail}>`)
      await this.command(socket, 'DATA')
      const lines = [
        `From: ${this.config.from}`,
        `To: ${message.recipientEmail}`,
        `Subject: ${message.title}`,
        '',
        message.body,
        '.',
      ]
      await this.command(socket, lines.join('\r\n'))
      await this.command(socket, 'QUIT')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    } finally {
      socket?.end()
    }
  }

  private openSocket(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => reject(err)
      const socket = this.config.secure
        ? tlsConnect({ host: this.config.host, port: this.config.port }, () => resolve(socket))
        : netConnect({ host: this.config.host, port: this.config.port }, () => resolve(socket))
      socket.once('error', onError)
    })
  }

  private read(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        socket.off('error', onError)
        resolve(chunk.toString('utf8'))
      }
      const onError = (err: Error) => reject(err)
      socket.once('data', onData)
      socket.once('error', onError)
    })
  }

  private async command(socket: Socket, line: string): Promise<string> {
    socket.write(line + '\r\n')
    const response = await this.read(socket)
    const code = Number(response.slice(0, 3))
    if (code >= 400) throw new Error(`SMTP ${code}: ${response.trim()}`)
    return response
  }
}

/**
 * Which transport runs. `SMTP_HOST` unset, which is every environment this
 * slice runs in, selects the recording transport: this is what keeps mail
 * out of this environment without a feature flag to forget to unset.
 */
export function transportFromEnv(env: NodeJS.ProcessEnv): DeliveryTransport {
  if (!env.SMTP_HOST) return new RecordingTransport()
  return new SmtpTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM ?? 'noreply@onegrc.local',
  })
}
