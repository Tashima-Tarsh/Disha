"""Disha Cognitive Architecture — Next-generation cognitive AI framework.

A neuroscience-inspired cognitive architecture combining:
- Perception: Multi-modal sensory input processing
- Reasoning: Hybrid deductive, inductive, abductive, and causal inference
- Memory: Episodic + Semantic + Working + Procedural memory systems
- Action: Goal-driven execution with planning and monitoring
- Reflection: Self-monitoring, meta-cognition, and continuous improvement
- Orchestration: Multi-agent consensus with debate and voting protocols
- Intelligence: Hybrid LLM + Symbolic + Rule engine reasoning
- Quantum Reasoning: Probabilistic multi-path simulation inspired by quantum mechanics

Usage:
    from cognitive import CognitiveEngine
    from cognitive.types import CognitiveMode, Goal, Thought
"""

__version__ = "1.0.0"

from .types import (
    AgentMessage,
    AgentRole,
    CognitiveEvent,
    CognitiveMode,
    CognitiveSnapshot,
    ConfidenceLevel,
    ConsensusMethod,
    Episode,
    Goal,
    GoalStatus,
    MemoryType,
    Percept,
    PerceptionType,
    QuantumState,
    ReasoningStrategy,
    ReflectionReport,
    ReflectionTrigger,
    SemanticNode,
    Thought,
)

__all__ = [
    "AgentMessage",
    "AgentRole",
    "CognitiveEvent",
    "CognitiveMode",
    "CognitiveSnapshot",
    "ConfidenceLevel",
    "ConsensusMethod",
    "Episode",
    "Goal",
    "GoalStatus",
    "MemoryType",
    "Percept",
    "PerceptionType",
    "QuantumState",
    "ReasoningStrategy",
    "ReflectionReport",
    "ReflectionTrigger",
    "SemanticNode",
    "Thought",
]
