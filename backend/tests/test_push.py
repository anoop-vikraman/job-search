import json
import uuid

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.models.device_token import DeviceToken
from app.models.enums import NotificationType, PricingModel, TweakStatus, TweakType
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate
from app.services import application_service, chat_service, notification_service, push_service
from app.services.push_service import PushMessage
from tests.conftest import make_user


def _token(n: int) -> str:
    return f"ExponentPushToken[test{n:04d}]"


async def _device(db: AsyncSession, user: User, n: int) -> DeviceToken:
    device = DeviceToken(user_id=user.id, token=_token(n), platform="android")
    db.add(device)
    await db.flush()
    return device


@pytest.fixture
def scheduled(monkeypatch: pytest.MonkeyPatch) -> list[PushMessage]:
    """Enable push and capture what would be delivered after each commit."""
    captured: list[PushMessage] = []
    monkeypatch.setattr(settings, "EXPO_PUSH_ENABLED", True)
    monkeypatch.setattr(push_service, "_schedule", captured.extend)
    return captured


async def _no_sleep(_: float) -> None:
    return None


# ─── Commit / rollback hooks ────────────────────────────────────────────────


async def test_notification_push_sent_only_after_commit(
    db: AsyncSession, scheduled: list[PushMessage]
) -> None:
    lister = await make_user(db)
    provider = await make_user(db)
    tweak = Tweak(
        created_by_user_id=lister.id,
        title="Fix sink",
        description="d",
        category="Plumbing",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        price_minor=1000,
    )
    db.add(tweak)
    await db.flush()
    assert scheduled == []

    await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())

    assert len(scheduled) == 1
    msg = scheduled[0]
    assert msg.user_id == lister.id
    assert msg.title == "New application"
    assert msg.data["type"] == "application_received"
    assert msg.data["tweak_id"] == str(tweak.id)
    assert uuid.UUID(msg.data["notification_id"])


async def test_rolled_back_notification_is_not_pushed(
    db: AsyncSession, scheduled: list[PushMessage]
) -> None:
    user = await make_user(db)
    notification_service.add(db, user.id, NotificationType.system, "Will be rolled back")
    await db.rollback()
    await db.commit()
    assert scheduled == []


async def test_disabled_push_schedules_nothing(
    db: AsyncSession, scheduled: list[PushMessage], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "EXPO_PUSH_ENABLED", False)
    user = await make_user(db)
    notification_service.add(db, user.id, NotificationType.system, "Hello")
    await db.commit()
    assert scheduled == []


async def test_chat_push_carries_conversation_id(
    db: AsyncSession, scheduled: list[PushMessage]
) -> None:
    lister = await make_user(db, balance_minor=10000)
    provider = await make_user(db)
    tweak = Tweak(
        created_by_user_id=lister.id,
        title="Paint",
        description="d",
        category="Painting",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        price_minor=5000,
    )
    db.add(tweak)
    await db.flush()
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    conv, _ = await chat_service.get_or_create(db, app.id, lister.id)
    scheduled.clear()

    await chat_service.send_message(db, conv.id, provider.id, "Hi")

    assert len(scheduled) == 1
    assert scheduled[0].user_id == lister.id
    assert scheduled[0].data["type"] == "new_message"
    assert scheduled[0].data["conversation_id"] == str(conv.id)


# ─── Delivery ───────────────────────────────────────────────────────────────


async def test_build_payloads_fans_out_per_device(db: AsyncSession) -> None:
    alice = await make_user(db)
    bob = await make_user(db)
    await _device(db, alice, 1)
    await _device(db, alice, 2)
    messages = [
        PushMessage(user_id=alice.id, title="A", body="body", data={"type": "system"}),
        PushMessage(user_id=bob.id, title="B", body=None),  # no devices
    ]
    payloads = await push_service.build_payloads(db, messages)
    assert sorted(p["to"] for p in payloads) == [_token(1), _token(2)]
    assert all(p["title"] == "A" and p["body"] == "body" for p in payloads)
    assert payloads[0]["data"] == {"type": "system"}


async def test_send_batches_by_100_and_retries_server_errors() -> None:
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        batch = json.loads(request.content)
        calls.append(len(batch))
        if len(calls) == 1:
            return httpx.Response(503, text="busy")
        return httpx.Response(200, json={"data": [{"status": "ok", "id": "x"} for _ in batch]})

    payloads = [{"to": _token(i), "title": "t"} for i in range(150)]
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        tickets = await push_service.send(client, payloads, sleep=_no_sleep)

    assert calls == [100, 100, 50]  # first batch retried once after the 503
    assert len(tickets) == 150
    assert all(t["status"] == "ok" for t in tickets)


async def test_send_does_not_retry_client_errors() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(400, json={"errors": [{"code": "VALIDATION_ERROR"}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        tickets = await push_service.send(client, [{"to": _token(1)}], sleep=_no_sleep)
    assert calls == 1
    assert tickets == [{"status": "error", "details": {"error": "RequestFailed"}}]


async def test_prune_removes_unregistered_tokens(db: AsyncSession) -> None:
    user = await make_user(db)
    await _device(db, user, 1)
    await _device(db, user, 2)
    payloads = [{"to": _token(1)}, {"to": _token(2)}]
    tickets = [
        {"status": "error", "details": {"error": "DeviceNotRegistered"}},
        {"status": "ok", "id": "abc"},
    ]
    assert await push_service.prune_unregistered(db, payloads, tickets) == 1
    remaining = (
        await db.scalars(select(DeviceToken.token).where(DeviceToken.user_id == user.id))
    ).all()
    assert remaining == [_token(2)]


# ─── Device endpoints ───────────────────────────────────────────────────────


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), 'user')}"}


async def test_device_registration_flow(client: AsyncClient, db: AsyncSession) -> None:
    alice = await make_user(db)
    bob = await make_user(db)
    body = {"token": _token(7), "platform": "ios"}

    first = await client.post("/api/v1/devices", json=body, headers=_auth(alice))
    assert first.status_code == 201
    again = await client.post("/api/v1/devices", json=body, headers=_auth(alice))
    assert again.status_code == 200
    assert again.json()["id"] == first.json()["id"]

    # Same install, different account: the token follows the signed-in user.
    moved = await client.post("/api/v1/devices", json=body, headers=_auth(bob))
    assert moved.status_code == 200
    device = await db.scalar(select(DeviceToken).where(DeviceToken.token == _token(7)))
    assert device is not None
    await db.refresh(device)
    assert device.user_id == bob.id

    bad = await client.post(
        "/api/v1/devices", json={"token": "not-a-token", "platform": "ios"}, headers=_auth(bob)
    )
    assert bad.status_code == 422

    # Alice no longer owns it; only Bob can remove it.
    path = f"/api/v1/devices/{_token(7)}"
    assert (await client.delete(path, headers=_auth(alice))).status_code == 404
    assert (await client.delete(path, headers=_auth(bob))).status_code == 204
    assert (await client.delete(path, headers=_auth(bob))).status_code == 404
