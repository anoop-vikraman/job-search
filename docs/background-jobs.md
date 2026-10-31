# Background jobs

Durable jobs stored in Postgres (`jobs` table). No Redis or broker is needed.

## How it works (`services/job_service.py`)

- `job_service.enqueue(db, kind, payload, run_at=None, max_attempts=5)` adds a row in the
  **caller's transaction**. The job exists only if that work commits, and it survives restarts.
- Handlers: `@job_service.handler("kind")` → `async def fn(db, payload)`.
- Periodic tasks: `@job_service.periodic("name", every_seconds)` → `async def fn(db)`. They run on
  every worker, so they must be idempotent (all current ones lock rows or re-check state).
- `run_once()` claims due jobs with `SELECT … FOR UPDATE SKIP LOCKED`, so any number of workers
  can run side by side. A failure is retried with backoff (30 s, 60 s, 120 s … max 1 h) until
  `max_attempts`, then marked `failed` with `last_error`.
- Jobs left `running` for 10+ minutes (crashed worker) are re-queued every 5 minutes.
- New modules that own handlers must be imported in `services/jobs.py`.

## Running the worker

| Where | How |
|---|---|
| Local dev | Nothing to do: `RUN_WORKER_IN_APP=true` (default) runs the worker inside uvicorn |
| Separate process | `cd backend && venv/bin/python -m app.worker` |
| docker compose | The `worker` service; the `backend` container sets `RUN_WORKER_IN_APP=false` |

`WORKER_POLL_SECONDS` (default 2) is the idle poll interval.

## Current jobs

| Kind / task | Trigger | Purpose |
|---|---|---|
| `push` (job) | every `Notification` | Expo push delivery ([push-notifications.md](./push-notifications.md)) |
| `auto_release` (job) | provider submits work | Release escrow if the lister doesn't respond by `auto_release_at` |
| `match_saved_searches` (job) | a tweak becomes active | Alert users whose saved searches match |
| `push_receipts` (every 5 min) | periodic | Check Expo receipts, prune dead tokens |
| `purge_otp_codes` (every 6 h) | periodic | Delete OTP rows older than a day |
| `requeue_stale_jobs` (every 5 min) | periodic | Recover jobs from crashed workers |

Inspect: `SELECT kind, status, attempts, last_error FROM jobs ORDER BY created_at DESC;`
