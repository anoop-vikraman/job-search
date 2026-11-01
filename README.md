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

### Seed demo data
Populate the DB with a realistic scenario — an admin, demo users, tweaks across categories,
applications, a counter-offer, an accepted job with an escrow hold, wallet top-ups, a processed
refund, and ratings. Idempotent (re-run anytime; it rebuilds the seed users and their data):

```bash
cd backend && venv/bin/python -m app.seeds.seed
```

Demo logins (all `+91`):

| Phone | Password | Role |
|---|---|---|
| 9000000000 | `Admin@12345` | admin |
| 9000000001 … 9000000005 | `Password@123` | user |

### Creating an admin (manually)
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

The app uses native modules (maps, push, MMKV, webview, Sentry), so **Expo Go won't work** — you
need a **development build** (custom dev client).

```bash
cd mobile
npm install

# build + install the dev client and start Metro (needs a native toolchain)
npx expo run:android      # or: npx expo run:ios  (macOS)

# on later runs, just start the bundler:
npx expo start --dev-client
```

Point the app at your backend with `EXPO_PUBLIC_API_URL` in `mobile/.env` (default lives in
`mobile/utils/config.ts`). On a physical device use your LAN IP; on the Android emulator use
`http://10.0.2.2:8000`; bind uvicorn with `--host 0.0.0.0`.

Full walkthrough — local builds, EAS cloud builds, env vars, and troubleshooting — is in
[`mobile/RUNNING.md`](mobile/RUNNING.md).

## Checks

| App | Command |
|---|---|
| backend | `cd backend && venv/bin/ruff check . && venv/bin/mypy app` |
| admin | `cd admin && npx tsc -b && npx eslint .` |
| mobile | `cd mobile && npx tsc --noEmit && npx expo lint` |
