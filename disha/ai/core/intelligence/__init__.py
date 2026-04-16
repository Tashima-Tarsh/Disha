"""
cognitive-engine/intelligence — Reasoning and Decision Intelligence for DISHA.

This subpackage contains three reasoning and decision-making components:

  HybridReasoner       : Combines deductive, inductive, and abductive reasoning
                         to generate three hypothesis branches in parallel.
  QuantumDecisionEngine: Quantum-inspired superposition model for decision selection
                         using amplitude scoring, interference, and collapse.
  GoalEngine           : Priority-queue-based goal manager with dependency tracking
                         and rule-based goal decomposition.
"""

from .hybrid_reasoner import HybridReasoner
from .quantum_decision import QuantumDecisionEngine
from .goal_engine import GoalEngine

__all__ = [
    "HybridReasoner",
    "QuantumDecisionEngine",
    "GoalEngine",
]
