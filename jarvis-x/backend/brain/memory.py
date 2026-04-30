from __future__ import annotations

from database.store import SQLiteStore
from models.schemas import MemoryItem


class MemoryBrain:
    def __init__(self, store: SQLiteStore) -> None:
        self.store = store

    def remember(self, user_id: str, kind: str, content: str, metadata: dict | None = None) -> None:
        self.store.add_memory(
            MemoryItem(user_id=user_id, kind=kind, content=content, metadata=metadata or {})
        )

    def recall(self, user_id: str, limit: int = 8) -> list[dict]:
        return self.store.list_memory(user_id=user_id, limit=limit)
