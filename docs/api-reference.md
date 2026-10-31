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
| GET | `/api/v1/tweaks?page&limit&category&search&lat&lng&radius_km&sort` | user — marketplace feed (see [tweaks.md](./tweaks.md#the-marketplace-feed)) |
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

### Wallet
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/wallet` | user |
| POST | `/api/v1/wallet/topup` | user |
| GET | `/api/v1/wallet/transactions?page&limit` | user |

### Refunds
| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/refunds` | user (own) |
| POST | `/api/v1/refunds` | user (party) |

### Ratings
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/ratings` | user (party, completed tweak) |

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

Endpoint list generated from the live FastAPI router; see the backend `app/api/v1/` for request
and response models.
