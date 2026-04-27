"""
Entities sub-package.

Provides the core entity types and the spatial entity registry used to
track every object that exists inside the simulated world.
"""

from .entity import AgentEntity, Entity, EntityState, ObjectEntity
from .entity_registry import EntityRegistry

__all__ = [
    "Entity",
    "AgentEntity",
    "ObjectEntity",
    "EntityState",
    "EntityRegistry",
]
