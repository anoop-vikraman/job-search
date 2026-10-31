"""Expo push delivery for notifications.

`notification_service.add()` calls `queue()`, which enqueues a durable `push` job in the same
transaction as the notification row: rolled-back work sends nothing, and a crash between
commit and delivery doesn't lose the push. The worker runs the job, skipping users who muted
that notification type, and records Expo tickets. A periodic task checks delivery receipts
~15 minutes later and removes tokens Expo reports as `DeviceNotRegistered`.
"""

import asyncio
import logging
import uuid
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device_token import DeviceToken
from app.models.enums import NotificationType
from app.models.notification_preference import NotificationPreference
from app.models.push_ticket import PushTicket
from app.services import job_service

logger = logging.getLogger(__name__)

BATCH_SIZE = 100  # Expo accepts at most 100 messages per request.
RECEIPT_BATCH = 1000  # ...and at most 1000 receipt ids.
RECEIPT_DELAY = timedelta(minutes=15)
RECEIPT_EXPIRY = timedelta(hours=24)  # Expo drops receipts after a day.

Ticket = dict[str, Any]

# Tests swap this for an httpx.MockTransport.
transport: httpx.AsyncBaseTransport | None = None


@dataclass(frozen=True)
class PushMessage:
    user_id: uuid.UUID
    title: str
    body: str | None
    # Routing hints for tap-to-navigate (all values are strings). `type` drives mute settings.
    data: dict[str, str] = field(default_factory=dict)


def queue(db: AsyncSession, message: PushMessage) -> None:
    """Send `message` after the caller's transaction commits (durable job)."""
    if not settings.EXPO_PUSH_ENABLED:
        return
    job_service.enqueue(
        db,
        "push",
        {
            "user_id": str(message.user_id),
            "title": message.title,
            "body": message.body,
            "data": message.data,
        },
    )


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"
    return headers


# ─── Job ────────────────────────────────────────────────────────────────────


@job_service.handler("push")
async def run_push_job(db: AsyncSession, payload: dict[str, Any]) -> None:
    message = PushMessage(
        user_id=uuid.UUID(payload["user_id"]),
        title=payload["title"],
        body=payload.get("body"),
        data=dict(payload.get("data") or {}),
    )
    payloads = await build_payloads(db, [message])
    if not payloads:
        return
    async with httpx.AsyncClient(timeout=10.0, transport=transport) as client:
        tickets = await send(client, payloads)
    if all((t.get("details") or {}).get("error") == "RequestFailed" for t in tickets):
        raise RuntimeError("Expo push request failed; will retry")
    await record_tickets(db, payloads, tickets)
    await prune_unregistered(db, payloads, tickets)


async def build_payloads(db: AsyncSession, messages: Sequence[PushMessage]) -> list[Ticket]:
    """One Expo message per (notification, device token), minus muted notification types."""
    user_ids = {m.user_id for m in messages}
    rows = await db.execute(
        select(DeviceToken.user_id, DeviceToken.token).where(DeviceToken.user_id.in_(user_ids))
    )
    tokens: dict[uuid.UUID, list[str]] = {}
    for user_id, token in rows.tuples():
        tokens.setdefault(user_id, []).append(token)

    muted = {
        (user_id, type_.value)
        for user_id, type_ in (
            await db.execute(
                select(NotificationPreference.user_id, NotificationPreference.type).where(
                    NotificationPreference.user_id.in_(user_ids),
                    NotificationPreference.push_enabled.is_(False),
                )
            )
        ).tuples()
    }

    payloads: list[Ticket] = []
    for m in messages:
        if (m.user_id, m.data.get("type", "")) in muted:
            continue
        for token in tokens.get(m.user_id, []):
            payload: Ticket = {
                "to": token,
                "title": m.title,
                "sound": "default",
                "priority": "high",
                "data": m.data,
            }
            if m.body:
                payload["body"] = m.body
            payloads.append(payload)
    return payloads


async def send(
    client: httpx.AsyncClient,
    payloads: Sequence[Ticket],
    *,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> list[Ticket]:
    """POST in batches of 100. Returns one ticket per payload, in order.

    429/5xx/network errors are retried once after a short backoff; a batch that still
    fails gets synthetic `RequestFailed` tickets so tickets stay aligned with payloads.
    """
    tickets: list[Ticket] = []
    for start in range(0, len(payloads), BATCH_SIZE):
        batch = list(payloads[start : start + BATCH_SIZE])
        batch_tickets: list[Ticket] | None = None
        for attempt in range(2):
            try:
                res = await client.post(settings.EXPO_PUSH_URL, json=batch, headers=_headers())
            except httpx.HTTPError as exc:
                logger.warning("Expo push request error (attempt %d): %s", attempt + 1, exc)
            else:
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    batch_tickets = data if isinstance(data, list) else [data]
                    break
                logger.warning(
                    "Expo push HTTP %s (attempt %d): %s",
                    res.status_code,
                    attempt + 1,
                    res.text[:500],
                )
                if res.status_code != 429 and res.status_code < 500:
                    break  # payload/credential problem; retrying won't help
            if attempt == 0:
                await sleep(1.0)
        if batch_tickets is None or len(batch_tickets) != len(batch):
            batch_tickets = [
                {"status": "error", "details": {"error": "RequestFailed"}} for _ in batch
            ]
        tickets.extend(batch_tickets)
    return tickets


async def record_tickets(
    db: AsyncSession, payloads: Sequence[Ticket], tickets: Sequence[Ticket]
) -> int:
    """Store ok tickets so their receipts can be checked later."""
    count = 0
    for p, t in zip(payloads, tickets, strict=False):
        if t.get("status") == "ok" and t.get("id"):
            db.add(PushTicket(ticket_id=str(t["id"]), token=p["to"]))
            count += 1
    await db.commit()
    return count


def _dead_tokens(pairs: Sequence[tuple[str, Ticket]]) -> set[str]:
    return {
        token
        for token, t in pairs
        if t.get("status") == "error"
        and (t.get("details") or {}).get("error") == "DeviceNotRegistered"
    }


async def _delete_tokens(db: AsyncSession, dead: set[str]) -> int:
    if not dead:
        return 0
    await db.execute(delete(DeviceToken).where(DeviceToken.token.in_(dead)))
    await db.commit()
    logger.info("Pruned %d unregistered push token(s)", len(dead))
    return len(dead)


async def prune_unregistered(
    db: AsyncSession, payloads: Sequence[Ticket], tickets: Sequence[Ticket]
) -> int:
    """Delete tokens whose ticket says DeviceNotRegistered. Returns the number removed."""
    pairs = [(p["to"], t) for p, t in zip(payloads, tickets, strict=False)]
    return await _delete_tokens(db, _dead_tokens(pairs))


# ─── Receipts ───────────────────────────────────────────────────────────────


async def check_receipts(db: AsyncSession, client: httpx.AsyncClient | None = None) -> int:
    """Fetch receipts for tickets older than 15 min; prune dead tokens. Returns tokens removed."""
    now = datetime.now(UTC)
    # Receipts are gone after 24h; drop tickets we can no longer check.
    await db.execute(delete(PushTicket).where(PushTicket.created_at < now - RECEIPT_EXPIRY))
    tickets = list(
        await db.scalars(
            select(PushTicket)
            .where(PushTicket.created_at <= now - RECEIPT_DELAY)
            .order_by(PushTicket.created_at)
            .limit(RECEIPT_BATCH)
        )
    )
    if not tickets:
        await db.commit()
        return 0

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=15.0, transport=transport)
    try:
        res = await http.post(
            settings.EXPO_RECEIPTS_URL,
            json={"ids": [t.ticket_id for t in tickets]},
            headers=_headers(),
        )
    finally:
        if own_client:
            await http.aclose()
    if res.status_code != 200:
        logger.warning("Expo receipts HTTP %s: %s", res.status_code, res.text[:300])
        await db.commit()
        return 0

    receipts: dict[str, Ticket] = res.json().get("data") or {}
    pairs = [(t.token, receipts[t.ticket_id]) for t in tickets if t.ticket_id in receipts]
    # Receipts not yet available stay for the next run; checked ones are done.
    checked = [t.id for t in tickets if t.ticket_id in receipts]
    if checked:
        await db.execute(delete(PushTicket).where(PushTicket.id.in_(checked)))
    await db.commit()
    return await _delete_tokens(db, _dead_tokens(pairs))


@job_service.periodic("push_receipts", 300)
async def _push_receipts_task(db: AsyncSession) -> None:
    if settings.EXPO_PUSH_ENABLED:
        await check_receipts(db)


# ─── Preferences ────────────────────────────────────────────────────────────


async def get_preferences(db: AsyncSession, user_id: uuid.UUID) -> dict[NotificationType, bool]:
    """Push on/off for every notification type (default on)."""
    prefs: dict[NotificationType, bool] = {t: True for t in NotificationType}
    rows = await db.execute(
        select(NotificationPreference.type, NotificationPreference.push_enabled).where(
            NotificationPreference.user_id == user_id
        )
    )
    for type_, enabled in rows.tuples():
        prefs[type_] = enabled
    return prefs


async def set_preferences(
    db: AsyncSession, user_id: uuid.UUID, updates: dict[NotificationType, bool]
) -> dict[NotificationType, bool]:
    existing = {
        p.type: p
        for p in await db.scalars(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
    }
    for type_, enabled in updates.items():
        if type_ in existing:
            existing[type_].push_enabled = enabled
        else:
            db.add(NotificationPreference(user_id=user_id, type=type_, push_enabled=enabled))
    await db.commit()
    return await get_preferences(db, user_id)
