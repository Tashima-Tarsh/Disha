from __future__ import annotations

from .episodic import EpisodicMemory, EpisodicMemoryItem
from .semantic import SemanticMemory
from .working import WorkingMemory


class MemoryStore:
    def __init__(self) -> None:
        self.working = WorkingMemory()
        self.episodic = EpisodicMemory()
        self.semantic = SemanticMemory()

    def update_from_result(self, input_text: str, version: str, final_answer: str) -> None:
        self.working.update({"last_version": version, "last_answer": final_answer})
        self.episodic.add(
            EpisodicMemoryItem(
                input_text=input_text, version=version, final_answer=final_answer
            )
        )
        self.semantic.observe([version, *input_text.split()[:8]])

