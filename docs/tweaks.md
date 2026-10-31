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

- `GET /api/v1/tweaks` returns a **paginated** feed of `active` tweaks **not owned by the viewer**,
  newest first, optionally filtered by `category`. Rendered with `FlatList` in `app/apply/*`.
- `GET /api/v1/tweaks/mine` returns the caller's own tweaks (any status) for the "My Tweaks" tab.

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
| GET | `/api/v1/tweaks?page&limit&category` | Marketplace feed (paginated) |
| GET | `/api/v1/tweaks/mine` | Caller's own tweaks |
| POST | `/api/v1/tweaks` | Create (draft or active) |
| GET | `/api/v1/tweaks/{id}` | Fetch one |
| PATCH | `/api/v1/tweaks/{id}` | Update (owner only) |
| DELETE | `/api/v1/tweaks/{id}` | Delete or close if it has accepted work |

## Key files
- Backend: `app/services/tweak_service.py`, `app/api/v1/tweaks.py`, `app/models/tweak.py`, `app/schemas/{tweak,jsonb}.py`
- Mobile: `app/create-tweak/*`, `app/tweaks/[id].tsx`, `app/apply/*`, `store/useCreateTweakStore.ts`, `store/useTweaksStore.ts`
- Admin: tweak moderation in `src/pages/TweaksPage.tsx`
