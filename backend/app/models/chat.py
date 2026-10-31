import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Conversation(Base):
    """One chat thread per application, between the tweak's lister and its accepted provider."""

    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint("lister_user_id <> provider_user_id", name="distinct_parties"),
        Index("ix_conversations_lister_last_message", "lister_user_id", "last_message_at"),
        Index("ix_conversations_provider_last_message", "provider_user_id", "last_message_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    tweak_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tweaks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lister_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Per-party read cursors: messages from the other party newer than this are unread.
    lister_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        # Text up to 2000 chars; may be empty only when the message carries attachments.
        CheckConstraint(
            "char_length(body) <= 2000 AND "
            "(char_length(body) >= 1 OR jsonb_array_length(attachments) > 0)",
            name="body_or_attachment",
        ),
        CheckConstraint("jsonb_typeof(attachments) = 'array'", name="attachments_array"),
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # [{"url": "/media/...", "type": "image"}]
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
