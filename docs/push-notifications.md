# Push notifications

Every in-app `Notification` row is also sent as an Expo push to the recipient's registered
devices. Tapping the push opens the related screen.

## Backend flow

1. `notification_service.add()` inserts the row and enqueues a durable `push` job in the same
   transaction ([background-jobs.md](./background-jobs.md)). Callers don't change; any service that
   creates a notification gets push for free. Rolled-back work sends nothing, and a crash after
   commit doesn't lose the push.
2. The worker runs the job: it loads the user's `device_tokens`, drops the message if the user
   muted that notification type, and POSTs to the Expo Push API in batches of 100. 429/5xx/network
   errors are retried once inside the job; if every message still failed, the job raises and is
   retried with backoff.
3. Tickets with `DeviceNotRegistered` delete that token right away. OK tickets are stored in
   `push_tickets`.
4. The `push_receipts` periodic task (every 5 min) fetches receipts for tickets older than
   15 minutes, deletes tokens whose receipt says `DeviceNotRegistered`, and drops tickets once
   checked (or after 24 h, when Expo discards receipts).

Push payload: `title`/`body` from the notification, `sound: default`, `priority: high`, and
`data = { notification_id, type, tweak_id?, conversation_id? }` for routing.

## Mute settings

`GET /api/v1/notifications/preferences` → `{ "push": { "<type>": true|false, … } }` (every type,
default `true`). `PUT` the same shape with only the types to change. Muting affects push only;
the in-app notification row is still created. Stored in `notification_preferences`
(one row per changed type). Mobile: **Notification settings** screen
(`app/settings/notifications.tsx`), linked from the profile menu.

Not implemented: badge counts.

### Config (`backend/.env`)

| Var | Default | Notes |
|---|---|---|
| `EXPO_PUSH_ENABLED` | `true` | `false` skips all push HTTP calls (tests force this off) |
| `EXPO_PUSH_URL` | `https://exp.host/--/api/v2/push/send` | Override to point at a mock |
| `EXPO_RECEIPTS_URL` | `https://exp.host/--/api/v2/push/getReceipts` | Receipt lookups |
| `EXPO_ACCESS_TOKEN` | unset | Only if enhanced push security is on for the EAS project |

## Device tokens

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/devices` | `{ token, platform: ios\|android\|web }`. 201 new, 200 known. A known token moves to the caller (shared device / re-login). Token must look like `ExponentPushToken[...]` (422 otherwise) |
| DELETE | `/api/v1/devices/{token}` | 204; 404 `DEVICE_NOT_FOUND` if the caller doesn't own it. URL-encode the token |

Table `device_tokens`: `user_id` (FK users, CASCADE), `token` (unique), `platform`
(CHECK ios/android/web), `created_at`, `last_seen_at`.

## Mobile

- `hooks/usePushNotifications.ts` is mounted once in `app/_layout.tsx`. When a user is signed in
  it requests permission, gets the Expo token and `POST /devices` (`utils/push.ts`). It also
  shows banners while the app is open and refetches notification/chat queries when a push lands.
- **Tap-to-navigate** uses `useLastNotificationResponse`, so taps that cold-start the app work too.
  Routes come from `utils/notificationRoutes.ts`, shared with the in-app notifications list:

  | `type` | Opens |
  |---|---|
  | `new_message` | `/chat/{conversation_id}` (list if absent) |
  | `application_received` | `/tweaks/{tweak_id}/applicants` |
  | `application_accepted`, `application_rejected`, `counter_offer`, `tweak_completed` | `/tweaks/{tweak_id}` |
  | `refund_processed` | `/refunds` |
  | `wallet_topup` | `/wallet` |
  | anything else | `/tweaks/{tweak_id}` or the notifications tab |

- **Logout** calls `DELETE /devices/{token}` before clearing the session.
- Android uses the `default` notification channel (created at registration; also set as the
  config plugin's `defaultChannel`).

### Requirements to receive real pushes

- A **physical device** running a **development build** (`expo-dev-client`) or release build.
  Simulators/emulators get no token, and Expo Go no longer supports remote push on Android.
- An EAS project id: run `eas init`, then build with `EAS_PROJECT_ID=<id>`; `app.config.ts`
  exposes it as `extra.eas.projectId`. Without it, registration is skipped with a console warning.
- Android: FCM V1 credentials uploaded to EAS (`eas credentials`) and `google-services.json`.
  iOS: an APNs key via `eas credentials`.

## Key files
- Backend: `app/services/push_service.py`, `app/services/notification_service.py`,
  `app/services/device_service.py`, `app/api/v1/devices.py`, `app/models/device_token.py`,
  migration `32c9f2a50400`
- Mobile: `hooks/usePushNotifications.ts`, `utils/push.ts`, `utils/notificationRoutes.ts`,
  `api/devices.ts`, `app.config.ts` (plugin + `extra.eas.projectId`)
