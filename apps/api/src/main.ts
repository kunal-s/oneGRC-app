// Loads apps/api/.env, which is a symlink to the single .env at the repo root.
import 'dotenv/config'
import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  // Every route is namespaced, so the web bundle and the API can sit behind
  // one reverse proxy on a single origin in an on-prem deployment (ADR-001).
  app.setGlobalPrefix('api')

  // Dev only. In production the web bundle is served same-origin, so no CORS.
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({ origin: 'http://localhost:5173', credentials: true })
  }

  const port = Number(process.env.API_PORT ?? 3000)
  // 0.0.0.0 so the port is reachable from Windows when the API runs in WSL.
  await app.listen(port, '0.0.0.0')

  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/api`)
}

void bootstrap()
