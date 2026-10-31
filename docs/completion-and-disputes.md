# Job completion & disputes

Accepted work finishes in one of three ways: the lister confirms it, it auto-confirms after a
review window, or a dispute is settled by an admin. The escrow hold placed at acceptance is what
moves in every case ([wallet-and-escrow.md](./wallet-and-escrow.md)).

## Two-sided completion

1. **Provider marks the work done**: `POST /tweaks/applications/{id}/submit-work`
   `{ note?, photo_urls[] }` (photos from `POST /media/upload`, max 10). Sets `work_submitted_at`,
   `completion_note`, `completion_photos`, and `auto_release_at = now + AUTO_RELEASE_HOURS`
   (default 72). The lister gets a `work_submitted` notification.
2. **Lister confirms**: `POST /tweaks/applications/{id}/complete` (unchanged; the lister may
   also confirm before the provider submits).
3. **Auto-release**: submitting enqueues an `auto_release` job for `auto_release_at`
   ([background-jobs.md](./background-jobs.md)). When it runs, if the application is still
   `accepted` and the deadline has passed, the escrow is released exactly as if the lister had
   confirmed, and both sides are notified. Confirming, disputing or resubmitting first makes the
   job a no-op.

Once work is submitted the lister can no longer **cancel** (`409 WORK_SUBMITTED`): a refund at
that point needs a dispute.

## Disputes

- `POST /tweaks/applications/{id}/dispute` `{ reason (10–2000 chars), evidence_urls[] }`: either
  party, while the application is `accepted`. The application becomes `disputed`, the escrow stays
  held, the auto-release is cancelled, and the other party is notified. Only one open dispute per
  application (partial unique index).
- While disputed: confirm/cancel return `409 INVALID_STATE`; chat stays open.
- `GET /tweaks/applications/{id}/dispute`: latest dispute, parties only.

### Resolution (admin)

`POST /admin/disputes/{id}/resolve` `{ outcome, provider_amount_minor?, note? }`:

| Outcome | Money | Application / tweak |
|---|---|---|
| `release` | Full escrow to the provider minus the platform fee | `completed` / `completed` |
| `refund` | Full escrow back to the lister | `withdrawn` / `cancelled` |
| `partial` | `provider_amount_minor` (1 … escrow−1) to the provider, fee charged on that part; the rest back to the lister | `completed` / `completed` |

Both parties get a `dispute_resolved` notification (with the admin's note). Admin queue:
`GET /admin/disputes?status=open|resolved`. Admin panel: **Disputes** page with
Release / Refund / Split actions and links to evidence photos.

## Mobile

- **Provider** (tweak screen): "Mark Work Done" opens a sheet for a note and up to 6 photos.
  A status banner shows "Waiting for the lister to confirm" with the auto-release time.
  "Report a problem with this job" opens a dispute.
- **Lister** (applicant screen): after submission the banner shows the provider's note and photos,
  and the footer offers **Dispute** or **Confirm & Pay**; before submission it's Cancel / Mark
  Completed plus a "Report a problem" link.
- Both sides see "Under review by Tweak support" while disputed and the outcome afterwards.

Files: `components/Work/*`, `hooks/useWorkflow.ts`, `utils/mediaUpload.ts`.

## Backend files

`services/application_service.py` (`submit_work`, `release_to_provider`, `auto_release_job`),
`services/dispute_service.py`, `services/wallet_service.py` (`split_hold`), `models/dispute.py`,
migration `b9d90e1ac79d`.
