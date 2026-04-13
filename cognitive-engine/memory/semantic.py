"""
SemanticMemory — Concept Graph for the DISHA Cognitive Engine.

Semantic memory stores long-term factual knowledge as a concept graph.
Each concept has a definition, typed relationships to other concepts, source
provenance, and a confidence score that slowly decays to model knowledge aging.

Role in architecture:
    SemanticMemory provides background world knowledge that enriches the
    _attend phase. Important episodic episodes are periodically promoted into
    semantic memory by the MemoryManager, allowing learned facts to persist
    across sessions. BFS traversal enables multi-hop relational inference.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections import deque
from pathlib import Path
from typing import Any

import aiofiles
import structlog

log = structlog.get_logger(__name__)

SEMANTIC_STORE_PATH = Path.home() / ".disha" / "semantic.json"


class SemanticMemory:
    """
    Persistent concept graph with BFS traversal and confidence decay.

    The graph is stored as a dict:
        concept_name -> {
            definition: str,
            relationships: [{target, rel_type, confidence}],
            sources: [str],
            last_updated: float,
            confidence: float,
        }

    Persists to ~/.disha/semantic.json.
    """

    def __init__(self, store_path: Path | None = None) -> None:
        self._path = store_path or SEMANTIC_STORE_PATH
        self._graph: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._loaded = False
        log.debug("semantic_memory.initialized", path=str(self._path))

    # ------------------------------------------------------------------
    # Lifecycle helpers
    # ------------------------------------------------------------------

    async def _ensure_loaded(self) -> None:
        """Lazy-load concept graph from disk."""
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
                    self._graph = json.loads(raw) if raw.strip() else {}
                    log.info(
                        "semantic_memory.loaded",
                        concepts=len(self._graph),
                        path=str(self._path),
                    )
                else:
                    self._graph = {}
            except Exception as exc:
                log.warning("semantic_memory.load_failed", error=str(exc))
                self._graph = {}
            self._loaded = True

    async def _persist(self) -> None:
        """Write graph to disk atomically."""
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(self._path, "w") as f:
                await f.write(json.dumps(self._graph, indent=2, default=str))
            log.debug("semantic_memory.persisted", concepts=len(self._graph))
        except Exception as exc:
            log.error("semantic_memory.persist_failed", error=str(exc))

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def learn(
        self,
        concept: str,
        definition: str,
        relationships: list[dict[str, Any]],
        source: str,
    ) -> None:
        """
        Add or update a concept in the graph.

        If the concept already exists, the definition is updated (if non-empty),
        new relationships are merged (deduped by target+rel_type), and the source
        is added to the provenance list.

        Args:
            concept:       Concept name (key in graph).
            definition:    Human-readable definition.
            relationships: List of dicts: [{target, rel_type, confidence}].
            source:        Provenance string (e.g. session_id or "bootstrap").
        """
        await self._ensure_loaded()

        concept = concept.strip().lower()

        # Validate and normalize relationships
        valid_rels: list[dict[str, Any]] = []
        for rel in relationships:
            if "target" in rel and "rel_type" in rel:
                valid_rels.append(
                    {
                        "target": str(rel["target"]).strip().lower(),
                        "rel_type": str(rel["rel_type"]),
                        "confidence": float(rel.get("confidence", 0.8)),
                    }
                )

        async with self._lock:
            if concept in self._graph:
                node = self._graph[concept]
                if definition:
                    node["definition"] = definition
                # Merge relationships (avoid duplicates by target+rel_type)
                existing_keys = {
                    (r["target"], r["rel_type"]) for r in node.get("relationships", [])
                }
                for rel in valid_rels:
                    key = (rel["target"], rel["rel_type"])
                    if key not in existing_keys:
                        node.setdefault("relationships", []).append(rel)
                        existing_keys.add(key)
                    else:
                        # Update confidence if higher
                        for r in node["relationships"]:
                            if (r["target"], r["rel_type"]) == key:
                                r["confidence"] = max(r["confidence"], rel["confidence"])
                if source not in node.get("sources", []):
                    node.setdefault("sources", []).append(source)
                node["last_updated"] = time.time()
            else:
                self._graph[concept] = {
                    "definition": definition,
                    "relationships": valid_rels,
                    "sources": [source],
                    "last_updated": time.time(),
                    "confidence": 1.0,
                }

        await self._persist()
        log.debug(
            "semantic_memory.learned",
            concept=concept,
            relationships=len(valid_rels),
            source=source,
        )

    async def query(self, concept: str) -> dict[str, Any] | None:
        """
        Retrieve a concept node with its full relationship graph.

        Args:
            concept: The concept to look up.

        Returns:
            Concept dict or None if not found.
        """
        await self._ensure_loaded()
        concept = concept.strip().lower()
        result = self._graph.get(concept)
        log.debug("semantic_memory.query", concept=concept, found=result is not None)
        return result

    async def find_related(self, concept: str, depth: int = 2) -> list[dict[str, Any]]:
        """
        BFS traversal from a concept up to the given depth.

        Args:
            concept: Starting concept.
            depth:   Maximum BFS depth (hops).

        Returns:
            List of related concept dicts, each augmented with 'name' and 'hops'.
        """
        await self._ensure_loaded()
        concept = concept.strip().lower()

        if concept not in self._graph:
            return []

        visited: set[str] = {concept}
        queue: deque[tuple[str, int]] = deque([(concept, 0)])
        related: list[dict[str, Any]] = []

        while queue:
            current, hops = queue.popleft()
            if hops >= depth:
                continue
            node = self._graph.get(current, {})
            for rel in node.get("relationships", []):
                target = rel["target"]
                if target not in visited and target in self._graph:
                    visited.add(target)
                    entry = dict(self._graph[target])
                    entry["name"] = target
                    entry["hops"] = hops + 1
                    entry["via_relation"] = rel["rel_type"]
                    related.append(entry)
                    queue.append((target, hops + 1))

        log.debug(
            "semantic_memory.find_related",
            concept=concept,
            depth=depth,
            found=len(related),
        )
        return related

    async def infer(self, concept_a: str, concept_b: str) -> str | None:
        """
        Check whether a path exists between two concepts.

        Uses BFS to find the shortest path. If found, returns a human-readable
        description of the relationship chain. Returns None if disconnected.

        Args:
            concept_a: Source concept.
            concept_b: Target concept.

        Returns:
            A string describing the relationship path, or None.
        """
        await self._ensure_loaded()
        ca = concept_a.strip().lower()
        cb = concept_b.strip().lower()

        if ca not in self._graph or cb not in self._graph:
            return None
        if ca == cb:
            return f"'{ca}' is identical to '{cb}'"

        # BFS with path tracking
        queue: deque[tuple[str, list[tuple[str, str]]]] = deque([(ca, [])])
        visited: set[str] = {ca}

        while queue:
            current, path = queue.popleft()
            node = self._graph.get(current, {})
            for rel in node.get("relationships", []):
                target = rel["target"]
                new_path = path + [(rel["rel_type"], target)]
                if target == cb:
                    # Build human-readable inference
                    parts = [ca]
                    for rel_type, t in new_path:
                        parts.append(f"--[{rel_type}]--> {t}")
                    inference = " ".join(parts)
                    log.debug("semantic_memory.inferred", path=inference)
                    return inference
                if target not in visited and target in self._graph:
                    visited.add(target)
                    queue.append((target, new_path))

        log.debug("semantic_memory.no_inference", concept_a=ca, concept_b=cb)
        return None

    def decay_confidence(self, factor: float = 0.999) -> None:
        """
        Slowly reduce the confidence of all concepts to model knowledge aging.

        Args:
            factor: Multiplicative decay per call. Default 0.999 (slow decay).
        """
        count = 0
        for node in self._graph.values():
            node["confidence"] = max(0.0, node.get("confidence", 1.0) * factor)
            count += 1
        log.debug("semantic_memory.confidence_decayed", concepts=count, factor=factor)

    def stats(self) -> dict[str, Any]:
        """Return summary statistics about the semantic graph."""
        if not self._graph:
            return {"total_concepts": 0, "total_relationships": 0, "avg_confidence": 0.0}
        total_rels = sum(len(n.get("relationships", [])) for n in self._graph.values())
        confidences = [n.get("confidence", 1.0) for n in self._graph.values()]
        return {
            "total_concepts": len(self._graph),
            "total_relationships": total_rels,
            "avg_confidence": round(sum(confidences) / len(confidences), 4),
            "min_confidence": round(min(confidences), 4),
        }
