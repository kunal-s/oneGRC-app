# OneGRC Platform

Unified governance, risk, compliance and audit platform. On-prem, single-tenant.

## Layout

| Path | What |
|---|---|
| `apps/web` | React + TypeScript + Vite front end (the prototype, being rewired to the API) |
| `apps/api` | NestJS + Prisma backend *(added at P0-02)* |
| `packages/` | Shared types, contracts and seed world *(added from P0-03)* |
| `docs/` | Specification, build plan and decision records — also an Obsidian vault |

## Prerequisites

- Node >= 22 (`nvm use 22`)
- pnpm (`corepack enable pnpm`)
- Docker + Docker Compose *(needed from P0-02 for PostgreSQL)*

## Getting started

```bash
pnpm install
pnpm dev          # serves the web app
pnpm typecheck    # type-checks every workspace
```

## Documentation

Start at [`docs/index.md`](docs/index.md). Open `docs/` as an Obsidian vault to navigate
the linked spec, build plan and decision records.
