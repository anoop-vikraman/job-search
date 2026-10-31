import math
import uuid
from typing import Any

from fastapi import status
from sqlalchemy import ColumnElement, Float, case, cast, func, or_, select, type_coerce
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.address import Address
from app.models.application import Application
from app.models.enums import ApplicationStatus, TweakStatus
from app.models.tweak import Tweak
from app.schemas.jsonb import resolve_price_minor
from app.schemas.tweak import FeedSort, TweakCreate, TweakUpdate


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


EARTH_RADIUS_KM = 6371.0


def _like_pattern(term: str) -> str:
    """Substring ILIKE pattern with the user's `%`, `_` and `\\` treated literally."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _haversine_km(lat: float, lng: float) -> ColumnElement[float]:
    """Great-circle distance (km) from (lat, lng) to the joined Address row."""
    lat1 = math.radians(lat)
    lng1 = math.radians(lng)
    lat2 = func.radians(cast(Address.latitude, Float))
    lng2 = func.radians(cast(Address.longitude, Float))
    sin_dlat = func.sin((lat2 - lat1) / 2)
    sin_dlng = func.sin((lng2 - lng1) / 2)
    a = sin_dlat * sin_dlat + math.cos(lat1) * func.cos(lat2) * sin_dlng * sin_dlng
    # LEAST() guards asin/sqrt against float rounding pushing `a` just above 1. Postgres
    # LEAST() skips NULLs, so un-geocoded rows must be mapped to NULL explicitly.
    km = 2 * EARTH_RADIUS_KM * func.asin(func.sqrt(func.least(1.0, a)))
    return type_coerce(
        case((or_(Address.latitude.is_(None), Address.longitude.is_(None)), None), else_=km),
        Float,
    )


async def list_feed(
    db: AsyncSession,
    *,
    viewer_id: uuid.UUID,
    page: int,
    limit: int,
    category: str | None = None,
    search: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    sort: FeedSort = FeedSort.newest,
) -> tuple[list[tuple[Tweak, float | None]], int]:
    """Active, discoverable tweaks not owned by the viewer, each with its distance (km).

    Distance is computed only when `lat`/`lng` are given, from the tweak's address
    coordinates. Tweaks without a geocoded address get `None` and are excluded by
    `radius_km`.
    """
    if (lat is None) != (lng is None):
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "LOCATION_REQUIRED",
            "lat and lng must be provided together.",
        )
    if lat is None and (radius_km is not None or sort == FeedSort.distance):
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "LOCATION_REQUIRED",
            "radius_km and sort=distance require lat and lng.",
        )

    conditions: list[ColumnElement[bool]] = [
        Tweak.status == TweakStatus.active,
        Tweak.created_by_user_id != viewer_id,
    ]
    if category:
        conditions.append(Tweak.category == category)
    term = (search or "").strip()
    if term:
        pattern = _like_pattern(term)
        conditions.append(
            or_(
                Tweak.title.ilike(pattern, escape="\\"),
                Tweak.description.ilike(pattern, escape="\\"),
                Tweak.category.ilike(pattern, escape="\\"),
                func.array_to_string(Tweak.skills, " ").ilike(pattern, escape="\\"),
            )
        )

    distance: ColumnElement[float] | None = None
    if lat is not None and lng is not None:
        distance = _haversine_km(lat, lng)
        if radius_km is not None:
            conditions.append(distance <= radius_km)

    order_by: list[Any]
    if sort == FeedSort.price_asc:
        order_by = [Tweak.price_minor.asc().nulls_last()]
    elif sort == FeedSort.price_desc:
        order_by = [Tweak.price_minor.desc().nulls_last()]
    elif sort == FeedSort.distance and distance is not None:
        order_by = [distance.asc().nulls_last()]
    else:
        order_by = []
    # Stable tie-breakers so pages don't overlap.
    order_by += [Tweak.created_at.desc(), Tweak.id.desc()]

    count_q = select(func.count()).select_from(Tweak)
    if distance is not None:
        count_q = count_q.outerjoin(Address, Address.id == Tweak.address_id)
    total = await db.scalar(count_q.where(*conditions)) or 0

    offset = (page - 1) * limit
    if distance is None:
        tweaks = await db.scalars(
            select(Tweak).where(*conditions).order_by(*order_by).offset(offset).limit(limit)
        )
        return [(tweak, None) for tweak in tweaks], total

    result = await db.execute(
        select(Tweak, distance)
        .outerjoin(Address, Address.id == Tweak.address_id)
        .where(*conditions)
        .order_by(*order_by)
        .offset(offset)
        .limit(limit)
    )
    rows: list[tuple[Tweak, float | None]] = [
        (tweak, round(d, 2) if d is not None else None) for tweak, d in result.tuples()
    ]
    return rows, total


async def list_my_tweaks(db: AsyncSession, owner_id: uuid.UUID) -> list[Tweak]:
    rows = (
        await db.scalars(
            select(Tweak)
            .where(Tweak.created_by_user_id == owner_id)
            .order_by(Tweak.created_at.desc())
        )
    ).all()
    return list(rows)
