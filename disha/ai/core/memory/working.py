from __future__ import annotations

import time
from typing import Any
import structlog

log = structlog.get_logger(__name__)

MAX_SLOTS = 8


class WorkingMemory:
    def __init__(self) -> None:
        self._slots: list[dict[str, Any]] = []
        log.debug("working_memory.initialized", max_slots=MAX_SLOTS)

    def add(self, item: dict[str, Any], relevance: float) -> None:
        relevance = max(0.0, min(1.0, relevance))

        entry: dict[str, Any] = {
            "content": item.get("content", item),
            "relevance": relevance,
            "source": item.get("source", "unknown"),
            "added_at": time.time(),
            "metadata": {
                k: v for k, v in item.items() if k not in ("content", "source")
            },
        }

        if len(self._slots) >= MAX_SLOTS:
            min_idx = min(
                range(len(self._slots)), key=lambda i: self._slots[i]["relevance"]
            )
            evicted = self._slots.pop(min_idx)
            log.debug(
                "working_memory.evicted",
                evicted_source=evicted.get("source"),
                evicted_relevance=round(evicted["relevance"], 3),
                new_item_source=entry["source"],
            )

        self._slots.append(entry)
        log.debug(
            "working_memory.added",
            source=entry["source"],
            relevance=round(relevance, 3),
            slot_count=len(self._slots),
        )

    def get_context_window(self) -> list[dict[str, Any]]:
        return sorted(self._slots, key=lambda s: s["relevance"], reverse=True)

    def clear_below(self, threshold: float) -> int:
        before = len(self._slots)
        self._slots = [s for s in self._slots if s["relevance"] >= threshold]
        removed = before - len(self._slots)
        if removed:
            log.debug(
                "working_memory.cleared_below_threshold",
                threshold=threshold,
                removed=removed,
                remaining=len(self._slots),
            )
        return removed

    def decay(self, factor: float = 0.95) -> None:
        for slot in self._slots:
            slot["relevance"] = max(0.0, slot["relevance"] * factor)
        log.debug("working_memory.decayed", factor=factor, slot_count=len(self._slots))

    def clear_all(self) -> None:
        self._slots.clear()
        log.debug("working_memory.cleared_all")

    def __len__(self) -> int:
        return len(self._slots)

    def __repr__(self) -> str:
        return f"WorkingMemory(slots={len(self._slots)}/{MAX_SLOTS})"

    def stats(self) -> dict[str, Any]:
        if not self._slots:
            return {
                "count": 0,
                "avg_relevance": 0.0,
                "max_relevance": 0.0,
                "min_relevance": 0.0,
            }
        relevances = [s["relevance"] for s in self._slots]
        return {
            "count": len(self._slots),
            "capacity": MAX_SLOTS,
            "avg_relevance": round(sum(relevances) / len(relevances), 4),
            "max_relevance": round(max(relevances), 4),
            "min_relevance": round(min(relevances), 4),
        }
