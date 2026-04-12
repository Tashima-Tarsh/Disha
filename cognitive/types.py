"""Cognitive Architecture type definitions for Disha.

Defines the core data structures used across all cognitive layers:
perception, reasoning, memory, action, reflection, and orchestration.
"""

from __future__ import annotations

import enum
import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


# ── Cognitive State Enums ──────────────────────────────────────────

class CognitiveMode(enum.Enum):
    """Operating mode of the cognitive system."""
    REACTIVE = "reactive"          # Fast, stimulus-response
    DELIBERATIVE = "deliberative"  # Slow, goal-directed reasoning
    REFLECTIVE = "reflective"      # Meta-cognitive self-analysis
    CREATIVE = "creative"          # Novel solution generation
    LEARNING = "learning"          # Active knowledge acquisition


class PerceptionType(enum.Enum):
    """Types of sensory input the system can process."""
    TEXT = "text"
    CODE = "code"
    STRUCTURED_DATA = "structured_data"
    EVENT = "event"
    SIGNAL = "signal"
    FEEDBACK = "feedback"


class ReasoningStrategy(enum.Enum):
    """Reasoning approaches available to the system."""
    DEDUCTIVE = "deductive"          # Top-down logical inference
    INDUCTIVE = "inductive"          # Bottom-up pattern generalization
    ABDUCTIVE = "abductive"          # Best explanation inference
    ANALOGICAL = "analogical"        # Cross-domain mapping
    CAUSAL = "causal"                # Cause-effect chain analysis
    COUNTERFACTUAL = "counterfactual" # What-if simulation
    PROBABILISTIC = "probabilistic"  # Bayesian belief updating


class MemoryType(enum.Enum):
    """Categories in the cognitive memory system."""
    WORKING = "working"        # Active processing buffer (7±2 items)
    EPISODIC = "episodic"      # Event sequences with temporal context
    SEMANTIC = "semantic"      # Facts, concepts, relationships
    PROCEDURAL = "procedural"  # Skills and action sequences
    PROSPECTIVE = "prospective" # Future intentions and plans


class GoalStatus(enum.Enum):
    """Status of a cognitive goal."""
    PROPOSED = "proposed"
    ACTIVE = "active"
    PURSUING = "pursuing"
    ACHIEVED = "achieved"
    FAILED = "failed"
    SUSPENDED = "suspended"
    ABANDONED = "abandoned"


class AgentRole(enum.Enum):
    """Roles in the multi-agent orchestration system."""
    PLANNER = "planner"
    EXECUTOR = "executor"
    CRITIC = "critic"
    MEMORY_MANAGER = "memory_manager"
    TOOL_SPECIALIST = "tool_specialist"
    SYNTHESIZER = "synthesizer"
    MONITOR = "monitor"


class ConsensusMethod(enum.Enum):
    """Methods for multi-agent consensus."""
    MAJORITY_VOTE = "majority_vote"
    WEIGHTED_VOTE = "weighted_vote"
    DEBATE = "debate"
    HIERARCHICAL = "hierarchical"
    BLACKBOARD = "blackboard"


class ReflectionTrigger(enum.Enum):
    """What triggers self-reflection."""
    FAILURE = "failure"
    UNCERTAINTY = "uncertainty"
    PERIODIC = "periodic"
    GOAL_COMPLETION = "goal_completion"
    ANOMALY = "anomaly"
    EXTERNAL_REQUEST = "external_request"


class ConfidenceLevel(enum.Enum):
    """Confidence in a cognitive output."""
    CERTAIN = "certain"          # >95%
    HIGH = "high"                # 75-95%
    MODERATE = "moderate"        # 50-75%
    LOW = "low"                  # 25-50%
    SPECULATIVE = "speculative"  # <25%


# ── Core Data Structures ──────────────────────────────────────────

@dataclass
class Percept:
    """A single unit of perceived input."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    perception_type: PerceptionType = PerceptionType.TEXT
    content: Any = None
    source: str = ""
    salience: float = 0.5  # 0.0 = irrelevant, 1.0 = critical
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Thought:
    """A reasoning step or intermediate conclusion."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    content: str = ""
    strategy: ReasoningStrategy = ReasoningStrategy.DEDUCTIVE
    confidence: float = 0.5
    evidence: list[str] = field(default_factory=list)
    parent_id: str | None = None
    children: list[str] = field(default_factory=list)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Goal:
    """A cognitive goal driving the system's behavior."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    description: str = ""
    status: GoalStatus = GoalStatus.PROPOSED
    priority: float = 0.5  # 0.0 = low, 1.0 = critical
    parent_goal: str | None = None
    subgoals: list[str] = field(default_factory=list)
    success_criteria: list[str] = field(default_factory=list)
    progress: float = 0.0  # 0.0 to 1.0
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    deadline: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_terminal(self) -> bool:
        return self.status in (
            GoalStatus.ACHIEVED, GoalStatus.FAILED, GoalStatus.ABANDONED
        )


@dataclass
class CognitiveEvent:
    """An event in the cognitive processing pipeline."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    event_type: str = ""
    source_layer: str = ""  # perception, reasoning, memory, action, reflection
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class Episode:
    """A temporal sequence of events forming an episodic memory."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    events: list[CognitiveEvent] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)
    outcome: str = ""
    emotional_valence: float = 0.0  # -1.0 negative to +1.0 positive
    importance: float = 0.5
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    tags: list[str] = field(default_factory=list)


@dataclass
class SemanticNode:
    """A concept in the semantic memory graph."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    concept: str = ""
    category: str = ""
    properties: dict[str, Any] = field(default_factory=dict)
    relations: list[tuple[str, str, float]] = field(default_factory=list)  # (relation, target_id, weight)
    activation: float = 0.0  # Spreading activation level
    access_count: int = 0
    last_accessed: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class AgentMessage:
    """A message in the multi-agent communication protocol."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    sender: AgentRole = AgentRole.PLANNER
    receiver: AgentRole | None = None  # None = broadcast
    performative: str = "inform"  # inform, request, propose, critique, accept, reject
    content: Any = None
    in_reply_to: str | None = None
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class ReflectionReport:
    """Output of a self-reflection cycle."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    trigger: ReflectionTrigger = ReflectionTrigger.PERIODIC
    observations: list[str] = field(default_factory=list)
    diagnosis: str = ""
    recommendations: list[str] = field(default_factory=list)
    confidence: float = 0.5
    metrics: dict[str, float] = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class QuantumState:
    """A superposition of possible cognitive states for quantum-inspired reasoning."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    branches: list[dict[str, Any]] = field(default_factory=list)  # Each branch = {state, probability, metadata}
    collapsed: bool = False
    selected_branch: int | None = None
    coherence: float = 1.0  # How well branches maintain consistency
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def collapse(self, branch_index: int) -> dict[str, Any]:
        """Collapse the superposition to a single state."""
        if branch_index < 0 or branch_index >= len(self.branches):
            raise ValueError(f"Invalid branch index: {branch_index}")
        self.collapsed = True
        self.selected_branch = branch_index
        return self.branches[branch_index]

    @property
    def entropy(self) -> float:
        """Calculate Shannon entropy of branch probabilities."""
        probs = [b.get("probability", 0.0) for b in self.branches]
        total = sum(probs)
        if total == 0:
            return 0.0
        probs = [p / total for p in probs]
        return -sum(p * math.log2(p) for p in probs if p > 0)


@dataclass
class CognitiveSnapshot:
    """Complete snapshot of the cognitive system state."""
    mode: CognitiveMode = CognitiveMode.REACTIVE
    active_goals: list[Goal] = field(default_factory=list)
    working_memory_load: float = 0.0  # 0.0 to 1.0
    reasoning_depth: int = 0
    reflection_count: int = 0
    agent_consensus: float = 0.0
    confidence: ConfidenceLevel = ConfidenceLevel.MODERATE
    cycle_count: int = 0
    uptime_seconds: float = 0.0
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
