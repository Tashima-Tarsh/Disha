"""
Classical Physics Submodule
===========================

Provides Newtonian mechanics, thermodynamics, and electromagnetism engines.
"""

from physics_engine.classical.mechanics import (
    PhysicsObject,
    ClassicalMechanicsEngine,
)
from physics_engine.classical.thermodynamics import (
    ThermalBody,
    ThermodynamicsEngine,
)
from physics_engine.classical.electromagnetism import (
    ChargedParticle,
    ElectromagneticEngine,
)

__all__ = [
    "PhysicsObject",
    "ClassicalMechanicsEngine",
    "ThermalBody",
    "ThermodynamicsEngine",
    "ChargedParticle",
    "ElectromagneticEngine",
]
