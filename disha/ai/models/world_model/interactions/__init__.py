"""
Interactions sub-package.

Defines the interaction primitives (collision, communication, force) and
the resolver that processes every active interaction each simulation step.
"""

from .interaction import (
    CollisionInteraction,
    CommunicationInteraction,
    ForceInteraction,
    Interaction,
    InteractionResolver,
)

__all__ = [
    "Interaction",
    "CollisionInteraction",
    "CommunicationInteraction",
    "ForceInteraction",
    "InteractionResolver",
]
