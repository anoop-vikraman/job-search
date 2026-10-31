import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import ORMModel, UtcDatetime


class ConversationCreate(BaseModel):
    application_id: uuid.UUID


class ChatMessageCreate(BaseModel):
    body: str = Field("", max_length=2000)
    # Photos uploaded via POST /media/upload (their `/media/...` URLs).
    attachment_urls: list[str] = Field(default_factory=list, max_length=4)

    @field_validator("body")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("attachment_urls")
    @classmethod
    def _own_media(cls, v: list[str]) -> list[str]:
        # Only files uploaded to this API; no arbitrary external links as "photos".
        for url in v:
            if not url.startswith("/media/") or ".." in url:
                raise ValueError("Attachments must be uploaded through /media/upload.")
        return v

    @model_validator(mode="after")
    def _not_empty(self) -> "ChatMessageCreate":
        if not self.body and not self.attachment_urls:
            raise ValueError("Message cannot be empty.")
        return self


class ChatMessageResponse(ORMModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID
    body: str
    attachments: list[dict[str, Any]] = Field(default_factory=list)
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
    # False once the work was cancelled/rejected, or if either side blocked the other.
    can_send: bool
    # Either side blocked the other.
    blocked: bool = False
    # When the other party last read the thread (for "Seen" on your messages).
    other_last_read_at: UtcDatetime | None = None
    # While the application is still pending: messages the caller may still send.
    pre_accept_remaining: int | None = None
    last_message_at: UtcDatetime | None
    created_at: UtcDatetime


class UnreadCountResponse(BaseModel):
    count: int
