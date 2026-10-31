# API Reference

Base URL: `/api/v1`. Interactive docs when the backend is running: `http://localhost:8000/docs`
(Swagger) and `/redoc`. The OpenAPI schema is at `/openapi.json`.

## Conventions

- **Auth**: send `Authorization: Bearer <access_token>`. Admin routes additionally require
  `role: admin`.
- **Errors**: `{ "detail": "message", "code": "UPPER_SNAKE_CASE" }` for every error, including 422.
- **Pagination**: list endpoints take `?page` (1-based) and `?limit` (max 100) and return
  `{ "items": [...], "total": int, "page": int, "limit": int }`.
- **Money**: integer minor units; responses include `currency`.
- **Timestamps**: ISO-8601 UTC ending in `Z`.

## Status codes
`200` ok · `201` created · `204` no content · `400` business-rule violation · `401` bad/expired
token · `403` insufficient role/access · `404` not found · `409` conflict/state · `422` validation.
`/health` returns `503` when the DB is down.

## Endpoints

### Health
| Method | Path | Auth |
|---|---|---|
| GET | `/health` | none — `{ status, db_connected }` |

### Auth
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/signup` | none |
| POST | `/api/v1/auth/login` | none |
| POST | `/api/v1/auth/refresh` | none (refresh token in body) |
| POST | `/api/v1/auth/logout` | user |
| POST | `/api/v1/auth/otp/generate` | none (stub) |
| POST | `/api/v1/auth/otp/verify` | none (stub) |

### Users
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/users/me` | user |
| PATCH | `/api/v1/users/me` | user |

### Addresses
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/addresses` | user |
| POST | `/api/v1/addresses` | user |
| DELETE | `/api/v1/addresses/{address_id}` | user (owner) |

### Tweaks
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/tweaks?cursor&page&limit&category&tweak_type&search&lat&lng&radius_km&sort` | user — marketplace feed (see [tweaks.md](./tweaks.md#the-marketplace-feed)) |
| GET | `/api/v1/tweaks/mine` | user |
| POST | `/api/v1/tweaks` | user |
| GET | `/api/v1/tweaks/{tweak_id}` | user |
| PATCH | `/api/v1/tweaks/{tweak_id}` | user (owner) |
| DELETE | `/api/v1/tweaks/{tweak_id}` | user (owner) |

### Applications & offers
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/tweaks/{tweak_id}/applications` | user (provider) |
| POST | `/api/v1/tweaks/applications/{application_id}/accept` | user (lister) |
| POST | `/api/v1/tweaks/applications/{application_id}/reject` | user (lister) |
| POST | `/api/v1/tweaks/applications/{application_id}/counter` | user (lister) |
| POST | `/api/v1/tweaks/applications/{application_id}/submit-work` | user (provider) |
| POST | `/api/v1/tweaks/applications/{application_id}/dispute` | user (lister or provider) |
| GET | `/api/v1/tweaks/applications/{application_id}/dispute` | user (party) |

### Wallet
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/wallet` | user |
| POST | `/api/v1/wallet/topup` | user (simulated; dev only) |
| POST | `/api/v1/wallet/topup/order` | user |
| POST | `/api/v1/wallet/topup/verify` | user (order owner) |
| POST | `/api/v1/wallet/razorpay/webhook` | none (Razorpay HMAC signature) |
| POST | `/api/v1/wallet/payouts` | user |
| GET | `/api/v1/wallet/payouts?page&limit` | user (own) |
| GET | `/api/v1/wallet/transactions?page&limit` | user |

See [wallet-and-escrow.md](./wallet-and-escrow.md#adding-money-razorpay) for the payment flow.

### Refunds
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/refunds` | user (own) |
| POST | `/api/v1/refunds` | user (party) |

### Ratings
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/ratings` | user (party, completed tweak) |

### Conversations (chat)
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/conversations?page&limit` | user (own) |
| POST | `/api/v1/conversations` | user (lister or provider of an accepted application) |
| GET | `/api/v1/conversations/unread-count` | user |
| GET | `/api/v1/conversations/{conversation_id}` | user (party) |
| GET | `/api/v1/conversations/{conversation_id}/messages?page&limit` | user (party) |
| POST | `/api/v1/conversations/{conversation_id}/messages` | user (party) |
| POST | `/api/v1/conversations/{conversation_id}/read` | user (party) |

### Moderation
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/reports` | user |
| POST | `/api/v1/users/{user_id}/block` | user |
| DELETE | `/api/v1/users/{user_id}/block` | user |
| GET | `/api/v1/users/me/blocks` | user |
| GET | `/api/v1/admin/reports?status&target_type&page&limit` | admin |
| POST | `/api/v1/admin/reports/{report_id}/resolve` | admin |

### Identity verification (KYC)
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/kyc` | user |
| POST | `/api/v1/kyc` | user (multipart) |
| GET | `/api/v1/admin/kyc?status&page&limit` | admin |
| GET | `/api/v1/admin/kyc/{submission_id}/documents/{index}` | admin |
| POST | `/api/v1/admin/kyc/{submission_id}/review` | admin |

### Devices (push)
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/devices` | user |
| DELETE | `/api/v1/devices/{token}` | user (own token) |

### Admin
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/admin/users?page&limit` | admin |
| POST | `/api/v1/admin/users/{user_id}/ban` | admin |
| GET | `/api/v1/admin/tweaks?page&limit` | admin |
| POST | `/api/v1/admin/tweaks/{tweak_id}/close` | admin |
| GET | `/api/v1/admin/applications?page&limit` | admin |
| GET | `/api/v1/admin/transactions?page&limit` | admin |
| GET | `/api/v1/admin/refunds?page&limit` | admin |
| POST | `/api/v1/admin/refunds/{refund_id}/decide` | admin |
| GET | `/api/v1/admin/disputes?status&page&limit` | admin |
| POST | `/api/v1/admin/disputes/{dispute_id}/resolve` | admin |
| GET | `/api/v1/admin/payouts?status&page&limit` | admin |
| POST | `/api/v1/admin/payouts/{payout_id}/decide` | admin |

## Common error codes

| Code | When |
|---|---|
| `PHONE_ALREADY_EXISTS` | Signup with a registered phone |
| `INVALID_CREDENTIALS` | Wrong phone/password |
| `USER_BANNED` | Banned account |
| `REFRESH_TOKEN_REUSED` / `_EXPIRED` | Refresh replay / expiry |
| `CANNOT_APPLY_OWN_TWEAK` | Provider == lister |
| `ALREADY_APPLIED` | Duplicate active application |
| `ALREADY_ACCEPTED` | Second accept on a tweak |
| `INSUFFICIENT_BALANCE` | Escrow hold exceeds balance |
| `NO_AGREED_PRICE` | Accept with no quote/price |
| `TWEAK_ACCESS_DENIED` | Acting on a tweak you don't own |
| `TWEAK_NOT_COMPLETED` / `ALREADY_RATED` | Rating rule violations |
| `INVALID_PRICING_DATA` | Pricing payload fails validation |
| `FORBIDDEN` | Non-admin on an admin route |
| `LOCATION_REQUIRED` | Feed `radius_km` / `sort=distance` without `lat`+`lng` |
| `INVALID_CURSOR` | Feed cursor garbled or from another sort |
| `CHAT_NOT_AVAILABLE` / `CHAT_CLOSED` | Chat before acceptance / after cancellation |
| `CONVERSATION_ACCESS_DENIED` | Not a party to the conversation |
| `PAYMENTS_NOT_CONFIGURED` | Razorpay keys unset |
| `INVALID_SIGNATURE` / `PAYMENT_MISMATCH` / `PAYMENT_NOT_CAPTURED` | Top-up verification failures |
| `ORDER_ALREADY_PAID` | Order credited by a different payment |
| `SIMULATED_TOPUP_DISABLED` | Legacy top-up turned off |
| `KYC_REQUIRED` / `UPI_NOT_VERIFIED` | Withdrawal before verification / to another UPI id |
| `KYC_PENDING` / `ALREADY_VERIFIED` | Duplicate verification submission |
| `USER_BLOCKED` | Applying to / chatting with a blocked (or blocking) user |
| `ALREADY_REPORTED` | Duplicate open report |
| `WORK_SUBMITTED` | Lister cancel after the provider marked work done |
| `INVALID_SPLIT` | Partial dispute amount outside 1…escrow−1 |

Endpoint list generated from the live FastAPI router; see the backend `app/api/v1/` for request
and response models.
