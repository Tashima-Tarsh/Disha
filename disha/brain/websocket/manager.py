from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self, send_timeout_seconds: float = 2.0) -> None:
        self._clients: set[WebSocket] = set()
        self.send_timeout_seconds = send_timeout_seconds

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._clients.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        dead_clients: list[WebSocket] = []
        message = json.dumps(payload)
        for client in list(self._clients):
            try:
                await asyncio.wait_for(
                    client.send_text(message),
                    timeout=self.send_timeout_seconds,
                )
            except Exception:
                dead_clients.append(client)
        for client in dead_clients:
            self.disconnect(client)
