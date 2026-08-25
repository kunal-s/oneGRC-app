// Loads apps/api/.env, a symlink to the single .env at the repo root.
import 'dotenv/config'
import 'reflect-metadata'
import fastifyCookie from '@fastify/cookie'
import { Logger } from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { ActorGuard } from './core/identity/actor.guard'
import { SessionService } from './core/identity/session.service'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  await app.register(fastifyCookie as never)

  // Every route is namespaced, so the web bundle and the API can sit behind
  // one reverse proxy on a single origin in an on-prem deployment (ADR-001).
  app.setGlobalPrefix('api')

  // Authentication is resolved globally and opted OUT of, never opted in:
  // a new endpoint is protected by default (ADR-002).
  app.useGlobalGuards(new ActorGuard(app.get(SessionService), app.get(Reflector)))

  // Dev only. In production the web bundle is served same-origin, so no CORS.
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  }

  const port = Number(process.env.API_PORT ?? 3000)
  // 0.0.0.0 so the port is reachable from Windows when the API runs in WSL.
  await app.listen(port, '0.0.0.0')

  new Logger('Bootstrap').log(
    `API listening on http://localhost:${port}/api  (AUTH_MODE=${process.env.AUTH_MODE ?? 'unset'})`,
  )
}

void bootstrap()
