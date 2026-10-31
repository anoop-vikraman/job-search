import uuid

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.application import Application
from app.models.enums import ApplicationStatus, TweakStatus
from app.models.tweak import Tweak
from app.schemas.jsonb import resolve_price_minor
from app.schemas.tweak import TweakCreate, TweakUpdate


def _validate_and_price(pricing_model: str, pricing_data: dict | None) -> int | None:
    try:
        return resolve_price_minor(pricing_model, pricing_data)
    except Exception as exc:  # pydantic validation of the JSONB payload
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_PRICING_DATA", str(exc)
        ) from exc


async def create_tweak(db: AsyncSession, owner_id: uuid.UUID, data: TweakCreate) -> Tweak:
    price_minor = _validate_and_price(data.pricing_model.value, data.pricing_data)
    tweak = Tweak(
        created_by_user_id=owner_id,
        title=data.title,
        description=data.description,
        category=data.category,
        tweak_type=data.tweak_type,
        status=data.status,
        address_id=data.address_id,
        skills=data.skills,
        languages=data.languages,
        media=data.media,
        schedule_preference=data.schedule_preference,
        schedule_data=data.schedule_data,
        pricing_model=data.pricing_model,
        pricing_data=data.pricing_data,
        price_minor=price_minor,
    )
    db.add(tweak)
    await db.commit()
    await db.refresh(tweak)
    return tweak


async def get_tweak(db: AsyncSession, tweak_id: uuid.UUID) -> Tweak:
    tweak = await db.get(Tweak, tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    return tweak


async def update_tweak(
    db: AsyncSession, tweak_id: uuid.UUID, owner_id: uuid.UUID, data: TweakUpdate
) -> Tweak:
    tweak = await get_tweak(db, tweak_id)
    if tweak.created_by_user_id != owner_id:
        raise AppError(status.HTTP_403_FORBIDDEN, "TWEAK_ACCESS_DENIED", "Not your tweak.")

    fields = data.model_dump(exclude_unset=True)
    for key, value in fields.items():
        setattr(tweak, key, value)
    # Re-derive the price if pricing changed.
    if "pricing_model" in fields or "pricing_data" in fields:
        tweak.price_minor = _validate_and_price(tweak.pricing_model.value, tweak.pricing_data)
    await db.commit()
    await db.refresh(tweak)
    return tweak


async def delete_tweak(db: AsyncSession, tweak_id: uuid.UUID, owner_id: uuid.UUID) -> None:
    tweak = await get_tweak(db, tweak_id)
    if tweak.created_by_user_id != owner_id:
        raise AppError(status.HTTP_403_FORBIDDEN, "TWEAK_ACCESS_DENIED", "Not your tweak.")
    accepted = await db.scalar(
        select(Application).where(
            Application.tweak_id == tweak_id, Application.status == ApplicationStatus.accepted
        )
    )
    if accepted is not None:
        # A tweak with an accepted application is closed, never hard-deleted.
        tweak.status = TweakStatus.closed
        await db.commit()
        return
    await db.delete(tweak)
    await db.commit()


async def list_feed(
    db: AsyncSession,
    *,
    viewer_id: uuid.UUID,
    page: int,
    limit: int,
    category: str | None = None,
) -> tuple[list[Tweak], int]:
    """Active, discoverable tweaks not owned by the viewer."""
    conditions = [
        Tweak.status == TweakStatus.active,
        Tweak.created_by_user_id != viewer_id,
    ]
    if category:
        conditions.append(Tweak.category == category)

    total = await db.scalar(select(func.count()).select_from(Tweak).where(*conditions)) or 0
    rows = (
        await db.scalars(
            select(Tweak)
            .where(*conditions)
            .order_by(Tweak.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return list(rows), total


async def list_my_tweaks(db: AsyncSession, owner_id: uuid.UUID) -> list[Tweak]:
    rows = (
        await db.scalars(
            select(Tweak)
            .where(Tweak.created_by_user_id == owner_id)
            .order_by(Tweak.created_at.desc())
        )
    ).all()
    return list(rows)
