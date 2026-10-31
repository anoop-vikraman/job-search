---
inclusion: fileMatch
fileMatchPattern: 'backend/**'
---

# Backend Conventions

## Stack
- Python 3.11+
- FastAPI, Pydantic v2
- SQLAlchemy 2.0 (async) + asyncpg
- Alembic (async migrations)
- Virtualenv at `backend/venv`

## Structure
```
backend/app/
├── core/      # config, security (JWT), settings
├── api/v1/    # routers, dependencies
├── models/    # SQLAlchemy ORM models
├── schemas/   # Pydantic v2 request/response models
├── services/  # business logic
└── db/        # engine, async_sessionmaker, get_db, base
```

## Auth & RBAC
- Custom JWT access tokens + rotatable refresh tokens persisted in DB.
- Refresh rotation: issuing a new refresh token invalidates the previous one; reuse of a revoked
  token revokes the whole token family.
- Required dependencies:
  - `get_current_user`
  - `require_role(["admin", "user"])`
  - `verify_tweak_access` — guards reads/writes of a tweak to its owner, an accepted applicant, or an admin.
- Protect routes via `Depends(...)`; never inline auth checks in route bodies.
- OTP/phone verification is a backend service; the API decides auth outcomes, not the client.

## Database Sessions
- `async_sessionmaker` producing `AsyncSession`.
- Inject via `Depends(get_db)` (yield-based, closes on exit).
- No blocking sync calls (sync drivers, `time.sleep`, sync file/network I/O) in async paths.

## Models
- Relationships use `lazy="raise"`; load explicitly with `selectinload`/`joinedload` (no N+1).
- Every JSONB column (e.g. tweak schedule data, pricing data, media metadata) has a strict
  Pydantic v2 schema validated before writes, plus a `CHECK (jsonb_typeof(col) = ...)`.
- New models must be imported in `app/models/__init__.py`.
- Index every FK and every column you filter or sort on (marketplace feed, applications by tweak,
  transactions by user+date).

## Business Logic
- Routes: validate input (Pydantic) and dispatch to services only.
- `services/` owns all business rules:
  - **Application flow** — a provider cannot apply to their own tweak; one active application per
    (tweak, provider); accept/reject/counter-quote are explicit state transitions.
  - **Wallet / escrow** — accepting an application places a hold on the lister's balance; completion
    releases it to the provider; cancellation triggers a refund. Balance changes are append-only
    ledger transactions, never in-place balance edits.
  - **Refunds** — enforce the refund policy and record a reversing transaction.
  - **Ratings** — only after a tweak reaches a completed state, once per side.
- Services receive `AsyncSession` as a parameter; no FastAPI imports in services.
- Money is stored as integer minor units (or `NUMERIC`), never floats.

## Migrations
- Every model change requires an Alembic async revision script.
- Generate: `alembic revision --autogenerate -m "<message>"`; review by hand before committing
  (enum `DROP TYPE`, partial/GIN indexes, raw SQL constraints).
- Never edit an applied revision; add a new one.
- Schema spec: `.kiro/specs/01_db_schema.spec.md`.
