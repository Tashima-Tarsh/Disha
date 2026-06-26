from __future__ import annotations

import json

from .event_schema import AuditEvent
from .hash_chain import chain_hash


class AuditLedger:
    def __init__(self) -> None:
        self._events: list[tuple[AuditEvent, str]] = []
        self._latest_hash = "GENESIS"

    def append(self, event: AuditEvent) -> AuditEvent:
        payload = json.dumps(event.model_dump(mode="json"), sort_keys=True)
        self._latest_hash = chain_hash(self._latest_hash, payload)
        self._events.append((event, self._latest_hash))
        return event

    def export(self) -> list[dict[str, object]]:
        return [
            {"event": json.loads(event.model_dump_json()), "hash": event_hash}
            for event, event_hash in self._events
        ]

    @property
    def latest_hash(self) -> str:
        return self._latest_hash
