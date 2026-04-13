"""
cognitive-engine/agents — Multi-Agent Deliberation for the DISHA Cognitive Architecture.

This subpackage implements the three-agent deliberation layer that sits between
raw reasoning hypotheses and final action selection:

  Planner  → strategic goal decomposition
  Executor → concrete step-by-step action plan
  Critic   → quality gate and risk assessment
  Vote     → confidence-weighted consensus

The AgentDeliberator class orchestrates all three and returns a consensus dict.
"""

from cognitive_engine.agents.deliberation import AgentDeliberator

__all__ = ["AgentDeliberator"]
