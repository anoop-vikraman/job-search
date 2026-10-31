# Architecture

## Monorepo layout

```
backend/          FastAPI + async SQLAlchemy + Postgres API
mobile/           Expo (React Native) app
admin/            React + Vite moderation/operations dashboard
packages/theme/   @tweak/theme shared design tokens (colours, spacing, radii, type)
.kiro/            Conventions (steering) + the DB schema spec — source of truth
docker-compose.yml
```

Each app owns its own slice. Cross-app communication happens only through the HTTP API contract
(`/api/v1`), never through shared code. The single shared package is `@tweak/theme` (design tokens).

## Stacks

| App | Stack |
|---|---|
| backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, python-jose (JWT), passlib/bcrypt |
| mobile | Expo SDK 58, React Native 0.88, TypeScript, expo-router, Zustand, NativeWind, react-hook-form + zod, axios, i18next |
| admin | React 18, Vite, TypeScript, Tailwind + Shadcn-style UI, TanStack Query + TanStack Table, react-router, axios, zustand |
| database | PostgreSQL 16 (Docker container `tweak_postgres`) |

## Backend structure

```
backend/app/
├── core/       config, security (JWT/refresh/bcrypt), error envelope
├── api/v1/     routers (auth, users, addresses, tweaks, wallet, refunds, ratings, admin) + deps
├── models/     SQLAlchemy ORM models + enums
├── schemas/    Pydantic request/response models + JSONB validation
├── services/   business logic (auth, tweak, application, wallet, refund, rating)
├── db/         engine, async_sessionmaker, get_db, Base (naming convention)
└── seeds/      demo-data seeder
```

- **Routes validate and dispatch only.** All business rules live in `services/`, which receive an
  `AsyncSession` and never import FastAPI.
- **Auth** is dependency-injected: `get_current_user`, `require_role`, admin guard.
- **Sessions** are yield-based via `Depends(get_db)`; services commit explicitly.

## Data model (tables)

```
users 1─┬─< refresh_tokens
        ├─< addresses
        ├─1 wallets 1─< wallet_transactions   (append-only ledger)
        ├─< tweaks (as lister)
        ├─< applications (as provider)
        └─< ratings (as rater / ratee)

tweaks 1─< applications 1─0..1 offers (lister counter-quote)
applications 0..1─< refunds
tweaks 1─< ratings
```

See `.kiro/specs/01_db_schema.spec.md` for the authoritative column-level schema. Migrations live in
`backend/alembic/versions/`.

## How the apps connect

```
mobile  ──HTTP /api/v1──▶ backend ──▶ Postgres
admin   ──HTTP /api/v1──▶ backend ──▶ Postgres
```

- Both clients authenticate with a JWT access token (Bearer header) and refresh it on 401.
- The admin dev server proxies `/api` → `http://localhost:8000` (see `admin/vite.config.ts`).
- The mobile client base URL is configured in `mobile/utils/config.ts`.

## Running locally

See the root `README.md` for full setup. In short: `docker compose up -d postgres`, create the
backend venv, `alembic upgrade head`, optionally `npm run seed`, then run each app.
