# Admin Panel

An internal moderation / operations dashboard (`admin/`) for running the platform. Desktop-first,
high-density, sidebar + content layout.

## Access

- Sign in at `/login` with an **admin-role** account. Non-admin accounts are rejected at login.
- All `/api/v1/admin/*` endpoints are guarded server-side by `require_admin`; a non-admin token
  gets `403 FORBIDDEN`.
- Promote a user to admin via SQL or the seed (see root `README.md`).

## Features

| Page | What it does | Actions |
|---|---|---|
| **Users** (`UsersPage`) | All users: name, phone, role, rating, status, joined | Ban / Unban |
| **Tweaks** (`TweaksPage`) | All tweaks: title, category, type, price, status | Close a tweak |
| **Applications** (`ApplicationsPage`) | All applications: tweak, provider, quote, status | Read-only |
| **Transactions** (`TransactionsPage`) | Cross-user wallet ledger: type, amount, status, reference | Read-only |
| **Refunds** (`RefundsPage`) | Refund queue | Approve (reverses escrow) / Reject |

## Shared data table

All pages use one `DataTable` component (`src/components/data-table.tsx`) built on TanStack Table,
providing the admin-standard affordances:

- sticky header
- pagination (server-driven, `page`/`limit`)
- column-visibility toggle
- per-row quick actions

Server state is fetched with **TanStack Query**; mutations (ban, close, decide refund) invalidate
the relevant query so the table refreshes. Destructive actions (ban, approve refund, close) are
confirmation-gated.

## Admin endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/users` | List users (paginated) |
| POST | `/api/v1/admin/users/{id}/ban` | Ban / unban |
| GET | `/api/v1/admin/tweaks` | List tweaks |
| POST | `/api/v1/admin/tweaks/{id}/close` | Force-close a tweak |
| GET | `/api/v1/admin/applications` | List applications |
| GET | `/api/v1/admin/transactions` | List all transactions |
| GET | `/api/v1/admin/refunds` | Refund queue |
| POST | `/api/v1/admin/refunds/{id}/decide` | Approve/reject a refund |

## Design system

- Shadcn-style primitives (`src/components/ui/*`), Tailwind CSS variables for theming, full
  light/dark support, Inter typography, `font-mono` for IDs/amounts/timestamps.
- Money is rendered from integer minor units; timestamps from ISO-8601-`Z`. Types mirror the
  backend Pydantic schemas exactly (`src/lib/types.ts`) — the client never invents fields.

## Key files
- `admin/src/pages/*`, `admin/src/features/admin/api.ts`, `admin/src/components/data-table.tsx`
- Backend: `backend/app/api/v1/admin.py`
