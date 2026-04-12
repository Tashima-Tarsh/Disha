"""Cognitive Engine — The unified cognitive architecture for Disha.

Integrates all cognitive layers into a single processing loop:
    Perceive → Reason → Remember → Act → Reflect

This is the main entry point for the cognitive architecture,
orchestrating perception, reasoning, memory, action, reflection,
multi-agent coordination, hybrid intelligence, and quantum reasoning.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from .types import (
    CognitiveEvent,
    CognitiveMode,
    CognitiveSnapshot,
    ConfidenceLevel,
    Episode,
    Goal,
    Percept,
    ReasoningStrategy,
    ReflectionTrigger,
)
from .perception import PerceptionEngine
from .reasoning import ReasoningEngine
from .memory import CognitiveMemorySystem
from .action import ActionEngine
from .reflection import ReflectionEngine
from .orchestration import OrchestrationEngine
from .intelligence import HybridIntelligence
from .quantum_reasoning import QuantumReasoningEngine

logger = logging.getLogger(__name__)


class CognitiveEngine:
    """The unified cognitive engine powering Disha's intelligence.
    
    Implements a full cognitive processing loop:
    
    1. PERCEIVE: Process inputs through attention and feature extraction
    2. REASON: Apply multi-strategy reasoning (deductive, inductive, etc.)
    3. REMEMBER: Store/retrieve from episodic, semantic, and working memory
    4. ACT: Plan and execute goal-driven actions
    5. REFLECT: Monitor performance and generate improvements
    
    Additionally supports:
    - Multi-agent deliberation via orchestration layer
    - Hybrid intelligence (LLM + symbolic + rules)
    - Quantum-inspired probabilistic reasoning
    
    Example:
        engine = CognitiveEngine(context_keywords=["security", "threat"])
        
        # Full cognitive cycle
        result = engine.process(
            "Critical security breach detected in authentication module",
            source="alert_system",
        )
        
        print(result["perception"])   # What was noticed
        print(result["reasoning"])    # What was concluded
        print(result["actions"])      # What should be done
        print(result["reflection"])   # Self-assessment
    """

    def __init__(
        self,
        context_keywords: list[str] | None = None,
        max_reasoning_depth: int = 5,
        working_memory_capacity: int = 7,
        model_name: str = "default",
    ) -> None:
        # Core cognitive layers
        self.perception = PerceptionEngine(
            context_keywords=context_keywords,
            attention_capacity=working_memory_capacity,
        )
        self.reasoning = ReasoningEngine(max_depth=max_reasoning_depth)
        self.memory = CognitiveMemorySystem(
            working_capacity=working_memory_capacity,
        )
        self.action = ActionEngine()
        self.reflection = ReflectionEngine()

        # Advanced layers
        self.orchestration = OrchestrationEngine()
        self.intelligence = HybridIntelligence(model_name=model_name)
        self.quantum = QuantumReasoningEngine()

        # State
        self._mode = CognitiveMode.REACTIVE
        self._cycle_count = 0
        self._start_time = time.time()
        self._event_log: list[CognitiveEvent] = []

    def process(
        self,
        input_data: Any,
        *,
        source: str = "direct",
        mode: CognitiveMode | None = None,
        goal_description: str | None = None,
    ) -> dict[str, Any]:
        """Run a full cognitive processing cycle.
        
        Args:
            input_data: Raw input (text, dict, code, etc.)
            source: Origin of the input
            mode: Override the cognitive mode
            goal_description: Optional goal to pursue
            
        Returns:
            Comprehensive result dict with outputs from all cognitive layers.
        """
        self._cycle_count += 1
        cycle_start = time.time()
        current_mode = mode or self._mode

        logger.info(
            "Cognitive cycle #%d [%s] — processing input from %s",
            self._cycle_count, current_mode.value, source,
        )

        result: dict[str, Any] = {
            "cycle": self._cycle_count,
            "mode": current_mode.value,
            "timestamp": None,
        }

        # ── 1. PERCEIVE ─────────────────────────────────────────
        percepts = self.perception.perceive(input_data, source=source)
        result["perception"] = {
            "percept_count": len(percepts),
            "percepts": [
                {
                    "id": p.id,
                    "type": p.perception_type.value,
                    "salience": p.salience,
                    "source": p.source,
                }
                for p in percepts
            ],
        }

        # Store in working memory
        for p in percepts:
            self.memory.working.hold(
                p.content, label=f"percept_{p.id}", priority=p.salience,
            )

        # ── 2. REASON ───────────────────────────────────────────
        query = str(input_data)[:500] if not isinstance(input_data, str) else input_data[:500]
        
        if current_mode == CognitiveMode.DELIBERATIVE:
            reasoning_result = self.reasoning.multi_strategy_reason(query)
        else:
            reasoning_result = self.reasoning.reason(query, percepts=percepts)
        
        result["reasoning"] = {
            "conclusion": reasoning_result.get("conclusion") or reasoning_result.get("primary_conclusion", ""),
            "confidence": reasoning_result.get("confidence") or reasoning_result.get("primary_confidence", 0.0),
            "strategy": reasoning_result.get("strategy_used") or reasoning_result.get("primary_strategy", ""),
        }

        # Track reasoning confidence for reflection
        confidence = result["reasoning"]["confidence"]
        self.reflection.observe("reasoning_confidence", confidence)

        # ── 3. REMEMBER ─────────────────────────────────────────
        # Store reasoning as episodic memory
        episode = Episode(
            context={"input": str(input_data)[:200], "source": source},
            outcome=result["reasoning"]["conclusion"][:200],
            importance=max(p.salience for p in percepts) if percepts else 0.5,
            tags=[source, current_mode.value],
        )
        self.memory.episodic.record(episode)

        # Add to semantic memory if high confidence
        if confidence >= 0.7:
            self.memory.semantic.add_concept(
                concept=result["reasoning"]["conclusion"][:100],
                category="derived_knowledge",
                properties={
                    "confidence": confidence,
                    "source": source,
                    "cycle": self._cycle_count,
                },
            )

        result["memory"] = self.memory.snapshot()

        # ── 4. ACT ──────────────────────────────────────────────
        if goal_description:
            goal = self.action.goals.propose(
                goal_description,
                priority=max(p.salience for p in percepts) if percepts else 0.5,
            )
            self.action.goals.activate(goal.id)
            actions = self.action.plan(goal)
            result["actions"] = {
                "goal_id": goal.id,
                "goal_status": goal.status.value,
                "planned_actions": len(actions),
                "actions": actions[:5],
            }
        else:
            result["actions"] = {"planned_actions": 0, "actions": []}

        # ── 5. REFLECT ──────────────────────────────────────────
        # Periodic reflection every 5 cycles or on low confidence
        should_reflect = (
            self._cycle_count % 5 == 0
            or confidence < 0.3
            or current_mode == CognitiveMode.REFLECTIVE
        )

        if should_reflect:
            snapshot = self.snapshot()
            report = self.reflection.reflect(
                trigger=(
                    ReflectionTrigger.UNCERTAINTY if confidence < 0.3
                    else ReflectionTrigger.PERIODIC
                ),
                cognitive_snapshot=snapshot,
            )
            result["reflection"] = {
                "triggered": True,
                "observations": report.observations[:5],
                "recommendations": report.recommendations[:3],
                "diagnosis": report.diagnosis,
            }
        else:
            result["reflection"] = {"triggered": False}

        # Record processing time
        duration = time.time() - cycle_start
        result["duration_ms"] = round(duration * 1000, 1)
        self.reflection.observe("cycle_duration_ms", duration * 1000)

        self._event_log.append(CognitiveEvent(
            event_type="cognitive_cycle",
            source_layer="engine",
            payload={
                "cycle": self._cycle_count,
                "mode": current_mode.value,
                "confidence": confidence,
                "duration_ms": result["duration_ms"],
            },
        ))

        return result

    def think(self, query: str, **kwargs: Any) -> dict[str, Any]:
        """Shorthand for deliberative reasoning on a query."""
        return self.process(query, mode=CognitiveMode.DELIBERATIVE, **kwargs)

    def react(self, stimulus: Any, **kwargs: Any) -> dict[str, Any]:
        """Shorthand for reactive processing of a stimulus."""
        return self.process(stimulus, mode=CognitiveMode.REACTIVE, **kwargs)

    def reflect(self) -> dict[str, Any]:
        """Trigger an explicit self-reflection cycle."""
        report = self.reflection.reflect(
            trigger=ReflectionTrigger.EXTERNAL_REQUEST,
            cognitive_snapshot=self.snapshot(),
        )
        meta = self.reflection.meta_reflect()
        return {
            "report": {
                "observations": report.observations,
                "diagnosis": report.diagnosis,
                "recommendations": report.recommendations,
                "confidence": report.confidence,
            },
            "meta_reflection": meta,
        }

    def deliberate(self, topic: str, **kwargs: Any) -> dict[str, Any]:
        """Run multi-agent deliberation on a topic."""
        return self.orchestration.deliberate(topic, **kwargs)

    def hybrid_reason(self, query: str, **kwargs: Any) -> dict[str, Any]:
        """Run hybrid intelligence (neural + symbolic + rules)."""
        return self.intelligence.reason(query, **kwargs)

    def quantum_explore(self, hypotheses: list[dict[str, Any]], **kwargs: Any) -> dict[str, Any]:
        """Explore hypotheses using quantum-inspired reasoning."""
        return self.quantum.explore_hypotheses(hypotheses, **kwargs)

    def snapshot(self) -> CognitiveSnapshot:
        """Get a complete snapshot of the cognitive system state."""
        return CognitiveSnapshot(
            mode=self._mode,
            active_goals=self.action.goals.get_active(),
            working_memory_load=self.memory.working.load,
            reasoning_depth=self.reasoning.thought_tree.depth,
            reflection_count=len(self.reflection.reports),
            agent_consensus=0.0,
            confidence=ConfidenceLevel.MODERATE,
            cycle_count=self._cycle_count,
            uptime_seconds=time.time() - self._start_time,
        )

    @property
    def mode(self) -> CognitiveMode:
        return self._mode

    @mode.setter
    def mode(self, value: CognitiveMode) -> None:
        self._mode = value

    @property
    def cycle_count(self) -> int:
        return self._cycle_count

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)

    def summary(self) -> dict[str, Any]:
        """Comprehensive system summary."""
        return {
            "engine": {
                "mode": self._mode.value,
                "cycles": self._cycle_count,
                "uptime_seconds": round(time.time() - self._start_time, 1),
            },
            "memory": self.memory.snapshot(),
            "goals": self.action.goals.summary(),
            "orchestration": self.orchestration.summary(),
            "intelligence": self.intelligence.summary(),
            "events": len(self._event_log),
        }
