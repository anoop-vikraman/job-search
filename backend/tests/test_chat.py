import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.application import Application
from app.models.enums import NotificationType, PricingModel, TweakStatus, TweakType
from app.models.notification import Notification
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate
from app.services import application_service, chat_service
from tests.conftest import make_user


async def _accepted(db: AsyncSession, *, accept: bool = True) -> tuple[User, User, Application]:
    lister = await make_user(db, balance_minor=200000)
    provider = await make_user(db)
    provider.first_name = "Priya"
    tweak = Tweak(
        created_by_user_id=lister.id,
        title="Fix sink",
        description="desc",
        category="Plumbing",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        pricing_data={"amount_minor": 50000},
        price_minor=50000,
    )
    db.add(tweak)
    await db.flush()
    application = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    if accept:
        application = await application_service.accept(db, application.id, lister.id)
    return lister, provider, application


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), 'user')}"}


async def test_open_is_idempotent_for_both_parties(db: AsyncSession) -> None:
    lister, provider, application = await _accepted(db)
    conv, created = await chat_service.get_or_create(db, application.id, lister.id)
    assert created is True
    assert conv.my_role == "lister"
    assert conv.other_user.id == provider.id
    assert conv.tweak_title == "Fix sink"
    assert conv.can_send is True

    again, created_again = await chat_service.get_or_create(db, application.id, provider.id)
    assert created_again is False
    assert again.id == conv.id
    assert again.my_role == "provider"
    assert again.other_user.id == lister.id


async def test_pending_application_allows_a_few_questions(db: AsyncSession) -> None:
    lister, provider, application = await _accepted(db, accept=False)
    # The provider can't start a chat on a pending application; the lister can.
    with pytest.raises(AppError) as exc:
        await chat_service.get_or_create(db, application.id, provider.id)
    assert exc.value.code == "CHAT_NOT_AVAILABLE"
    conv, _ = await chat_service.get_or_create(db, application.id, lister.id)
    assert conv.can_send is True and conv.pre_accept_remaining == settings.CHAT_PRE_ACCEPT_LIMIT

    for i in range(settings.CHAT_PRE_ACCEPT_LIMIT):
        await chat_service.send_message(db, conv.id, lister.id, f"Question {i}?")
    with pytest.raises(AppError) as exc:
        await chat_service.send_message(db, conv.id, lister.id, "One more?")
    assert exc.value.code == "PRE_ACCEPT_LIMIT"
    as_lister = await chat_service.get_conversation(db, conv.id, lister.id)
    assert as_lister.pre_accept_remaining == 0 and as_lister.can_send is False

    # The provider still has their own allowance to answer.
    as_provider = await chat_service.get_conversation(db, conv.id, provider.id)
    assert as_provider.pre_accept_remaining == settings.CHAT_PRE_ACCEPT_LIMIT
    await chat_service.send_message(db, conv.id, provider.id, "Yes, I have tools.")

    # Acceptance lifts the cap.
    await application_service.accept(db, application.id, lister.id)
    after = await chat_service.get_conversation(db, conv.id, lister.id)
    assert after.pre_accept_remaining is None and after.can_send is True
    await chat_service.send_message(db, conv.id, lister.id, "Great, see you tomorrow")


async def test_photo_messages_and_read_receipts(db: AsyncSession) -> None:
    lister, provider, application = await _accepted(db)
    conv, _ = await chat_service.get_or_create(db, application.id, lister.id)
    msg = await chat_service.send_message(
        db, conv.id, provider.id, "", ["/media/abc.jpg", "/media/def.jpg"]
    )
    assert msg.attachments == [
        {"url": "/media/abc.jpg", "type": "image"},
        {"url": "/media/def.jpg", "type": "image"},
    ]
    note = await db.scalar(
        select(Notification)
        .where(Notification.user_id == lister.id, Notification.type == NotificationType.new_message)
        .order_by(Notification.created_at.desc())
    )
    assert note is not None and note.body == "📷 2 photos"

    seen = await chat_service.get_conversation(db, conv.id, provider.id)
    assert seen.other_last_read_at is None  # lister hasn't opened it yet
    await chat_service.mark_read(db, conv.id, lister.id)
    seen = await chat_service.get_conversation(db, conv.id, provider.id)
    assert seen.other_last_read_at is not None and seen.other_last_read_at >= msg.created_at


@pytest.mark.parametrize(
    "payload",
    [
        {"body": "", "attachment_urls": []},
        {"body": "hi", "attachment_urls": ["https://evil.example/x.jpg"]},
        {"body": "hi", "attachment_urls": ["/media/../kyc_private/secret.jpg"]},
        {"body": "hi", "attachment_urls": ["/media/a.jpg"] * 5},
    ],
)
async def test_invalid_message_payloads(payload: dict[str, object]) -> None:
    from pydantic import ValidationError

    from app.schemas.chat import ChatMessageCreate

    with pytest.raises(ValidationError):
        ChatMessageCreate.model_validate(payload)


async def test_only_the_two_parties_can_access(db: AsyncSession) -> None:
    lister, _, application = await _accepted(db)
    stranger = await make_user(db)
    conv, _ = await chat_service.get_or_create(db, application.id, lister.id)

    with pytest.raises(AppError) as exc:
        await chat_service.get_or_create(db, application.id, stranger.id)
    assert exc.value.code == "CONVERSATION_ACCESS_DENIED"
    for call in (
        chat_service.get_conversation(db, conv.id, stranger.id),
        chat_service.list_messages(db, conv.id, stranger.id, page=1, limit=20),
        chat_service.send_message(db, conv.id, stranger.id, "hi"),
        chat_service.mark_read(db, conv.id, stranger.id),
    ):
        with pytest.raises(AppError) as exc:
            await call
        assert exc.value.code == "CONVERSATION_ACCESS_DENIED"

    with pytest.raises(AppError) as exc:
        await chat_service.get_conversation(db, uuid.uuid4(), lister.id)
    assert exc.value.code == "CONVERSATION_NOT_FOUND"


async def test_send_notifies_and_tracks_unread(db: AsyncSession) -> None:
    lister, provider, application = await _accepted(db)
    conv, _ = await chat_service.get_or_create(db, application.id, lister.id)

    await chat_service.send_message(db, conv.id, provider.id, "On my way")
    await chat_service.send_message(db, conv.id, provider.id, "10 minutes out")

    assert await chat_service.total_unread(db, lister.id) == 2
    assert await chat_service.total_unread(db, provider.id) == 0

    listed, total = await chat_service.list_conversations(db, lister.id, page=1, limit=20)
    assert total == 1
    assert listed[0].unread_count == 2
    assert listed[0].last_message is not None
    assert listed[0].last_message.body == "10 minutes out"

    messages, msg_total = await chat_service.list_messages(db, conv.id, lister.id, page=1, limit=20)
    assert msg_total == 2
    assert [m.body for m in messages] == ["10 minutes out", "On my way"]  # newest first

    notifications = (
        await db.scalars(
            select(Notification).where(
                Notification.user_id == lister.id,
                Notification.type == NotificationType.new_message,
            )
        )
    ).all()
    assert len(notifications) == 2
    assert notifications[0].title == "New message from Priya"
    assert all(not n.is_read for n in notifications)

    await chat_service.mark_read(db, conv.id, lister.id)
    assert await chat_service.total_unread(db, lister.id) == 0
    for n in notifications:
        await db.refresh(n)
    assert all(n.is_read for n in notifications)

    # Replying counts as reading; the provider now has one unread.
    await chat_service.send_message(db, conv.id, lister.id, "Great, thanks")
    assert await chat_service.total_unread(db, provider.id) == 1
    assert await chat_service.total_unread(db, lister.id) == 0


async def test_cancelled_work_makes_chat_read_only(db: AsyncSession) -> None:
    lister, provider, application = await _accepted(db)
    conv, _ = await chat_service.get_or_create(db, application.id, lister.id)
    await chat_service.send_message(db, conv.id, lister.id, "See you tomorrow")
    await application_service.cancel(db, application.id, lister.id)

    after = await chat_service.get_conversation(db, conv.id, provider.id)
    assert after.can_send is False
    with pytest.raises(AppError) as exc:
        await chat_service.send_message(db, conv.id, provider.id, "Why?")
    assert exc.value.code == "CHAT_CLOSED"
    # History stays readable.
    messages, _ = await chat_service.list_messages(db, conv.id, provider.id, page=1, limit=20)
    assert [m.body for m in messages] == ["See you tomorrow"]


async def test_chat_http_flow(client: AsyncClient, db: AsyncSession) -> None:
    lister, provider, application = await _accepted(db)

    first = await client.post(
        "/api/v1/conversations", json={"application_id": str(application.id)}, headers=_auth(lister)
    )
    assert first.status_code == 201
    conv_id = first.json()["id"]
    second = await client.post(
        "/api/v1/conversations",
        json={"application_id": str(application.id)},
        headers=_auth(provider),
    )
    assert second.status_code == 200
    assert second.json()["id"] == conv_id

    sent = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"body": "  Hello there  "},
        headers=_auth(provider),
    )
    assert sent.status_code == 201
    assert sent.json()["body"] == "Hello there"
    assert sent.json()["created_at"].endswith("Z")

    blank = await client.post(
        f"/api/v1/conversations/{conv_id}/messages", json={"body": "   "}, headers=_auth(provider)
    )
    assert blank.status_code == 422
    assert blank.json()["code"] == "VALIDATION_ERROR"

    unread = await client.get("/api/v1/conversations/unread-count", headers=_auth(lister))
    assert unread.json() == {"count": 1}

    page = await client.get(f"/api/v1/conversations/{conv_id}/messages", headers=_auth(lister))
    assert page.status_code == 200
    assert page.json()["total"] == 1

    read = await client.post(f"/api/v1/conversations/{conv_id}/read", headers=_auth(lister))
    assert read.status_code == 200
    unread = await client.get("/api/v1/conversations/unread-count", headers=_auth(lister))
    assert unread.json() == {"count": 0}

    stranger = await make_user(db)
    denied = await client.get(f"/api/v1/conversations/{conv_id}", headers=_auth(stranger))
    assert denied.status_code == 403
    assert denied.json()["code"] == "CONVERSATION_ACCESS_DENIED"
