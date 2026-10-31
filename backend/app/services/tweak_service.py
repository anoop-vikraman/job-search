import base64
import json
import math
import uuid
from collections.abc import Collection
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from fastapi import status
from sqlalchemy import (
    BigInteger,
    ColumnElement,
    DateTime,
    Float,
    case,
    cast,
    func,
    literal,
    or_,
    select,
    tuple_,
    type_coerce,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.address import Address
from app.models.application import Application
from app.models.enums import ApplicationStatus, TweakStatus, TweakType
from app.models.tweak import Tweak
from app.schemas.jsonb import resolve_price_minor
from app.schemas.tweak import FeedSort, TweakCreate, TweakUpdate
from app.services import analytics_service, job_service


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
        recurrence=data.recurrence,
    )
    db.add(tweak)
    if tweak.status == TweakStatus.active:
        await db.flush()
        _alert_saved_searches(db, tweak.id)
        analytics_service.track(db, "tweak_posted", user_id=owner_id, tweak_id=tweak.id)
    await db.commit()
    await db.refresh(tweak)
    return tweak


def _alert_saved_searches(db: AsyncSession, tweak_id: uuid.UUID) -> None:
    # Handled by saved_search_service (registered job); enqueued by kind to avoid an import cycle.
    job_service.enqueue(db, "match_saved_searches", {"tweak_id": str(tweak_id)})


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

    was_active = tweak.status == TweakStatus.active
    fields = data.model_dump(exclude_unset=True)
    for key, value in fields.items():
        setattr(tweak, key, value)
    if tweak.status == TweakStatus.active and not was_active:
        _alert_saved_searches(db, tweak.id)
        analytics_service.track(db, "tweak_posted", user_id=owner_id, tweak_id=tweak.id)
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


# Coordinates shown on the map are snapped to a 0.005° grid (~550 m) so a tweak's exact
# address is never exposed.
APPROX_GRID = 200  # 1 / 0.005
# Sort keys stand in for NULLs so keyset comparisons stay total (unpriced/un-geocoded last).
_PRICE_LAST_ASC = 2**62
_PRICE_LAST_DESC = -1
_DISTANCE_LAST = 1e9


@dataclass(frozen=True)
class FeedFilters:
    category: str | None = None
    search: str | None = None
    lat: float | None = None
    lng: float | None = None
    radius_km: float | None = None
    tweak_type: TweakType | None = None


@dataclass(frozen=True)
class FeedRow:
    tweak: Tweak
    distance_km: float | None
    approx_lat: float | None
    approx_lng: float | None


def _approx(value: Any) -> float | None:
    return None if value is None else round(round(float(value) * APPROX_GRID) / APPROX_GRID, 3)


def validate_location(filters: FeedFilters, sort: FeedSort) -> None:
    if (filters.lat is None) != (filters.lng is None):
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "LOCATION_REQUIRED",
            "lat and lng must be provided together.",
        )
    if filters.lat is None and (filters.radius_km is not None or sort == FeedSort.distance):
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "LOCATION_REQUIRED",
            "radius_km and sort=distance require lat and lng.",
        )


def feed_conditions(
    filters: FeedFilters, distance: ColumnElement[float] | None
) -> list[ColumnElement[bool]]:
    """WHERE clauses shared by the feed and saved-search matching (status/owner excluded)."""
    conditions: list[ColumnElement[bool]] = []
    if filters.category:
        conditions.append(Tweak.category == filters.category)
    if filters.tweak_type is not None:
        conditions.append(Tweak.tweak_type == filters.tweak_type)
    term = (filters.search or "").strip()
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
    if distance is not None and filters.radius_km is not None:
        conditions.append(distance <= filters.radius_km)
    return conditions


def _sort_key(
    sort: FeedSort, distance: ColumnElement[float] | None
) -> tuple[ColumnElement[Any], bool, Any]:
    """(key expression, descending?, SQL type) for keyset pagination."""
    if sort == FeedSort.price_asc:
        return func.coalesce(Tweak.price_minor, _PRICE_LAST_ASC), False, BigInteger()
    if sort == FeedSort.price_desc:
        return func.coalesce(Tweak.price_minor, _PRICE_LAST_DESC), True, BigInteger()
    if sort == FeedSort.distance and distance is not None:
        return func.coalesce(distance, _DISTANCE_LAST), False, Float()
    created_at: ColumnElement[Any] = Tweak.created_at.expression
    return created_at, True, DateTime(timezone=True)


def encode_cursor(sort: FeedSort, key: Any, tweak_id: uuid.UUID) -> str:
    value = key.isoformat() if isinstance(key, datetime) else key
    raw = json.dumps({"s": sort.value, "k": value, "i": str(tweak_id)}, separators=(",", ":"))
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str, sort: FeedSort) -> tuple[Any, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded))
        if data["s"] != sort.value:
            raise ValueError("cursor belongs to a different sort")
        key: Any = data["k"]
        if sort == FeedSort.newest:
            key = datetime.fromisoformat(key)
        elif sort in (FeedSort.price_asc, FeedSort.price_desc):
            key = int(key)
        else:
            key = float(key)
        return key, uuid.UUID(data["i"])
    except (ValueError, KeyError, TypeError) as exc:
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "INVALID_CURSOR",
            "The pagination cursor is invalid for this query; start from the first page.",
        ) from exc


async def list_feed(
    db: AsyncSession,
    *,
    viewer_id: uuid.UUID,
    page: int,
    limit: int,
    filters: FeedFilters = FeedFilters(),
    sort: FeedSort = FeedSort.newest,
    cursor: str | None = None,
    exclude_owner_ids: Collection[uuid.UUID] = (),
) -> tuple[list[FeedRow], int, str | None]:
    """Active tweaks not owned by the viewer. Returns (rows, total, next_cursor).

    Pass `cursor` (from the previous response) for keyset pagination; otherwise `page`
    is used. `distance_km` is set only when lat/lng are given; tweaks without a geocoded
    address get `None` and are excluded by `radius_km`.
    """
    validate_location(filters, sort)

    distance: ColumnElement[float] | None = None
    if filters.lat is not None and filters.lng is not None:
        distance = _haversine_km(filters.lat, filters.lng)

    conditions: list[ColumnElement[bool]] = [
        Tweak.status == TweakStatus.active,
        Tweak.created_by_user_id != viewer_id,
        *feed_conditions(filters, distance),
    ]
    if exclude_owner_ids:
        conditions.append(Tweak.created_by_user_id.not_in(list(exclude_owner_ids)))

    total = (
        await db.scalar(
            select(func.count())
            .select_from(Tweak)
            .outerjoin(Address, Address.id == Tweak.address_id)
            .where(*conditions)
        )
        or 0
    )

    key, descending, key_type = _sort_key(sort, distance)
    order_by = [key.desc(), Tweak.id.desc()] if descending else [key.asc(), Tweak.id.asc()]
    page_conditions = list(conditions)
    if cursor is not None:
        after_key, after_id = decode_cursor(cursor, sort)
        bound = tuple_(literal(after_key, key_type), literal(after_id, UUID(as_uuid=True)))
        row_key = tuple_(key, Tweak.id)
        page_conditions.append(row_key < bound if descending else row_key > bound)

    query = (
        select(
            Tweak,
            distance if distance is not None else literal(None, Float()),
            key,
            Address.latitude,
            Address.longitude,
        )
        .outerjoin(Address, Address.id == Tweak.address_id)
        .where(*page_conditions)
        .order_by(*order_by)
        .limit(limit + 1)
    )
    if cursor is None:
        query = query.offset((page - 1) * limit)
    result = (await db.execute(query)).tuples().all()

    has_more = len(result) > limit
    result = result[:limit]
    rows = [
        FeedRow(
            tweak=tweak,
            distance_km=round(d, 2) if d is not None else None,
            approx_lat=_approx(alat) if tweak.tweak_type == TweakType.in_person else None,
            approx_lng=_approx(alng) if tweak.tweak_type == TweakType.in_person else None,
        )
        for tweak, d, _, alat, alng in result
    ]
    next_cursor = None
    if has_more and result:
        last_tweak, _, last_key, _, _ = result[-1]
        next_cursor = encode_cursor(sort, last_key, last_tweak.id)
    return rows, total, next_cursor


async def list_my_tweaks(db: AsyncSession, owner_id: uuid.UUID) -> list[Tweak]:
    rows = (
        await db.scalars(
            select(Tweak)
            .where(Tweak.created_by_user_id == owner_id)
            .order_by(Tweak.created_at.desc())
        )
    ).all()
    return list(rows)
