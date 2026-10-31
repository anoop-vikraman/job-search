import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password
from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from app.models.wallet import Wallet


@pytest.fixture(autouse=True)
def _no_real_push(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never call the Expo API from tests; push tests re-enable it with a fake transport."""
    monkeypatch.setattr(settings, "EXPO_PUSH_ENABLED", False)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """A session on a transaction rolled back after each test — leaves no trace.

    A fresh NullPool engine is created per test so the connection is always bound to the
    current event loop (avoids cross-loop Future errors in the full suite).
    ``join_transaction_mode="create_savepoint"`` makes each service-level ``commit()`` release
    a SAVEPOINT inside the outer transaction instead of ending it.
    """
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    connection = await test_engine.connect()
    trans = await connection.begin()
    maker = async_sessionmaker(
        bind=connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    session = maker()
    try:
        yield session
    finally:
        await session.close()
        if trans.is_active:
            await trans.rollback()
        await connection.close()
        await test_engine.dispose()


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with the DB dependency overridden to the rolled-back session."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def make_user(
    db: AsyncSession,
    *,
    phone: str | None = None,
    role: UserRole = UserRole.user,
    balance_minor: int = 0,
) -> User:
    user = User(
        phone_number=phone or str(uuid.uuid4().int)[:10],
        country_code="+91",
        hashed_password=hash_password("Password@123"),
        first_name="Test",
        role=role,
        is_phone_verified=True,
    )
    db.add(user)
    await db.flush()
    db.add(Wallet(user_id=user.id))
    await db.flush()
    if balance_minor:
        # Seed the balance via a real topup so the ledger reconciles with the balance.
        from app.services import wallet_service

        await wallet_service.topup(db, user.id, balance_minor, reference=None)
    return user
