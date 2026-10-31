import uuid

from fastapi import status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.tweak import Tweak
from app.models.watchlist import Watchlist


async def add(db: AsyncSession, user_id: uuid.UUID, tweak_id: uuid.UUID) -> None:
    tweak = await db.get(Tweak, tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    existing = await db.scalar(
        select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.tweak_id == tweak_id)
    )
    if existing is None:
        db.add(Watchlist(user_id=user_id, tweak_id=tweak_id))
        await db.commit()


async def remove(db: AsyncSession, user_id: uuid.UUID, tweak_id: uuid.UUID) -> None:
    await db.execute(
        delete(Watchlist).where(Watchlist.user_id == user_id, Watchlist.tweak_id == tweak_id)
    )
    await db.commit()


async def list_tweaks(db: AsyncSession, user_id: uuid.UUID) -> list[Tweak]:
    rows = (
        await db.scalars(
            select(Tweak)
            .join(Watchlist, Watchlist.tweak_id == Tweak.id)
            .where(Watchlist.user_id == user_id)
            .order_by(Watchlist.created_at.desc())
        )
    ).all()
    return list(rows)
