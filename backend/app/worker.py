"""Background worker: `python -m app.worker`.

Runs queued jobs and periodic tasks. Several workers can run at once. The API also runs one
in-process when `RUN_WORKER_IN_APP=true` (dev default); disable that in production and run
this as its own process.
"""

import asyncio
import logging

from app.core.config import settings
from app.core.observability import init_sentry
from app.db.session import async_session_maker
from app.services import job_service
from app.services import jobs as _jobs  # noqa: F401 - registers handlers and periodic tasks

logger = logging.getLogger(__name__)


async def run_forever(stop: asyncio.Event | None = None) -> None:
    stop = stop or asyncio.Event()
    logger.info("Worker started (poll every %.1fs)", settings.WORKER_POLL_SECONDS)
    while not stop.is_set():
        try:
            await job_service.run_periodic(async_session_maker)
            worked = await job_service.run_once(async_session_maker)
        except Exception:
            logger.exception("Worker iteration failed")
            worked = 0
        if not worked:
            try:
                await asyncio.wait_for(stop.wait(), timeout=settings.WORKER_POLL_SECONDS)
            except TimeoutError:
                pass


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    init_sentry("worker")
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()
