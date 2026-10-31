"""User blocking. A block works both ways: neither side sees the other's tweaks, applies to
them, or can send chat messages to them."""

import uuid

from fastapi import status
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.moderation import Block
from app.models.user import User


async def block(db: AsyncSession, blocker_id: uuid.UUID, blocked_id: uuid.UUID) -> Block:
    if blocker_id == blocked_id:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "CANNOT_BLOCK_SELF", "You can't block yourself."
        )
    if await db.get(User, blocked_id) is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND", "User not found.")
    existing = await db.scalar(
        select(Block).where(
            Block.blocker_user_id == blocker_id, Block.blocked_user_id == blocked_id
        )
    )
    if existing is not None:
        return existing
    row = Block(blocker_user_id=blocker_id, blocked_user_id=blocked_id)
    db.add(row)
    try:
        await db.commit()
    except IntegrityError:  # concurrent duplicate
        await db.rollback()
        again = await db.scalar(
            select(Block).where(
                Block.blocker_user_id == blocker_id, Block.blocked_user_id == blocked_id
            )
        )
        if again is None:
            raise
        return again
    await db.refresh(row)
    return row


async def unblock(db: AsyncSession, blocker_id: uuid.UUID, blocked_id: uuid.UUID) -> None:
    await db.execute(
        delete(Block).where(
            Block.blocker_user_id == blocker_id, Block.blocked_user_id == blocked_id
        )
    )
    await db.commit()


async def list_blocked(db: AsyncSession, blocker_id: uuid.UUID) -> list[tuple[Block, User]]:
    rows = await db.execute(
        select(Block, User)
        .join(User, User.id == Block.blocked_user_id)
        .where(Block.blocker_user_id == blocker_id)
        .order_by(Block.created_at.desc())
    )
    return [(b, u) for b, u in rows.tuples()]


async def blocked_ids(db: AsyncSession, user_id: uuid.UUID) -> set[uuid.UUID]:
    """Everyone the user blocked or was blocked by."""
    rows = await db.execute(
        select(Block.blocker_user_id, Block.blocked_user_id).where(
            or_(Block.blocker_user_id == user_id, Block.blocked_user_id == user_id)
        )
    )
    return {b if a == user_id else a for a, b in rows.tuples()}


async def is_blocked_between(db: AsyncSession, a: uuid.UUID, b: uuid.UUID) -> bool:
    found = await db.scalar(
        select(Block.id)
        .where(
            or_(
                (Block.blocker_user_id == a) & (Block.blocked_user_id == b),
                (Block.blocker_user_id == b) & (Block.blocked_user_id == a),
            )
        )
        .limit(1)
    )
    return found is not None


async def ensure_not_blocked(db: AsyncSession, a: uuid.UUID, b: uuid.UUID) -> None:
    if await is_blocked_between(db, a, b):
        raise AppError(
            status.HTTP_403_FORBIDDEN,
            "USER_BLOCKED",
            "You can't interact with this user.",
        )
