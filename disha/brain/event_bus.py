from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

Subscriber = Callable[[dict[str, Any]], Awaitable[None]]


class EventBus:
    def __init__(self, publish_timeout_seconds: float = 3.0) -> None:
        self._subscribers: dict[str, list[Subscriber]] = defaultdict(list)
        self.publish_timeout_seconds = publish_timeout_seconds

    def subscribe(self, topic: str, subscriber: Subscriber) -> None:
        self._subscribers[topic].append(subscriber)

    async def publish(self, topic: str, payload: dict[str, Any]) -> None:
        tasks = [
            asyncio.wait_for(subscriber(payload), timeout=self.publish_timeout_seconds)
            for subscriber in self._subscribers.get(topic, [])
        ]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
