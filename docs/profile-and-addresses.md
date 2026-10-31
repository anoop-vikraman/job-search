# Profile, Addresses & Peripheral Features

## Profile

Each user has a profile: name, email, phone, bio, profile picture, skills, completed categories,
and a rating aggregate.

- `GET /api/v1/users/me` — the authenticated user's profile.
- `PATCH /api/v1/users/me` — update `first_name`, `last_name`, `email`, `date_of_birth`, `gender`,
  `bio`, `profile_picture_url`, `skills` (partial update; only sent fields change).

Mobile: `app/profile/index.tsx` (view), `app/profile/edit.tsx` (edit), `app/profile/setup.tsx`
(onboarding). `skills` and `completed_categories` feed into applicant presentation.

## Saved addresses

Users save addresses for in-person tweaks.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/addresses` | List own addresses |
| POST | `/api/v1/addresses` | Create (save_as, formatted_address, lat/lng, …) |
| DELETE | `/api/v1/addresses/{id}` | Remove (own only) |

A tweak references an address via `address_id` (set null if the address is deleted). Mobile
screens live under `app/create-tweak/select-location.tsx` and `components/Location/*`.

## Reliability score (mobile-only, UI)

`app/score/index.tsx` presents a reliability score built from positive/negative acts. This is
currently a **display feature with an empty-state** awaiting a backend scoring endpoint; it is not
yet persisted server-side.

## Invites / referrals (feature-flagged)

`app/invite/index.tsx` shows a referral screen. Referral codes are gated behind
`FeatureFlags.ENABLE_REFERRAL_CODE` (off by default) in `mobile/constants/featureFlags.ts`. No
backend referral endpoints exist yet — this is a planned feature.

## Notifications & Offers tabs (mobile)

`app/(tabs)/notifications.tsx` and `app/(tabs)/offers.tsx` are list screens with empty states,
ready to be populated from `GET /api/v1/notifications` / `/offers` once those backend endpoints are
added.

## Settings

`app/settings/*` covers language (i18next), privacy, and terms screens.

## Feature flags

`mobile/constants/featureFlags.ts`:

| Flag | Default | Purpose |
|---|---|---|
| `ENABLE_COUNTRY_PICKER` | false | Allow changing country code |
| `ENABLE_REFERRAL_CODE` | false | Referral code entry at signup |
| `USE_LOCAL_STORAGE_FOR_TWEAKS` | true | Use local store for tweaks (vs. the API) during development |
| `ENABLE_THUMBNAIL_FEATURE` | false | Image thumbnail selection |

> Note: with `USE_LOCAL_STORAGE_FOR_TWEAKS` on, parts of the mobile tweak flow operate against the
> local Zustand store rather than the live API. Turn it off to exercise the backend tweak endpoints
> end-to-end.

## Key files
- Backend: `app/api/v1/users.py`, `app/api/v1/addresses.py`, `app/models/{user,address}.py`
- Mobile: `app/profile/*`, `app/settings/*`, `app/score/*`, `app/invite/*`, `components/Location/*`
