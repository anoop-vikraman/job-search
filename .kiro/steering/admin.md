---
inclusion: fileMatch
fileMatchPattern: 'admin/**'
---

# Admin Conventions

The admin panel is an internal moderation / operations dashboard for Tweak: review and ban users,
moderate posted tweaks, inspect applications and offers, monitor wallet transactions, and process
refunds and payouts.

## Stack
- React 18+, Vite
- TypeScript (`strict: true`)
- Tailwind CSS, Shadcn UI (`radix-ui`)
- TanStack Table v8, TanStack Query v5
- react-hook-form + `@hookform/resolvers/zod`
- axios (shared API client generated from the backend OpenAPI contract)

## Architecture (feature-sliced)
```
admin/src/features/
├── auth/
├── users/           # profiles, bans, roles, ratings
├── tweaks/          # moderate posts, categories, status
├── applications/    # applications, offers / counter-quotes
├── wallet/          # transactions ledger, holds, payouts
└── refunds/         # refund queue + policy actions
```
- Each feature owns its components, hooks, API calls, and types.
- Shared primitives (Shadcn components, utils) live outside `features/`.

## State Management
- Server state: TanStack Query only. No server data in Zustand or `useState`.
- Local UI state: Zustand.

## Forms
- `react-hook-form` + `@hookform/resolvers/zod`.
- Zod schema is the single source of truth for form types (`z.infer`).
- Types mirror the backend Pydantic schemas exactly; never invent fields. A missing endpoint is a
  backend task, not a client-side workaround.

## Money & time
- Render money from integer minor units + `currency`; never parse floats.
- Render timestamps from ISO-8601-`Z` strings in the admin's locale; store/compare in UTC.

## Role Guard
- Protected layout routes allow access only if `user.role === 'admin'`.
- Enforce at the layout route level, not per page.
- Destructive operations (ban user, force-refund, close tweak) require a confirmation dialog and
  are logged.
