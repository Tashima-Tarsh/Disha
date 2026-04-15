"""
Quantum-Inspired Submodule
===========================

State-vector superposition and entanglement models for decision making and
probabilistic reasoning.
"""

from physics_engine.quantum_inspired.superposition import (
    QuantumState,
    SuperpositionManager,
)
from physics_engine.quantum_inspired.entanglement import (
    EntangledPair,
)

__all__ = [
    "QuantumState",
    "SuperpositionManager",
    "EntangledPair",
]
