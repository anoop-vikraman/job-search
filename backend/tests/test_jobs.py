import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import JobStatus
from app.models.job import Job
from app.services import job_service
from tests.conftest import same_session


def _kind() -> str:
    return f"test-{uuid.uuid4().hex[:8]}"


async def test_enqueued_job_runs_and_completes(db: AsyncSession) -> None:
    kind = _kind()
    seen: list[dict[str, Any]] = []

    @job_service.handler(kind)
    async def _ok(_: AsyncSession, payload: dict[str, Any]) -> None:
        seen.append(payload)

    job = job_service.enqueue(db, kind, {"n": 1})
    await db.commit()

    assert await job_service.run_once(same_session(db), kinds=[kind]) == 1
    await db.refresh(job)
    assert job.status == JobStatus.done
    assert job.attempts == 1 and job.finished_at is not None
    assert seen == [{"n": 1}]


async def test_failures_back_off_then_fail_permanently(db: AsyncSession) -> None:
    kind = _kind()

    @job_service.handler(kind)
    async def _boom(_: AsyncSession, __: dict[str, Any]) -> None:
        raise ValueError("nope")

    job = job_service.enqueue(db, kind, {}, max_attempts=2)
    await db.commit()

    await job_service.run_once(same_session(db), kinds=[kind])
    await db.refresh(job)
    assert job.status == JobStatus.queued
    assert job.last_error == "ValueError: nope"
    assert job.run_at > datetime.now(UTC)  # backed off
    # Not due yet, so nothing runs.
    assert await job_service.run_once(same_session(db), kinds=[kind]) == 0

    job.run_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()
    await job_service.run_once(same_session(db), kinds=[kind])
    await db.refresh(job)
    assert job.status == JobStatus.failed
    assert job.attempts == 2


async def test_future_jobs_wait_and_unknown_kinds_fail(db: AsyncSession) -> None:
    later = _kind()
    job_service.enqueue(db, later, {}, run_at=datetime.now(UTC) + timedelta(hours=1))
    unknown = job_service.enqueue(db, "no-such-kind", {})
    await db.commit()

    assert await job_service.run_once(same_session(db), kinds=[later]) == 0
    await job_service.run_once(same_session(db), kinds=["no-such-kind"])
    await db.refresh(unknown)
    assert unknown.status == JobStatus.failed
    assert "No handler" in (unknown.last_error or "")


async def test_rolled_back_enqueue_leaves_no_job(db: AsyncSession) -> None:
    kind = _kind()
    job = job_service.enqueue(db, kind, {})
    job_id = job.id
    await db.rollback()
    assert await db.get(Job, job_id) is None


async def test_stale_running_jobs_are_requeued(db: AsyncSession) -> None:
    job = job_service.enqueue(db, _kind(), {})
    job.status = JobStatus.running
    job.locked_at = datetime.now(UTC) - timedelta(hours=1)
    await db.commit()
    assert await job_service.requeue_stale(db) >= 1
    await db.refresh(job)
    assert job.status == JobStatus.queued
