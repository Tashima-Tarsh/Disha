"""
Classical Physics Submodule
===========================

Provides Newtonian mechanics, thermodynamics, and electromagnetism engines.
"""

from physics_engine.classical.electromagnetism import (
    ChargedParticle,
    ElectromagneticEngine,
)
from physics_engine.classical.mechanics import (
    ClassicalMechanicsEngine,
    PhysicsObject,
)
from physics_engine.classical.thermodynamics import (
    ThermalBody,
    ThermodynamicsEngine,
)

__all__ = [
    "PhysicsObject",
    "ClassicalMechanicsEngine",
    "ThermalBody",
    "ThermodynamicsEngine",
    "ChargedParticle",
    "ElectromagneticEngine",
]
