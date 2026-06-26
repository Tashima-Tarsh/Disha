from __future__ import annotations

from typing import Any


class WorkingMemory:
    def __init__(self) -> None:
        self.context: dict[str, Any] = {}

    def update(self, values: dict[str, Any]) -> None:
        self.context.update(values)

