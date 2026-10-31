import uuid
from typing import Any

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ConversationCreate,
    ConversationResponse,
    UnreadCountResponse,
)
from app.schemas.common import ErrorResponse, MessageResponse, Page
from app.services import chat_service

router = APIRouter(prefix="/conversations", tags=["conversations"])

ERRORS: dict[int | str, dict[str, Any]] = {
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
}


@router.get("", response_model=Page[ConversationResponse], status_code=status.HTTP_200_OK)
async def list_conversations(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> Page[ConversationResponse]:
    """The caller's conversations, most recently active first, with unread counts."""
    items, total = await chat_service.list_conversations(db, user.id, page=page, limit=limit)
    return Page(items=items, total=total, page=page, limit=limit)


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"model": ConversationResponse}, **ERRORS},
)
async def open_conversation(
    data: ConversationCreate, user: CurrentUser, db: DbSession, response: Response
) -> ConversationResponse:
    """Open the chat for an application: either party once accepted, or the lister while it
    is pending (to ask the applicant questions).

    Idempotent: returns 201 when the conversation is created, 200 if it already existed.
    """
    conversation, created = await chat_service.get_or_create(db, data.application_id, user.id)
    if not created:
        response.status_code = status.HTTP_200_OK
    return conversation


@router.get("/unread-count", response_model=UnreadCountResponse, status_code=status.HTTP_200_OK)
async def unread_count(user: CurrentUser, db: DbSession) -> UnreadCountResponse:
    """Unread messages across all of the caller's conversations."""
    return UnreadCountResponse(count=await chat_service.total_unread(db, user.id))


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
    responses=ERRORS,
)
async def get_conversation(
    conversation_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ConversationResponse:
    """A single conversation (participants only)."""
    return await chat_service.get_conversation(db, conversation_id, user.id)


@router.get(
    "/{conversation_id}/messages",
    response_model=Page[ChatMessageResponse],
    status_code=status.HTTP_200_OK,
    responses=ERRORS,
)
async def list_messages(
    conversation_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> Page[ChatMessageResponse]:
    """Messages in a conversation, newest first (participants only)."""
    rows, total = await chat_service.list_messages(
        db, conversation_id, user.id, page=page, limit=limit
    )
    return Page(
        items=[ChatMessageResponse.model_validate(m) for m in rows],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def send_message(
    conversation_id: uuid.UUID, data: ChatMessageCreate, user: CurrentUser, db: DbSession
) -> ChatMessageResponse:
    """Send a message (text and/or up to 4 uploaded photos); notifies the other party.

    While the application is pending, each side may send CHAT_PRE_ACCEPT_LIMIT messages.
    """
    message = await chat_service.send_message(
        db, conversation_id, user.id, data.body, data.attachment_urls
    )
    return ChatMessageResponse.model_validate(message)


@router.post(
    "/{conversation_id}/read",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    responses=ERRORS,
)
async def mark_read(
    conversation_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> MessageResponse:
    """Mark the conversation read up to its latest message."""
    await chat_service.mark_read(db, conversation_id, user.id)
    return MessageResponse(message="Marked read.")
