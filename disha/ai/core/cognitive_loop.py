from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import structlog

from .memory.memory_manager import MemoryManager
from .agents.deliberation import AgentDeliberator
from .intelligence.hybrid_reasoner import HybridReasoner
from .intelligence.quantum_decision import QuantumDecisionEngine
from .intelligence.goal_engine import GoalEngine
from .decision_engine.main_decision_engine import DecisionEngine

logger = structlog.get_logger("cognitive_loop")


@dataclass
class CognitiveState:
    session_id: str
    turn: int
    raw_input: str

    intent: str = ""
    entities: list[str] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)
    uncertainty: float = 0.5

    working_memory: list[dict] = field(default_factory=list)
    recalled_episodes: list[dict] = field(default_factory=list)
    recalled_concepts: list[dict] = field(default_factory=list)

    hypotheses: list[dict] = field(default_factory=list)
    selected_hypothesis: dict | None = None

    agent_deliberations: list[dict] = field(default_factory=list)
    consensus: dict | None = None
    dissenting_view: dict | None = None

    action: dict | None = None
    confidence: float = 0.0

    reflection: dict | None = None
    learning_triggers: list[str] = field(default_factory=list)

    consolidated_episodes: int = 0
    new_concepts_learned: int = 0

    stage_durations: dict[str, float] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items()}


class CognitiveEngine:
    CONFIDENCE_THRESHOLD = 0.45
    WORKING_MEMORY_DECAY = 0.92

    def __init__(self):
        self.memory = MemoryManager()
        self.deliberator = AgentDeliberator()
        self.reasoner = HybridReasoner()
        self.decision_engine = QuantumDecisionEngine()
        self.decision_nexus = DecisionEngine()
        self.goal_engine = GoalEngine()

        self._traces: dict[str, list[CognitiveState]] = {}

    async def process(
        self, raw_input: str, session_id: str | None = None
    ) -> CognitiveState:
        session_id = session_id or str(uuid.uuid4())
        turn = len(self._traces.get(session_id, []))

        state = CognitiveState(
            session_id=session_id,
            turn=turn,
            raw_input=raw_input,
        )

        log = logger.bind(session=session_id, turn=turn)
        log.info("cognitive_cycle_start", input_preview=raw_input[:80])

        stages = [
            ("perceive", self._perceive),
            ("attend", self._attend),
            ("reason", self._reason),
            ("deliberate", self._deliberate),
            ("act", self._act),
            ("reflect", self._reflect),
            ("consolidate", self._consolidate),
        ]

        for stage_name, stage_fn in stages:
            t0 = time.perf_counter()
            try:
                await stage_fn(state)
            except Exception as exc:
                log.error("stage_failed", stage=stage_name, error=str(exc))
                state.learning_triggers.append(f"stage_error:{stage_name}")
            state.stage_durations[stage_name] = round(time.perf_counter() - t0, 4)
            log.debug(
                "stage_complete",
                stage=stage_name,
                duration=state.stage_durations[stage_name],
            )

        self._traces.setdefault(session_id, []).append(state)
        log.info(
            "cognitive_cycle_complete",
            confidence=round(state.confidence, 3),
            action_type=state.action.get("type") if state.action else None,
            reflection_quality=state.reflection.get("quality")
            if state.reflection
            else None,
        )

        return state

    async def _perceive(self, state: CognitiveState) -> None:
        text = state.raw_input.lower()

        intent_map = {
            "investigate": [
                "investigate",
                "analyse",
                "analyze",
                "check",
                "scan",
                "look into",
            ],
            "explain": ["explain", "what is", "how does", "describe", "tell me about"],
            "plan": ["plan", "strategy", "how to", "steps to", "roadmap"],
            "threat": [
                "threat",
                "attack",
                "malware",
                "vulnerability",
                "exploit",
                "breach",
            ],
            "compare": ["compare", "difference", "versus", "vs", "better than"],
            "summarize": ["summarize", "summary", "tldr", "overview", "brief"],
        }
        state.intent = "general"
        for intent, keywords in intent_map.items():
            if any(k in text for k in keywords):
                state.intent = intent
                break

        import re

        ip_pattern = re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b")
        domain_pattern = re.compile(r"\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b")
        state.entities = (
            ip_pattern.findall(state.raw_input)
            + [d for d in domain_pattern.findall(state.raw_input) if len(d) > 4]
        )[:10]

        word_count = len(state.raw_input.split())
        state.uncertainty = max(0.1, min(0.9, 1.0 - word_count / 30))

    async def _attend(self, state: CognitiveState) -> None:
        memory_ctx = await self.memory.retrieve(state.raw_input, state.session_id)

        state.working_memory = memory_ctx.get("working", [])
        state.recalled_episodes = memory_ctx.get("episodic", [])[:4]
        state.recalled_concepts = memory_ctx.get("semantic", [])[:4]

        self.memory.working.decay(self.WORKING_MEMORY_DECAY)

        self.memory.working.add(
            {"content": state.raw_input, "intent": state.intent, "turn": state.turn},
            relevance=1.0 - state.uncertainty,
        )

    async def _reason(self, state: CognitiveState) -> None:
        context = {
            "intent": state.intent,
            "entities": state.entities,
            "episodes": state.recalled_episodes,
            "concepts": state.recalled_concepts,
            "uncertainty": state.uncertainty,
        }

        hypotheses = await self.reasoner.reason(state.raw_input, context)
        state.hypotheses = [h if isinstance(h, dict) else vars(h) for h in hypotheses]
        best = self.reasoner.select_best(hypotheses)
        state.selected_hypothesis = best if isinstance(best, dict) else vars(best)

    async def _deliberate(self, state: CognitiveState) -> None:
        # 1. Internal Multi-Agent Deliberation (Planner, Executor, Critic)
        deliberation_result = await self.deliberator.deliberate(state)
        state.agent_deliberations = deliberation_result.get("all_opinions", [])

        # 2. Nexus-Level Multi-Agent Decision (Political, Legal, Security, Ideology)
        nexus_result = self.decision_nexus.decide(state.raw_input)
        state.consensus = {
            **deliberation_result.get("winner", {}),
            "nexus_analysis": nexus_result,
            "recommendations": nexus_result.get("recommendations", []),
        }
        state.dissenting_view = deliberation_result.get("dissenting_view")

    async def _act(self, state: CognitiveState) -> None:
        hypothesis_conf = (
            state.selected_hypothesis.get("confidence", 0.5)
            if state.selected_hypothesis
            else 0.5
        )
        deliberation_conf = (
            state.consensus.get("confidence", 0.5) if state.consensus else 0.5
        )
        state.confidence = round((hypothesis_conf + deliberation_conf) / 2, 3)

        if state.confidence < self.CONFIDENCE_THRESHOLD:
            state.action = {
                "type": "clarification_request",
                "message": (
                    f"Confidence too low ({state.confidence:.0%}) to act reliably. "
                    "Could you provide more detail or context?"
                ),
                "confidence": state.confidence,
            }
        else:
            recommendation = (state.consensus or {}).get("recommendation", "")
            state.action = {
                "type": state.intent,
                "response": recommendation
                or (state.selected_hypothesis or {}).get("hypothesis", ""),
                "entities_involved": state.entities,
                "confidence": state.confidence,
                "reasoning_mode": (state.selected_hypothesis or {}).get(
                    "mode", "unknown"
                ),
            }

    async def _reflect(self, state: CognitiveState) -> None:
        quality_factors = []
        triggers = []

        opinions = state.agent_deliberations
        if len(opinions) >= 2:
            confs = [o.get("confidence", 0) for o in opinions if isinstance(o, dict)]
            if confs:
                variance = sum((c - sum(confs) / len(confs)) ** 2 for c in confs) / len(
                    confs
                )
                convergence = max(0.0, 1.0 - variance * 4)
                quality_factors.append(convergence)
                if convergence < 0.4:
                    triggers.append("agent_divergence")

        quality_factors.append(state.confidence)
        if state.confidence < self.CONFIDENCE_THRESHOLD:
            triggers.append("low_confidence")

        if state.recalled_episodes or state.recalled_concepts:
            quality_factors.append(0.8)
        else:
            quality_factors.append(0.3)
            triggers.append("no_prior_context")

        if len(state.hypotheses) >= 3:
            quality_factors.append(0.9)
        else:
            quality_factors.append(0.4)
            triggers.append("limited_hypothesis_diversity")

        quality = round(sum(quality_factors) / max(len(quality_factors), 1), 3)

        state.reflection = {
            "quality": quality,
            "factors": {
                "agent_convergence": quality_factors[0]
                if len(quality_factors) > 0
                else None,
                "action_confidence": state.confidence,
                "memory_retrieval": quality_factors[2]
                if len(quality_factors) > 2
                else None,
                "hypothesis_diversity": quality_factors[3]
                if len(quality_factors) > 3
                else None,
            },
        }
        state.learning_triggers = triggers

    async def _consolidate(self, state: CognitiveState) -> None:

        importance = (
            round((state.reflection.get("quality", 0.5) + state.confidence) / 2, 3)
            if state.reflection
            else state.confidence
        )

        await self.memory.store_episode(
            session_id=state.session_id,
            turn=state.turn,
            content=state.raw_input,
            outcome=str(state.action),
            importance=importance,
        )

        promoted = self.memory.promote_to_semantic(state.session_id)
        state.consolidated_episodes = promoted

        for entity in state.entities[:3]:
            if entity and len(entity) > 3:
                await self.memory.learn_concept(
                    concept=entity,
                    definition=f"Entity observed in session {state.session_id}, turn {state.turn}",
                    relations=[
                        {
                            "target": state.intent,
                            "rel_type": "related_to",
                            "confidence": state.confidence,
                        }
                    ],
                    source=f"session:{state.session_id}",
                )
                state.new_concepts_learned += 1

    def get_introspection_report(self, session_id: str) -> dict:
        turns = self._traces.get(session_id, [])
        return {
            "session_id": session_id,
            "total_turns": len(turns),
            "turns": [t.to_dict() for t in turns],
            "memory_stats": self.memory.get_memory_stats(),
            "goal_tree": self.goal_engine.get_goal_tree(),
        }

    def get_session_ids(self) -> list[str]:
        return list(self._traces.keys())
