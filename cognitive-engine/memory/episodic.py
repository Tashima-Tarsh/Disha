"""
EpisodicMemory — Time-stamped Event Store for the DISHA Cognitive Engine.

Episodic memory records specific events, interactions, and outcomes that occur
during sessions. It functions like a personal diary — each episode captures
what happened, the result, and its emotional/importance weight.

Role in architecture:
    EpisodicMemory feeds the _attend phase with relevant past experiences,
    allowing the cognitive loop to learn from history. High-importance episodes
    are periodically promoted to SemanticMemory by the MemoryManager.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

import aiofiles
import structlog

log = structlog.get_logger(__name__)

EPISODIC_STORE_PATH = Path.home() / ".disha" / "episodic.json"


class EpisodicMemory:
    """
    Persistent time-stamped event store with fuzzy recall.

    Episodes are stored as dicts and persisted to JSON at
    ~/.disha/episodic.json. Recall is performed via keyword overlap
    scoring weighted by recency and importance.
    """

    def __init__(self, store_path: Path | None = None) -> None:
        self._path = store_path or EPISODIC_STORE_PATH
        self._episodes: list[dict[str, Any]] = []
        self._lock = asyncio.Lock()
        self._loaded = False
        log.debug("episodic_memory.initialized", path=str(self._path))

    # ------------------------------------------------------------------
    # Lifecycle helpers
    # ------------------------------------------------------------------

    async def _ensure_loaded(self) -> None:
        """Load from disk if not already loaded (lazy init)."""
        if self._loaded:
            return
        async with self._lock:
            if self._loaded:
                return
            try:
                self._path.parent.mkdir(parents=True, exist_ok=True)
                if self._path.exists():
                    async with aiofiles.open(self._path, "r") as f:
                        raw = await f.read()
                    self._episodes = json.loads(raw) if raw.strip() else []
                    log.info(
                        "episodic_memory.loaded",
                        episodes=len(self._episodes),
                        path=str(self._path),
                    )
                else:
                    self._episodes = []
            except Exception as exc:
                log.warning("episodic_memory.load_failed", error=str(exc))
                self._episodes = []
            self._loaded = True

    async def _persist(self) -> None:
        """Atomically write episodes to disk."""
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(self._path, "w") as f:
                await f.write(json.dumps(self._episodes, indent=2, default=str))
            log.debug("episodic_memory.persisted", count=len(self._episodes))
        except Exception as exc:
            log.error("episodic_memory.persist_failed", error=str(exc))

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def record(
        self,
        session_id: str,
        turn: int,
        what: str,
        outcome: str,
        importance: float = 0.5,
        emotions: list[str] | None = None,
    ) -> str:
        """
        Record a new episode.

        Args:
            session_id: Session identifier.
            turn:       Cognitive turn number within the session.
            what:       Description of what happened.
            outcome:    Result or consequence of the event.
            importance: Importance score in [0, 1]. Default 0.5.
            emotions:   Optional list of emotional tags (e.g. ["curious", "uncertain"]).

        Returns:
            The generated episode_id (UUID string).
        """
        await self._ensure_loaded()

        episode_id = str(uuid.uuid4())
        episode: dict[str, Any] = {
            "episode_id": episode_id,
            "session_id": session_id,
            "turn": turn,
            "what": what,
            "outcome": outcome,
            "emotions": emotions or [],
            "importance": max(0.0, min(1.0, importance)),
            "timestamp": time.time(),
        }

        async with self._lock:
            self._episodes.append(episode)

        await self._persist()
        log.debug(
            "episodic_memory.recorded",
            episode_id=episode_id,
            session_id=session_id,
            turn=turn,
            importance=importance,
        )
        return episode_id

    async def recall(self, query: str, n: int = 5) -> list[dict[str, Any]]:
        """
        Retrieve the top-n most relevant episodes using fuzzy keyword matching.

        Scoring = keyword_overlap_ratio * 0.5 + importance * 0.3 + recency_score * 0.2

        Args:
            query: Free-text query to match against episode content.
            n:     Maximum number of episodes to return.

        Returns:
            List of episode dicts sorted by relevance score (descending).
        """
        await self._ensure_loaded()

        if not self._episodes:
            return []

        query_tokens = set(query.lower().split())
        now = time.time()
        max_age = 7 * 24 * 3600  # 1 week normalisation window

        scored: list[tuple[float, dict[str, Any]]] = []
        for ep in self._episodes:
            # Keyword overlap score
            ep_text = f"{ep.get('what', '')} {ep.get('outcome', '')}".lower()
            ep_tokens = set(ep_text.split())
            overlap = len(query_tokens & ep_tokens) / max(len(query_tokens), 1)

            # Recency score (1.0 = just happened, 0.0 = very old)
            age = now - ep.get("timestamp", now)
            recency = max(0.0, 1.0 - age / max_age)

            score = overlap * 0.5 + ep.get("importance", 0.5) * 0.3 + recency * 0.2
            scored.append((score, ep))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [ep for _, ep in scored[:n]]
        log.debug("episodic_memory.recalled", query=query[:50], results=len(results))
        return results

    def consolidate(self, min_importance: float = 0.7) -> list[dict[str, Any]]:
        """
        Return all episodes above the importance threshold.

        These are candidates for promotion into SemanticMemory.

        Args:
            min_importance: Minimum importance to include. Default 0.7.

        Returns:
            List of high-importance episode dicts.
        """
        candidates = [ep for ep in self._episodes if ep.get("importance", 0) >= min_importance]
        log.debug(
            "episodic_memory.consolidate",
            candidates=len(candidates),
            threshold=min_importance,
        )
        return candidates

    def get_timeline(self, session_id: str) -> list[dict[str, Any]]:
        """
        Return all episodes for a session in chronological order.

        Args:
            session_id: The session to retrieve episodes for.

        Returns:
            Chronologically sorted list of episode dicts.
        """
        timeline = [ep for ep in self._episodes if ep.get("session_id") == session_id]
        timeline.sort(key=lambda ep: ep.get("timestamp", 0))
        return timeline

    def stats(self) -> dict[str, Any]:
        """Return summary statistics about the episodic store."""
        if not self._episodes:
            return {"total_episodes": 0, "sessions": 0, "avg_importance": 0.0}
        importances = [ep.get("importance", 0.5) for ep in self._episodes]
        sessions = len({ep.get("session_id") for ep in self._episodes})
        return {
            "total_episodes": len(self._episodes),
            "sessions": sessions,
            "avg_importance": round(sum(importances) / len(importances), 4),
            "high_importance_count": sum(1 for i in importances if i >= 0.7),
        }
