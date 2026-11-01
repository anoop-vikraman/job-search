# Running Tweak locally

How to run the three apps in the monorepo:

- **backend/** — FastAPI + async SQLAlchemy + Postgres API
- **admin/** — React + Vite moderation dashboard
- **mobile/** — Expo (React Native) app

```
mobile ──HTTP──▶ backend ──▶ Postgres
admin  ──HTTP──┘   (worker runs background jobs)
```

For the mobile dev client specifically (build + install), see
[`mobile/RUNNING.md`](../mobile/RUNNING.md). This doc is the end-to-end setup for all three.

---

## Prerequisites

| Tool | Version | For |
|---|---|---|
| Docker + Compose | current | Postgres (and optional full-stack) |
| Python | 3.11+ (tested 3.12) | backend |
| Node | 20+ (tested 24) | admin, mobile |
| npm | 10+ | admin, mobile |

A native toolchain (Android Studio / Xcode) is required for a mobile dev build — see the mobile
section.

---

## 0. Get Postgres running (shared by backend + worker)

The database runs in the `tweak_postgres` container, mapped to host port **5433**.

```bash
docker compose up -d postgres
docker exec tweak_postgres pg_isready -U postgres   # -> accepting connections
```

> Host port is **5433** (`127.0.0.1:5433 -> container 5432`), so it won't clash with a local
> Postgres on 5432. `DATABASE_URL` in `backend/.env` must point at `localhost:5433` when the
> backend runs on the host.

Stop it with `docker compose stop postgres`. `docker compose down -v` **deletes all data** (named
volume `postgres_data`) — only use it for a clean reset.

---

## 1. Backend (FastAPI)

```bash
# from repo root

# 1. Virtualenv + dependencies
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements-dev.txt

# 2. Env file — copy the example, then set a strong SECRET_KEY
cp backend/.env.example backend/.env

# 3. Apply migrations
cd backend && venv/bin/alembic upgrade head

# 4. Run the API (host 0.0.0.0 so a phone/emulator can reach it)
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Check it:

- Health: `curl localhost:8000/health` → `{"status":"ok","db_connected":true}`
- API docs: http://localhost:8000/docs
- API is under `/api/v1`. Errors use `{ "detail", "code" }`; lists are `Page[T]`; money is integer
  minor units; timestamps are ISO-8601 UTC `Z`.

### Key env vars (`backend/.env`)

| Var | Default (dev) | Notes |
|---|---|---|
| `DATABASE_URL` | `...@localhost:5432/tweak_db` | **change to port 5433** for host runs (the container maps 5433→5432) |
| `SECRET_KEY` | placeholder | set a random string ≥ 32 chars |
| `CORS_ORIGINS` | `localhost:5173,localhost:8081` | admin + Expo dev server |
| `RUN_WORKER_IN_APP` | `true` | dev runs background jobs in-process; set `false` in prod and run the worker separately |
| `WALLET_SIMULATED_TOPUP_ENABLED` | `true` | fake wallet top-ups; set `false` with real Razorpay |
| `SMS_PROVIDER` | `console` | OTP: `console` echoes the code; else `msg91` / `twilio` |
| `RAZORPAY_*`, `SENTRY_DSN`, `EXPO_PUSH_ENABLED` | mostly unset | optional integrations |

> If `DATABASE_URL` in the example still says `localhost:5432`, change the port to `5433` for
> host-side runs, or the backend won't find the container's Postgres.

### Background worker

Jobs (push, auto-release, receipts, reconciliation, saved-search alerts) run **in-process** in dev
because `RUN_WORKER_IN_APP=true`. To run the worker separately (as in production):

```bash
cd backend && RUN_WORKER_IN_APP=false venv/bin/uvicorn app.main:app --reload --port 8000   # API
cd backend && venv/bin/python -m app.worker                                                 # worker
```

### Seed demo data

```bash
cd backend && venv/bin/python -m app.seeds.seed   # idempotent; rebuilds demo users + data
```

Demo logins (country code `+91`):

| Phone | Password | Role |
|---|---|---|
| 9000000000 | `Admin@12345` | admin |
| 9000000001 … 9000000005 | `Password@123` | user |

Promote any account to admin manually:

```bash
docker exec tweak_postgres psql -U postgres -d tweak_db \
  -c "UPDATE users SET role='admin' WHERE phone_number='<digits>';"
```

---

## 2. Admin panel (React + Vite)

Needs the backend running on :8000 (Vite proxies `/api` and `/media` there).

```bash
# from repo root
npm install --workspace=admin        # or: cd admin && npm install
npm run dev --workspace=admin        # http://localhost:5173
```

Open http://localhost:5173 and sign in with an **admin** account (e.g. `+91 9000000000` /
`Admin@12345` after seeding). Features: user bans, tweak moderation, applications/offers, the
wallet ledger, refunds, disputes, KYC verification, payouts, and analytics.

Production build / preview:

```bash
npm run build --workspace=admin
npm run preview --workspace=admin
```

---

## 3. Mobile app (Expo)

**Expo Go will not work** — the app uses native modules (maps, push, MMKV, webview, Sentry), so
you need a **development build** (custom dev client). `expo-dev-client` is already a dependency.

```bash
cd mobile
npm install

# build + install the dev client, then start Metro (needs a native toolchain)
npx expo run:android          # or: npx expo run:ios  (macOS)

# on later runs, just start the bundler:
npx expo start --dev-client
```

Point the app at your backend via `EXPO_PUBLIC_API_URL` in `mobile/.env` (default in
`mobile/utils/config.ts` is the hosted URL):

```bash
# mobile/.env
# physical device: your computer's LAN IP; Android emulator: http://10.0.2.2:8000
EXPO_PUBLIC_API_URL=http://192.168.1.50:8000
```

Full mobile walkthrough — local vs. EAS cloud builds, native env vars (`GOOGLE_MAPS_API_KEY`,
`EAS_PROJECT_ID`, `EXPO_PUBLIC_SENTRY_DSN`), when to rebuild, and troubleshooting — is in
[`mobile/RUNNING.md`](../mobile/RUNNING.md).

---

## Alternative: run backend + worker + Postgres in Docker

Instead of sections 0–1 on the host, bring up the whole backend stack:

```bash
docker compose up -d --build        # postgres + backend + worker
docker compose logs -f backend
```

Inside compose, the backend reaches the DB by service name (`postgres:5432`), and the API is
published on host `127.0.0.1:8000`. Still run migrations once (they don't run automatically):

```bash
docker exec tweak_backend alembic upgrade head
```

The admin and mobile apps still run on the host as in sections 2–3.

---

## Quick reference

| App | Start | URL |
|---|---|---|
| Postgres | `docker compose up -d postgres` | `localhost:5433` |
| Backend | `cd backend && venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` | http://localhost:8000/docs |
| Admin | `npm run dev --workspace=admin` | http://localhost:5173 |
| Mobile | `cd mobile && npx expo start --dev-client` | dev client on device |

### Fast checks (no build)

| App | Command |
|---|---|
| backend | `cd backend && venv/bin/ruff check app tests && venv/bin/mypy app && venv/bin/pytest -q` |
| admin | `cd admin && npx tsc -b && npx eslint .` |
| mobile | `cd mobile && npx tsc --noEmit && npx expo lint` |

### Troubleshooting

| Symptom | Fix |
|---|---|
| Backend: connection refused on startup | Postgres not up, or `DATABASE_URL` points at `5432` instead of `5433` for host runs. |
| Admin: API calls 404 / fail | Backend not on :8000, or you opened it somewhere other than :5173 (the Vite proxy assumes :8000). |
| Mobile: "Network request failed" | Use LAN IP (device) or `10.0.2.2` (Android emulator), not `localhost`; run uvicorn with `--host 0.0.0.0`. |
| Mobile: app opens in Expo Go and crashes | Build and open the **dev client**; start Metro with `--dev-client`. |
| OTP code never arrives | Dev uses `SMS_PROVIDER=console` — the code is logged/echoed by the backend, not texted. |
