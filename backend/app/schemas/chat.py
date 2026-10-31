import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel, UtcDatetime


class ConversationCreate(BaseModel):
    application_id: uuid.UUID


class ChatMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message cannot be empty.")
        return stripped


class ChatMessageResponse(ORMModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID
    body: str
    created_at: UtcDatetime


class ChatParticipant(ORMModel):
    id: uuid.UUID
    first_name: str | None
    last_name: str | None
    profile_picture_url: str | None


class ConversationResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    tweak_id: uuid.UUID
    tweak_title: str
    # The party that is not the caller.
    other_user: ChatParticipant
    # The caller's side in this conversation.
    my_role: Literal["lister", "provider"]
    last_message: ChatMessageResponse | None
    unread_count: int
    # False once the application is no longer accepted/completed (e.g. cancelled).
    can_send: bool
    last_message_at: UtcDatetime | None
    created_at: UtcDatetime


class UnreadCountResponse(BaseModel):
    count: int
