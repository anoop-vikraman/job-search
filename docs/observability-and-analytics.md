# Error tracking & analytics

## Sentry (errors)

Both are off unless a DSN is configured.

| Where | Config | Notes |
|---|---|---|
| Backend API + worker | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` (default `development`), `SENTRY_TRACES_SAMPLE_RATE` (default 0) | `app/core/observability.py`; tagged `component=api` / `worker`. `send_default_pii=False`, and `before_send` filters `Authorization`, cookies, the Razorpay signature header and password/OTP/token fields. Error-level logs become events |
| Mobile | `EXPO_PUBLIC_SENTRY_DSN`, optional `EXPO_PUBLIC_APP_ENV` | `utils/observability.ts`; the root layout is wrapped with `Sentry.wrap`, `GlobalErrorBoundary` reports caught UI errors, and only the user id is attached. Source-map upload: set `SENTRY_ORG`, `SENTRY_PROJECT` (enables the `@sentry/react-native/expo` plugin) and `SENTRY_AUTH_TOKEN` at build time. Needs a dev/release build (native module) |

## Product analytics (funnel)

Events live in `analytics_events` (`name`, `user_id`, `tweak_id`, `properties` JSONB, `created_at`).

**Server-side** (recorded in the same transaction as the action, so counts match reality):

| Event | When |
|---|---|
| `tweak_posted` | A tweak is created active or published from draft |
| `application_submitted` | A provider applies |
| `application_accepted` | The lister accepts (`amount_minor`) |
| `job_completed` | Escrow released: confirm, auto-release or dispute release (`amount_minor`, `fee_minor`, `how`) |
| `topup_paid`, `payout_requested`, `dispute_opened` | Money and trust signals |

**Client** (`POST /api/v1/analytics/events { name, properties }`, whitelisted so server events
can't be forged; properties capped at 10 scalar values, strings at 200 chars): `app_open`,
`tweak_viewed`, `search_performed`, `checkout_opened`. The app sends them fire-and-forget
(`utils/analytics.ts`) with `X-Silent-Errors` so failures never show a toast.

**Report**: `GET /api/v1/admin/analytics/funnel?days=30` → steps (count, unique users, conversion
from the previous step), other event totals, and daily counts. Admin panel: **Analytics** page.
