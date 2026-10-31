"""Real-time chat events over WebSocket, fanned out through Postgres LISTEN/NOTIFY.

- `notify()` runs `pg_notify` inside the caller's transaction, so an event is delivered
  only if the message/read actually commits, and every API process receives it.
- Each process runs `listen_forever()` (started in the app lifespan) and forwards events
  to the WebSockets of the users named in the event.
- Events carry ids only (`{"type": "message"|"read", "conversation_id"}`); clients refetch
  through the normal, authorized REST endpoints, so nothing private travels over NOTIFY.
"""

import asyncio
import json
import logging
import uuid
from collections.abc import Iterable
from typing import Any, Protocol

import asyncpg
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL = "tweak_events"


class EventSocket(Protocol):
    async def send_json(self, data: Any, mode: str = "text") -> None: ...


async def notify(
    db: AsyncSession, kind: str, conversation_id: uuid.UUID, user_ids: Iterable[uuid.UUID]
) -> None:
    """Queue an event for delivery when the caller's transaction commits."""
    if not settings.REALTIME_ENABLED:
        return
    payload = json.dumps(
        {"t": kind, "c": str(conversation_id), "u": [str(u) for u in user_ids]},
        separators=(",", ":"),
    )
    await db.execute(select(func.pg_notify(CHANNEL, payload)))


class Hub:
    """This process's connected sockets, by user."""

    def __init__(self) -> None:
        self._sockets: dict[uuid.UUID, set[EventSocket]] = {}

    def add(self, user_id: uuid.UUID, socket: EventSocket) -> None:
        self._sockets.setdefault(user_id, set()).add(socket)

    def remove(self, user_id: uuid.UUID, socket: EventSocket) -> None:
        sockets = self._sockets.get(user_id)
        if sockets is not None:
            sockets.discard(socket)
            if not sockets:
                del self._sockets[user_id]

    def connected(self, user_id: uuid.UUID) -> int:
        return len(self._sockets.get(user_id, ()))

    async def dispatch(self, raw: str) -> int:
        """Forward one NOTIFY payload to the named users. Returns sockets reached."""
        try:
            event = json.loads(raw)
            message = {"type": str(event["t"]), "conversation_id": str(event["c"])}
            user_ids = [uuid.UUID(u) for u in event["u"]]
        except (ValueError, KeyError, TypeError):
            logger.warning("Ignoring malformed realtime payload: %.200s", raw)
            return 0
        reached = 0
        for user_id in user_ids:
            for socket in list(self._sockets.get(user_id, ())):
                try:
                    await socket.send_json(message)
                    reached += 1
                except Exception:  # noqa: BLE001 - a dead socket must not stop the fan-out
                    self.remove(user_id, socket)
        return reached


hub = Hub()
_tasks: set[asyncio.Task[int]] = set()


def _on_notify(_conn: object, _pid: int, _channel: str, payload: str) -> None:
    task = asyncio.get_running_loop().create_task(hub.dispatch(payload))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


async def listen_forever(stop: asyncio.Event) -> None:
    """Hold a LISTEN connection, reconnecting if it drops."""
    dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
    while not stop.is_set():
        conn: asyncpg.Connection | None = None
        try:
            conn = await asyncpg.connect(dsn)
            await conn.add_listener(CHANNEL, _on_notify)
            logger.info("Realtime listener connected")
            while not stop.is_set() and not conn.is_closed():
                try:
                    await asyncio.wait_for(stop.wait(), timeout=15)
                except TimeoutError:
                    pass
        except Exception:
            logger.exception("Realtime listener error; reconnecting")
            try:
                await asyncio.wait_for(stop.wait(), timeout=3)
            except TimeoutError:
                pass
        finally:
            if conn is not None and not conn.is_closed():
                await conn.close()
