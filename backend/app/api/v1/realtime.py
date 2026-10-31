import asyncio
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.services.realtime_service import hub

router = APIRouter(tags=["realtime"])

AUTH_TIMEOUT_SECONDS = 10
UNAUTHORIZED = 4401  # app-specific close code


@router.websocket("/ws")
async def events(websocket: WebSocket) -> None:
    """Real-time chat events.

    Protocol: connect, then send `{"type": "auth", "token": "<access token>"}` within 10 s
    (tokens stay out of URLs and logs). The server replies `{"type": "ready"}` and then
    pushes `{"type": "message"|"read", "conversation_id"}`. Send `{"type": "ping"}` to get
    `{"type": "pong"}`. Invalid auth closes with code 4401.
    """
    await websocket.accept()
    try:
        first = json.loads(
            await asyncio.wait_for(websocket.receive_text(), timeout=AUTH_TIMEOUT_SECONDS)
        )
        claims = decode_token(str(first.get("token", ""))) if first.get("type") == "auth" else None
        if claims is None or claims.get("type") != "access":
            raise ValueError("bad token")
        user_id = uuid.UUID(str(claims["sub"]))
    except (TimeoutError, ValueError, KeyError, AttributeError, WebSocketDisconnect):
        await websocket.close(code=UNAUTHORIZED)
        return

    hub.add(user_id, websocket)
    try:
        await websocket.send_json({"type": "ready"})
        while True:
            text = await websocket.receive_text()
            try:
                kind = json.loads(text).get("type")
            except (ValueError, AttributeError):
                continue
            if kind == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        hub.remove(user_id, websocket)
