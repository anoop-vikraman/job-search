import json
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.models.device_token import DeviceToken
from app.models.enums import NotificationType, PricingModel, TweakStatus, TweakType
from app.models.job import Job
from app.models.push_ticket import PushTicket
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate
from app.services import application_service, chat_service, notification_service, push_service
from tests.conftest import make_user


def _token(n: int) -> str:
    return f"ExponentPushToken[test{n:04d}]"


async def _device(db: AsyncSession, user: User, n: int) -> DeviceToken:
    device = DeviceToken(user_id=user.id, token=_token(n), platform="android")
    db.add(device)
    await db.flush()
    return device


async def _push_jobs(db: AsyncSession, user: User) -> list[Job]:
    jobs = await db.scalars(select(Job).where(Job.kind == "push"))
    return [j for j in jobs if j.payload["user_id"] == str(user.id)]


@pytest.fixture
def push_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "EXPO_PUSH_ENABLED", True)


async def _tweak(db: AsyncSession, owner: User) -> Tweak:
    tweak = Tweak(
        created_by_user_id=owner.id,
        title="Fix sink",
        description="d",
        category="Plumbing",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        price_minor=5000,
    )
    db.add(tweak)
    await db.flush()
    return tweak


async def _no_sleep(_: float) -> None:
    return None


# ─── Queueing ───────────────────────────────────────────────────────────────


async def test_notification_enqueues_durable_push_job(db: AsyncSession, push_on: None) -> None:
    lister = await make_user(db)
    provider = await make_user(db)
    tweak = await _tweak(db, lister)

    await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())

    jobs = await _push_jobs(db, lister)
    assert len(jobs) == 1
    payload = jobs[0].payload
    assert payload["title"] == "New application"
    assert payload["data"]["type"] == "application_received"
    assert payload["data"]["tweak_id"] == str(tweak.id)
    assert uuid.UUID(payload["data"]["notification_id"])


async def test_rolled_back_notification_has_no_job(db: AsyncSession, push_on: None) -> None:
    user = await make_user(db)
    await db.commit()
    notification_service.add(db, user.id, NotificationType.system, "Will be rolled back")
    await db.rollback()
    assert await _push_jobs(db, user) == []


async def test_disabled_push_enqueues_nothing(db: AsyncSession) -> None:
    user = await make_user(db)
    notification_service.add(db, user.id, NotificationType.system, "Hello")
    await db.commit()
    assert await _push_jobs(db, user) == []


async def test_chat_push_carries_conversation_id(db: AsyncSession, push_on: None) -> None:
    lister = await make_user(db, balance_minor=10000)
    provider = await make_user(db)
    tweak = await _tweak(db, lister)
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    conv, _ = await chat_service.get_or_create(db, app.id, lister.id)

    await chat_service.send_message(db, conv.id, provider.id, "Hi")

    chat_jobs = [
        j for j in await _push_jobs(db, lister) if j.payload["data"]["type"] == "new_message"
    ]
    assert len(chat_jobs) == 1
    assert chat_jobs[0].payload["data"]["conversation_id"] == str(conv.id)


# ─── The push job ───────────────────────────────────────────────────────────


async def test_push_job_sends_records_tickets_and_prunes(
    db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await make_user(db)
    await _device(db, user, 1)
    await _device(db, user, 2)
    sent: list[list[dict[str, object]]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        batch = json.loads(request.content)
        sent.append(batch)
        return httpx.Response(
            200,
            json={
                "data": [
                    {"status": "ok", "id": f"tkt-{uuid.uuid4().hex[:6]}"},
                    {"status": "error", "details": {"error": "DeviceNotRegistered"}},
                ]
            },
        )

    monkeypatch.setattr(push_service, "transport", httpx.MockTransport(handler))
    await push_service.run_push_job(
        db,
        {"user_id": str(user.id), "title": "Hi", "body": "there", "data": {"type": "system"}},
    )

    assert [m["to"] for m in sent[0]] == [_token(1), _token(2)]
    tokens = (
        await db.scalars(select(DeviceToken.token).where(DeviceToken.user_id == user.id))
    ).all()
    assert tokens == [_token(1)]  # the dead one was pruned
    tickets = (await db.scalars(select(PushTicket).where(PushTicket.token == _token(1)))).all()
    assert len(tickets) == 1


async def test_push_job_raises_for_retry_when_expo_is_down(
    db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await make_user(db)
    await _device(db, user, 3)

    async def failing_send(
        _: httpx.AsyncClient, payloads: list[dict[str, object]]
    ) -> list[dict[str, object]]:
        # What send() returns after its own retry when Expo keeps answering 5xx.
        return [{"status": "error", "details": {"error": "RequestFailed"}} for _ in payloads]

    monkeypatch.setattr(push_service, "send", failing_send)
    with pytest.raises(RuntimeError):
        await push_service.run_push_job(
            db, {"user_id": str(user.id), "title": "t", "body": None, "data": {"type": "system"}}
        )


async def test_muted_types_are_skipped(db: AsyncSession) -> None:
    user = await make_user(db)
    await _device(db, user, 4)
    await push_service.set_preferences(db, user.id, {NotificationType.new_message: False})

    muted = push_service.PushMessage(user.id, "m", None, {"type": "new_message"})
    allowed = push_service.PushMessage(user.id, "a", None, {"type": "system"})
    payloads = await push_service.build_payloads(db, [muted, allowed])
    assert [p["title"] for p in payloads] == ["a"]


# ─── Batching / receipts ────────────────────────────────────────────────────


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

    assert calls == [100, 100, 50]
    assert len(tickets) == 150 and all(t["status"] == "ok" for t in tickets)


async def test_send_does_not_retry_client_errors() -> None:
    calls = 0

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(400, json={"errors": [{"code": "VALIDATION_ERROR"}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        tickets = await push_service.send(client, [{"to": _token(1)}], sleep=_no_sleep)
    assert calls == 1
    assert tickets == [{"status": "error", "details": {"error": "RequestFailed"}}]


async def test_receipts_prune_dead_tokens_and_clear_checked_tickets(db: AsyncSession) -> None:
    user = await make_user(db)
    await _device(db, user, 5)
    await _device(db, user, 6)
    old = datetime.now(UTC) - timedelta(minutes=20)
    t_dead = f"r-{uuid.uuid4().hex[:6]}"
    t_ok = f"r-{uuid.uuid4().hex[:6]}"
    t_pending = f"r-{uuid.uuid4().hex[:6]}"
    t_fresh = f"r-{uuid.uuid4().hex[:6]}"
    db.add_all(
        [
            PushTicket(ticket_id=t_dead, token=_token(5), created_at=old),
            PushTicket(ticket_id=t_ok, token=_token(6), created_at=old),
            PushTicket(ticket_id=t_pending, token=_token(6), created_at=old),
            PushTicket(ticket_id=t_fresh, token=_token(6), created_at=datetime.now(UTC)),
        ]
    )
    await db.flush()
    asked: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        ids = json.loads(request.content)["ids"]
        asked.extend(ids)
        receipts = {
            t_dead: {"status": "error", "details": {"error": "DeviceNotRegistered"}},
            t_ok: {"status": "ok"},
        }
        return httpx.Response(200, json={"data": {k: v for k, v in receipts.items() if k in ids}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        removed = await push_service.check_receipts(db, client)

    assert removed == 1
    assert t_fresh not in asked  # too new to check
    remaining = set((await db.scalars(select(PushTicket.ticket_id))).all())
    assert t_pending in remaining and t_fresh in remaining
    assert t_dead not in remaining and t_ok not in remaining
    tokens = (
        await db.scalars(select(DeviceToken.token).where(DeviceToken.user_id == user.id))
    ).all()
    assert tokens == [_token(6)]


# ─── Endpoints ──────────────────────────────────────────────────────────────


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

    path = f"/api/v1/devices/{_token(7)}"
    assert (await client.delete(path, headers=_auth(alice))).status_code == 404
    assert (await client.delete(path, headers=_auth(bob))).status_code == 204
    assert (await client.delete(path, headers=_auth(bob))).status_code == 404


async def test_preferences_endpoints(client: AsyncClient, db: AsyncSession) -> None:
    user = await make_user(db)
    initial = await client.get("/api/v1/notifications/preferences", headers=_auth(user))
    assert initial.status_code == 200
    assert all(initial.json()["push"].values())

    updated = await client.put(
        "/api/v1/notifications/preferences",
        json={"push": {"new_message": False}},
        headers=_auth(user),
    )
    assert updated.status_code == 200
    push = updated.json()["push"]
    assert push["new_message"] is False and push["system"] is True

    bad = await client.put(
        "/api/v1/notifications/preferences", json={"push": {"bogus": False}}, headers=_auth(user)
    )
    assert bad.status_code == 422
