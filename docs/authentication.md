# Authentication

Phone-number + password authentication with JWT access tokens and rotating refresh tokens.

## User flows

### Signup (mobile)
1. `app/signup.tsx` collects name, mobile number, country code, and password.
2. It requests an OTP (`authApi.generateOtp`) and navigates to `app/auth/otp.tsx`.
3. On OTP verify, the app calls `signup(...)` which hits `POST /api/v1/auth/signup`, stores the
   returned tokens in `expo-secure-store`, and loads the profile.

### Login (mobile)
`app/login.tsx` → `POST /api/v1/auth/login` with `{ country_code, phone_number, password }`.
On success both tokens are written to secure storage and the user lands in the tabs.

### Login (admin)
`admin/src/pages/LoginPage.tsx` logs in, then calls `GET /users/me` and **rejects non-admin
accounts** (`role !== "admin"`) before entering the dashboard.

## Token model

| Token | Lifetime | Storage (mobile) | Storage (admin) |
|---|---|---|---|
| Access (JWT) | 30 min (configurable) | `expo-secure-store` | zustand `persist` |
| Refresh (opaque) | 30 days (configurable) | `expo-secure-store` | zustand `persist` |

- Access tokens are signed JWTs carrying `sub` (user id), `role`, and `type: "access"`.
- Refresh tokens are random opaque strings; **only their SHA-256 hash is stored** in the
  `refresh_tokens` table (the raw token is never persisted server-side).

### Refresh rotation + reuse detection
`POST /api/v1/auth/refresh`:
- Issues a new refresh token and **revokes the old one** (rotation), keeping the same `family_id`.
- If a **already-revoked** token is presented (replay), the entire token **family is revoked** and
  the request fails with `REFRESH_TOKEN_REUSED`.
- Expired tokens fail with `REFRESH_TOKEN_EXPIRED`.

### Logout
`POST /api/v1/auth/logout` revokes all of the current user's active refresh tokens.
The mobile/admin clients also clear local tokens.

## Route protection
- **Mobile** (`app/_layout.tsx`): authenticated users are kept out of auth routes; unauthenticated
  users on a protected route are redirected to `/login`.
- **Admin** (`src/App.tsx`): `ProtectedRoute` redirects to `/login` when no token is present; the
  login page additionally enforces the admin role.
- **Backend**: `get_current_user` validates the Bearer token, rejects banned users, and
  `require_role(...)` guards admin-only routes.

## OTP

- `POST /api/v1/auth/otp/generate` creates a 6-digit code (5-minute TTL), stores only an HMAC
  of it in `otp_codes`, invalidates earlier codes for the same phone + purpose, and sends it by
  SMS. `POST /otp/verify` checks it: codes are single use and lock after 5 wrong attempts
  (`400 INVALID_OTP`). Both endpoints are also throttled per phone (`429 RATE_LIMITED`).
- Storage is Postgres, so codes survive restarts and work with several workers. The request
  throttle is still per process.
- A periodic task (`purge_otp_codes`, every 6 h) deletes codes older than a day.

### SMS provider (`backend/.env`)

| `SMS_PROVIDER` | Settings | Notes |
|---|---|---|
| `console` (default) | `OTP_DEV_ECHO=true` | Logs the code and returns it in the response message `(dev code: 123456)`. Local dev only |
| `msg91` | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | India; the template must be DLT-approved with an OTP variable |
| `twilio` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | `TWILIO_FROM` is an E.164 number or a Messaging Service SID (`MG…`) |

Real providers never return the code. A provider error returns `400 SMS_SEND_FAILED` (details
are logged).

## Endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | country_code, phone_number, password, first_name, … | 201 → tokens; `PHONE_ALREADY_EXISTS` on dup |
| POST | `/api/v1/auth/login` | country_code, phone_number, password | `INVALID_CREDENTIALS`, `USER_BANNED` |
| POST | `/api/v1/auth/refresh` | refresh_token | rotates; `REFRESH_TOKEN_REUSED`/`_EXPIRED` |
| POST | `/api/v1/auth/logout` | — | revokes refresh tokens (auth required) |
| POST | `/api/v1/auth/otp/generate` | country_code, phone_number, request_type | sends SMS |
| POST | `/api/v1/auth/otp/verify` | …, otp | single use |

## Key files
- Backend: `app/services/auth_service.py`, `app/core/security.py`, `app/api/v1/auth.py`, `app/models/refresh_token.py`
- Mobile: `app/login.tsx`, `app/signup.tsx`, `app/auth/*`, `store/useAuthStore.ts`, `utils/api.ts`, `utils/storage.ts`
- Admin: `src/pages/LoginPage.tsx`, `src/features/auth/*`, `src/lib/api.ts`
