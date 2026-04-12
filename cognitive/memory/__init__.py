"""Memory Architecture — Multi-store cognitive memory system.

Implements a neuroscience-inspired memory model with four stores:
- Working Memory: Limited-capacity active processing buffer
- Episodic Memory: Temporal event sequences with emotional valence
- Semantic Memory: Concept graph with spreading activation
- Procedural Memory: Learned skills and action patterns

Memory consolidation transfers important items from working → long-term stores.
Retrieval uses cue-based activation spreading.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ..types import (
    CognitiveEvent,
    Episode,
    MemoryType,
    SemanticNode,
)

logger = logging.getLogger(__name__)


class WorkingMemory:
    """Limited-capacity active processing buffer.
    
    Based on Baddeley's model: maintains a small set of active items
    with automatic decay and displacement of older items.
    Capacity defaults to 7 (Miller's Law: 7 ± 2).
    """

    def __init__(self, capacity: int = 7, decay_seconds: float = 300.0) -> None:
        self._capacity = capacity
        self._decay_seconds = decay_seconds
        self._items: deque[dict[str, Any]] = deque(maxlen=capacity)
        self._focus_item: dict[str, Any] | None = None

    def hold(self, item: Any, *, label: str = "", priority: float = 0.5) -> None:
        """Add an item to working memory. Displaces oldest if at capacity."""
        entry = {
            "content": item,
            "label": label,
            "priority": priority,
            "entered_at": datetime.now(timezone.utc).isoformat(),
            "access_count": 0,
        }
        self._items.append(entry)
        logger.debug("Working memory: held '%s' (load: %d/%d)", label, len(self._items), self._capacity)

    def focus(self, label: str) -> Any | None:
        """Bring a specific item into focus (central executive attention)."""
        for item in self._items:
            if item["label"] == label:
                item["access_count"] += 1
                self._focus_item = item
                return item["content"]
        return None

    def retrieve_all(self) -> list[dict[str, Any]]:
        """Get all items currently in working memory."""
        self._decay()
        return list(self._items)

    @property
    def load(self) -> float:
        """Current load as fraction of capacity (0.0 to 1.0)."""
        return len(self._items) / self._capacity

    @property
    def current_focus(self) -> Any | None:
        """Currently focused item."""
        return self._focus_item["content"] if self._focus_item else None

    def clear(self) -> None:
        self._items.clear()
        self._focus_item = None

    def _decay(self) -> None:
        """Remove items that have exceeded the decay period."""
        now = datetime.now(timezone.utc)
        to_keep: list[dict[str, Any]] = []
        for item in self._items:
            try:
                entered = datetime.fromisoformat(item["entered_at"])
                if entered.tzinfo is None:
                    entered = entered.replace(tzinfo=timezone.utc)
                age = (now - entered).total_seconds()
                if age < self._decay_seconds:
                    to_keep.append(item)
            except (ValueError, TypeError):
                to_keep.append(item)
        self._items.clear()
        for item in to_keep:
            self._items.append(item)


class EpisodicMemory:
    """Temporal event sequence storage with emotional tagging.
    
    Stores episodes (sequences of events) with context, outcomes,
    and emotional valence. Supports retrieval by similarity, recency,
    and emotional significance.
    """

    def __init__(self, max_episodes: int = 1000) -> None:
        self._episodes: dict[str, Episode] = {}
        self._max_episodes = max_episodes
        self._timeline: list[str] = []  # Episode IDs in chronological order

    def record(self, episode: Episode) -> str:
        """Record a new episode. Returns episode ID."""
        self._episodes[episode.id] = episode
        self._timeline.append(episode.id)

        # Evict oldest if over capacity
        while len(self._episodes) > self._max_episodes:
            oldest_id = self._timeline.pop(0)
            self._episodes.pop(oldest_id, None)

        logger.debug(
            "Episodic memory: recorded episode '%s' (total: %d)",
            episode.id, len(self._episodes),
        )
        return episode.id

    def recall_recent(self, limit: int = 10) -> list[Episode]:
        """Recall most recent episodes."""
        recent_ids = self._timeline[-limit:]
        return [self._episodes[eid] for eid in reversed(recent_ids) if eid in self._episodes]

    def recall_by_tags(self, tags: list[str], limit: int = 10) -> list[Episode]:
        """Recall episodes matching any of the given tags."""
        tag_set = set(tags)
        matches = [
            ep for ep in self._episodes.values()
            if tag_set.intersection(ep.tags)
        ]
        matches.sort(key=lambda e: e.importance, reverse=True)
        return matches[:limit]

    def recall_by_outcome(self, outcome_keyword: str, limit: int = 10) -> list[Episode]:
        """Recall episodes whose outcome contains the keyword."""
        keyword = outcome_keyword.lower()
        matches = [
            ep for ep in self._episodes.values()
            if keyword in ep.outcome.lower()
        ]
        matches.sort(key=lambda e: e.importance, reverse=True)
        return matches[:limit]

    def recall_emotional(self, valence_sign: float, limit: int = 5) -> list[Episode]:
        """Recall episodes with matching emotional valence direction.
        
        Args:
            valence_sign: Positive value for positive memories, negative for negative.
        """
        if valence_sign >= 0:
            matches = [ep for ep in self._episodes.values() if ep.emotional_valence > 0]
        else:
            matches = [ep for ep in self._episodes.values() if ep.emotional_valence < 0]
        matches.sort(key=lambda e: abs(e.emotional_valence), reverse=True)
        return matches[:limit]

    @property
    def count(self) -> int:
        return len(self._episodes)

    def summary(self) -> dict[str, Any]:
        if not self._episodes:
            return {"count": 0, "avg_importance": 0.0, "avg_valence": 0.0}
        episodes = list(self._episodes.values())
        return {
            "count": len(episodes),
            "avg_importance": sum(e.importance for e in episodes) / len(episodes),
            "avg_valence": sum(e.emotional_valence for e in episodes) / len(episodes),
            "tag_distribution": dict(self._tag_counts()),
        }

    def _tag_counts(self) -> dict[str, int]:
        counts: dict[str, int] = defaultdict(int)
        for ep in self._episodes.values():
            for tag in ep.tags:
                counts[tag] += 1
        return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True)[:20])


class SemanticMemory:
    """Concept graph with spreading activation.
    
    Stores concepts as nodes in a graph with weighted relationships.
    Supports spreading activation for associative retrieval —
    activating one concept spreads to related concepts.
    """

    def __init__(
        self,
        activation_decay: float = 0.7,
        activation_threshold: float = 0.1,
    ) -> None:
        self._nodes: dict[str, SemanticNode] = {}
        self._activation_decay = activation_decay
        self._activation_threshold = activation_threshold

    def add_concept(
        self,
        concept: str,
        category: str = "",
        properties: dict[str, Any] | None = None,
    ) -> SemanticNode:
        """Add or update a concept in semantic memory."""
        # Check for existing concept by name
        for node in self._nodes.values():
            if node.concept.lower() == concept.lower():
                if properties:
                    node.properties.update(properties)
                return node

        node = SemanticNode(
            concept=concept,
            category=category,
            properties=properties or {},
        )
        self._nodes[node.id] = node
        return node

    def add_relation(
        self,
        source_id: str,
        relation: str,
        target_id: str,
        weight: float = 1.0,
    ) -> bool:
        """Add a weighted relation between two concepts."""
        source = self._nodes.get(source_id)
        target = self._nodes.get(target_id)
        if source is None or target is None:
            return False
        source.relations.append((relation, target_id, str(weight)))
        return True

    def activate(self, concept_name: str, initial_activation: float = 1.0) -> dict[str, float]:
        """Activate a concept and spread activation to related nodes.
        
        Returns a dict of concept_name → activation_level for all activated nodes.
        """
        # Find the starting node
        start_node = None
        for node in self._nodes.values():
            if node.concept.lower() == concept_name.lower():
                start_node = node
                break

        if start_node is None:
            return {}

        # Reset all activations
        for node in self._nodes.values():
            node.activation = 0.0

        # Spreading activation (BFS)
        start_node.activation = initial_activation
        start_node.access_count += 1
        start_node.last_accessed = datetime.now(timezone.utc).isoformat()

        queue: list[tuple[str, float]] = [(start_node.id, initial_activation)]
        visited: set[str] = set()
        activations: dict[str, float] = {start_node.concept: initial_activation}

        while queue:
            node_id, current_activation = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = self._nodes.get(node_id)
            if node is None:
                continue

            for relation, target_id, weight_str in node.relations:
                weight = float(weight_str)
                spread = current_activation * self._activation_decay * weight
                if spread < self._activation_threshold:
                    continue

                target = self._nodes.get(target_id)
                if target is None:
                    continue

                target.activation = max(target.activation, spread)
                activations[target.concept] = target.activation
                queue.append((target_id, spread))

        return dict(sorted(activations.items(), key=lambda x: x[1], reverse=True))

    def find_concept(self, name: str) -> SemanticNode | None:
        """Find a concept by name."""
        for node in self._nodes.values():
            if node.concept.lower() == name.lower():
                return node
        return None

    def get_related(self, concept_name: str, limit: int = 10) -> list[tuple[str, str, float]]:
        """Get concepts related to the given concept.
        
        Returns: List of (relation_type, target_concept, weight).
        """
        node = self.find_concept(concept_name)
        if node is None:
            return []

        results = []
        for relation, target_id, weight_str in node.relations:
            target = self._nodes.get(target_id)
            if target:
                results.append((relation, target.concept, float(weight_str)))

        results.sort(key=lambda x: x[2], reverse=True)
        return results[:limit]

    @property
    def concept_count(self) -> int:
        return len(self._nodes)

    def summary(self) -> dict[str, Any]:
        total_relations = sum(len(n.relations) for n in self._nodes.values())
        categories = defaultdict(int)
        for n in self._nodes.values():
            categories[n.category or "uncategorized"] += 1
        return {
            "concepts": len(self._nodes),
            "relations": total_relations,
            "categories": dict(categories),
            "most_accessed": sorted(
                [(n.concept, n.access_count) for n in self._nodes.values()],
                key=lambda x: x[1], reverse=True,
            )[:5],
        }


class ProceduralMemory:
    """Stores learned action sequences and skills.
    
    Skills are stored as sequences of steps with success rates,
    allowing the system to recall proven action patterns.
    """

    def __init__(self, max_skills: int = 500) -> None:
        self._skills: dict[str, dict[str, Any]] = {}
        self._max_skills = max_skills

    def learn_skill(
        self,
        name: str,
        steps: list[str],
        *,
        context: str = "",
        success_rate: float = 1.0,
    ) -> str:
        """Record a learned skill (action sequence)."""
        skill_id = hashlib.md5(name.encode(), usedforsecurity=False).hexdigest()[:12]
        if skill_id in self._skills:
            # Update existing skill
            existing = self._skills[skill_id]
            existing["executions"] += 1
            # Running average of success rate
            n = existing["executions"]
            existing["success_rate"] = (
                existing["success_rate"] * (n - 1) + success_rate
            ) / n
            existing["last_used"] = datetime.now(timezone.utc).isoformat()
        else:
            self._skills[skill_id] = {
                "id": skill_id,
                "name": name,
                "steps": steps,
                "context": context,
                "success_rate": success_rate,
                "executions": 1,
                "learned_at": datetime.now(timezone.utc).isoformat(),
                "last_used": datetime.now(timezone.utc).isoformat(),
            }

        # Evict least-used if over capacity
        if len(self._skills) > self._max_skills:
            least_used = min(
                self._skills.items(),
                key=lambda x: x[1]["executions"],
            )
            del self._skills[least_used[0]]

        return skill_id

    def recall_skill(self, name: str) -> dict[str, Any] | None:
        """Recall a skill by name."""
        skill_id = hashlib.md5(name.encode(), usedforsecurity=False).hexdigest()[:12]
        return self._skills.get(skill_id)

    def find_skills(self, keyword: str, limit: int = 5) -> list[dict[str, Any]]:
        """Find skills matching a keyword."""
        keyword = keyword.lower()
        matches = [
            s for s in self._skills.values()
            if keyword in s["name"].lower() or keyword in s["context"].lower()
        ]
        matches.sort(key=lambda s: s["success_rate"] * s["executions"], reverse=True)
        return matches[:limit]

    def best_skills(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return highest-performing skills."""
        return sorted(
            self._skills.values(),
            key=lambda s: s["success_rate"] * math.log1p(s["executions"]),
            reverse=True,
        )[:limit]

    @property
    def skill_count(self) -> int:
        return len(self._skills)


class CognitiveMemorySystem:
    """Unified cognitive memory system integrating all memory stores.
    
    Provides a single interface for memory operations with automatic
    consolidation from working memory to long-term stores.
    
    Example:
        memory = CognitiveMemorySystem()
        
        # Working memory operations
        memory.working.hold("threat detected", label="alert", priority=0.9)
        
        # Episodic memory
        episode = Episode(events=[...], outcome="resolved", importance=0.8)
        memory.episodic.record(episode)
        
        # Semantic memory
        node = memory.semantic.add_concept("SQL Injection", category="attack")
        
        # Procedural memory
        memory.procedural.learn_skill("incident_response", ["detect", "classify", "contain", "eradicate"])
        
        # Consolidate working → long-term
        memory.consolidate()
    """

    def __init__(
        self,
        working_capacity: int = 7,
        episodic_capacity: int = 1000,
        persist_path: str = ".disha/cognitive_memory",
    ) -> None:
        self.working = WorkingMemory(capacity=working_capacity)
        self.episodic = EpisodicMemory(max_episodes=episodic_capacity)
        self.semantic = SemanticMemory()
        self.procedural = ProceduralMemory()
        self._persist_path = Path(persist_path)
        self._consolidation_count = 0
        self._event_log: list[CognitiveEvent] = []

    def consolidate(self) -> dict[str, int]:
        """Consolidate working memory items into long-term stores.
        
        High-priority items are stored in semantic memory.
        Sequences are stored as episodic memories.
        Returns counts of consolidated items per store.
        """
        items = self.working.retrieve_all()
        counts = {"semantic": 0, "episodic": 0, "procedural": 0}

        for item in items:
            priority = item.get("priority", 0.5)
            label = item.get("label", "")

            # High-priority items → semantic memory
            if priority >= 0.7:
                self.semantic.add_concept(
                    concept=label or str(item["content"])[:100],
                    category="consolidated",
                    properties={"source": "working_memory", "priority": priority},
                )
                counts["semantic"] += 1

        self._consolidation_count += 1
        self._event_log.append(CognitiveEvent(
            event_type="consolidation",
            source_layer="memory",
            payload={"counts": counts, "cycle": self._consolidation_count},
        ))

        logger.info(
            "Memory consolidation #%d: %s",
            self._consolidation_count, counts,
        )
        return counts

    def snapshot(self) -> dict[str, Any]:
        """Complete snapshot of all memory systems."""
        return {
            "working_memory": {
                "load": self.working.load,
                "items": len(self.working.retrieve_all()),
            },
            "episodic_memory": self.episodic.summary(),
            "semantic_memory": self.semantic.summary(),
            "procedural_memory": {
                "skills": self.procedural.skill_count,
                "top_skills": [
                    {"name": s["name"], "success_rate": s["success_rate"]}
                    for s in self.procedural.best_skills(3)
                ],
            },
            "consolidations": self._consolidation_count,
        }

    def save(self) -> None:
        """Persist memory state to disk."""
        self._persist_path.mkdir(parents=True, exist_ok=True)
        state = {
            "episodic": {
                eid: {
                    "id": ep.id,
                    "outcome": ep.outcome,
                    "importance": ep.importance,
                    "emotional_valence": ep.emotional_valence,
                    "tags": ep.tags,
                    "created_at": ep.created_at,
                    "context": ep.context,
                }
                for eid, ep in self.episodic._episodes.items()
            },
            "semantic": {
                nid: {
                    "id": node.id,
                    "concept": node.concept,
                    "category": node.category,
                    "properties": node.properties,
                    "relations": node.relations,
                    "access_count": node.access_count,
                }
                for nid, node in self.semantic._nodes.items()
            },
            "procedural": self.procedural._skills,
            "consolidation_count": self._consolidation_count,
        }
        (self._persist_path / "cognitive_state.json").write_text(
            json.dumps(state, indent=2, default=str), encoding="utf-8",
        )
        logger.info("Cognitive memory saved to %s", self._persist_path)

    def load(self) -> bool:
        """Load memory state from disk."""
        state_path = self._persist_path / "cognitive_state.json"
        if not state_path.exists():
            return False
        try:
            data = json.loads(state_path.read_text(encoding="utf-8"))
            # Restore semantic memory
            for _nid, raw in data.get("semantic", {}).items():
                node = SemanticNode(
                    id=raw["id"],
                    concept=raw["concept"],
                    category=raw.get("category", ""),
                    properties=raw.get("properties", {}),
                    relations=[tuple(r) for r in raw.get("relations", [])],
                    access_count=raw.get("access_count", 0),
                )
                self.semantic._nodes[node.id] = node
            # Restore procedural memory
            self.procedural._skills = data.get("procedural", {})
            self._consolidation_count = data.get("consolidation_count", 0)
            logger.info("Cognitive memory loaded from %s", self._persist_path)
            return True
        except Exception as exc:
            logger.warning("Failed to load cognitive memory: %s", exc)
            return False

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)
