from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import engine


def custom_operation_id(route: APIRoute) -> str:
    # Stable operationId for TypeScript client generation (admin + mobile).
    return route.name


app = FastAPI(
    title="Tweak API",
    version="1.0.0",
    generate_unique_id_function=custom_operation_id,
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
