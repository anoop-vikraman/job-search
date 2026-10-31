# Tweaks

A **tweak** is a posted job. Listers create them; providers discover and apply to them.

## Anatomy of a tweak

| Field | Meaning |
|---|---|
| `title`, `description` | What the job is |
| `category` | Plumbing, Electrical, Cleaning, Moving, Painting, Writing, Design, Coding, Others |
| `tweak_type` | `remote` or `in_person` |
| `status` | `draft` (private to owner) · `active` (discoverable) · `closed` |
| `address_id` | Saved address (in-person jobs) |
| `skills`, `languages` | Requirements |
| `media` | Images / audio clip metadata (JSONB) |
| `schedule_preference` + `schedule_data` | When it should happen (one-day / few-days / deadline) |
| `pricing_model` + `pricing_data` | `fixed` · `hourly` · `quantity` · `quote` |
| `price_minor`, `currency` | Resolved price (null for open `quote`) |

Categories are defined in `mobile/constants/categories.ts`.

## Create-tweak wizard (mobile)

A multi-step flow under `app/create-tweak/*`: **type → category → schedule → details → schedule
data → pricing → preview**. Backing state is the `useCreateTweakStore` Zustand store, which uses
`persist` so progress survives an app reload or backgrounding.

- **Save Draft** writes a real `draft`-status tweak (never a silent no-op).
- **Pricing** is model-specific; `price_minor` is derived from `pricing_data`:
  - `fixed`: `amount_minor`
  - `hourly`: `rate_per_hour_minor × estimated_hours`
  - `quantity`: `unit_price_minor × quantity`
  - `quote`: null (negotiated later)
- Media uses `expo-image-picker` (+ resize) and `expo-audio`; maps use `react-native-maps`.

## The marketplace feed

- `GET /api/v1/tweaks` returns a **paginated** feed of `active` tweaks **not owned by the viewer**.
  Rendered in `app/apply/market.tsx`. Query params:

  | Param | Meaning |
  |---|---|
  | `category` | Exact category match |
  | `search` | Case-insensitive substring over title, description, category and skills (max 100 chars; `%`/`_` are literal) |
  | `lat`, `lng` | Viewer position. Must be sent together. Adds `distance_km` (haversine, from the tweak's address coordinates) to each item |
  | `radius_km` | `0 < r ≤ 500`. Keeps tweaks within `r` km. Tweaks with no geocoded address are excluded. Requires `lat`/`lng` |
  | `sort` | `newest` (default), `price_asc`, `price_desc` (unpriced `quote` tweaks last), `distance` (requires `lat`/`lng`; un-geocoded last) |

  `radius_km` or `sort=distance` without a location returns `422 LOCATION_REQUIRED`. `distance_km` is
  `null` when no location was sent or the tweak has no coordinates.
- **Pagination**: the response is `{ items, total, page, limit, next_cursor }`. Pass `next_cursor`
  back as `cursor` for the next page; it's a keyset cursor (sort key + id), so new tweaks arriving
  don't shift or duplicate pages. A cursor from a different `sort` (or a garbled one) returns
  `422 INVALID_CURSOR`. `page` still works for offset paging. Other params: `tweak_type`
  (`remote`/`in_person`).
- **Map coordinates**: in-person tweaks with a geocoded address carry `approx_lat`/`approx_lng`,
  snapped to a 0.005° grid (~550 m) so the exact address is never exposed. Remote tweaks get `null`.
  Mobile: the List / Map toggle on Find Tweaks shows the loaded results as pins
  (`components/Tweak/TweakMap.tsx`, `react-native-maps`), with the Near-me radius drawn as a circle.
  Tapping a pin's callout opens the tweak. Android needs `GOOGLE_MAPS_API_KEY` at build time.
- Mobile: the search box is debounced (350 ms) and sent as `search`. "Near me" uses `expo-location`
  (foreground permission, position rounded to ~110 m) and switches the sort to `distance` with a
  25 km default radius (changeable in Filters). The schedule filter is applied
  client-side to loaded pages. The list loads 20 at a time and fetches more on scroll.
- **Saved search alerts**: `POST /api/v1/saved-searches` `{ name, search?, category?, tweak_type?,
  lat?, lng?, radius_km? }` (max 10 per user; needs at least one filter, `400 EMPTY_SEARCH`;
  `409 TOO_MANY_SAVED_SEARCHES`), `GET`, `DELETE /{id}`. When a tweak becomes `active` (created
  active or published from draft), a `match_saved_searches` job checks it against everyone's saved
  searches with the feed's rules (case-insensitive text match, category, type, haversine radius)
  and sends each matching user one `saved_search_match` notification. Owners and blocked users are
  skipped. Mobile: bell icon on Find Tweaks saves the current search; **Saved Search Alerts** in
  the profile menu lists and deletes them.
- `GET /api/v1/tweaks/mine` returns the caller's own tweaks (any status) for the "My Tweaks" tab.

## Recurring tweaks

`recurrence`: `weekly` | `biweekly` | `monthly` | `null` (one-off), set on create or via `PATCH`.
When a recurring tweak's job **completes** (lister confirms, auto-release, or a dispute settled in
the provider's favour), the next occurrence is posted in the same transaction
(`services/recurrence_service.py`, a completion hook): same details, pricing and address, status
`active`, `previous_occurrence_id` pointing back, and schedule dates moved forward by 7/14/30 days
(repeatedly, until the first date is today or later; date and ISO datetime formats are kept).
Saved-search alerts fire for it and the lister is notified. `PATCH { "recurrence": null }` on the
latest occurrence stops the series. Mobile: **Repeat** chips (Off / Weekly / Every 2 weeks /
Monthly) on the owner's tweak screen.

## Pricing validation

The backend validates `pricing_data` against strict Pydantic schemas (`app/schemas/jsonb.py`)
before deriving `price_minor`. Invalid shapes return `422 INVALID_PRICING_DATA`.

## Lifecycle rules (enforced in `tweak_service.py`)

- Only `active` tweaks appear in the feed; `draft` is private to its owner.
- Updating pricing re-derives `price_minor`.
- **Delete**: a tweak with an **accepted** application is **closed, never hard-deleted**; otherwise
  it is removed.
- Accepting an application closes the tweak (see [applications-and-offers.md](./applications-and-offers.md)).

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/tweaks?cursor&page&limit&category&tweak_type&search&lat&lng&radius_km&sort` | Marketplace feed (cursor-paginated) |
| GET | `/api/v1/tweaks/mine` | Caller's own tweaks |
| POST | `/api/v1/tweaks` | Create (draft or active) |
| GET | `/api/v1/tweaks/{id}` | Fetch one |
| PATCH | `/api/v1/tweaks/{id}` | Update (owner only) |
| DELETE | `/api/v1/tweaks/{id}` | Delete or close if it has accepted work |

## Key files
- Backend: `app/services/tweak_service.py`, `app/api/v1/tweaks.py`, `app/models/tweak.py`, `app/schemas/{tweak,jsonb}.py`
- Mobile: `app/create-tweak/*`, `app/tweaks/[id].tsx`, `app/apply/*`, `store/useCreateTweakStore.ts`, `store/useTweaksStore.ts`
- Admin: tweak moderation in `src/pages/TweaksPage.tsx`
