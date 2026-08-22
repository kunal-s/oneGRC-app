# ADR-001 · Stack and repository shape

**Status:** Accepted · **Date:** 2026-08-22

## Context

The prototype is a front-end-only React 18 + TypeScript + Vite app: ~175 source files, ~40 routed
pages, a 103KB Zustand store holding all session state, deterministic seed generators in `src/data`,
and **no backend at all** — no fetch, no API, no persistence. It must become a full-stack product
deployable **on client premises**, repeatably, across multiple customer environments.

## Decision

**One repository**, a pnpm monorepo: `apps/web`, `apps/api`, `packages/*`, `docs/`.

- **Frontend: keep Vite + React + React Router.** Not Next.js. SSR and SEO are irrelevant for an
  internal authenticated tool; migrating ~113 working .tsx files buys no capability; a separate API
  keeps the server-authorization boundary physical and reviewable (see [[ADR-002-authorization-seam]]);
  and a static bundle plus an API container is the simplest thing to hand a customer ops team.
- **Backend: NestJS on the Fastify adapter, Prisma, PostgreSQL.** Chosen over plain Fastify because
  three spec demands map onto Nest primitives rather than hand-rolled convention: guards to the single
  central authority check (§4.10), interceptors to every mutation transactional with its audit entry
  (§17.5), modules and DI to "one engine per concern" (§2).
- **Docker Compose**, single-tenant. No managed cloud, no third-party auth SaaS. Multi-tenancy (G-25)
  is deferred but must not be designed out.

## Consequences

- Shared types live once in `packages/`; a change breaks compilation on both sides immediately.
- NestJS costs boilerplate. Accepted deliberately: an opinionated framework keeps generated code
  consistent over months, which matters more here than terseness.
- Splitting the repo later is a subdirectory extraction; merging split repos later is not. One repo
  is the reversible choice.

## Links

[[build-plan]] P0-01, P0-02 · [[functional-spec]] §2, §15, §17.5
