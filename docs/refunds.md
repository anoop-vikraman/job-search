# Refunds

A refund reverses the escrow hold on an accepted job back to the lister's wallet.

## Requesting a refund (user)

`POST /api/v1/refunds` with `{ application_id, amount_minor, reason? }`.

- Only a **party to the tweak** (the lister or the accepted provider) may request a refund;
  others get `403 NOT_A_PARTY`.
- Creates a `Refund` row in status `requested`.

Mobile: `app/refunds/index.tsx` lists the user's own refund requests
(`GET /api/v1/refunds`).

## Processing a refund (admin)

`POST /api/v1/admin/refunds/{refund_id}/decide` with `{ approve: true | false }`.

- **Approve** → calls `wallet_service.refund_hold`, which moves the amount from the lister's
  `held` back to `balance` and appends a `refund` transaction. The refund is marked `processed`,
  linked to the reversing transaction (`reversing_txn_id`), and the tweak is `closed`.
- **Reject** → the refund is marked `rejected` (no money moves).
- Only a `requested` refund can be decided (else `409 INVALID_STATE`).

## Status lifecycle

```
requested ──approve──▶ processed   (escrow hold reversed to lister)
          ──reject───▶ rejected
```

(`approved` exists in the enum for a future two-step flow; the current flow goes straight to
`processed` on approval.)

## Admin queue

`src/pages/RefundsPage.tsx` shows the refund queue with **Approve** / **Reject** row actions.
Approve is confirmation-gated because it moves money.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/refunds` | user (own requests) |
| POST | `/api/v1/refunds` | party to the tweak |
| GET | `/api/v1/admin/refunds?page&limit` | admin |
| POST | `/api/v1/admin/refunds/{id}/decide` | admin |

## Key files
- Backend: `app/services/refund_service.py`, `app/api/v1/refunds.py`, `app/api/v1/admin.py`, `app/models/refund.py`
- Mobile: `app/refunds/index.tsx`
- Admin: `src/pages/RefundsPage.tsx`
