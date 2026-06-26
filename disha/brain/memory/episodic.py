from __future__ import annotations

from pydantic import BaseModel


class EpisodicMemoryItem(BaseModel):
    input_text: str
    version: str
    final_answer: str


class EpisodicMemory:
    def __init__(self) -> None:
        self.items: list[EpisodicMemoryItem] = []

    def add(self, item: EpisodicMemoryItem) -> None:
        self.items.append(item)
