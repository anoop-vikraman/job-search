import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.device_token import DeviceToken


async def register(
    db: AsyncSession, user_id: uuid.UUID, token: str, platform: str
) -> tuple[DeviceToken, bool]:
    """Upsert a push token for the user. Returns (device, created).

    A token identifies one app install; if another account registered it before (shared
    device, re-login), it moves to the current user so pushes follow whoever is signed in.
    """
    device = await db.scalar(select(DeviceToken).where(DeviceToken.token == token))
    created = device is None
    if device is None:
        device = DeviceToken(user_id=user_id, token=token, platform=platform)
        db.add(device)
    else:
        device.user_id = user_id
        device.platform = platform
        device.last_seen_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(device)
    return device, created


async def unregister(db: AsyncSession, user_id: uuid.UUID, token: str) -> None:
    """Remove the caller's token (on logout). Unknown or foreign tokens are a 404."""
    result = await db.execute(
        delete(DeviceToken)
        .where(DeviceToken.token == token, DeviceToken.user_id == user_id)
        .returning(DeviceToken.id)
    )
    if result.scalar_one_or_none() is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "DEVICE_NOT_FOUND", "Device not registered.")
    await db.commit()
