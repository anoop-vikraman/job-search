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
| `payout` / `fee` | reserved for payouts and platform fees |

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

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/wallet` | Current balances (creates the wallet if missing) |
| POST | `/api/v1/wallet/topup` | `{ amount_minor, reference? }` — idempotent on reference |
| GET | `/api/v1/wallet/transactions?page&limit` | Paginated ledger, newest first |

## Mobile
`app/wallet/index.tsx` renders the balance card and a `FlatList` of transactions.

## Admin
`src/pages/TransactionsPage.tsx` shows the full cross-user ledger (type, amount, status,
reference, time) for operations review.

## Key files
- Backend: `app/services/wallet_service.py`, `app/api/v1/wallet.py`, `app/models/wallet.py`
- Mobile: `app/wallet/index.tsx`
- Admin: `src/pages/TransactionsPage.tsx`
