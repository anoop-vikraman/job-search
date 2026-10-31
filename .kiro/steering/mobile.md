---
inclusion: fileMatch
fileMatchPattern: 'mobile/**'
---

# Mobile Conventions

## Stack
- Expo SDK (managed / CNG workflow), React Native, TypeScript (`strict: true`)
- expo-router (file-based routing under `mobile/app/`)
- Zustand for state; `persist` middleware for non-sensitive data
- NativeWind (Tailwind) for styling; design tokens via `@tweak/theme`
- react-hook-form + zod for forms
- axios for the API client
- i18next / react-i18next for localization (`mobile/locales/`)

## Storage (strict)
| Data | Store |
|---|---|
| Access & refresh tokens (sensitive) | `expo-secure-store` ONLY |
| User profile, tweaks cache, UI/session state | Zustand `persist` → AsyncStorage (or MMKV via dev build) |

- Never put tokens in AsyncStorage, MMKV or Zustand persisted state. Tokens live only in
  `expo-secure-store`, accessed through `utils/storage.ts` `secureStorage`.
- Do not persist `password` or any credential in a Zustand store. (Current `useAuthStore` persists a
  mock `password` for local testing — that must be removed when the real backend is wired in.)
- Note: `react-native-mmkv` is native; if used it needs an Expo dev build (`expo-dev-client` / EAS),
  not Expo Go.

## Auth & API
- All network calls go through the shared axios instance in `utils/api.ts`.
- The request interceptor attaches `Authorization: Bearer <access_token>` from `secureStorage`.
- On 401, the response interceptor refreshes once via the refresh token, then retries; on refresh
  failure it triggers the registered logout handler. Login/OTP flows MUST persist both tokens via
  `secureStorage.save('access_token', …)` / `('refresh_token', …)` — a token the interceptor can
  read must actually be written on login.
- OTP and credential checks are validated server-side; the client never decides auth outcomes
  with a hardcoded value in production code.

## Lists & performance
- Never use `ScrollView` + `.map()` for the marketplace feed, applicants, transactions or any
  list that can grow. Use `FlatList` (or FlashList if added) with stable `keyExtractor={item => item.id}`.
- Avoid array-index `key`s for lists that can reorder or have items removed (tweak feed,
  applications, saved addresses). Index keys are only acceptable for static, append-only rows.

## Create-Tweak wizard
- The multi-step create/edit flow (`app/create-tweak/*`) is a wizard: type → category → schedule →
  details → schedule data → pricing → preview.
- Wizard progress MUST survive reload/backgrounding: the create store uses Zustand `persist`
  (AsyncStorage), and "Save Draft" writes a real `draft`-status tweak. A "saved" toast must reflect
  an actual write, never a no-op.
- Hooks are never called conditionally. No early `return` before the full hook list (see
  `app/create-tweak/edit.tsx`, which currently returns before its hooks — a rules-of-hooks violation).

## Media & location
- Images via `expo-image-picker` (+ `expo-image-manipulator` for resize); audio via `expo-audio`.
- Create an audio player only when there is a source; release it on unmount. Do not instantiate a
  player with an empty URI.
- Maps via `react-native-maps`; never fall back to a hardcoded city centre — if lat/lng are
  missing, hide the map or prompt for a location.

## Accessibility & touch
- Icon-only `TouchableOpacity`/`Pressable` require `accessibilityLabel` and `accessibilityRole`.
- Minimum 44×44pt hit targets (`hitSlop`); respect safe-area insets; pair status colour with an
  icon/label (never colour alone).
- Animations via `react-native-reanimated`; respect `useReducedMotion`.

## Cleanup
- Clear every timer, interval, listener and subscription on unmount / AppState change
  (the Toast timer and audio-status effects are current offenders).
- No `console.log` in committed code; route errors through the crash handler / error boundary.
