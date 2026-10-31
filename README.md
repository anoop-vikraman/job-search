# Tweak

A local-services / gig marketplace. Users post short jobs ("tweaks"), providers apply, the two
sides negotiate a price, money moves through an in-app wallet (escrow), and both sides rate each
other. An admin panel moderates users, tweaks and payouts.

## Monorepo

```
backend/   FastAPI + async SQLAlchemy + Postgres API
mobile/    Expo (React Native) app
admin/     React + Vite moderation/operations dashboard
packages/theme/   @tweak/theme shared design tokens
.kiro/     Kiro config (source of truth for conventions — see steering + specs)
docker-compose.yml
```

## Prerequisites
- Docker (Postgres), Python 3.11+, Node 20+.

## Backend

```bash
# 1. Postgres (container tweak_postgres, host port 5433 -> container 5432)
docker compose up -d postgres

# 2. Virtualenv + deps
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements-dev.txt

# 3. Env file (sets SECRET_KEY, DATABASE_URL)
cp backend/.env.example backend/.env   # then set a strong SECRET_KEY

# 4. Migrate
cd backend && venv/bin/alembic upgrade head

# 5. Run
venv/bin/uvicorn app.main:app --reload --port 8000
```

- Health: `curl localhost:8000/health` -> `{"status":"ok","db_connected":true}`
- OpenAPI docs: http://localhost:8000/docs
- The full API lives under `/api/v1` (auth, users, tweaks, applications, wallet, refunds, ratings,
  addresses, admin). Errors use the `{ "detail", "code" }` envelope; lists are `Page[T]`; money is
  integer minor units; timestamps are ISO-8601 UTC `Z`.

### Creating an admin
New signups are role `user`. Promote one to admin:

```bash
docker exec tweak_postgres psql -U postgres -d tweak_db \
  -c "UPDATE users SET role='admin' WHERE phone_number='<digits>';"
```

## Admin panel

```bash
npm install --workspace=admin      # or: cd admin && npm install
npm run dev --workspace=admin      # http://localhost:5173 (proxies /api -> :8000)
```

Sign in with an admin account. Features: users (ban/unban), tweak moderation (close),
applications, wallet transactions ledger, and the refund queue (approve reverses the escrow hold).

## Mobile

```bash
cd mobile
npm install
npx expo start      # requires a dev build for native modules
```

Point the app's API client (`mobile/utils/config.ts`) at the backend base URL.

## Checks

| App | Command |
|---|---|
| backend | `cd backend && venv/bin/ruff check . && venv/bin/mypy app` |
| admin | `cd admin && npx tsc -b && npx eslint .` |
| mobile | `cd mobile && npx tsc --noEmit && npx expo lint` |
