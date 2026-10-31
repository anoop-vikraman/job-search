---
inclusion: always
---

# API Guidelines

Applies to the backend (producer) and admin/mobile (consumers).

## Standards
- RESTful resources under `/api/v1/`.
- Plural nouns for collections (`/api/v1/tweaks`, `/api/v1/tweaks/{tweak_id}`,
  `/api/v1/tweaks/{tweak_id}/applications`, `/api/v1/wallet/transactions`).
- Allowed status codes only:

| Code | Use |
|---|---|
| 200 | Successful read/update with body |
| 201 | Resource created |
| 204 | Success, no body (e.g. delete) |
| 400 | Malformed request / business rule violation |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but insufficient role/access |
| 404 | Resource not found |
| 409 | Conflict (duplicate, state conflict) |
| 422 | Validation failure |

## Error Envelope
```json
{"detail": "Clear descriptive message", "code": "MACHINE_READABLE_CODE"}
```
- `code`: `UPPER_SNAKE_CASE`, stable across releases
  (e.g. `TWEAK_ACCESS_DENIED`, `ALREADY_APPLIED`, `CANNOT_APPLY_OWN_TWEAK`, `INSUFFICIENT_BALANCE`,
  `PHONE_ALREADY_EXISTS`).
- Override FastAPI's default `HTTPException` and `RequestValidationError` handlers so every error,
  including 422, matches this envelope.

## Pagination
```json
{"items": [], "total": 0, "page": 1, "limit": 20}
```
- Query params: `page` (1-based), `limit` (enforce a max).
- Cursor mode returns the same shape plus `next_cursor` (null at end) — use cursor mode for the
  marketplace feed.
- Use a generic Pydantic `Page[T]` schema for all list responses.

## Money
- All monetary fields are integer minor units (e.g. paise) or `NUMERIC` strings — never floats.
- Responses include a `currency` field (ISO 4217, e.g. `INR`).

## Date Handling
- All timestamps: ISO 8601 UTC ending with `Z` (`2026-10-22T09:30:00Z`).
- Store as `timestamptz`; use timezone-aware `datetime` only.
- Pydantic v2 serializes UTC as `+00:00` by default; use a shared serializer to emit `Z`.

## OpenAPI Contract
Every route must declare:
- `response_model`
- `status_code`
- `responses={...}` for documented error codes (using the error envelope schema)
- Docstring (becomes the operation description)
- Stable `operationId` (set `generate_unique_id_function` on the app/routers) for TypeScript client
  generation (consumed by both `admin/` and `mobile/`).
