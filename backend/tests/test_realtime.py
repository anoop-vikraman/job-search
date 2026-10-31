import json
import uuid
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token
from app.main import app
from app.services import realtime_service
from app.services.realtime_service import Hub


class FakeSocket:
    def __init__(self, fail: bool = False) -> None:
        self.sent: list[Any] = []
        self.fail = fail

    async def send_json(self, data: Any, mode: str = "text") -> None:
        if self.fail:
            raise RuntimeError("socket closed")
        self.sent.append(data)


async def test_hub_fans_out_to_named_users_only() -> None:
    hub = Hub()
    alice, bob, carol = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    a1, a2, b1, c1 = FakeSocket(), FakeSocket(), FakeSocket(), FakeSocket()
    for user, sock in ((alice, a1), (alice, a2), (bob, b1), (carol, c1)):
        hub.add(user, sock)
    conv = uuid.uuid4()

    payload = json.dumps({"t": "message", "c": str(conv), "u": [str(alice), str(bob)]})
    assert await hub.dispatch(payload) == 3
    expected = {"type": "message", "conversation_id": str(conv)}
    assert a1.sent == [expected] and a2.sent == [expected] and b1.sent == [expected]
    assert c1.sent == []


async def test_hub_drops_dead_sockets_and_ignores_garbage() -> None:
    hub = Hub()
    user = uuid.uuid4()
    dead, alive = FakeSocket(fail=True), FakeSocket()
    hub.add(user, dead)
    hub.add(user, alive)
    payload = json.dumps({"t": "read", "c": str(uuid.uuid4()), "u": [str(user)]})
    assert await hub.dispatch(payload) == 1
    assert hub.connected(user) == 1
    assert await hub.dispatch("not json") == 0
    assert await hub.dispatch(json.dumps({"t": "x"})) == 0


async def test_notify_runs_inside_the_transaction(db: AsyncSession) -> None:
    # pg_notify is transactional: rolled back here, so nothing is delivered.
    await realtime_service.notify(db, "message", uuid.uuid4(), [uuid.uuid4()])


@pytest.fixture
def ws_client() -> TestClient:
    # No `with`: the app lifespan (worker + listener) is not started for this client.
    return TestClient(app)


def test_ws_handshake_ping_and_registration(ws_client: TestClient) -> None:
    user_id = uuid.uuid4()
    token = create_access_token(str(user_id), "user")
    with ws_client.websocket_connect("/api/v1/ws") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert ws.receive_json() == {"type": "ready"}
        assert realtime_service.hub.connected(user_id) == 1
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}
    assert realtime_service.hub.connected(user_id) == 0


@pytest.mark.parametrize(
    "first",
    [
        {"type": "auth", "token": "garbage"},
        {"type": "hello"},
        {"type": "auth"},
    ],
)
def test_ws_rejects_bad_auth(ws_client: TestClient, first: dict[str, str]) -> None:
    with ws_client.websocket_connect("/api/v1/ws") as ws:
        ws.send_json(first)
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
    assert exc.value.code == 4401
