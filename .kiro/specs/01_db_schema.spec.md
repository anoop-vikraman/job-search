# Spec 01: Database Schema

Target: PostgreSQL 16, SQLAlchemy 2.0 async ORM, Alembic.
Domain: Tweak — a local-services gig marketplace (users post tweaks, providers apply, both sides
negotiate a price, money moves through an in-app wallet, both sides rate each other).

Structure:
- **Part A: Core.** The tables required by the features already defined in steering (auth rotation,
  tweaks + applications + offers, wallet ledger, refunds, ratings, addresses). Implement as-is.
- **Part B: Optional.** Every other constraint, index or column, each with its trade-off. Each item
  is `Status: undecided` until marked `include` or `drop`.

---

# Part A: Core

## A1. Conventions

- PK: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, unless noted.
- Timestamps: `TIMESTAMPTZ` (UTC). Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- Money: integer **minor units** in `BIGINT` columns named `*_minor` (e.g. `amount_minor`), plus a
  `currency CHAR(3)` where a row stands alone. Never `FLOAT`/`REAL`.
- Booleans: `NOT NULL` with explicit default.
- FK delete behaviour: CASCADE where the child is owned by the parent; SET NULL where the FK is
  nullable; otherwise the Postgres default `NO ACTION` (blocks deleting the parent while children
  exist). See B4 to change this.
- `Base.metadata.naming_convention` (needed for stable Alembic diffs):

| Kind | Pattern |
|---|---|
| index | `ix_<table>_<cols>` |
| unique | `uq_<table>_<cols>` |
| check | `ck_<table>_<name>` |
| fk | `fk_<table>_<col>_<reftable>` |
| pk | `pk_<table>` |

- JSONB: each column has `CHECK (jsonb_typeof(col) = 'object'|'array')` and a Pydantic v2 schema (A4)
  validated before every write. Required by the `backend-architect` agent rules.

Enums (native PG):

| Enum | Values |
|---|---|
| `user_role` | `admin`, `user` |
| `tweak_status` | `draft`, `active`, `closed` |
| `tweak_type` | `remote`, `in_person` |
| `pricing_model` | `hourly`, `quantity`, `fixed`, `quote` |
| `application_status` | `pending`, `accepted`, `rejected`, `withdrawn` |
| `txn_type` | `topup`, `hold`, `release`, `refund`, `payout`, `fee` |
| `txn_status` | `pending`, `completed`, `failed`, `reversed` |
| `refund_status` | `requested`, `approved`, `rejected`, `processed` |

Adding an enum value later needs a hand-written `ALTER TYPE ... ADD VALUE` migration; autogenerate
doesn't detect it.

## A2. Relationships

```
users 1─┬─< refresh_tokens
        ├─< addresses
        ├─< tweaks (as lister: created_by_user_id)
        ├─< applications (as provider: provider_user_id)
        ├─1 wallets 1─< wallet_transactions
        └─< ratings (as rater / as ratee)

tweaks 1─< applications 1─0..1 offers (counter-quote)
tweaks 1─< ratings
applications 0..1─< refunds
```

## A3. Tables

`Req` column: **R** = core-requested, **S** = required by steering/defined features.

### users
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| phone_number | VARCHAR(16) | N | | R |
| country_code | VARCHAR(6) | N | `'+91'` | R |
| hashed_password | VARCHAR(255) | N | | R |
| first_name | VARCHAR(80) | Y | | R |
| last_name | VARCHAR(80) | Y | | R |
| email | VARCHAR(255) | Y | | R |
| bio | TEXT | Y | | R |
| profile_picture_url | VARCHAR(2048) | Y | | R |
| skills | TEXT[] | N | `'{}'` | R |
| completed_categories | TEXT[] | N | `'{}'` | R |
| languages | TEXT[] | N | `'{}'` | R |
| rating_avg | NUMERIC(3,2) | N | `0` | S: denormalized from ratings |
| rating_count | INTEGER | N | `0` | S |
| role | user_role | N | `'user'` | R |
| is_phone_verified | BOOLEAN | N | `false` | S: OTP flow |
| is_banned | BOOLEAN | N | `false` | R |
| banned_reason | TEXT | Y | | R |
| created_at | TIMESTAMPTZ | N | `now()` | R |

- `uq_users_phone_number (country_code, phone_number)`
- `ck_users_rating_range` (`rating_avg BETWEEN 0 AND 5`)

### refresh_tokens (S)
Required by steering: rotatable refresh tokens persisted in DB.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | PK, used as the JWT `jti` |
| user_id | UUID | N | | FK `users` **CASCADE** |
| token_hash | CHAR(64) | N | | SHA-256 of the token; the raw token is never stored |
| family_id | UUID | N | | rotation chain; reuse of a revoked token revokes the family |
| expires_at | TIMESTAMPTZ | N | | |
| revoked_at | TIMESTAMPTZ | Y | | |
| replaced_by_id | UUID | Y | | FK `refresh_tokens` SET NULL |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `uq_refresh_tokens_token_hash (token_hash)`
- `ix_refresh_tokens_family_id (family_id)`

### addresses
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| user_id | UUID | N | | R, FK `users` **CASCADE** |
| save_as | VARCHAR(40) | N | | R (Home, Work, …) |
| contact_name | VARCHAR(120) | Y | | R |
| phone_number | VARCHAR(16) | Y | | R |
| formatted_address | TEXT | N | | R |
| house_no | VARCHAR(80) | Y | | R |
| area | VARCHAR(160) | Y | | R |
| city | VARCHAR(120) | Y | | R |
| state | VARCHAR(120) | Y | | R |
| pincode | VARCHAR(12) | Y | | R |
| latitude | NUMERIC(9,6) | Y | | R |
| longitude | NUMERIC(9,6) | Y | | R |
| created_at | TIMESTAMPTZ | N | `now()` | |

### tweaks
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| created_by_user_id | UUID | N | | R, FK `users` **CASCADE** |
| title | VARCHAR(200) | N | | R |
| description | TEXT | N | | R |
| category | VARCHAR(80) | N | | R |
| tweak_type | tweak_type | N | | R |
| status | tweak_status | N | `'draft'` | R |
| address_id | UUID | Y | | R, FK `addresses` **SET NULL** (in-person only) |
| skills | TEXT[] | N | `'{}'` | R |
| languages | TEXT[] | N | `'{}'` | R |
| media | JSONB | N | `'[]'` | R (images/audio metadata) |
| schedule_preference | VARCHAR(40) | Y | | R |
| schedule_data | JSONB | Y | | R (slots/deadline structure) |
| pricing_model | pricing_model | N | | R |
| pricing_data | JSONB | Y | | R (model-specific shape) |
| price_minor | BIGINT | Y | | R (resolved amount; null for open quote) |
| currency | CHAR(3) | N | `'INR'` | R |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `ix_tweaks_created_by_user_id (created_by_user_id)`
- `ix_tweaks_feed (status, category, created_at DESC)` — marketplace feed
- `ck_tweaks_media_array`, `ck_tweaks_schedule_object`, `ck_tweaks_pricing_object`

### applications
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| tweak_id | UUID | N | | R, FK `tweaks` **CASCADE** |
| provider_user_id | UUID | N | | R, FK `users` **CASCADE** |
| why_prefer_message | TEXT | Y | | R |
| quoted_price_minor | BIGINT | Y | | R (provider's quote) |
| selected_slots | JSONB | N | `'[]'` | R |
| status | application_status | N | `'pending'` | R |
| applied_at | TIMESTAMPTZ | N | `now()` | R |
| responded_at | TIMESTAMPTZ | Y | | S: accept/reject time |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `uq_applications_active_one` UNIQUE `(tweak_id, provider_user_id) WHERE status IN ('pending','accepted')`
  — one active application per provider per tweak.
- `ix_applications_tweak_id (tweak_id)`
- `ck_applications_slots_array`
- Service rule (not SQL): `provider_user_id <> tweaks.created_by_user_id` (cannot apply to own tweak).

### offers (lister counter-quote)
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| application_id | UUID | N | | R, FK `applications` **CASCADE** |
| lister_quoted_price_minor | BIGINT | N | | R |
| message | TEXT | Y | | R |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `ix_offers_application_id (application_id)`

### wallets
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| user_id | UUID | N | | R, FK `users` **CASCADE** |
| balance_minor | BIGINT | N | `0` | R (available) |
| held_minor | BIGINT | N | `0` | R (escrow holds) |
| currency | CHAR(3) | N | `'INR'` | R |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `uq_wallets_user_id (user_id)` — one wallet per user.
- `ck_wallets_nonneg` (`balance_minor >= 0 AND held_minor >= 0`).
- Balance is derived/maintained only via `wallet_transactions` (append-only); never edited ad hoc.

### wallet_transactions (ledger)
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R; client-id allowed for idempotency |
| wallet_id | UUID | N | | R, FK `wallets` **CASCADE** |
| type | txn_type | N | | R |
| status | txn_status | N | `'completed'` | R |
| amount_minor | BIGINT | N | | R (signed by convention per type) |
| tweak_id | UUID | Y | | R, FK `tweaks` **SET NULL** (escrow context) |
| application_id | UUID | Y | | R, FK `applications` **SET NULL** |
| reference | VARCHAR(120) | Y | | R (external payment ref / idempotency key) |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `uq_wallet_transactions_reference (reference)` WHERE `reference IS NOT NULL` — idempotent top-ups.
- `ix_wallet_transactions_wallet_created (wallet_id, created_at DESC)` — ledger view.

### refunds
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| application_id | UUID | N | | R, FK `applications` NO ACTION |
| requested_by_user_id | UUID | N | | R, FK `users` NO ACTION |
| amount_minor | BIGINT | N | | R |
| reason | TEXT | Y | | R |
| status | refund_status | N | `'requested'` | R |
| reversing_txn_id | UUID | Y | | S, FK `wallet_transactions` SET NULL |
| processed_at | TIMESTAMPTZ | Y | | R |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `ix_refunds_application_id (application_id)`

### ratings
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| tweak_id | UUID | N | | R, FK `tweaks` **CASCADE** |
| rater_user_id | UUID | N | | R, FK `users` **CASCADE** |
| ratee_user_id | UUID | N | | R, FK `users` **CASCADE** |
| score | SMALLINT | N | | R |
| comment | TEXT | Y | | R |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `uq_ratings_once` UNIQUE `(tweak_id, rater_user_id, ratee_user_id)` — one rating per side per tweak.
- `ck_ratings_score_range` (`score BETWEEN 1 AND 5`).
- Service rule: only after the tweak reaches a completed state; rater and ratee must both be parties
  to the tweak (lister and accepted provider).

### conversations (chat)
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| application_id | UUID | N | | R, FK `applications` **CASCADE**, UNIQUE (one thread per application) |
| tweak_id | UUID | N | | R, FK `tweaks` **CASCADE** |
| lister_user_id | UUID | N | | R, FK `users` **CASCADE** |
| provider_user_id | UUID | N | | R, FK `users` **CASCADE** |
| lister_last_read_at | TIMESTAMPTZ | Y | | R (read cursor) |
| provider_last_read_at | TIMESTAMPTZ | Y | | R (read cursor) |
| last_message_at | TIMESTAMPTZ | Y | | R (list ordering) |
| created_at | TIMESTAMPTZ | N | `now()` | |

- `ck_conversations_distinct_parties` (`lister_user_id <> provider_user_id`).
- `ix_conversations_lister_last_message (lister_user_id, last_message_at)`,
  `ix_conversations_provider_last_message (provider_user_id, last_message_at)`, `ix_conversations_tweak_id`.
- Service rule: created only for `accepted`/`completed` applications; writable while the application
  stays `accepted`/`completed`.

### messages
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| conversation_id | UUID | N | | R, FK `conversations` **CASCADE** |
| sender_user_id | UUID | N | | R, FK `users` **CASCADE** |
| body | TEXT | N | | R |
| created_at | TIMESTAMPTZ | N | `now()` (service sets wall-clock, strictly increasing per thread) | |

- `ck_messages_body_length` (`char_length(body) BETWEEN 1 AND 2000`).
- `ix_messages_conversation_created (conversation_id, created_at)`, `ix_messages_sender_user_id`.
- `notification_type` gains `new_message`.

### device_tokens (push)
| Column | Type | Null | Default | Req |
|---|---|---|---|---|
| id | UUID | N | `gen_random_uuid()` | R |
| user_id | UUID | N | | R, FK `users` **CASCADE** |
| token | VARCHAR(255) | N | | R, UNIQUE (Expo push token; one owner at a time) |
| platform | VARCHAR(16) | N | | R |
| created_at | TIMESTAMPTZ | N | `now()` | |
| last_seen_at | TIMESTAMPTZ | N | `now()` | R (bumped on re-register) |

- `ck_device_tokens_platform_valid` (`platform IN ('ios','android','web')`).
- `ix_device_tokens_user_id (user_id)`.

## A4. JSONB Schemas (Pydantic v2)

All use `ConfigDict(extra="forbid", strict=True)`. Shapes are a proposal; B3 decides the final shape.

```python
class MediaItem(BaseModel):             # tweaks.media: list[MediaItem]
    kind: Literal["image", "audio"]
    url: Annotated[str, StringConstraints(pattern=r"^https://")]
    width: int | None = None
    height: int | None = None
    duration_ms: int | None = None       # audio only

class TimeSlot(BaseModel):              # schedule_data.slots / applications.selected_slots
    date: date
    start: Annotated[str, StringConstraints(pattern=r"^\d{2}:\d{2}$")]
    end: Annotated[str, StringConstraints(pattern=r"^\d{2}:\d{2}$")]

class HourlyPricing(BaseModel):         # tweaks.pricing_data when pricing_model='hourly'
    rate_per_hour_minor: Annotated[int, Field(ge=0)]
    estimated_hours: Annotated[float, Field(gt=0)]

class QuantityPricing(BaseModel):       # pricing_model='quantity'
    unit_label: Annotated[str, StringConstraints(min_length=1, max_length=40)]
    unit_price_minor: Annotated[int, Field(ge=0)]
    quantity: Annotated[int, Field(ge=1)]

class FixedPricing(BaseModel):          # pricing_model='fixed'
    amount_minor: Annotated[int, Field(ge=0)]
```

Service-level rules (always enforced, in code not SQL):
- `pricing_data` shape matches `pricing_model`; `price_minor` is derived from it (null when `quote`).
- `applications.selected_slots` must be a subset of the tweak's offered `schedule_data.slots`.
- Wallet invariant: for every wallet, `balance_minor + held_minor == sum(signed amounts of completed
  transactions)`; accept = `hold`, completion = `release` (hold → provider balance), cancel = `refund`.

---

# Part B: Optional

## B1. Cheap safety (recommended default: include)

| ID | Item | Status |
|---|---|---|
| B1.1 | Index every FK column not already indexed: `addresses.user_id`, `refunds.requested_by_user_id`, `ratings.rater_user_id`, `ratings.ratee_user_id`, `wallet_transactions.tweak_id`, `tweaks.address_id`. Postgres doesn't index FKs on its own; joins and cascading deletes fall back to full scans without these. | undecided |
| B1.2 | `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (ORM `onupdate`) on mutable tables (users, tweaks, applications, wallets). | undecided |
| B1.3 | Format checks: phone E.164 `^\+?[1-9][0-9]{7,14}$`; pincode `^\d{4,10}$`; `profile_picture_url LIKE 'https://%'`; `currency ~ '^[A-Z]{3}$'`. | undecided |
| B1.4 | Range checks: `latitude BETWEEN -90 AND 90`, `longitude BETWEEN -180 AND 180`; `price_minor >= 0`; `quoted_price_minor >= 0`; `lister_quoted_price_minor >= 0`; `amount_minor <> 0`. | undecided |
| B1.5 | State-consistency checks: banned ⇒ `banned_reason` set; `status='accepted'` application ⇒ `responded_at` set; refund `status='processed'` ⇒ `processed_at`, `reversing_txn_id` set; `tweak_type='in_person'` ⇒ `address_id` set. | undecided |
| B1.6 | Uniques: none beyond A3 (consider `uq_addresses_user_save_as (user_id, save_as)` if save-as labels must be unique per user). | undecided |
| B1.7 | `refresh_tokens.expires_at` index for the expiry cleanup job. | undecided |

## B2. Strong integrity (more migration work)

| ID | Item | Cost | Status |
|---|---|---|---|
| B2.1 | Guarantee an application's `address`/wallet context belongs to the right tweak via composite FKs (e.g. `wallet_transactions (application_id)` must reference an application of `tweak_id`). Needs matching UNIQUE parents. | Raw `op.execute` | undecided |
| B2.2 | DB-level "cannot apply to own tweak": add `tweaks.created_by_user_id` into applications and a `CHECK (provider_user_id <> created_by_user_id)` (denormalized column + trigger to keep it in sync). | Column + trigger | undecided |
| B2.3 | `CHECK` that `offers.lister_quoted_price_minor` only exists for `pending` applications (no counter after accept/reject). | Hand-added | undecided |
| B2.4 | Partial unique to forbid more than one `accepted` application per tweak: `uq_applications_one_accepted (tweak_id) WHERE status='accepted'`. | Hand-added | undecided |
| B2.5 | `CHECK (rater_user_id <> ratee_user_id)` on ratings. | none | undecided |

## B3. Product-dependent

| ID | Decision | Options | Status |
|---|---|---|---|
| B3.1 | Tweak lifecycle | (a) 3 states `draft/active/closed` (current); (b) richer: add `in_progress`, `completed`, `cancelled` to drive escrow release and ratings precisely | undecided |
| B3.2 | Platform fee | (a) computed at accept time and stored as a `fee` transaction; (b) a `fee_minor` column on the accepted application | undecided |
| B3.3 | `tweaks.media` shape | A4 object list vs separate `tweak_media` table (needed if media needs its own ordering/soft-delete) | undecided |
| B3.4 | Category vocabulary | free-form `VARCHAR` (current) vs a `categories` reference table (Plumbing/Electrical/Cleaning/…) with FK | undecided |
| B3.5 | Watchlist | add a `watchlist (user_id, tweak_id)` join table (mobile has a watchlist feature) | undecided |
| B3.6 | Invites/referrals | add `invites`/`referral_codes` tables (feature-flagged in mobile) | undecided |
| B3.7 | GIN index on `users.skills`, `tweaks.skills` | include only if skill-match filtering runs in SQL (`&&`) | undecided |
| B3.8 | Feed/notification partial indexes as the catalogue grows | include when lists get large | undecided |
| B3.9 | `users.role` index | include if the admin panel filters users by role often | undecided |

## B4. Delete policy

| ID | Relationship | Core default | Alternative | Status |
|---|---|---|---|---|
| B4.1 | `tweaks → applications`, `applications → offers` | CASCADE (owned children) | NO ACTION (keep history; close instead) | undecided |
| B4.2 | `refunds.application_id`, `wallet_transactions` → tweak/application | NO ACTION / SET NULL (never lose financial history) | — | keep (financial records are immutable) |
| B4.3 | A tweak with an `accepted` application | never hard-delete; close it | — | keep (steering rule) |

---

## Implementation Tasks

1. Resolve the B-items (mark each `include` / `drop`).
2. Add `naming_convention` to `Base.metadata` in `app/db/session.py`.
3. Create the enums and models in `app/models/` and import each one in `app/models/__init__.py`.
4. Add the A4 schemas to `app/schemas/` and the service-level rules (pricing/slots/wallet invariant)
   to `services/`.
5. Autogenerate the initial revision, then hand-add the included B2 items, partial indexes, triggers
   and enum `DROP TYPE` in the downgrade.
6. Run `upgrade head` → `downgrade base` → `upgrade head` against `postgres:16-alpine`.
