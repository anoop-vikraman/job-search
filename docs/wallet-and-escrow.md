# Wallet & Escrow

Every user has one wallet. Money is held in escrow while a job is in progress and released on
completion (or refunded on cancellation). Balances are an **append-only ledger** — they are never
edited directly.

## Wallet shape

| Field | Meaning |
|---|---|
| `balance_minor` | Spendable balance |
| `held_minor` | Funds locked in escrow for accepted jobs |
| `currency` | ISO 4217 (default `INR`) |

A DB check constraint guarantees both are `>= 0`.

## Transactions (the ledger)

Every balance change is a `wallet_transactions` row. Types:

| Type | Effect |
|---|---|
| `topup` | `balance += amount` |
| `hold` | `balance -= amount`, `held += amount` (on accept) |
| `release` | lister `held -= amount`; provider `balance += amount` (on completion) |
| `refund` | `held -= amount`, `balance += amount` (on cancellation) |
| `fee` | platform fee debited from the provider on completion |
| `payout` | withdrawal: `balance -= amount` on request (negative row); a rejected withdrawal adds a positive `payout` row that re-credits it |

**Invariant:** for every wallet, `balance_minor + held_minor == sum(amount_minor of completed
transactions)`. The seed script and tests verify this reconciles.

## Operations (`wallet_service.py`)

- **`topup`** — adds funds. Idempotent on `reference` (a repeated top-up with the same reference
  returns the existing transaction instead of double-crediting).
- **`place_hold`** — called when an application is accepted; moves the agreed amount from
  `balance` to `held`. Fails with `INSUFFICIENT_BALANCE` if the lister can't cover it.
- **`release_hold`** — completion: moves the held amount from the lister's `held` to the
  provider's `balance`.
- **`refund_hold`** — cancellation/refund: returns the held amount to the lister's `balance`.

All mutations go through `_record(...)`, which appends the ledger row; balances are only ever
adjusted alongside a transaction.

## Example (from the seed)

```
Liam tops up        → balance 500000, held 0
Liam accepts a job  → hold 120000 → balance 380000, held 120000
```

## Adding money (Razorpay)

Top-ups go through Razorpay (`services/payment_service.py`, `services/razorpay_client.py`).
The internal ledger is unchanged: a paid order is credited through `wallet_service.topup` with
reference `razorpay:{payment_id}`, which makes crediting idempotent.

1. `POST /wallet/topup/order { amount_minor }` creates a Razorpay order (₹1–₹1,00,000) and a
   `payment_orders` row, and returns `provider_order_id`, `key_id` and `test_mode` for Checkout.
2. The app opens Razorpay Standard Checkout. On success Checkout returns
   `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
3. `POST /wallet/topup/verify` checks `HMAC_SHA256(order_id|payment_id, key_secret)`, fetches the
   payment from Razorpay, checks that its order, amount and currency match, captures it if it is
   only `authorized`, then credits the wallet and sends a `wallet_topup` notification.
4. `POST /wallet/razorpay/webhook` (no user auth) checks `X-Razorpay-Signature` =
   `HMAC_SHA256(raw body, webhook secret)` and credits on `payment.captured` / `order.paid`. This
   covers users who close the app before step 3. `payment.failed` marks the order `failed`; a later
   successful retry inside Checkout still credits it. Unknown orders and amount mismatches are
   acknowledged (200 `ignored`) so Razorpay stops retrying.

Verify and webhook can race: the order row is locked (`SELECT … FOR UPDATE`) and the ledger
`reference` is unique, so an order is credited exactly once. Verifying an order that a different
payment already paid returns `409 ORDER_ALREADY_PAID`.

Errors: `AMOUNT_OUT_OF_RANGE`, `PAYMENTS_NOT_CONFIGURED` (keys unset), `PAYMENT_GATEWAY_ERROR`,
`INVALID_SIGNATURE`, `PAYMENT_MISMATCH`, `PAYMENT_NOT_CAPTURED`, `PAYMENT_ORDER_NOT_FOUND`
(also returned for another user's order).

### Config (`backend/.env`)

| Var | Notes |
|---|---|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Use `rzp_test_…` keys for sandbox (`test_mode: true` in the order response) |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you set on the webhook in the Razorpay dashboard (not the API secret) |
| `WALLET_TOPUP_MIN_MINOR` / `WALLET_TOPUP_MAX_MINOR` | Defaults 100 / 10,000,000 |
| `WALLET_SIMULATED_TOPUP_ENABLED` | Default `true`. The legacy `POST /wallet/topup` credits without payment; set `false` anywhere real money is involved |

Webhook setup: Dashboard → Test mode → Webhooks → URL `https://<public-host>/api/v1/wallet/razorpay/webhook`,
events `payment.captured`, `order.paid`, `payment.failed`. Razorpay refuses `localhost` and most
tunnel domains; their docs suggest zrok for local testing.

## Withdrawals (payouts)

`POST /wallet/payouts { amount_minor, upi_id }` (minimum ₹100) debits the balance immediately
(`payout` ledger row, wallet row locked against concurrent withdrawals) and creates a `payouts`
record with status `requested`. Sending the money is manual for now: an admin calls
`POST /admin/payouts/{id}/decide` with `{ approve: true, reference: "<UTR>" }` to mark it `paid`,
or `{ approve: false, reason }` to reject it, which re-credits the wallet. The user is notified
either way. Automated transfers (RazorpayX Payouts) are not integrated.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/wallet` | Current balances (creates the wallet if missing) |
| POST | `/api/v1/wallet/topup` | Simulated top-up (dev only, see `WALLET_SIMULATED_TOPUP_ENABLED`). `reference` may not start with `razorpay:`/`payout:`/`payout-reversal:` |
| POST | `/api/v1/wallet/topup/order` | Create a Razorpay order (201) |
| POST | `/api/v1/wallet/topup/verify` | Verify Checkout result and credit (idempotent) |
| POST | `/api/v1/wallet/razorpay/webhook` | Razorpay events (HMAC-verified, no auth) |
| POST | `/api/v1/wallet/payouts` | Request a UPI withdrawal (201) |
| GET | `/api/v1/wallet/payouts?page&limit` | Caller's withdrawals |
| GET | `/api/v1/wallet/transactions?page&limit` | Paginated ledger, newest first |
| GET | `/api/v1/admin/payouts?status&page&limit` | Admin withdrawal queue |
| POST | `/api/v1/admin/payouts/{id}/decide` | Admin: mark paid / reject |

## Mobile
`app/wallet/index.tsx` renders the balance card, an **Add money** sheet (amount + quick picks),
and the ledger (signed amounts: green credits, red debits). Paying opens
`components/Wallet/RazorpayCheckout.tsx`: Razorpay Standard Checkout (`checkout.js`) inside a
`react-native-webview`, which hands `upi://` and other app links to the OS so UPI apps open. On
success the app calls verify; if that call fails, the webhook still credits the payment. There is
no withdrawal UI in the app yet.

## Admin
`src/pages/TransactionsPage.tsx` shows the full cross-user ledger (type, amount, status,
reference, time) for operations review.

## Key files
- Backend: `app/services/wallet_service.py`, `app/services/payment_service.py`,
  `app/services/razorpay_client.py`, `app/api/v1/wallet.py`, `app/models/{wallet,payment}.py`,
  migration `4ace59c14072`
- Mobile: `app/wallet/index.tsx`, `components/Wallet/RazorpayCheckout.tsx`, `api/wallet.ts`,
  `hooks/useWallet.ts`
- Admin: `src/pages/TransactionsPage.tsx`
