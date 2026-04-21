from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from disha.ai.core.memory.working import WorkingMemory
from disha.ai.core.memory.episodic import EpisodicMemory
from disha.ai.core.memory.semantic import SemanticMemory

log = structlog.get_logger(__name__)


class MemoryManager:
    def __init__(self) -> None:
        self.working = WorkingMemory()
        self.episodic = EpisodicMemory()
        self.semantic = SemanticMemory()
        log.info("memory_manager.initialized")

    async def retrieve(self, query: str, session_id: str) -> dict[str, Any]:
        log.debug("memory_manager.retrieve", query=query[:60], session_id=session_id)

        episodic_task = asyncio.create_task(self.episodic.recall(query, n=5))

        keywords = [w for w in query.lower().split() if len(w) > 3]
        semantic_results: list[dict[str, Any]] = []
        for kw in keywords[:3]:
            concept = await self.semantic.query(kw)
            if concept:
                concept["name"] = kw
                semantic_results.append(concept)

        episodic_results = await episodic_task
        working_slots = self.working.get_context_window()

        result = {
            "working": working_slots,
            "episodic": episodic_results,
            "semantic": semantic_results,
        }
        log.debug(
            "memory_manager.retrieved",
            working=len(working_slots),
            episodic=len(episodic_results),
            semantic=len(semantic_results),
        )
        return result

    async def store_episode(
        self,
        session_id: str,
        turn: int,
        content: str,
        outcome: str,
        importance: float = 0.5,
        emotions: list[str] | None = None,
    ) -> str:
        episode_id = await self.episodic.record(
            session_id=session_id,
            turn=turn,
            what=content,
            outcome=outcome,
            importance=importance,
            emotions=emotions,
        )
        log.debug(
            "memory_manager.episode_stored",
            episode_id=episode_id,
            session_id=session_id,
            importance=importance,
        )
        return episode_id

    async def learn_concept(
        self,
        concept: str,
        definition: str,
        relations: list[dict[str, Any]],
        source: str,
    ) -> None:
        await self.semantic.learn(
            concept=concept,
            definition=definition,
            relationships=relations,
            source=source,
        )
        log.debug(
            "memory_manager.concept_learned",
            concept=concept,
            relations=len(relations),
            source=source,
        )

    def promote_to_semantic(self, session_id: str) -> int:
        candidates = self.episodic.consolidate(min_importance=0.7)
        session_candidates = [
            ep for ep in candidates if ep.get("session_id") == session_id
        ]

        promoted = 0
        for ep in session_candidates:
            what = ep.get("what", "")
            if not what or len(what.split()) < 3:
                continue

            words = [w.strip(".,!?") for w in what.lower().split() if len(w) > 3]
            if not words:
                continue
            concept = words[0]
            definition = what

            outcome_words = [
                w.strip(".,!?")
                for w in ep.get("outcome", "").lower().split()
                if len(w) > 3
            ]
            relations: list[dict[str, Any]] = []
            if outcome_words:
                relations.append(
                    {
                        "target": outcome_words[0],
                        "rel_type": "leads_to",
                        "confidence": ep.get("importance", 0.7),
                    }
                )

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(
                        self.semantic.learn(
                            concept=concept,
                            definition=definition,
                            relationships=relations,
                            source=f"episodic:{ep.get('episode_id', 'unknown')}",
                        )
                    )
                else:
                    loop.run_until_complete(
                        self.semantic.learn(
                            concept=concept,
                            definition=definition,
                            relationships=relations,
                            source=f"episodic:{ep.get('episode_id', 'unknown')}",
                        )
                    )
                promoted += 1
            except Exception as exc:
                log.warning(
                    "memory_manager.promote_failed", error=str(exc), concept=concept
                )

        log.info(
            "memory_manager.promoted_to_semantic",
            session_id=session_id,
            promoted=promoted,
            candidates=len(session_candidates),
        )
        return promoted

    def add_to_working(self, item: dict[str, Any], relevance: float) -> None:
        self.working.add(item, relevance)

    def decay_working_memory(self, factor: float = 0.95) -> None:
        self.working.decay(factor)

    def get_memory_stats(self) -> dict[str, Any]:
        stats = {
            "working": self.working.stats(),
            "episodic": self.episodic.stats(),
            "semantic": self.semantic.stats(),
            "timestamp": time.time(),
        }
        log.debug("memory_manager.stats", stats=stats)
        return stats
