"""Saved searches and new-tweak alerts.

When a tweak goes live (`active`), `enqueue_matching()` schedules a `match_saved_searches`
job. The job narrows candidates in SQL (category / type), then applies the same text and
distance rules as the feed in Python, and sends one `saved_search_match` notification per
user (even if several of their searches match).
"""

import math
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.address import Address
from app.models.enums import NotificationType, TweakStatus
from app.models.saved_search import SavedSearch
from app.models.tweak import Tweak
from app.schemas.saved_search import SavedSearchCreate
from app.services import block_service, job_service, notification_service, tweak_service

MAX_PER_USER = 10


async def create(db: AsyncSession, user_id: uuid.UUID, data: SavedSearchCreate) -> SavedSearch:
    filters = tweak_service.FeedFilters(
        category=data.category,
        search=data.search,
        lat=data.lat,
        lng=data.lng,
        radius_km=data.radius_km,
        tweak_type=data.tweak_type,
    )
    tweak_service.validate_location(filters, tweak_service.FeedSort.newest)
    if not (data.search or data.category or data.tweak_type or data.radius_km):
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "EMPTY_SEARCH",
            "Add a search term, category, type or distance to save an alert.",
        )
    count = await db.scalar(
        select(func.count()).select_from(SavedSearch).where(SavedSearch.user_id == user_id)
    )
    if (count or 0) >= MAX_PER_USER:
        raise AppError(
            status.HTTP_409_CONFLICT,
            "TOO_MANY_SAVED_SEARCHES",
            f"You can save up to {MAX_PER_USER} alerts. Delete one first.",
        )
    saved = SavedSearch(
        user_id=user_id,
        name=data.name,
        search=(data.search or "").strip() or None,
        category=data.category,
        tweak_type=data.tweak_type,
        lat=data.lat,
        lng=data.lng,
        radius_km=data.radius_km,
    )
    db.add(saved)
    await db.commit()
    await db.refresh(saved)
    return saved


async def list_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[SavedSearch]:
    rows = await db.scalars(
        select(SavedSearch)
        .where(SavedSearch.user_id == user_id)
        .order_by(SavedSearch.created_at.desc())
    )
    return list(rows)


async def delete(db: AsyncSession, user_id: uuid.UUID, saved_id: uuid.UUID) -> None:
    saved = await db.get(SavedSearch, saved_id)
    if saved is None or saved.user_id != user_id:
        raise AppError(status.HTTP_404_NOT_FOUND, "SAVED_SEARCH_NOT_FOUND", "Alert not found.")
    await db.delete(saved)
    await db.commit()


# ─── Matching ───────────────────────────────────────────────────────────────


def enqueue_matching(db: AsyncSession, tweak_id: uuid.UUID) -> None:
    """Call (before commit) when a tweak becomes active."""
    job_service.enqueue(db, "match_saved_searches", {"tweak_id": str(tweak_id)})


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * tweak_service.EARTH_RADIUS_KM * math.asin(min(1.0, math.sqrt(a)))


def matches(saved: SavedSearch, tweak: Tweak, location: tuple[float, float] | None) -> bool:
    """Same semantics as the feed filters (case-insensitive substring, radius)."""
    if saved.category and saved.category != tweak.category:
        return False
    if saved.tweak_type is not None and saved.tweak_type != tweak.tweak_type:
        return False
    if saved.search:
        term = saved.search.casefold()
        haystack = [tweak.title, tweak.description, tweak.category, " ".join(tweak.skills)]
        if not any(term in h.casefold() for h in haystack):
            return False
    if saved.radius_km is not None and saved.lat is not None and saved.lng is not None:
        if location is None:
            return False
        if _distance_km(saved.lat, saved.lng, *location) > saved.radius_km:
            return False
    return True


@job_service.handler("match_saved_searches")
async def match_job(db: AsyncSession, payload: dict[str, Any]) -> None:
    tweak = await db.get(Tweak, uuid.UUID(payload["tweak_id"]))
    if tweak is None or tweak.status != TweakStatus.active:
        return
    location: tuple[float, float] | None = None
    if tweak.address_id is not None:
        address = await db.get(Address, tweak.address_id)
        if address and address.latitude is not None and address.longitude is not None:
            location = (float(address.latitude), float(address.longitude))

    blocked = await block_service.blocked_ids(db, tweak.created_by_user_id)
    candidates = await db.scalars(
        select(SavedSearch).where(
            SavedSearch.user_id != tweak.created_by_user_id,
            or_(SavedSearch.category.is_(None), SavedSearch.category == tweak.category),
            or_(SavedSearch.tweak_type.is_(None), SavedSearch.tweak_type == tweak.tweak_type),
        )
    )
    notified: set[uuid.UUID] = set()
    now = datetime.now(UTC)
    for saved in candidates:
        if saved.user_id in blocked or not matches(saved, tweak, location):
            continue
        saved.last_matched_at = now
        if saved.user_id in notified:
            continue
        notified.add(saved.user_id)
        notification_service.add(
            db,
            saved.user_id,
            NotificationType.saved_search_match,
            f"New tweak for “{saved.name}”",
            tweak.title,
            tweak_id=tweak.id,
        )
    await db.commit()
