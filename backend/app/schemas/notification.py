import uuid

from pydantic import BaseModel

from app.models.enums import NotificationType
from app.schemas.common import ORMModel, UtcDatetime


class NotificationResponse(ORMModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    body: str | None
    tweak_id: uuid.UUID | None
    is_read: bool
    created_at: UtcDatetime


class NotificationPreferences(BaseModel):
    """Map of notification type -> push enabled."""

    push: dict[NotificationType, bool]
