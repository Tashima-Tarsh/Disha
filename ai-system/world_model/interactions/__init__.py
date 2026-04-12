"""
Interactions sub-package.

Defines the interaction primitives (collision, communication, force) and
the resolver that processes every active interaction each simulation step.
"""

from .interaction import (
    Interaction,
    CollisionInteraction,
    CommunicationInteraction,
    ForceInteraction,
    InteractionResolver,
)

__all__ = [
    "Interaction",
    "CollisionInteraction",
    "CommunicationInteraction",
    "ForceInteraction",
    "InteractionResolver",
]
