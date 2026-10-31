# Applications & Offers

How providers apply to tweaks and how listers respond (accept, reject, or counter-quote).

## Applying (provider)

`POST /api/v1/tweaks/{tweak_id}/applications` with:

| Field | Meaning |
|---|---|
| `why_prefer_message` | Pitch to the lister |
| `quoted_price_minor` | The provider's price (optional; required for `quote`-model tweaks) |
| `selected_slots` | Chosen time windows (JSONB array) |

Mobile flow: `app/apply/application/[tweakId]/step1.tsx` (message) → `step2.tsx` (slots + quote).

### Rules enforced (`application_service.apply`)
- **A provider cannot apply to their own tweak** → `400 CANNOT_APPLY_OWN_TWEAK`.
- The tweak must be `active` → otherwise `400 TWEAK_NOT_ACTIVE`.
- **One active application per (tweak, provider)** → a second active apply returns
  `409 ALREADY_APPLIED` (also enforced by a partial unique index).

Application status: `pending → accepted | rejected | withdrawn`.

## Lister responses

All require the caller to own the tweak (else `403 TWEAK_ACCESS_DENIED`).

### Accept
`POST /api/v1/tweaks/applications/{application_id}/accept`
- Only a `pending` application; only one accepted per tweak (`409 ALREADY_ACCEPTED`).
- **Places an escrow hold** on the lister's wallet for the agreed amount (the provider's quote, or
  the tweak's resolved `price_minor`). Insufficient balance → `400 INSUFFICIENT_BALANCE`.
- Marks the application `accepted` and the tweak `closed`.

### Reject
`POST /api/v1/tweaks/applications/{application_id}/reject` — pending → `rejected`.

### Counter-quote (offer)
`POST /api/v1/tweaks/applications/{application_id}/counter` with `lister_quoted_price_minor` +
optional `message`. Creates (or updates) a single `offer` row linked to the application. Only valid
while the application is `pending`.

## The negotiation shape

```
provider applies (quote) ──▶ lister may counter (offer) ──▶ accept  ──▶ escrow hold + tweak closed
                                                        └──▶ reject
```

## Agreed amount
On accept, the held amount is: the application's `quoted_price_minor` if set, otherwise the tweak's
`price_minor`. If neither exists (e.g. an open quote never priced), accept fails with
`400 NO_AGREED_PRICE`.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/tweaks/{tweak_id}/applications` | provider |
| POST | `/api/v1/tweaks/applications/{id}/accept` | lister (owner) |
| POST | `/api/v1/tweaks/applications/{id}/reject` | lister (owner) |
| POST | `/api/v1/tweaks/applications/{id}/counter` | lister (owner) |

## Key files
- Backend: `app/services/application_service.py`, `app/api/v1/tweaks.py`, `app/models/application.py`
- Mobile: `app/apply/application/[tweakId]/*`, `app/tweaks/[id]/applicants/*`
- Admin: read-only list in `src/pages/ApplicationsPage.tsx`
