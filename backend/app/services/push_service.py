"""Expo push delivery for committed notifications.

`notification_service.add()` queues a `PushMessage` on the session. When that session's
transaction commits, a background task looks up the recipients' device tokens and posts
them to the Expo Push API. Rolled-back transactions send nothing, and delivery failures are
logged, never raised into the request that created the notification.
"""

import asyncio
import logging
import uuid
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

import httpx
from sqlalchemy import delete, event, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import async_session_maker
from app.models.device_token import DeviceToken

logger = logging.getLogger(__name__)

BATCH_SIZE = 100  # Expo accepts at most 100 messages per request.
_PENDING_KEY = "pending_push"
# Strong references so in-flight tasks aren't garbage-collected.
_tasks: set[asyncio.Task[None]] = set()

Ticket = dict[str, Any]


@dataclass(frozen=True)
class PushMessage:
    user_id: uuid.UUID
    title: str
    body: str | None
    # Routing hints for tap-to-navigate (all values are strings).
    data: dict[str, str] = field(default_factory=dict)


def queue(db: AsyncSession, message: PushMessage) -> None:
    """Send `message` once the session's current transaction commits."""
    db.info.setdefault(_PENDING_KEY, []).append(message)


# ─── Session hooks ──────────────────────────────────────────────────────────


@event.listens_for(Session, "after_commit")
def _after_commit(session: Session) -> None:
    pending: list[PushMessage] = session.info.pop(_PENDING_KEY, [])
    if pending and settings.EXPO_PUSH_ENABLED:
        _schedule(pending)


@event.listens_for(Session, "after_rollback")
def _after_rollback(session: Session) -> None:
    session.info.pop(_PENDING_KEY, None)


def _schedule(messages: list[PushMessage]) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:  # committed outside an event loop (e.g. a sync script)
        logger.warning("Push skipped: no running event loop for %d message(s)", len(messages))
        return
    task = loop.create_task(deliver(messages))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


# ─── Delivery ───────────────────────────────────────────────────────────────


async def deliver(
    messages: Sequence[PushMessage],
    session_factory: Callable[[], AsyncSession] = async_session_maker,
) -> None:
    """Look up tokens, send, and drop tokens Expo reports as unregistered."""
    try:
        async with session_factory() as db:
            payloads = await build_payloads(db, messages)
            if not payloads:
                return
            async with httpx.AsyncClient(timeout=10.0) as client:
                tickets = await send(client, payloads)
            await prune_unregistered(db, payloads, tickets)
    except Exception:
        logger.exception("Push delivery failed for %d message(s)", len(messages))


async def build_payloads(db: AsyncSession, messages: Sequence[PushMessage]) -> list[Ticket]:
    """One Expo message per (notification, device token)."""
    user_ids = {m.user_id for m in messages}
    rows = await db.execute(
        select(DeviceToken.user_id, DeviceToken.token).where(DeviceToken.user_id.in_(user_ids))
    )
    tokens: dict[uuid.UUID, list[str]] = {}
    for user_id, token in rows.tuples():
        tokens.setdefault(user_id, []).append(token)

    payloads: list[Ticket] = []
    for m in messages:
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
    fails gets synthetic error tickets so the caller can keep tickets aligned.
    """
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"

    tickets: list[Ticket] = []
    for start in range(0, len(payloads), BATCH_SIZE):
        batch = list(payloads[start : start + BATCH_SIZE])
        batch_tickets: list[Ticket] | None = None
        for attempt in range(2):
            try:
                res = await client.post(settings.EXPO_PUSH_URL, json=batch, headers=headers)
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


async def prune_unregistered(
    db: AsyncSession, payloads: Sequence[Ticket], tickets: Sequence[Ticket]
) -> int:
    """Delete tokens whose ticket says DeviceNotRegistered. Returns the number removed."""
    dead = {
        p["to"]
        for p, t in zip(payloads, tickets, strict=False)
        if t.get("status") == "error"
        and (t.get("details") or {}).get("error") == "DeviceNotRegistered"
    }
    if not dead:
        return 0
    await db.execute(delete(DeviceToken).where(DeviceToken.token.in_(dead)))
    await db.commit()
    logger.info("Pruned %d unregistered push token(s)", len(dead))
    return len(dead)
