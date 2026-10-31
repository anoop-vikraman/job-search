"""Lister <-> accepted-provider chat: one conversation per application."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal, TypeVar

from fastapi import status
from sqlalchemy import ColumnElement, Select, case, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.application import Application
from app.models.chat import Conversation, Message
from app.models.enums import ApplicationStatus, NotificationType
from app.models.notification import Notification
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.chat import ChatMessageResponse, ChatParticipant, ConversationResponse
from app.services import block_service, notification_service, realtime_service

# Chat opens on acceptance and stays writable through disputes and after completion
# (follow-ups, reviews). Rejected/withdrawn (incl. cancelled work) leaves it read-only.
CHAT_OPEN_STATUSES = (
    ApplicationStatus.accepted,
    ApplicationStatus.completed,
    ApplicationStatus.disputed,
)
PREVIEW_CHARS = 120

K = TypeVar("K")
V = TypeVar("V")


def _party_filter(user_id: uuid.UUID) -> ColumnElement[bool]:
    return or_(Conversation.lister_user_id == user_id, Conversation.provider_user_id == user_id)


def _my_read_cursor(user_id: uuid.UUID) -> ColumnElement[datetime | None]:
    return case(
        (Conversation.lister_user_id == user_id, Conversation.lister_last_read_at),
        else_=Conversation.provider_last_read_at,
    )


def _unread_condition(user_id: uuid.UUID) -> ColumnElement[bool]:
    """Messages from the other party newer than the caller's read cursor."""
    cursor = _my_read_cursor(user_id)
    return (Message.sender_user_id != user_id) & or_(cursor.is_(None), Message.created_at > cursor)


def _role(conversation: Conversation, user_id: uuid.UUID) -> Literal["lister", "provider"]:
    return "lister" if conversation.lister_user_id == user_id else "provider"


async def _get_for_party(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> Conversation:
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None:
        raise AppError(
            status.HTTP_404_NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation not found."
        )
    if user_id not in (conversation.lister_user_id, conversation.provider_user_id):
        raise AppError(
            status.HTTP_403_FORBIDDEN,
            "CONVERSATION_ACCESS_DENIED",
            "You are not part of this conversation.",
        )
    return conversation


async def _pairs(db: AsyncSession, stmt: Select[tuple[K, V]]) -> dict[K, V]:
    """Run a two-column select into a dict (Result has .keys(), so dict(result) misbehaves)."""
    return {k: v for k, v in (await db.execute(stmt)).tuples()}


async def _build(
    db: AsyncSession, conversations: list[Conversation], viewer_id: uuid.UUID
) -> list[ConversationResponse]:
    """Assemble list/detail payloads with a fixed number of queries (no N+1)."""
    if not conversations:
        return []
    conv_ids = [c.id for c in conversations]
    other_ids = {
        c.provider_user_id if c.lister_user_id == viewer_id else c.lister_user_id
        for c in conversations
    }

    titles = await _pairs(
        db,
        select(Tweak.id, Tweak.title).where(Tweak.id.in_({c.tweak_id for c in conversations})),
    )
    app_statuses = await _pairs(
        db,
        select(Application.id, Application.status).where(
            Application.id.in_({c.application_id for c in conversations})
        ),
    )
    users = {u.id: u for u in await db.scalars(select(User).where(User.id.in_(other_ids)))}
    blocked = await block_service.blocked_ids(db, viewer_id)
    last_messages = {
        m.conversation_id: m
        for m in await db.scalars(
            select(Message)
            .where(Message.conversation_id.in_(conv_ids))
            .distinct(Message.conversation_id)
            .order_by(Message.conversation_id, Message.created_at.desc(), Message.id.desc())
        )
    }
    unread = await _pairs(
        db,
        select(Message.conversation_id, func.count())
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(Message.conversation_id.in_(conv_ids), _unread_condition(viewer_id))
        .group_by(Message.conversation_id),
    )
    sent_by_viewer = await _pairs(
        db,
        select(Message.conversation_id, func.count())
        .where(Message.conversation_id.in_(conv_ids), Message.sender_user_id == viewer_id)
        .group_by(Message.conversation_id),
    )

    out: list[ConversationResponse] = []
    for c in conversations:
        other_id = c.provider_user_id if c.lister_user_id == viewer_id else c.lister_user_id
        last = last_messages.get(c.id)
        app_status = app_statuses.get(c.application_id)
        pending = app_status == ApplicationStatus.pending
        remaining = (
            max(0, settings.CHAT_PRE_ACCEPT_LIMIT - sent_by_viewer.get(c.id, 0))
            if pending
            else None
        )
        out.append(
            ConversationResponse(
                id=c.id,
                application_id=c.application_id,
                tweak_id=c.tweak_id,
                tweak_title=titles.get(c.tweak_id, ""),
                other_user=ChatParticipant.model_validate(users[other_id]),
                my_role=_role(c, viewer_id),
                last_message=ChatMessageResponse.model_validate(last) if last else None,
                unread_count=unread.get(c.id, 0),
                can_send=(app_status in CHAT_OPEN_STATUSES or bool(remaining))
                and other_id not in blocked,
                blocked=other_id in blocked,
                other_last_read_at=(
                    c.provider_last_read_at
                    if c.lister_user_id == viewer_id
                    else c.lister_last_read_at
                ),
                pre_accept_remaining=remaining,
                last_message_at=c.last_message_at,
                created_at=c.created_at,
            )
        )
    return out


async def get_or_create(
    db: AsyncSession, application_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[ConversationResponse, bool]:
    """Open (or return) the chat for an application. Returns (conversation, created)."""
    application = await db.get(Application, application_id)
    if application is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "APPLICATION_NOT_FOUND", "Application not found.")
    tweak = await db.get(Tweak, application.tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    if user_id not in (tweak.created_by_user_id, application.provider_user_id):
        raise AppError(
            status.HTTP_403_FORBIDDEN,
            "CONVERSATION_ACCESS_DENIED",
            "Only the lister and the provider can chat about this application.",
        )

    existing = await db.scalar(
        select(Conversation).where(Conversation.application_id == application_id)
    )
    if existing is not None:
        return (await _build(db, [existing], user_id))[0], False

    await block_service.ensure_not_blocked(
        db, tweak.created_by_user_id, application.provider_user_id
    )
    lister_asking = (
        application.status == ApplicationStatus.pending and user_id == tweak.created_by_user_id
    )
    if application.status not in CHAT_OPEN_STATUSES and not lister_asking:
        raise AppError(
            status.HTTP_409_CONFLICT,
            "CHAT_NOT_AVAILABLE",
            "Chat opens once the application is accepted (listers can ask applicants questions"
            " before that).",
        )
    conversation = Conversation(
        application_id=application.id,
        tweak_id=tweak.id,
        lister_user_id=tweak.created_by_user_id,
        provider_user_id=application.provider_user_id,
    )
    db.add(conversation)
    try:
        await db.commit()
    except IntegrityError:
        # A concurrent request created it first; return that one.
        await db.rollback()
        winner = await db.scalar(
            select(Conversation).where(Conversation.application_id == application_id)
        )
        if winner is None:
            raise
        return (await _build(db, [winner], user_id))[0], False
    await db.refresh(conversation)
    return (await _build(db, [conversation], user_id))[0], True


async def get_conversation(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> ConversationResponse:
    conversation = await _get_for_party(db, conversation_id, user_id)
    return (await _build(db, [conversation], user_id))[0]


async def list_conversations(
    db: AsyncSession, user_id: uuid.UUID, *, page: int, limit: int
) -> tuple[list[ConversationResponse], int]:
    """The caller's conversations, most recently active first."""
    total = (
        await db.scalar(
            select(func.count()).select_from(Conversation).where(_party_filter(user_id))
        )
    ) or 0
    rows = (
        await db.scalars(
            select(Conversation)
            .where(_party_filter(user_id))
            .order_by(
                Conversation.last_message_at.desc().nulls_last(),
                Conversation.created_at.desc(),
                Conversation.id.desc(),
            )
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return await _build(db, list(rows), user_id), total


async def list_messages(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID, *, page: int, limit: int
) -> tuple[list[Message], int]:
    """Messages newest first (render inverted)."""
    await _get_for_party(db, conversation_id, user_id)
    total = (
        await db.scalar(
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == conversation_id)
        )
    ) or 0
    rows = (
        await db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc(), Message.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return list(rows), total


async def send_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    sender_id: uuid.UUID,
    body: str,
    attachment_urls: list[str] | None = None,
) -> Message:
    conversation = await _get_for_party(db, conversation_id, sender_id)
    application_status = await db.scalar(
        select(Application.status).where(Application.id == conversation.application_id)
    )
    if application_status == ApplicationStatus.pending:
        # Before acceptance each side gets a few messages for questions, not a full chat.
        sent = await db.scalar(
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == conversation.id, Message.sender_user_id == sender_id)
        )
        if (sent or 0) >= settings.CHAT_PRE_ACCEPT_LIMIT:
            raise AppError(
                status.HTTP_409_CONFLICT,
                "PRE_ACCEPT_LIMIT",
                f"Up to {settings.CHAT_PRE_ACCEPT_LIMIT} messages each until the application is"
                " accepted.",
            )
    elif application_status not in CHAT_OPEN_STATUSES:
        raise AppError(status.HTTP_409_CONFLICT, "CHAT_CLOSED", "This conversation is read-only.")
    await block_service.ensure_not_blocked(
        db, conversation.lister_user_id, conversation.provider_user_id
    )

    # Wall-clock time (not the transaction's now()) so ordering and read cursors stay
    # strictly increasing even for messages sent in quick succession.
    sent_at = datetime.now(UTC)
    if conversation.last_message_at is not None and sent_at <= conversation.last_message_at:
        sent_at = conversation.last_message_at + timedelta(microseconds=1)

    attachments = [{"url": url, "type": "image"} for url in (attachment_urls or [])]
    message = Message(
        conversation_id=conversation.id,
        sender_user_id=sender_id,
        body=body,
        attachments=attachments,
        created_at=sent_at,
    )
    db.add(message)
    conversation.last_message_at = sent_at
    # Sending implies the sender has read the thread up to their own message.
    if conversation.lister_user_id == sender_id:
        conversation.lister_last_read_at = sent_at
        recipient_id = conversation.provider_user_id
    else:
        conversation.provider_last_read_at = sent_at
        recipient_id = conversation.lister_user_id

    sender = await db.get(User, sender_id)
    sender_name = (sender.first_name if sender else None) or "your contact"
    text_preview = body or (
        "📷 Photo" if len(attachments) == 1 else f"📷 {len(attachments)} photos"
    )
    preview = (
        text_preview
        if len(text_preview) <= PREVIEW_CHARS
        else text_preview[: PREVIEW_CHARS - 1] + "…"
    )
    notification_service.add(
        db,
        recipient_id,
        NotificationType.new_message,
        f"New message from {sender_name}",
        preview,
        tweak_id=conversation.tweak_id,
        data={"conversation_id": str(conversation.id)},
    )
    await realtime_service.notify(
        db, "message", conversation.id, [conversation.lister_user_id, conversation.provider_user_id]
    )
    await db.commit()
    await db.refresh(message)
    return message


async def mark_read(db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Move the caller's read cursor to the latest message and clear chat notifications."""
    conversation = await _get_for_party(db, conversation_id, user_id)
    if conversation.last_message_at is None:
        return
    if conversation.lister_user_id == user_id:
        conversation.lister_last_read_at = conversation.last_message_at
        other_id = conversation.provider_user_id
    else:
        conversation.provider_last_read_at = conversation.last_message_at
        other_id = conversation.lister_user_id
    await realtime_service.notify(db, "read", conversation.id, [other_id])
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.type == NotificationType.new_message,
            Notification.tweak_id == conversation.tweak_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()


async def total_unread(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Unread messages across all of the caller's conversations (tab badge)."""
    count = await db.scalar(
        select(func.count())
        .select_from(Message)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(_party_filter(user_id), _unread_condition(user_id))
    )
    return count or 0
