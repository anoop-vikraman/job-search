# Ratings

After a job completes, the lister and the provider rate each other. Scores roll up into a per-user
aggregate shown on profiles.

## Creating a rating

`POST /api/v1/ratings` with `{ tweak_id, ratee_user_id, score (1–5), comment? }`.

### Rules enforced (`rating_service.create_rating`)
- **Only after completion** — the tweak must be `closed` with an accepted application
  (`400 TWEAK_NOT_COMPLETED` / `NO_ACCEPTED_APPLICATION`).
- **Both parties only** — rater and ratee must be the lister and the accepted provider of that
  tweak (`403 NOT_A_PARTY`).
- **You cannot rate yourself** (`400 CANNOT_RATE_SELF`).
- **Once per side per tweak** — a duplicate returns `409 ALREADY_RATED` (enforced by a unique index
  on `(tweak_id, rater_user_id, ratee_user_id)`).
- Score is constrained to `1..5` (DB check constraint).

## Aggregates

On each new rating the service recomputes the ratee's `rating_avg` (rounded to 2 dp) and
`rating_count` on the `users` row, so profiles and listings can show a current rating cheaply
without re-aggregating on read.

## Where it shows

- **Mobile**: a user's `rating_avg` / `rating_count` appear on profiles and applicant cards.
- **Admin**: the Users table surfaces `rating (count)` per user.

## Endpoint

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/ratings` | Create a rating (party to a completed tweak) |

## Key files
- Backend: `app/services/rating_service.py`, `app/api/v1/ratings.py`, `app/models/rating.py`
