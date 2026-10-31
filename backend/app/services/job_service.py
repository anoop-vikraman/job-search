"""Durable background jobs on Postgres (no extra infrastructure).

- `enqueue()` adds a `jobs` row in the caller's transaction, so the job exists if and only
  if the surrounding work commits.
- Handlers are registered with `@handler("kind")`; periodic tasks with `@periodic(...)`.
- `run_once()` claims due jobs with `FOR UPDATE SKIP LOCKED` (safe with many workers) and
  retries failures with exponential backoff up to `max_attempts`.

The worker loop lives in `app/worker.py` (`python -m app.worker`), and also runs inside
the API process when `RUN_WORKER_IN_APP=true` (the dev default).
"""

import logging
import time
import uuid
from collections.abc import Awaitable, Callable, Collection
from contextlib import AbstractAsyncContextManager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import JobStatus
from app.models.job import Job

logger = logging.getLogger(__name__)

Handler = Callable[[AsyncSession, dict[str, Any]], Awaitable[None]]
PeriodicFn = Callable[[AsyncSession], Awaitable[None]]
SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]

HANDLERS: dict[str, Handler] = {}
STALE_AFTER = timedelta(minutes=10)


@dataclass
class PeriodicTask:
    name: str
    every_seconds: float
    fn: PeriodicFn
    last_run: float = 0.0


PERIODIC: dict[str, PeriodicTask] = {}


def handler(kind: str) -> Callable[[Handler], Handler]:
    def register(fn: Handler) -> Handler:
        HANDLERS[kind] = fn
        return fn

    return register


def periodic(name: str, every_seconds: float) -> Callable[[PeriodicFn], PeriodicFn]:
    """Run `fn` roughly every `every_seconds` on each worker. Tasks must be idempotent."""

    def register(fn: PeriodicFn) -> PeriodicFn:
        PERIODIC[name] = PeriodicTask(name, every_seconds, fn)
        return fn

    return register


def enqueue(
    db: AsyncSession,
    kind: str,
    payload: dict[str, Any],
    *,
    run_at: datetime | None = None,
    max_attempts: int = 5,
) -> Job:
    """Add a job to the caller's transaction (it runs only if that transaction commits)."""
    job = Job(
        id=uuid.uuid4(),
        kind=kind,
        payload=payload,
        run_at=run_at or datetime.now(UTC),
        max_attempts=max_attempts,
        status=JobStatus.queued,
        attempts=0,
    )
    db.add(job)
    return job


def _backoff(attempts: int) -> timedelta:
    return timedelta(seconds=min(30 * 2 ** (attempts - 1), 3600))


async def run_once(
    session_factory: SessionFactory, *, limit: int = 20, kinds: Collection[str] | None = None
) -> int:
    """Claim and execute due jobs (optionally only `kinds`). Returns how many were attempted."""
    now = datetime.now(UTC)
    async with session_factory() as db:
        query = select(Job).where(Job.status == JobStatus.queued, Job.run_at <= now)
        if kinds is not None:
            query = query.where(Job.kind.in_(kinds))
        claimed = list(
            await db.scalars(
                query.order_by(Job.run_at).limit(limit).with_for_update(skip_locked=True)
            )
        )
        for job in claimed:
            job.status = JobStatus.running
            job.locked_at = now
            job.attempts += 1
        claims = [(j.id, j.kind, dict(j.payload), j.attempts, j.max_attempts) for j in claimed]
        await db.commit()

    for job_id, kind, payload, attempts, max_attempts in claims:
        await _execute(session_factory, job_id, kind, payload, attempts, max_attempts)
    return len(claims)


async def _execute(
    session_factory: SessionFactory,
    job_id: uuid.UUID,
    kind: str,
    payload: dict[str, Any],
    attempts: int,
    max_attempts: int,
) -> None:
    fn = HANDLERS.get(kind)
    error: str | None = None
    if fn is None:
        error = f"No handler for job kind {kind!r}"
    else:
        try:
            async with session_factory() as db:
                await fn(db, payload)
        except Exception as exc:  # noqa: BLE001 - any handler failure is retried
            logger.exception("Job %s (%s) failed on attempt %d", job_id, kind, attempts)
            error = f"{type(exc).__name__}: {exc}"[:2000]

    async with session_factory() as db:
        values: dict[str, Any]
        if error is None:
            values = {"status": JobStatus.done, "finished_at": datetime.now(UTC)}
        elif attempts >= max_attempts or fn is None:
            values = {
                "status": JobStatus.failed,
                "finished_at": datetime.now(UTC),
                "last_error": error,
            }
        else:
            values = {
                "status": JobStatus.queued,
                "run_at": datetime.now(UTC) + _backoff(attempts),
                "last_error": error,
            }
        await db.execute(update(Job).where(Job.id == job_id).values(**values))
        await db.commit()


async def requeue_stale(db: AsyncSession) -> int:
    """Jobs left `running` by a crashed worker go back to the queue."""
    cutoff = datetime.now(UTC) - STALE_AFTER
    result = await db.execute(
        update(Job)
        .where(Job.status == JobStatus.running, Job.locked_at < cutoff)
        .values(status=JobStatus.queued, run_at=datetime.now(UTC))
        .returning(Job.id)
    )
    count = len(result.all())
    await db.commit()
    return count


async def run_periodic(session_factory: SessionFactory) -> list[str]:
    """Run periodic tasks that are due. Returns the names that ran."""
    ran: list[str] = []
    now = time.monotonic()
    for task in PERIODIC.values():
        if task.last_run and now - task.last_run < task.every_seconds:
            continue
        task.last_run = now
        try:
            async with session_factory() as db:
                await task.fn(db)
            ran.append(task.name)
        except Exception:
            logger.exception("Periodic task %s failed", task.name)
    return ran


@periodic("requeue_stale_jobs", 300)
async def _requeue_stale_task(db: AsyncSession) -> None:
    count = await requeue_stale(db)
    if count:
        logger.warning("Requeued %d stale job(s)", count)
