import uuid

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select, update

from app.api.deps import CurrentUser, DbSession
from app.core.errors import AppError
from app.models.notification import Notification
from app.schemas.common import ErrorResponse, MessageResponse, Page
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Page[NotificationResponse])
async def list_notifications(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> Page[NotificationResponse]:
    """Paginated notifications for the authenticated user, newest first."""
    total = (
        await db.scalar(
            select(func.count()).select_from(Notification).where(Notification.user_id == user.id)
        )
    ) or 0
    rows = (
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return Page(
        items=[NotificationResponse.model_validate(n) for n in rows],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/unread-count", response_model=dict[str, int])
async def unread_count(user: CurrentUser, db: DbSession) -> dict[str, int]:
    """Number of unread notifications for the badge."""
    count = (
        await db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        )
    ) or 0
    return {"count": count}


@router.post("/read-all", response_model=MessageResponse)
async def mark_all_read(user: CurrentUser, db: DbSession) -> MessageResponse:
    """Mark all of the user's notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return MessageResponse(message="All marked read.")


@router.post(
    "/{notification_id}/read",
    response_model=MessageResponse,
    responses={404: {"model": ErrorResponse}},
)
async def mark_read(
    notification_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> MessageResponse:
    """Mark a single notification as read."""
    n = await db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        raise AppError(status.HTTP_404_NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Not found.")
    n.is_read = True
    await db.commit()
    return MessageResponse(message="Marked read.")
