"""
MemoryManager — Unified Memory Orchestrator for the DISHA Cognitive Engine.

MemoryManager provides a single interface to all three memory subsystems:
  - WorkingMemory  : volatile attention buffer (in-process)
  - EpisodicMemory : time-stamped event log (persisted to JSON)
  - SemanticMemory : concept graph (persisted to JSON)

It handles cross-memory operations such as promoting important episodic
memories into semantic memory (consolidation) and unified retrieval that
merges results from all three sources.

Role in architecture:
    CognitiveEngine holds one MemoryManager instance per session and calls it
    during the _attend phase (retrieve) and _consolidate phase (store_episode,
    learn_concept, promote_to_semantic).
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from cognitive_engine.memory.working import WorkingMemory
from cognitive_engine.memory.episodic import EpisodicMemory
from cognitive_engine.memory.semantic import SemanticMemory

log = structlog.get_logger(__name__)


class MemoryManager:
    """
    Unified interface to WorkingMemory, EpisodicMemory, and SemanticMemory.

    One instance is shared by the CognitiveEngine; the WorkingMemory is
    session-scoped (in-process), while Episodic and Semantic stores persist
    to disk across sessions.
    """

    def __init__(self) -> None:
        self.working = WorkingMemory()
        self.episodic = EpisodicMemory()
        self.semantic = SemanticMemory()
        log.info("memory_manager.initialized")

    # ------------------------------------------------------------------
    # Unified retrieval
    # ------------------------------------------------------------------

    async def retrieve(self, query: str, session_id: str) -> dict[str, Any]:
        """
        Retrieve relevant memories from all three stores simultaneously.

        Args:
            query:      Free-text query string.
            session_id: Active session identifier.

        Returns:
            {
                "working":  [slot dicts],
                "episodic": [episode dicts],
                "semantic": [concept dict | None],
            }
        """
        log.debug("memory_manager.retrieve", query=query[:60], session_id=session_id)

        # Fan-out to episodic and semantic in parallel; working is synchronous
        episodic_task = asyncio.create_task(self.episodic.recall(query, n=5))

        # For semantic, try to match main keyword from query
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

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def store_episode(
        self,
        session_id: str,
        turn: int,
        content: str,
        outcome: str,
        importance: float = 0.5,
        emotions: list[str] | None = None,
    ) -> str:
        """
        Record a new episode in episodic memory.

        Args:
            session_id: Session identifier.
            turn:       Cognitive turn number.
            content:    What happened (input/action description).
            outcome:    Result or consequence.
            importance: Importance score [0, 1].
            emotions:   Optional emotional tags.

        Returns:
            The generated episode_id.
        """
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
        """
        Add or update a concept in semantic memory.

        Args:
            concept:    Concept name.
            definition: Human-readable definition string.
            relations:  List of relationship dicts [{target, rel_type, confidence}].
            source:     Provenance string.
        """
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

    # ------------------------------------------------------------------
    # Consolidation
    # ------------------------------------------------------------------

    def promote_to_semantic(self, session_id: str) -> int:
        """
        Consolidate high-importance episodic memories into semantic memory.

        Episodes with importance >= 0.7 are promoted synchronously. Each
        episode's 'what' field is parsed for a simple concept/definition and
        stored in semantic memory.

        Args:
            session_id: The session whose episodes to promote.

        Returns:
            Number of episodes promoted.
        """
        candidates = self.episodic.consolidate(min_importance=0.7)
        session_candidates = [
            ep for ep in candidates if ep.get("session_id") == session_id
        ]

        promoted = 0
        for ep in session_candidates:
            what = ep.get("what", "")
            if not what or len(what.split()) < 3:
                continue
            # Derive a concept name from the first significant word
            words = [w.strip(".,!?") for w in what.lower().split() if len(w) > 3]
            if not words:
                continue
            concept = words[0]
            definition = what
            # Build a minimal relationship: this episode links to its outcome
            outcome_words = [
                w.strip(".,!?") for w in ep.get("outcome", "").lower().split() if len(w) > 3
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

            # promote_to_semantic is always called from async context (_consolidate),
            # so there is always a running event loop. Use ensure_future to schedule
            # the coroutine without blocking. asyncio.get_event_loop() is deprecated
            # in Python 3.10+ and loop.run_until_complete() deadlocks inside a running loop.
            try:
                asyncio.ensure_future(
                    self.semantic.learn(
                        concept=concept,
                        definition=definition,
                        relationships=relations,
                        source=f"episodic:{ep.get('episode_id', 'unknown')}",
                    )
                )
                promoted += 1
            except Exception as exc:
                log.warning("memory_manager.promote_failed", error=str(exc), concept=concept)

        log.info(
            "memory_manager.promoted_to_semantic",
            session_id=session_id,
            promoted=promoted,
            candidates=len(session_candidates),
        )
        return promoted

    # ------------------------------------------------------------------
    # Working memory helpers
    # ------------------------------------------------------------------

    def add_to_working(self, item: dict[str, Any], relevance: float) -> None:
        """Add an item directly to working memory."""
        self.working.add(item, relevance)

    def decay_working_memory(self, factor: float = 0.95) -> None:
        """Apply relevance decay to working memory slots."""
        self.working.decay(factor)

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------

    def get_memory_stats(self) -> dict[str, Any]:
        """
        Return aggregate statistics across all memory subsystems.

        Returns:
            Dict with counts and stats for working, episodic, and semantic memory.
        """
        stats = {
            "working": self.working.stats(),
            "episodic": self.episodic.stats(),
            "semantic": self.semantic.stats(),
            "timestamp": time.time(),
        }
        log.debug("memory_manager.stats", stats=stats)
        return stats
