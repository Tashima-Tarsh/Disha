"""
WorkingMemory — Attention Buffer for the DISHA Cognitive Engine.

Implements the 8-slot working memory model inspired by cognitive science research
on human short-term memory capacity (Miller's Law). Each slot holds an active
attention item with a relevance score that decays over time.

Role in architecture:
    WorkingMemory acts as the 'attentional spotlight' — only the most relevant
    context items are kept active during a cognitive turn, preventing overload
    and forcing prioritization.
"""

from __future__ import annotations

import time
from typing import Any
import structlog

log = structlog.get_logger(__name__)

MAX_SLOTS = 8


class WorkingMemory:
    """
    Fixed-capacity attention buffer implementing a relevance-gated memory store.

    Maintains up to MAX_SLOTS (8) active memory items. When full, the lowest-
    relevance item is evicted to make room for new items. Relevance scores decay
    each turn to model forgetting and keep recent information prioritized.
    """

    def __init__(self) -> None:
        self._slots: list[dict[str, Any]] = []
        log.debug("working_memory.initialized", max_slots=MAX_SLOTS)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def add(self, item: dict[str, Any], relevance: float) -> None:
        """
        Add an item to working memory with the given relevance score.

        If the buffer is full (8 slots), evicts the item with the lowest
        relevance score before inserting the new one.

        Args:
            item:      Arbitrary dict describing the memory content.
            relevance: Float in [0, 1] indicating how relevant this item is.
        """
        relevance = max(0.0, min(1.0, relevance))

        entry: dict[str, Any] = {
            "content": item.get("content", item),
            "relevance": relevance,
            "source": item.get("source", "unknown"),
            "added_at": time.time(),
            "metadata": {k: v for k, v in item.items() if k not in ("content", "source")},
        }

        if len(self._slots) >= MAX_SLOTS:
            # Evict the slot with the lowest relevance
            min_idx = min(range(len(self._slots)), key=lambda i: self._slots[i]["relevance"])
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
        """
        Return all active slots sorted by relevance (highest first).

        Returns:
            List of slot dicts ordered from most to least relevant.
        """
        return sorted(self._slots, key=lambda s: s["relevance"], reverse=True)

    def clear_below(self, threshold: float) -> int:
        """
        Remove all slots whose relevance falls below the given threshold.

        Args:
            threshold: Minimum relevance to keep. Items below this are dropped.

        Returns:
            Number of items removed.
        """
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
        """
        Decay all relevance scores by the given multiplicative factor.

        Simulates the natural fading of attention over time. Called once
        per cognitive turn to ensure stale items gradually lose priority.

        Args:
            factor: Multiplicative decay factor in (0, 1]. Default 0.95.
        """
        for slot in self._slots:
            slot["relevance"] = max(0.0, slot["relevance"] * factor)
        log.debug("working_memory.decayed", factor=factor, slot_count=len(self._slots))

    def clear_all(self) -> None:
        """Remove all items from working memory."""
        self._slots.clear()
        log.debug("working_memory.cleared_all")

    def __len__(self) -> int:
        return len(self._slots)

    def __repr__(self) -> str:
        return f"WorkingMemory(slots={len(self._slots)}/{MAX_SLOTS})"

    # ------------------------------------------------------------------
    # Stats / introspection
    # ------------------------------------------------------------------

    def stats(self) -> dict[str, Any]:
        """Return a summary of current memory state."""
        if not self._slots:
            return {"count": 0, "avg_relevance": 0.0, "max_relevance": 0.0, "min_relevance": 0.0}
        relevances = [s["relevance"] for s in self._slots]
        return {
            "count": len(self._slots),
            "capacity": MAX_SLOTS,
            "avg_relevance": round(sum(relevances) / len(relevances), 4),
            "max_relevance": round(max(relevances), 4),
            "min_relevance": round(min(relevances), 4),
        }
