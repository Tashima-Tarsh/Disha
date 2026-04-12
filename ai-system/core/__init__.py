"""
Disha AI System - Core Module

Provides the foundational components for the AI system:
- pipeline_engine: CalcHEP-inspired data processing pipeline
- reasoning_engine: Quantum-inspired Bayesian reasoning and decision making
- simulation_engine: Configurable simulation with event scheduling
- agent_framework: Multi-agent system with perception, deliberation, and communication
"""

from core.pipeline_engine.pipeline import Pipeline, PipelineStage
from core.reasoning_engine.reasoning import (
    ReasoningEngine,
    DecisionFramework,
    Hypothesis,
)
from core.simulation_engine.simulator import (
    Simulator,
    BatchSimulator,
    SimulationConfig,
    SimulationState,
)
from core.agent_framework.agent import (
    SimAgent,
    MultiAgentSystem,
    AgentCommunicationBus,
    AgentState,
)

__all__ = [
    "Pipeline",
    "PipelineStage",
    "ReasoningEngine",
    "DecisionFramework",
    "Hypothesis",
    "Simulator",
    "BatchSimulator",
    "SimulationConfig",
    "SimulationState",
    "SimAgent",
    "MultiAgentSystem",
    "AgentCommunicationBus",
    "AgentState",
]
