import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationType
from app.models.notification import Notification


def add(
    db: AsyncSession,
    user_id: uuid.UUID,
    type_: NotificationType,
    title: str,
    body: str | None = None,
    tweak_id: uuid.UUID | None = None,
) -> Notification:
    """Queue a notification row. The caller commits as part of its own transaction."""
    notification = Notification(
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        tweak_id=tweak_id,
    )
    db.add(notification)
    return notification
