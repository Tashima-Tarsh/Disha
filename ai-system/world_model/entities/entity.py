"""
Entity definitions for the World Model.

This module provides the base :class:`Entity` class and two concrete
sub-classes — :class:`AgentEntity` (autonomous actors) and
:class:`ObjectEntity` (passive physical objects).

Every entity carries a unique id, a 3-D position/velocity, a property bag,
and lifecycle state.  Entities are updated each simulation tick via
:meth:`Entity.update`.
"""

from __future__ import annotations

import logging
import uuid
from enum import Enum
from time import time
from typing import Any, Callable, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# EntityState enum
# ---------------------------------------------------------------------------

class EntityState(Enum):
    """Lifecycle states an entity can occupy."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    DESTROYED = "destroyed"


# ---------------------------------------------------------------------------
# Entity base class
# ---------------------------------------------------------------------------

class Entity:
    """Base class for every object that exists in the simulated world.

    Parameters
    ----------
    name : str
        Human-readable label.
    entity_type : str
        Arbitrary type tag (e.g. ``"agent"``, ``"wall"``).
    position : np.ndarray, optional
        3-D world position.  Defaults to the origin.
    velocity : np.ndarray, optional
        3-D velocity vector.  Defaults to zero.
    properties : dict, optional
        Free-form property bag attached to the entity.
    """

    def __init__(
        self,
        name: str,
        entity_type: str,
        position: Optional[np.ndarray] = None,
        velocity: Optional[np.ndarray] = None,
        properties: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.id: str = str(uuid.uuid4())
        self.name: str = name
        self.entity_type: str = entity_type
        self.position: np.ndarray = (
            np.array(position, dtype=np.float64)
            if position is not None
            else np.zeros(3, dtype=np.float64)
        )
        self.velocity: np.ndarray = (
            np.array(velocity, dtype=np.float64)
            if velocity is not None
            else np.zeros(3, dtype=np.float64)
        )
        self.properties: Dict[str, Any] = properties if properties is not None else {}
        self.state: EntityState = EntityState.ACTIVE
        self.created_at: float = time()

        logger.debug("Entity created: %s (%s) [%s]", self.name, self.id, self.entity_type)

    # -- Core API -----------------------------------------------------------

    def update(self, dt: float) -> None:
        """Advance the entity by *dt* seconds using simple Euler integration.

        Inactive or destroyed entities are not updated.
        """
        if self.state is not EntityState.ACTIVE:
            return
        self.position = self.position + self.velocity * dt

    def distance_to(self, other: Entity) -> float:
        """Return the Euclidean distance to *other*."""
        diff: np.ndarray = self.position - other.position
        return float(np.linalg.norm(diff))

    def apply_action(self, action: Dict[str, Any]) -> None:
        """Apply a generic action dictionary to this entity.

        Recognised keys
        ---------------
        ``set_velocity`` : list[float]
            Replace the entity's velocity.
        ``add_force`` : list[float]
            Treat the value as an instantaneous impulse added to velocity.
        ``set_state`` : str
            Transition to a new :class:`EntityState`.
        ``set_property`` : dict
            Merge key/value pairs into *properties*.
        """
        if "set_velocity" in action:
            self.velocity = np.array(action["set_velocity"], dtype=np.float64)
        if "add_force" in action:
            self.velocity = self.velocity + np.array(action["add_force"], dtype=np.float64)
        if "set_state" in action:
            try:
                self.state = EntityState(action["set_state"])
            except ValueError:
                logger.warning("Unknown state requested: %s", action["set_state"])
        if "set_property" in action:
            self.properties.update(action["set_property"])

    # -- Serialisation ------------------------------------------------------

    def get_state_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable snapshot of this entity."""
        return {
            "id": self.id,
            "name": self.name,
            "entity_type": self.entity_type,
            "position": self.position.tolist(),
            "velocity": self.velocity.tolist(),
            "properties": self.properties,
            "state": self.state.value,
            "created_at": self.created_at,
        }

    # -- Dunder helpers -----------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__} id={self.id!r} name={self.name!r} "
            f"state={self.state.value!r}>"
        )


# ---------------------------------------------------------------------------
# AgentEntity
# ---------------------------------------------------------------------------

class AgentEntity(Entity):
    """An autonomous entity that perceives the world and acts on goals.

    Parameters
    ----------
    name : str
        Human-readable label.
    goal : str
        Free-text goal description driving the agent's behaviour.
    behavior_fn : callable, optional
        ``(agent, dt, nearby_entities) -> None`` called every tick.
    perception_radius : float
        How far (world units) the agent can perceive other entities.
    """

    def __init__(
        self,
        name: str,
        goal: str = "",
        behavior_fn: Optional[Callable[["AgentEntity", float, List[Entity]], None]] = None,
        perception_radius: float = 10.0,
        position: Optional[np.ndarray] = None,
        velocity: Optional[np.ndarray] = None,
        properties: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            name=name,
            entity_type="agent",
            position=position,
            velocity=velocity,
            properties=properties,
        )
        self.goal: str = goal
        self.behavior_fn: Optional[
            Callable[["AgentEntity", float, List[Entity]], None]
        ] = behavior_fn
        self.perception_radius: float = perception_radius
        self.memory: List[Dict[str, Any]] = []

    def observe(self, observation: Dict[str, Any]) -> None:
        """Record an observation into the agent's memory buffer."""
        self.memory.append(observation)

    def update(self, dt: float, nearby_entities: Optional[List[Entity]] = None) -> None:  # type: ignore[override]
        """Advance the agent, optionally running its behaviour function.

        Parameters
        ----------
        dt : float
            Simulation time-step in seconds.
        nearby_entities : list[Entity], optional
            Entities within perception range, provided by the world manager.
        """
        if self.state is not EntityState.ACTIVE:
            return

        if self.behavior_fn is not None:
            try:
                self.behavior_fn(self, dt, nearby_entities or [])
            except Exception:
                logger.exception(
                    "behavior_fn raised for agent %s (%s)", self.name, self.id,
                )

        # Physics integration (base class)
        super().update(dt)

    def get_state_dict(self) -> Dict[str, Any]:
        """Extend base snapshot with agent-specific fields."""
        state = super().get_state_dict()
        state.update(
            {
                "goal": self.goal,
                "perception_radius": self.perception_radius,
                "memory_size": len(self.memory),
            }
        )
        return state

    def __repr__(self) -> str:
        return (
            f"<AgentEntity id={self.id!r} name={self.name!r} "
            f"goal={self.goal!r} state={self.state.value!r}>"
        )


# ---------------------------------------------------------------------------
# ObjectEntity
# ---------------------------------------------------------------------------

class ObjectEntity(Entity):
    """A passive physical object in the world.

    Parameters
    ----------
    name : str
        Human-readable label.
    mass : float
        Object mass in kilograms.
    material : str
        Material label (e.g. ``"wood"``, ``"metal"``).
    is_static : bool
        If ``True`` the object ignores velocity integration.
    durability : float
        Hit-points / durability value (0 → destroyed).
    """

    def __init__(
        self,
        name: str,
        mass: float = 1.0,
        material: str = "default",
        is_static: bool = False,
        durability: float = 100.0,
        position: Optional[np.ndarray] = None,
        velocity: Optional[np.ndarray] = None,
        properties: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            name=name,
            entity_type="object",
            position=position,
            velocity=velocity,
            properties=properties,
        )
        self.mass: float = max(mass, 0.001)  # prevent zero-mass
        self.material: str = material
        self.is_static: bool = is_static
        self.durability: float = durability

    def update(self, dt: float) -> None:
        """Static objects skip position integration."""
        if self.is_static:
            return
        super().update(dt)

    def take_damage(self, amount: float) -> None:
        """Reduce durability; destroy the entity when it reaches zero."""
        if self.state is EntityState.DESTROYED:
            return
        self.durability = max(0.0, self.durability - amount)
        if self.durability <= 0.0:
            self.state = EntityState.DESTROYED
            logger.info("Object %s (%s) destroyed.", self.name, self.id)

    def get_state_dict(self) -> Dict[str, Any]:
        """Extend base snapshot with object-specific fields."""
        state = super().get_state_dict()
        state.update(
            {
                "mass": self.mass,
                "material": self.material,
                "is_static": self.is_static,
                "durability": self.durability,
            }
        )
        return state

    def __repr__(self) -> str:
        return (
            f"<ObjectEntity id={self.id!r} name={self.name!r} "
            f"mass={self.mass} material={self.material!r} "
            f"state={self.state.value!r}>"
        )
