from __future__ import annotations


class SemanticMemory:
    def __init__(self) -> None:
        self.entities: dict[str, int] = {}

    def observe(self, terms: list[str]) -> None:
        for term in terms:
            normalized = term.strip().lower()
            if normalized:
                self.entities[normalized] = self.entities.get(normalized, 0) + 1

