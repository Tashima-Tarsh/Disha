"""
World Model System
==================

A comprehensive world simulation framework providing entity management,
environment modeling, interaction resolution, and world orchestration.

Modules:
    entities: Entity definitions, agent/object types, and spatial registry.
    environments: Terrain, regions, and environmental conditions.
    interactions: Collision, communication, and force interaction systems.
    world_manager: Top-level World class that ties all subsystems together.
"""

from .entities.entity import AgentEntity, Entity, EntityState, ObjectEntity
from .entities.entity_registry import EntityRegistry
from .environments.environment import (
    Environment,
    EnvironmentConditions,
    Region,
)
from .interactions.interaction import (
    CollisionInteraction,
    CommunicationInteraction,
    ForceInteraction,
    Interaction,
    InteractionResolver,
)
from .world_manager.world import World

__all__ = [
    "Entity",
    "AgentEntity",
    "ObjectEntity",
    "EntityState",
    "EntityRegistry",
    "Environment",
    "EnvironmentConditions",
    "Region",
    "Interaction",
    "CollisionInteraction",
    "CommunicationInteraction",
    "ForceInteraction",
    "InteractionResolver",
    "World",
]

__version__ = "1.0.0"
