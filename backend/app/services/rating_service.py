import uuid

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.application import Application
from app.models.enums import ApplicationStatus, TweakStatus
from app.models.rating import Rating
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.rating import RatingCreate


async def create_rating(db: AsyncSession, rater_id: uuid.UUID, data: RatingCreate) -> Rating:
    if rater_id == data.ratee_user_id:
        raise AppError(status.HTTP_400_BAD_REQUEST, "CANNOT_RATE_SELF", "You cannot rate yourself.")

    tweak = await db.get(Tweak, data.tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    # Ratings only after completion (tweak closed with an accepted application).
    if tweak.status != TweakStatus.closed:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "TWEAK_NOT_COMPLETED", "Tweak is not completed."
        )

    accepted = await db.scalar(
        select(Application).where(
            Application.tweak_id == tweak.id, Application.status == ApplicationStatus.accepted
        )
    )
    if accepted is None:
        raise AppError(status.HTTP_400_BAD_REQUEST, "NO_ACCEPTED_APPLICATION", "No accepted work.")

    parties = {tweak.created_by_user_id, accepted.provider_user_id}
    if rater_id not in parties or data.ratee_user_id not in parties:
        raise AppError(
            status.HTTP_403_FORBIDDEN, "NOT_A_PARTY", "Only parties to the tweak can rate."
        )

    existing = await db.scalar(
        select(Rating).where(
            Rating.tweak_id == data.tweak_id,
            Rating.rater_user_id == rater_id,
            Rating.ratee_user_id == data.ratee_user_id,
        )
    )
    if existing is not None:
        raise AppError(status.HTTP_409_CONFLICT, "ALREADY_RATED", "You already rated this.")

    rating = Rating(
        tweak_id=data.tweak_id,
        rater_user_id=rater_id,
        ratee_user_id=data.ratee_user_id,
        score=data.score,
        comment=data.comment,
    )
    db.add(rating)
    await db.flush()
    await _recompute_aggregate(db, data.ratee_user_id)
    await db.commit()
    await db.refresh(rating)
    return rating


async def _recompute_aggregate(db: AsyncSession, user_id: uuid.UUID) -> None:
    avg, count = (
        await db.execute(
            select(func.avg(Rating.score), func.count()).where(Rating.ratee_user_id == user_id)
        )
    ).one()
    user = await db.get(User, user_id)
    if user is not None:
        user.rating_avg = round(float(avg), 2) if avg is not None else 0
        user.rating_count = int(count)
