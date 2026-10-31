import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.observability import init_sentry
from app.db.session import engine
from app.services import jobs as _jobs  # noqa: F401 - registers job handlers + completion hooks

init_sentry("api")


def custom_operation_id(route: APIRoute) -> str:
    # Stable operationId for TypeScript client generation (admin + mobile).
    return route.name


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Start the in-process worker (RUN_WORKER_IN_APP) and the realtime listener."""
    stop = asyncio.Event()
    tasks: list[asyncio.Task[None]] = []
    if settings.RUN_WORKER_IN_APP:
        from app.worker import run_forever

        tasks.append(asyncio.create_task(run_forever(stop)))
    if settings.REALTIME_ENABLED:
        from app.services.realtime_service import listen_forever

        tasks.append(asyncio.create_task(listen_forever(stop)))
    try:
        yield
    finally:
        stop.set()
        await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(
    title="Tweak API",
    version="1.0.0",
    generate_unique_id_function=custom_operation_id,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router)

# Serve uploaded media at /media.
_media_dir = Path(settings.MEDIA_DIR)
_media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_media_dir)), name="media")


@app.get("/health", tags=["health"])
async def health() -> JSONResponse:
    """Liveness + DB connectivity check."""
    db_connected = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False
    status_code = 200 if db_connected else 503
    body = {"status": "ok" if db_connected else "degraded", "db_connected": db_connected}
    return JSONResponse(status_code=status_code, content=body)
