# CLAUDE.md

Mirrors the Kiro setup in `.kiro/` (source of truth). If they conflict, `.kiro/steering/*.md` wins; update this file to match.

**Project:** Tweak — a local-services gig marketplace. Users post short jobs ("tweaks": plumbing, electrical, cleaning, moving, painting, writing, design, coding), providers apply, both sides negotiate a price (quote / counter-quote), money moves through an in-app wallet (escrow on accept), and both sides rate each other. An admin web panel moderates users, tweaks and payouts.

## 1. Response & Workflow Rules (strict)

Output:
- No pleasantries, preambles, narration or closing summaries ("Sure", "Here is", "I hope this helps", "In conclusion", "Let me…").
- Line 1 of a response is the code fence, diff or command. No code? Line 1 is the direct answer.
- Code: unified diff or the complete new file only. Never repeat unchanged surrounding code.
- Explanations: terse bullets or compact ASCII diagrams, no prose paragraphs.
- Failed command → exactly: `Error:` exact line · `Cause:` one line · `Fix:` command or diff. Don't restate the workflow.

Edits:
- Surgical edits to the changed lines. Full-file writes only for new files or when more than about half the file changes.
- Read only the relevant range of large files.
- Never reformat, reorder or "clean up" code outside the change.
- Add an import together with (or after) the code that uses it; unused imports fail lint.

Hooks (`.claude/settings.json`, reusing `.kiro/hooks/scripts/`):
- After every Edit/Write: `backend/**/*.py` → `ruff check --fix` + `ruff format`; `admin|mobile/**/*.ts(x)` → `eslint --fix`. Expect files to be reformatted after edits.
- Before every Bash call: if it's `git commit`, runs `mypy` (backend) and `tsc` (admin, mobile); type errors block the commit (exit 2). Fix them; never bypass with `--no-verify`.

Builds & checks:
- Never run production builds unless asked: `npm run build`, `vite build`, `expo export`, `eas build`, `expo run:*`, `expo prebuild`, `docker compose build`.
- Verify with fast checks on the changed app only:

| App | Check |
|---|---|
| backend | `cd backend && venv/bin/ruff check <files> && venv/bin/mypy app` |
| admin | `cd admin && npx tsc -b && npx eslint <files>` |
| mobile | `cd mobile && npx tsc --noEmit && npx eslint <files>` |

- Don't start dev servers unless the change is runtime behaviour (routing, startup, CORS, DB connectivity).
- Quiet commands: `-q`, `| tail -n 20`, `2>&1 | grep -E 'error|warn'`. Always non-interactive (`--yes`, `CI=1`). Never dump install logs, lockfiles or dependency trees.

Tests:
- Default: no tests, mocks, fixtures or test config unless asked.
- **Mandatory** when creating or changing these areas:

| Area | Must cover |
|---|---|
| Wallet / escrow ledger (`backend/app/services/`) | hold on accept, release on completion, refund on cancel; balance never negative; ledger append-only and sums to balance |
| Refund policy (`backend/app/services/`) | eligible vs ineligible states, partial vs full, reversing transaction recorded, idempotent on retry |
| Application flow (`backend/app/services/`) | cannot apply to own tweak, one active application per (tweak, provider), accept/reject/counter-quote transitions |
| Refresh token rotation | old token revoked on rotation, reuse of revoked token revokes family, expiry |
| RBAC & tweak access (`get_current_user`, `require_role`, `verify_tweak_access`) | each role allowed/denied, banned user, owner vs accepted-applicant vs stranger |
| Ratings | only after completion, once per side, bounds 1–5, aggregate recomputed |
| Mobile create-tweak persistence | wizard writes persist and rehydrate across reload; "Save Draft" writes a real draft |

- Unit-level, no snapshot/UI tests. Backend: `pytest` + `pytest-asyncio` in `backend/tests/` mirroring module paths; DB tests use `tweak_postgres` inside a rolled-back transaction, not mocks. Admin: Vitest; mobile: `jest-expo`; `*.test.ts` next to the file; native storage mocked in-memory.
- Run only the changed module's tests. Install a framework (pinned) the first time it's needed.

Safety: never run `docker compose down -v`, `docker volume rm`, `rm -rf`, `git push`, `npm publish`, `eas submit`, `eas update` unless explicitly asked. Never read out or commit `backend/.env`.

## 2. Monorepo Boundaries

```
tweak/ (repo root)
├── backend/   FastAPI API          → only backend work writes here (+ docker-compose.yml)
├── admin/     React moderation panel → only admin work writes here
├── mobile/    Expo mobile app      → only mobile work writes here
├── packages/theme/  @tweak/theme design tokens (colours, spacing, radii, type) → the ONLY shared code; tokens only, no logic
├── .kiro/     Kiro config (source of truth for these rules)
└── docker-compose.yml, package.json (npm workspaces: admin, mobile)
```
- A task touches one app unless it's explicitly cross-cutting. Cross-app changes go through the API contract (§3), not shared code. Exception: `@tweak/theme` (`packages/theme/`) — admin maps it to Tailwind colours via CSS variables (`admin/tailwind.config.ts`, `admin/src/lib/theme.ts`); mobile reads it through `ThemeProvider`/`useTheme` (`mobile/themes/`). Change colours there, never as hex in components.
- Personas per app: see `skills.md` (read it when a trigger phrase in §5 is used).

### Backend (`backend/`)
- Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.x async + asyncpg, Alembic (async). Virtualenv: `backend/venv`.
- Layout under `backend/app/`: `core/` (config, JWT/security) · `api/v1/` (routers, deps) · `models/` · `schemas/` · `services/` · `db/` (engine, `async_sessionmaker`, `Base`, `get_db`).
- Sessions: `AsyncSession` via `Depends(get_db)` (yield-based). No blocking sync calls in async paths.
- Routes validate and dispatch only. Business rules (application flow, wallet/escrow ledger, refunds, ratings) live in `services/`; services take `AsyncSession` as a parameter and never import FastAPI.
- Auth: custom JWT access + DB-persisted rotatable refresh tokens (`refresh_tokens` table); rotation invalidates the previous token. Dependencies: `get_current_user`, `require_role(["admin","user"])`, `verify_tweak_access`. Auth only via `Depends(...)`, never inline.
- Money: integer minor units (`*_minor BIGINT`) or `NUMERIC`, never floats. Wallet balances change only through append-only `wallet_transactions`.
- Models: relationships use `lazy="raise"`; load explicitly with `selectinload`/`joinedload` (no N+1). Every JSONB column (tweak schedule/pricing/media) has a strict Pydantic schema validated before writes. New models must be imported in `app/models/__init__.py`.
- Migrations: every model change → `alembic revision --autogenerate`, review by hand (enum `DROP TYPE`, partial/GIN indexes, raw SQL constraints, triggers). Never edit an applied revision.
- Schema spec: `.kiro/specs/01_db_schema.spec.md` (Part A core; Part B items undecided).

### Admin (`admin/`)
- Internal moderation/operations dashboard: users (ban/role), tweaks moderation, applications/offers, wallet ledger, refunds/payouts.
- React 19 (18+ API), Vite, TypeScript strict, Tailwind 3, Shadcn UI (radix-ui), TanStack Table v8, TanStack Query v5, axios, lucide-react.
- Feature-sliced: `admin/src/features/{auth,users,tweaks,applications,wallet,refunds}/`; each owns components, hooks, API calls, types. Shared primitives live outside `features/`.
- State: server state **only** TanStack Query; local UI state Zustand. No server data in Zustand or `useState`.
- Forms: `react-hook-form` + `@hookform/resolvers/zod`; the Zod schema is the type source (`z.infer`).
- Money/time: render from integer minor units + `currency` and ISO-8601-`Z` strings; never parse floats.
- Role guard on layout routes: `user.role === 'admin'`. Destructive ops (ban, force-refund, close tweak) require confirmation and are logged.
- Design: desktop-first, high density, sidebar + panes; zinc/slate neutrals, primary `#2563EB` (blue-600) only for primary actions/focus/active; colours as Shadcn CSS variables from `@tweak/theme` (no hex in components); full `dark:` support; Inter → `system-ui`; `font-mono` for IDs, amounts, timestamps.
- Every data table: sticky header, pagination, column visibility toggle, per-row quick actions.
- Every form: floating labels, inline Zod errors linked via `aria-describedby`, disabled submit + spinner while loading.

### Mobile (`mobile/`)
- Expo SDK 54 (managed/CNG), React Native 0.81, TypeScript strict, expo-router, Zustand (+ `persist` to AsyncStorage/MMKV), NativeWind, react-hook-form + zod, axios, i18next.
- Install packages with `npx expo install`, never plain npm. Never hand-edit `android/`/`ios/`.
- If `react-native-mmkv` is used it is native: needs a development build, not Expo Go.
- Storage: access + refresh tokens → `expo-secure-store` only (never AsyncStorage/MMKV/Zustand). Never persist `password`. UI cache + session/wizard state → Zustand `persist`.
- Auth/API: all calls through the axios instance in `utils/api.ts`; request interceptor attaches the Bearer token from `secureStorage`; 401 refreshes once then retries. Login/OTP MUST actually `secureStorage.save('access_token'/'refresh_token', …)` — a token the interceptor reads must be written on login. Auth outcomes are decided server-side, not by a hardcoded client value.
- Engine rules:
  1. The create-tweak wizard (`app/create-tweak/*`) persists progress via Zustand `persist`; rehydrate before rendering; "Save Draft" writes a real `draft` tweak (never a no-op toast).
  2. Hooks are unconditional — no early `return` before the hook list (fix `app/create-tweak/edit.tsx`).
  3. Lists: `FlatList`/FlashList with stable `keyExtractor={i => i.id}`; never `ScrollView` + `.map()` for the feed/applicants/transactions. Avoid index keys for reorderable lists.
  4. Media: create an audio player only when a source exists and release on unmount; maps never fall back to a hardcoded city centre.
- Design: 44×44pt min hit targets (`hitSlop`), safe-area insets everywhere, slate base with system light/dark. Status colours (shared with admin): active/accepted/completed `#16A34A`/`#DCFCE7`, rejected/cancelled `#DC2626`/`#FEE2E2`, pending/on-hold/applied `#D97706`/`#FEF3C7` (dark mode: 950 surfaces); always pair colour with icon/label. Animations: `react-native-reanimated` only, respect `useReducedMotion`. Clean up every timer/listener/subscription on unmount.

## 3. API Contract

- REST under `/api/v1/`, plural resources (`/api/v1/tweaks/{tweak_id}`, `/api/v1/tweaks/{tweak_id}/applications`, `/api/v1/wallet/transactions`).
- Status codes: 200, 201, 204, 400, 401 (bad/expired token), 403 (insufficient role/access), 404, 409, 422. (`/health` uses 503 when the DB is down.)
- Error envelope, all errors including 422: `{"detail": "Clear descriptive message", "code": "UPPER_SNAKE_CASE"}` (e.g. `CANNOT_APPLY_OWN_TWEAK`, `ALREADY_APPLIED`, `INSUFFICIENT_BALANCE`, `TWEAK_ACCESS_DENIED`); codes stable across releases. Override FastAPI's `HTTPException` and `RequestValidationError` handlers.
- Pagination: `{"items": [...], "total": int, "page": int, "limit": int}`, 1-based `page`, max `limit` enforced; cursor mode adds `next_cursor` (use it for the marketplace feed). Generic `Page[T]` schema.
- Money: integer minor units + `currency` (ISO 4217); never floats.
- Timestamps: ISO 8601 UTC ending in `Z`; `timestamptz` storage; timezone-aware `datetime` only (shared serializer, since Pydantic emits `+00:00`).
- OpenAPI: every route declares `response_model`, `status_code`, `responses={...}` with the error schema, a docstring, and a stable `operationId` (`generate_unique_id_function`) for TS client generation (consumed by admin + mobile).

## 4. Typing & Formatting

- TypeScript: `strict: true`; no `any` (use `unknown` + narrowing); explicit return types on exported functions, hooks and API clients.
- Python: PEP 8; ruff (lint + isort) and ruff format / black at line length 100; mypy strict with `disallow_untyped_defs` (config: `backend/pyproject.toml`); annotate every function.
- File names: components `PascalCase.tsx`; hooks/utils `camelCase.ts`; Python `snake_case.py`.
- Imports in three blank-line-separated groups: (1) stdlib/external, (2) internal absolute (`@/…`, `app.…`), (3) relative. No `../../../`; use the `@/` alias (configure in tsconfig + Vite/Babel).

## 5. Skills

Persona definitions: `skills.md`. Triggers:
- `Adopt Skill: Backend & Database Architect`
- `Adopt Skill: Admin Panel Architect`
- `Adopt Skill: Mobile Engine Architect`
- `Drop Skill` (return to default)

## 6. Run / Dev Quick Reference

| Task | Command |
|---|---|
| Install JS deps | `npm install` (root; workspaces) |
| Backend venv | `python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements-dev.txt` |
| Env file | `cp backend/.env.example backend/.env` (set `SECRET_KEY` ≥ 32 chars) |
| Start Postgres | `docker compose up -d postgres` (container `tweak_postgres`, `127.0.0.1:5432`, volume `postgres_data`, healthcheck `pg_isready -U postgres`) |
| Migrate | `cd backend && venv/bin/alembic upgrade head` |
| All apps | `npm run dev` (backend :8000, admin :5173, Metro :8081) |
| One app | `npm run dev:backend` · `npm run dev:admin` · `npm run dev:mobile` |
| Health | `curl localhost:8000/health` → `{"status":"ok","db_connected":true}` |
| Lint | `npm run lint --workspace=admin` · `npm run lint --workspace=mobile` · `cd backend && venv/bin/ruff check .` |
| Postgres shell | `docker exec -it tweak_postgres psql -U postgres -d tweak_db` |

- Backend reaches the DB at `localhost:5432` from the host and at `postgres:5432` from inside compose.
- Run Alembic and uvicorn from `backend/` (that's where `.env` and `alembic.ini` are found).
