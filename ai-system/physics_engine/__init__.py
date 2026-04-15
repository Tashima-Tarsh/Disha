"""
Physics Engine Module
=====================

A production-quality physics simulation engine providing classical mechanics,
thermodynamics, electromagnetism, quantum-inspired state management, numerical
integration, and constraint solving.

Submodules:
    classical: Newtonian mechanics, thermodynamics, electromagnetism.
    quantum_inspired: Superposition and entanglement models.
    state_evolution: Numerical integrators and time-stepping utilities.
    constraints: Constraint definitions and iterative solvers.
"""

from physics_engine.classical.mechanics import (
    ClassicalMechanicsEngine,
    PhysicsObject,
)
from physics_engine.classical.thermodynamics import (
    ThermalBody,
    ThermodynamicsEngine,
)
from physics_engine.classical.electromagnetism import (
    ChargedParticle,
    ElectromagneticEngine,
)
from physics_engine.quantum_inspired.superposition import (
    QuantumState,
    SuperpositionManager,
)
from physics_engine.quantum_inspired.entanglement import (
    EntangledPair,
)
from physics_engine.state_evolution.integrator import (
    EulerIntegrator,
    RungeKutta4Integrator,
)
from physics_engine.state_evolution.time_stepper import TimeStepper
from physics_engine.constraints.constraint_solver import (
    Constraint,
    DistanceConstraint,
    BoundaryConstraint,
    ConstraintSolver,
)

__all__ = [
    "PhysicsObject",
    "ClassicalMechanicsEngine",
    "ThermalBody",
    "ThermodynamicsEngine",
    "ChargedParticle",
    "ElectromagneticEngine",
    "QuantumState",
    "SuperpositionManager",
    "EntangledPair",
    "EulerIntegrator",
    "RungeKutta4Integrator",
    "TimeStepper",
    "Constraint",
    "DistanceConstraint",
    "BoundaryConstraint",
    "ConstraintSolver",
]
