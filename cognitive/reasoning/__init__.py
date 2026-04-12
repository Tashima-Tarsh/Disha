"""Reasoning Layer — Multi-strategy inference engine for the cognitive architecture.

Implements a thought-tree based reasoning system supporting multiple
inference strategies. Inspired by dual-process theory (System 1/2)
and deliberative alignment.

Key capabilities:
- Multi-path reasoning with thought trees
- Strategy selection based on problem type
- Evidence-based confidence scoring
- Chain-of-thought with branching and pruning
"""

from __future__ import annotations

import logging
import math
import random
from collections import defaultdict
from typing import Any

from ..types import (
    CognitiveEvent,
    ConfidenceLevel,
    Percept,
    ReasoningStrategy,
    Thought,
)

logger = logging.getLogger(__name__)


class ThoughtTree:
    """A tree structure for organizing reasoning steps.
    
    Unlike a linear chain-of-thought, a thought tree allows branching
    into multiple hypotheses and pruning low-confidence paths.
    """

    def __init__(self) -> None:
        self._nodes: dict[str, Thought] = {}
        self._roots: list[str] = []

    def add(self, thought: Thought) -> None:
        """Add a thought to the tree."""
        self._nodes[thought.id] = thought
        if thought.parent_id is None:
            self._roots.append(thought.id)
        elif thought.parent_id in self._nodes:
            parent = self._nodes[thought.parent_id]
            if thought.id not in parent.children:
                parent.children.append(thought.id)

    def get(self, thought_id: str) -> Thought | None:
        return self._nodes.get(thought_id)

    @property
    def roots(self) -> list[Thought]:
        return [self._nodes[r] for r in self._roots if r in self._nodes]

    @property
    def leaves(self) -> list[Thought]:
        """Return thoughts with no children (terminal conclusions)."""
        return [t for t in self._nodes.values() if not t.children]

    @property
    def depth(self) -> int:
        """Maximum depth of the thought tree."""
        if not self._roots:
            return 0
        
        def _depth(node_id: str) -> int:
            node = self._nodes.get(node_id)
            if node is None or not node.children:
                return 1
            return 1 + max(_depth(c) for c in node.children)
        
        return max(_depth(r) for r in self._roots)

    def best_path(self) -> list[Thought]:
        """Return the highest-confidence path from root to leaf."""
        if not self._roots:
            return []
        
        best: list[Thought] = []
        best_score = -1.0
        
        def _traverse(node_id: str, path: list[Thought], score: float) -> None:
            nonlocal best, best_score
            node = self._nodes.get(node_id)
            if node is None:
                return
            current_path = path + [node]
            current_score = score + node.confidence
            
            if not node.children:
                avg = current_score / len(current_path)
                if avg > best_score:
                    best_score = avg
                    best = current_path
            else:
                for child_id in node.children:
                    _traverse(child_id, current_path, current_score)
        
        for root_id in self._roots:
            _traverse(root_id, [], 0.0)
        
        return best

    def prune(self, min_confidence: float = 0.2) -> int:
        """Remove low-confidence branches. Returns count of pruned nodes."""
        to_remove: list[str] = []
        for thought_id, thought in self._nodes.items():
            if thought.confidence < min_confidence and thought_id not in self._roots:
                to_remove.append(thought_id)
        
        for thought_id in to_remove:
            thought = self._nodes.pop(thought_id)
            if thought.parent_id and thought.parent_id in self._nodes:
                parent = self._nodes[thought.parent_id]
                parent.children = [c for c in parent.children if c != thought_id]
        
        return len(to_remove)

    def summary(self) -> dict[str, Any]:
        return {
            "total_nodes": len(self._nodes),
            "roots": len(self._roots),
            "leaves": len(self.leaves),
            "depth": self.depth,
            "avg_confidence": (
                sum(t.confidence for t in self._nodes.values()) / len(self._nodes)
                if self._nodes else 0.0
            ),
        }


class StrategySelector:
    """Selects the optimal reasoning strategy based on the problem context."""

    # Pattern → strategy mapping with confidence weights
    _STRATEGY_PATTERNS: dict[str, list[tuple[str, float]]] = {
        "deductive": [
            ("if.*then", 0.8), ("therefore", 0.7), ("must be", 0.6),
            ("follows that", 0.7), ("conclude", 0.6), ("prove", 0.8),
        ],
        "inductive": [
            ("pattern", 0.7), ("trend", 0.6), ("generally", 0.5),
            ("most cases", 0.6), ("typically", 0.5), ("observed", 0.6),
        ],
        "abductive": [
            ("best explanation", 0.8), ("likely cause", 0.7), ("hypothesis", 0.7),
            ("probably because", 0.6), ("suggests that", 0.5), ("diagnose", 0.7),
        ],
        "analogical": [
            ("similar to", 0.7), ("like", 0.4), ("analogy", 0.8),
            ("comparable", 0.6), ("resembles", 0.6), ("maps to", 0.7),
        ],
        "causal": [
            ("caused by", 0.8), ("leads to", 0.7), ("because", 0.5),
            ("results in", 0.7), ("effect of", 0.7), ("impact", 0.5),
        ],
        "counterfactual": [
            ("what if", 0.8), ("would have", 0.7), ("instead", 0.5),
            ("alternative", 0.6), ("suppose", 0.7), ("hypothetically", 0.8),
        ],
    }

    _STRATEGY_MAP = {
        "deductive": ReasoningStrategy.DEDUCTIVE,
        "inductive": ReasoningStrategy.INDUCTIVE,
        "abductive": ReasoningStrategy.ABDUCTIVE,
        "analogical": ReasoningStrategy.ANALOGICAL,
        "causal": ReasoningStrategy.CAUSAL,
        "counterfactual": ReasoningStrategy.COUNTERFACTUAL,
    }

    def select(self, context: str, percepts: list[Percept] | None = None) -> ReasoningStrategy:
        """Select the best reasoning strategy for the given context."""
        text = context.lower()
        scores: dict[str, float] = defaultdict(float)

        for strategy_name, patterns in self._STRATEGY_PATTERNS.items():
            for pattern, weight in patterns:
                if pattern in text:
                    scores[strategy_name] += weight

        # Boost based on percept types
        if percepts:
            for p in percepts:
                if p.metadata.get("features", {}).get("has_errors"):
                    scores["abductive"] += 0.3  # Errors suggest diagnosis
                if p.metadata.get("features", {}).get("has_question"):
                    scores["deductive"] += 0.2

        if not scores:
            return ReasoningStrategy.DEDUCTIVE  # Default

        best = max(scores.items(), key=lambda x: x[1])
        return self._STRATEGY_MAP.get(best[0], ReasoningStrategy.DEDUCTIVE)

    def recommend_multi(
        self, context: str, max_strategies: int = 3,
    ) -> list[tuple[ReasoningStrategy, float]]:
        """Recommend multiple strategies with confidence scores."""
        text = context.lower()
        scores: dict[str, float] = defaultdict(float)

        for strategy_name, patterns in self._STRATEGY_PATTERNS.items():
            for pattern, weight in patterns:
                if pattern in text:
                    scores[strategy_name] += weight

        if not scores:
            return [(ReasoningStrategy.DEDUCTIVE, 0.5)]

        sorted_strategies = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        total = sum(s for _, s in sorted_strategies)

        return [
            (self._STRATEGY_MAP[name], score / total if total > 0 else 0.0)
            for name, score in sorted_strategies[:max_strategies]
            if name in self._STRATEGY_MAP
        ]


class ReasoningEngine:
    """Main reasoning engine implementing multi-strategy inference.
    
    Builds thought trees through iterative reasoning steps,
    with strategy selection, evidence tracking, and confidence scoring.
    
    Example:
        engine = ReasoningEngine(max_depth=5)
        result = engine.reason(
            "Why is the system showing high latency?",
            evidence=["CPU at 95%", "Memory usage normal", "Network stable"]
        )
        print(result["conclusion"])
        print(result["confidence"])
    """

    def __init__(
        self,
        max_depth: int = 5,
        branch_factor: int = 3,
        min_confidence: float = 0.2,
    ) -> None:
        self._max_depth = max_depth
        self._branch_factor = branch_factor
        self._min_confidence = min_confidence
        self._strategy_selector = StrategySelector()
        self._thought_tree = ThoughtTree()
        self._event_log: list[CognitiveEvent] = []

    def reason(
        self,
        query: str,
        *,
        evidence: list[str] | None = None,
        strategy: ReasoningStrategy | None = None,
        percepts: list[Percept] | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Perform reasoning on a query with optional evidence.
        
        Returns:
            Dict with keys: conclusion, confidence, confidence_level,
            thought_chain, alternatives, tree_summary, strategy_used.
        """
        self._thought_tree = ThoughtTree()  # Fresh tree per query

        # Select strategy
        selected_strategy = strategy or self._strategy_selector.select(
            query, percepts
        )

        logger.info(
            "Reasoning with %s strategy on: %s",
            selected_strategy.value, query[:80],
        )

        # Build initial thought
        root = Thought(
            content=f"Analyzing: {query}",
            strategy=selected_strategy,
            confidence=0.6,
            evidence=evidence or [],
        )
        self._thought_tree.add(root)

        # Expand reasoning tree
        self._expand_tree(root, evidence or [], selected_strategy, depth=0)

        # Prune low-confidence branches
        pruned = self._thought_tree.prune(self._min_confidence)

        # Extract best path
        best_path = self._thought_tree.best_path()
        conclusion = best_path[-1].content if best_path else "No conclusion reached"
        avg_confidence = (
            sum(t.confidence for t in best_path) / len(best_path)
            if best_path else 0.0
        )

        # Determine confidence level
        confidence_level = self._confidence_level(avg_confidence)

        # Get alternative conclusions
        alternatives = [
            {"conclusion": leaf.content, "confidence": leaf.confidence}
            for leaf in self._thought_tree.leaves
            if leaf.id != (best_path[-1].id if best_path else None)
        ][:3]

        # Log event
        self._event_log.append(CognitiveEvent(
            event_type="reasoning_complete",
            source_layer="reasoning",
            payload={
                "query": query[:200],
                "strategy": selected_strategy.value,
                "conclusion": conclusion[:200],
                "confidence": avg_confidence,
                "tree_depth": self._thought_tree.depth,
                "pruned_nodes": pruned,
            },
        ))

        return {
            "conclusion": conclusion,
            "confidence": round(avg_confidence, 3),
            "confidence_level": confidence_level.value,
            "thought_chain": [
                {"step": i + 1, "thought": t.content, "confidence": t.confidence}
                for i, t in enumerate(best_path)
            ],
            "alternatives": alternatives,
            "tree_summary": self._thought_tree.summary(),
            "strategy_used": selected_strategy.value,
        }

    def multi_strategy_reason(
        self,
        query: str,
        *,
        evidence: list[str] | None = None,
        max_strategies: int = 3,
    ) -> dict[str, Any]:
        """Apply multiple reasoning strategies and synthesize results."""
        strategies = self._strategy_selector.recommend_multi(query, max_strategies)
        results: list[dict[str, Any]] = []

        for strat, weight in strategies:
            result = self.reason(query, evidence=evidence, strategy=strat)
            result["strategy_weight"] = weight
            results.append(result)

        # Synthesize: weighted average of conclusions
        if not results:
            return {"conclusion": "No reasoning path found", "confidence": 0.0}

        # Pick the result with highest weighted confidence
        best = max(
            results,
            key=lambda r: r["confidence"] * r.get("strategy_weight", 1.0),
        )

        return {
            "primary_conclusion": best["conclusion"],
            "primary_confidence": best["confidence"],
            "primary_strategy": best["strategy_used"],
            "all_results": results,
            "consensus": self._compute_consensus(results),
        }

    @property
    def thought_tree(self) -> ThoughtTree:
        return self._thought_tree

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)

    def _expand_tree(
        self,
        parent: Thought,
        evidence: list[str],
        strategy: ReasoningStrategy,
        depth: int,
    ) -> None:
        """Recursively expand the thought tree."""
        if depth >= self._max_depth:
            return

        # Generate child thoughts based on strategy
        children = self._generate_thoughts(parent, evidence, strategy)

        for child in children:
            self._thought_tree.add(child)
            # Recurse with decreasing probability as depth increases
            if child.confidence > self._min_confidence and depth < self._max_depth - 1:
                continuation_prob = 1.0 / (depth + 2)
                if random.random() < continuation_prob:
                    self._expand_tree(child, evidence, strategy, depth + 1)

    def _generate_thoughts(
        self,
        parent: Thought,
        evidence: list[str],
        strategy: ReasoningStrategy,
    ) -> list[Thought]:
        """Generate child thoughts based on the reasoning strategy."""
        generators = {
            ReasoningStrategy.DEDUCTIVE: self._deductive_step,
            ReasoningStrategy.INDUCTIVE: self._inductive_step,
            ReasoningStrategy.ABDUCTIVE: self._abductive_step,
            ReasoningStrategy.ANALOGICAL: self._analogical_step,
            ReasoningStrategy.CAUSAL: self._causal_step,
            ReasoningStrategy.COUNTERFACTUAL: self._counterfactual_step,
        }

        generator = generators.get(strategy, self._deductive_step)
        return generator(parent, evidence)

    def _deductive_step(self, parent: Thought, evidence: list[str]) -> list[Thought]:
        """Generate deductive reasoning steps (premises → conclusion)."""
        thoughts = []
        if evidence:
            # Use evidence as premises
            for i, ev in enumerate(evidence[:self._branch_factor]):
                confidence = parent.confidence * (0.9 - i * 0.1)
                thoughts.append(Thought(
                    content=f"Given '{ev}', it follows that: {parent.content}",
                    strategy=ReasoningStrategy.DEDUCTIVE,
                    confidence=max(confidence, 0.1),
                    evidence=[ev],
                    parent_id=parent.id,
                ))
        else:
            thoughts.append(Thought(
                content=f"By logical inference from: {parent.content}",
                strategy=ReasoningStrategy.DEDUCTIVE,
                confidence=parent.confidence * 0.85,
                parent_id=parent.id,
            ))
        return thoughts

    def _inductive_step(self, parent: Thought, evidence: list[str]) -> list[Thought]:
        """Generate inductive reasoning (observations → generalization)."""
        if not evidence:
            return [Thought(
                content=f"Generalizing from observed pattern: {parent.content}",
                strategy=ReasoningStrategy.INDUCTIVE,
                confidence=parent.confidence * 0.7,
                parent_id=parent.id,
            )]

        # Group evidence as supporting a pattern
        return [Thought(
            content=f"Pattern from {len(evidence)} observations: {parent.content}",
            strategy=ReasoningStrategy.INDUCTIVE,
            confidence=min(parent.confidence * (0.5 + 0.1 * len(evidence)), 0.9),
            evidence=evidence,
            parent_id=parent.id,
        )]

    def _abductive_step(self, parent: Thought, evidence: list[str]) -> list[Thought]:
        """Generate abductive reasoning (observation → best explanation)."""
        thoughts = []
        explanations = [
            "Primary hypothesis",
            "Alternative explanation",
            "Edge case consideration",
        ]
        for i, label in enumerate(explanations[:self._branch_factor]):
            thoughts.append(Thought(
                content=f"{label}: {parent.content}",
                strategy=ReasoningStrategy.ABDUCTIVE,
                confidence=parent.confidence * (0.8 - i * 0.15),
                evidence=evidence[:2] if evidence else [],
                parent_id=parent.id,
            ))
        return thoughts

    def _analogical_step(self, parent: Thought, evidence: list[str]) -> list[Thought]:
        """Generate analogical reasoning (cross-domain mapping)."""
        return [Thought(
            content=f"By analogy with known patterns: {parent.content}",
            strategy=ReasoningStrategy.ANALOGICAL,
            confidence=parent.confidence * 0.65,
            evidence=evidence[:1] if evidence else [],
            parent_id=parent.id,
        )]

    def _causal_step(self, parent: Thought, evidence: list[str]) -> list[Thought]:
        """Generate causal reasoning (cause → effect chains)."""
        thoughts = []
        # Forward causal chain
        thoughts.append(Thought(
            content=f"This causes: {parent.content}",
            strategy=ReasoningStrategy.CAUSAL,
            confidence=parent.confidence * 0.75,
            evidence=evidence,
            parent_id=parent.id,
        ))
        # Backward causal chain
        if evidence:
            thoughts.append(Thought(
                content=f"Root cause analysis: {evidence[0]} → {parent.content}",
                strategy=ReasoningStrategy.CAUSAL,
                confidence=parent.confidence * 0.7,
                evidence=evidence,
                parent_id=parent.id,
            ))
        return thoughts

    def _counterfactual_step(self, parent: Thought, evidence: list[str]) -> list[Thought]:
        """Generate counterfactual reasoning (what-if scenarios)."""
        return [
            Thought(
                content=f"If conditions were different: {parent.content}",
                strategy=ReasoningStrategy.COUNTERFACTUAL,
                confidence=parent.confidence * 0.6,
                parent_id=parent.id,
            ),
            Thought(
                content=f"Under alternative assumptions: {parent.content}",
                strategy=ReasoningStrategy.COUNTERFACTUAL,
                confidence=parent.confidence * 0.5,
                parent_id=parent.id,
            ),
        ]

    @staticmethod
    def _confidence_level(score: float) -> ConfidenceLevel:
        if score >= 0.95:
            return ConfidenceLevel.CERTAIN
        if score >= 0.75:
            return ConfidenceLevel.HIGH
        if score >= 0.50:
            return ConfidenceLevel.MODERATE
        if score >= 0.25:
            return ConfidenceLevel.LOW
        return ConfidenceLevel.SPECULATIVE

    @staticmethod
    def _compute_consensus(results: list[dict[str, Any]]) -> dict[str, Any]:
        """Compute consensus metrics across multiple reasoning results."""
        if not results:
            return {"agreement": 0.0, "spread": 0.0}

        confidences = [r["confidence"] for r in results]
        mean = sum(confidences) / len(confidences)
        variance = sum((c - mean) ** 2 for c in confidences) / len(confidences)

        return {
            "agreement": 1.0 - min(math.sqrt(variance), 1.0),
            "spread": round(max(confidences) - min(confidences), 3),
            "mean_confidence": round(mean, 3),
            "strategy_count": len(results),
        }
