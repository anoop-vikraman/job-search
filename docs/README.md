# Tweak — Feature Documentation

Tweak is a local-services / gig marketplace. Users post short jobs ("tweaks"), providers apply,
the two sides negotiate a price, money moves through an in-app wallet (escrow), and both sides
rate each other. An admin panel moderates the platform.

This folder documents each feature: what it does, where it lives across the three apps
(`mobile/`, `backend/`, `admin/`), the data involved, and the rules that govern it.

## Index

| Doc | Feature |
|---|---|
| [authentication.md](./authentication.md) | Signup, login, OTP, JWT + refresh-token rotation, route protection |
| [tweaks.md](./tweaks.md) | Posting a tweak, the create-tweak wizard, drafts, the marketplace feed |
| [applications-and-offers.md](./applications-and-offers.md) | Applying, quotes, counter-offers, accept / reject |
| [chat.md](./chat.md) | Lister ↔ accepted-provider messaging, unread counts |
| [push-notifications.md](./push-notifications.md) | Expo push delivery, device tokens, tap-to-navigate |
| [wallet-and-escrow.md](./wallet-and-escrow.md) | Wallet balances, top-ups, the escrow hold/release ledger |
| [refunds.md](./refunds.md) | Requesting and processing refunds |
| [ratings.md](./ratings.md) | Post-completion two-way ratings and aggregates |
| [profile-and-addresses.md](./profile-and-addresses.md) | Profile, saved addresses, score, invites |
| [admin-panel.md](./admin-panel.md) | The moderation / operations dashboard |
| [api-reference.md](./api-reference.md) | REST endpoint catalogue + conventions |
| [architecture.md](./architecture.md) | Monorepo layout, stacks, data model, how the apps connect |

## Conventions used across these docs

- **Money** is stored and sent as integer **minor units** (e.g. paise); `12000` = ₹120.00.
- **Timestamps** are ISO-8601 UTC ending in `Z`.
- **Errors** use the envelope `{ "detail": "message", "code": "UPPER_SNAKE_CASE" }`.
- **Lists** are paginated as `{ items, total, page, limit }`.
- Status values: tweak `draft|active|closed`, application `pending|accepted|rejected|withdrawn`,
  refund `requested|approved|rejected|processed`.
