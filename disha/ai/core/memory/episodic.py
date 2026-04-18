
from __future__ import annotations

import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Any

import aiofiles
import structlog

log = structlog.get_logger(__name__)

EPISODIC_STORE_PATH = Path.home() / ".disha" / "episodic.json"

class EpisodicMemory:

    def __init__(self, store_path: Path | None = None) -> None:
        self._path = store_path or EPISODIC_STORE_PATH
        self._episodes: list[dict[str, Any]] = []
        self._lock = asyncio.Lock()
        self._loaded = False
        log.debug("episodic_memory.initialized", path=str(self._path))

    async def _ensure_loaded(self) -> None:
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
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(self._path, "w") as f:
                await f.write(json.dumps(self._episodes, indent=2, default=str))
            log.debug("episodic_memory.persisted", count=len(self._episodes))
        except Exception as exc:
            log.error("episodic_memory.persist_failed", error=str(exc))

    async def record(
        self,
        session_id: str,
        turn: int,
        what: str,
        outcome: str,
        importance: float = 0.5,
        emotions: list[str] | None = None,
    ) -> str:
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
        await self._ensure_loaded()

        if not self._episodes:
            return []

        query_tokens = set(query.lower().split())
        now = time.time()
        max_age = 7 * 24 * 3600

        scored: list[tuple[float, dict[str, Any]]] = []
        for ep in self._episodes:

            ep_text = f"{ep.get('what', '')} {ep.get('outcome', '')}".lower()
            ep_tokens = set(ep_text.split())
            overlap = len(query_tokens & ep_tokens) / max(len(query_tokens), 1)

            age = now - ep.get("timestamp", now)
            recency = max(0.0, 1.0 - age / max_age)

            score = overlap * 0.5 + ep.get("importance", 0.5) * 0.3 + recency * 0.2
            scored.append((score, ep))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [ep for _, ep in scored[:n]]
        log.debug("episodic_memory.recalled", query=query[:50], results=len(results))
        return results

    def consolidate(self, min_importance: float = 0.7) -> list[dict[str, Any]]:
        candidates = [ep for ep in self._episodes if ep.get("importance", 0) >= min_importance]
        log.debug(
            "episodic_memory.consolidate",
            candidates=len(candidates),
            threshold=min_importance,
        )
        return candidates

    def get_timeline(self, session_id: str) -> list[dict[str, Any]]:
        timeline = [ep for ep in self._episodes if ep.get("session_id") == session_id]
        timeline.sort(key=lambda ep: ep.get("timestamp", 0))
        return timeline

    def stats(self) -> dict[str, Any]:
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
