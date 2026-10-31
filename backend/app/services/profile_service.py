"""Public provider profiles: ratings, reviews, completed work and portfolio photos."""

import uuid

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.application import Application
from app.models.enums import ApplicationStatus
from app.models.rating import Rating
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.profile import PortfolioPhoto, PublicProfile, PublicReview
from app.services import block_service

MAX_REVIEWS = 20
MAX_PHOTOS = 12


def _short_name(first: str | None, last: str | None) -> str:
    first = (first or "").strip()
    initial = (last or "").strip()[:1]
    if not first:
        return "Tweak user"
    return f"{first} {initial}." if initial else first


async def get_public_profile(
    db: AsyncSession, user_id: uuid.UUID, viewer_id: uuid.UUID
) -> PublicProfile:
    user = await db.get(User, user_id)
    # Banned or blocked (either way) users are hidden entirely.
    if (
        user is None
        or user.is_banned
        or (viewer_id != user_id and await block_service.is_blocked_between(db, viewer_id, user_id))
    ):
        raise AppError(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND", "User not found.")

    completed_jobs = (
        await db.scalar(
            select(func.count())
            .select_from(Application)
            .where(
                Application.provider_user_id == user_id,
                Application.status == ApplicationStatus.completed,
            )
        )
    ) or 0

    reviews = [
        PublicReview(
            score=rating.score,
            comment=rating.comment,
            created_at=rating.created_at,
            reviewer_name=_short_name(rater.first_name, rater.last_name),
            tweak_title=tweak.title,
            tweak_category=tweak.category,
        )
        for rating, rater, tweak in (
            await db.execute(
                select(Rating, User, Tweak)
                .join(User, User.id == Rating.rater_user_id)
                .join(Tweak, Tweak.id == Rating.tweak_id)
                .where(Rating.ratee_user_id == user_id)
                .order_by(Rating.created_at.desc())
                .limit(MAX_REVIEWS)
            )
        ).tuples()
    ]

    photos: list[PortfolioPhoto] = []
    rows = await db.execute(
        select(Application.completion_photos, Tweak.title, Tweak.category)
        .join(Tweak, Tweak.id == Application.tweak_id)
        .where(
            Application.provider_user_id == user_id,
            Application.status == ApplicationStatus.completed,
            func.jsonb_array_length(Application.completion_photos) > 0,
        )
        .order_by(Application.work_submitted_at.desc().nulls_last())
        .limit(MAX_PHOTOS)
    )
    for completion_photos, title, category in rows.tuples():
        for p in completion_photos:
            if len(photos) >= MAX_PHOTOS:
                break
            url = p.get("url") if isinstance(p, dict) else None
            if isinstance(url, str):
                photos.append(PortfolioPhoto(url=url, tweak_title=title, tweak_category=category))

    return PublicProfile(
        id=user.id,
        display_name=_short_name(user.first_name, user.last_name),
        profile_picture_url=user.profile_picture_url,
        bio=user.bio,
        skills=user.skills,
        completed_categories=user.completed_categories,
        rating_avg=float(user.rating_avg),
        rating_count=user.rating_count,
        completed_jobs=completed_jobs,
        verified=user.kyc_verified_at is not None,
        member_since=user.created_at,
        reviews=reviews,
        portfolio=photos,
    )
