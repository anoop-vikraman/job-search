import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationType
from app.models.notification import Notification
from app.services import push_service


def add(
    db: AsyncSession,
    user_id: uuid.UUID,
    type_: NotificationType,
    title: str,
    body: str | None = None,
    tweak_id: uuid.UUID | None = None,
    data: dict[str, str] | None = None,
) -> Notification:
    """Queue a notification row. The caller commits as part of its own transaction.

    A matching Expo push is sent to the user's devices after that commit. `data` adds
    extra routing hints to the push payload (e.g. `conversation_id`).
    """
    notification = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        tweak_id=tweak_id,
    )
    db.add(notification)
    push_data = {"notification_id": str(notification.id), "type": type_.value}
    if tweak_id is not None:
        push_data["tweak_id"] = str(tweak_id)
    push_data.update(data or {})
    push_service.queue(
        db, push_service.PushMessage(user_id=user_id, title=title, body=body, data=push_data)
    )
    return notification
