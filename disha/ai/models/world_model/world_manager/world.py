"""
World Manager — top-level simulation orchestrator.

:class:`World` binds together an :class:`EntityRegistry`, an
:class:`Environment`, and an :class:`InteractionResolver`, and drives the
simulation loop via :meth:`step`.

It also provides an event/callback system and full serialisation support.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

import numpy as np

from ..entities.entity import AgentEntity, Entity, EntityState, ObjectEntity
from ..entities.entity_registry import EntityRegistry
from ..environments.environment import Environment, EnvironmentConditions, Region
from ..interactions.interaction import (
    CollisionInteraction,
    Interaction,
    InteractionResolver,
)

logger = logging.getLogger(__name__)


class World:
    """Central simulation manager.

    Parameters
    ----------
    environment : Environment, optional
        The world's physical environment.  A default flat environment is
        created when omitted.
    grid_cell_size : float
        Cell size forwarded to the :class:`EntityRegistry` spatial grid.
    """

    def __init__(
        self,
        environment: Optional[Environment] = None,
        grid_cell_size: float = 20.0,
    ) -> None:
        # Reset the singleton so each World gets a fresh registry
        EntityRegistry.reset_instance()
        self.registry: EntityRegistry = EntityRegistry(grid_cell_size=grid_cell_size)
        self.environment: Environment = environment or Environment()
        self.resolver: InteractionResolver = InteractionResolver()
        self.simulation_time: float = 0.0
        self._step_count: int = 0

        # Callback lists
        self._on_entity_added: List[Callable[[Entity], None]] = []
        self._on_entity_removed: List[Callable[[Entity], None]] = []
        self._on_collision: List[Callable[[Interaction], None]] = []

        logger.info("World initialised with environment '%s'", self.environment.name)

    # -- Event registration -------------------------------------------------

    def on_entity_added(self, callback: Callable[[Entity], None]) -> None:
        """Register a callback invoked after an entity is added."""
        self._on_entity_added.append(callback)

    def on_entity_removed(self, callback: Callable[[Entity], None]) -> None:
        """Register a callback invoked after an entity is removed."""
        self._on_entity_removed.append(callback)

    def on_collision(self, callback: Callable[[Interaction], None]) -> None:
        """Register a callback invoked after a collision is resolved."""
        self._on_collision.append(callback)

    # -- Entity management --------------------------------------------------

    def add_entity(self, entity: Entity) -> Entity:
        """Add *entity* to the world and fire ``on_entity_added`` callbacks.

        Returns the entity for convenient chaining.
        """
        self.registry.register(entity)
        for cb in self._on_entity_added:
            try:
                cb(entity)
            except Exception:
                logger.exception("on_entity_added callback error")
        logger.debug("Entity added to world: %s", entity.name)
        return entity

    def remove_entity(self, entity_id: str) -> Optional[Entity]:
        """Remove the entity with *entity_id* from the world."""
        entity = self.registry.unregister(entity_id)
        if entity is not None:
            for cb in self._on_entity_removed:
                try:
                    cb(entity)
                except Exception:
                    logger.exception("on_entity_removed callback error")
            logger.debug("Entity removed from world: %s", entity.name)
        return entity

    # -- Simulation ---------------------------------------------------------

    def step(self, dt: float) -> Dict[str, Any]:
        """Advance the simulation by *dt* seconds.

        The step proceeds in four phases:

        1. **Interactions** — resolve all pending interactions.
        2. **Agent behaviour** — run each agent's behaviour function, feeding
           nearby entities from the spatial index.
        3. **Physics** — integrate velocities for every active entity and
           update the spatial grid.
        4. **Cleanup** — remove destroyed entities.

        Returns a summary dict with step statistics.
        """
        # --- 1. Resolve interactions ---------------------------------------
        entity_lookup: Dict[str, Entity] = {e.id: e for e in self.registry.get_all()}

        def _collision_cb(interaction: Interaction) -> None:
            for cb in self._on_collision:
                try:
                    cb(interaction)
                except Exception:
                    logger.exception("on_collision callback error")

        interactions_resolved = self.resolver.resolve_all(
            entity_lookup, dt, on_collision=_collision_cb,
        )

        # --- 2. Agent behaviour + 3. Physics integration -------------------
        destroyed_ids: List[str] = []
        for entity in self.registry.get_all():
            if entity.state is EntityState.DESTROYED:
                destroyed_ids.append(entity.id)
                continue

            old_position = entity.position.copy()

            if isinstance(entity, AgentEntity):
                nearby = self.registry.get_in_radius(
                    entity.position, entity.perception_radius,
                )
                # Exclude self
                nearby = [e for e in nearby if e.id != entity.id]
                entity.update(dt, nearby_entities=nearby)
            else:
                entity.update(dt)

            # Update spatial grid
            self.registry.update_grid_position(entity, old_position)

        # --- 4. Cleanup destroyed entities ---------------------------------
        for eid in destroyed_ids:
            self.remove_entity(eid)

        self.simulation_time += dt
        self._step_count += 1

        stats = {
            "step": self._step_count,
            "simulation_time": self.simulation_time,
            "dt": dt,
            "entity_count": self.registry.count,
            "interactions_resolved": interactions_resolved,
            "destroyed_removed": len(destroyed_ids),
        }
        logger.debug("Step %d complete: %s", self._step_count, stats)
        return stats

    # -- Query helpers ------------------------------------------------------

    @property
    def entity_count(self) -> int:
        """Number of currently registered entities."""
        return self.registry.count

    @property
    def interaction_count(self) -> int:
        """Number of active (not yet expired) interactions."""
        return self.resolver.active_count

    def get_world_state(self) -> Dict[str, Any]:
        """Return a high-level snapshot of the current world state."""
        return {
            "simulation_time": self.simulation_time,
            "step_count": self._step_count,
            "entity_count": self.registry.count,
            "active_interactions": self.resolver.active_count,
            "total_interactions_resolved": self.resolver.total_resolved,
            "environment": self.environment.name,
        }

    # -- Reset --------------------------------------------------------------

    def reset(self) -> None:
        """Tear down all entities and interactions; reset simulation clock."""
        for entity in self.registry.get_all():
            self.registry.unregister(entity.id)
        self.resolver.clear()
        self.simulation_time = 0.0
        self._step_count = 0
        logger.info("World reset.")

    # -- Serialisation ------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the complete world state to a plain dict."""
        entities_data: List[Dict[str, Any]] = []
        for entity in self.registry.get_all():
            entry = entity.get_state_dict()
            entry["_class"] = entity.__class__.__name__
            # Persist subclass-specific fields for AgentEntity / ObjectEntity
            entities_data.append(entry)

        interactions_data = [i.to_dict() for i in self.resolver.get_active()]

        return {
            "simulation_time": self.simulation_time,
            "step_count": self._step_count,
            "environment": self.environment.to_dict(),
            "entities": entities_data,
            "interactions": interactions_data,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "World":
        """Reconstruct a :class:`World` from a dict produced by
        :meth:`to_dict`.

        .. note::
           Agent ``behavior_fn`` callables and interaction instances beyond
           the base fields cannot be round-tripped; they must be re-attached
           after loading.
        """
        env = Environment.from_dict(data.get("environment", {}))
        world = cls(environment=env)
        world.simulation_time = float(data.get("simulation_time", 0.0))
        world._step_count = int(data.get("step_count", 0))

        _CLASS_MAP = {
            "AgentEntity": AgentEntity,
            "ObjectEntity": ObjectEntity,
            "Entity": Entity,
        }

        for edata in data.get("entities", []):
            klass_name = edata.get("_class", "Entity")
            klass = _CLASS_MAP.get(klass_name, Entity)

            if klass is AgentEntity:
                entity = AgentEntity(
                    name=edata.get("name", "unnamed"),
                    goal=edata.get("goal", ""),
                    perception_radius=edata.get("perception_radius", 10.0),
                    position=np.array(edata.get("position", [0, 0, 0]), dtype=np.float64),
                    velocity=np.array(edata.get("velocity", [0, 0, 0]), dtype=np.float64),
                    properties=edata.get("properties", {}),
                )
            elif klass is ObjectEntity:
                entity = ObjectEntity(
                    name=edata.get("name", "unnamed"),
                    mass=edata.get("mass", 1.0),
                    material=edata.get("material", "default"),
                    is_static=edata.get("is_static", False),
                    durability=edata.get("durability", 100.0),
                    position=np.array(edata.get("position", [0, 0, 0]), dtype=np.float64),
                    velocity=np.array(edata.get("velocity", [0, 0, 0]), dtype=np.float64),
                    properties=edata.get("properties", {}),
                )
            else:
                entity = Entity(
                    name=edata.get("name", "unnamed"),
                    entity_type=edata.get("entity_type", "generic"),
                    position=np.array(edata.get("position", [0, 0, 0]), dtype=np.float64),
                    velocity=np.array(edata.get("velocity", [0, 0, 0]), dtype=np.float64),
                    properties=edata.get("properties", {}),
                )

            # Restore original id and state
            if "id" in edata:
                entity.id = edata["id"]
            if "state" in edata:
                try:
                    entity.state = EntityState(edata["state"])
                except ValueError:
                    pass

            world.add_entity(entity)

        return world

    # -- Dunder helpers -----------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"<World env={self.environment.name!r} entities={self.entity_count} "
            f"time={self.simulation_time:.2f}>"
        )
