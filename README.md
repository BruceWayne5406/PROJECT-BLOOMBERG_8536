# Semiconductor Supplier–Buyer Commitment Platform

Collaboration and audit layer for semiconductor forecasts, commits, and change-orders. This is the system of record for those records. It is not an ERP, CLM, or PLM replacement.

**Phase 1 (current):** data model, append-only versioning schema, shared domain types, and the FC-88421 worked-example seed. No publish API, commit UI, or Excel/ERP adapters yet.

## Principles this schema enforces

- Contract (signed once, CLM reference IDs only) is separate from collaboration records (every cycle).
- Forecast and commit rows are never overwritten — a new version is always inserted.
- Partial and split commits are first-class (`forecast_commits` is 1:N on a forecast line).
- Time fences and flexibility bands live on `trading_partner_setups`, not in code.
- Derived fields (`gap_qty`, `late_flag`, `otif`, …) are SQL views, not editable columns.
- Binding supply is a PO / acknowledgement. Forecast commits are planning-grade unless converted.

## Repo layout

```
apps/web                 Next.js App Router (shell + design tokens)
apps/api                 NestJS (module shells mirroring entities)
packages/domain          Enums + Zod schemas shared by API, Excel, and later EDI
packages/db              Drizzle schema, migrations, views, seed
packages/event-contracts Domain event names + payloads
```

## Prerequisites

- Node 20+
- Docker Desktop (or another engine) running — Postgres 16 + Redis 7 via Compose

## Phase 1 setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
```

If `docker compose up` cannot reach the daemon, start Docker Desktop and retry. Migrate/seed need Postgres on `localhost:5432`.

Then optionally:

```bash
npm run dev:api    # http://localhost:3001/health
npm run dev:web    # http://localhost:3000
```

Seeded worked example: forecast `FC-88421` v1, 100,000 units dock 15 Dec 2026, split commits CM-01 / CM-02 / CM-03, 10,000 uncommitted (`CAPACITY`). Query `forecast_line_metrics` for `gap_qty` and `late_qty`.
