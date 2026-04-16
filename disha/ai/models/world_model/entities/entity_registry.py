"""
Spatial entity registry with grid-based indexing.

:class:`EntityRegistry` is the single source of truth for which entities
currently exist in the world.  It supports O(1) lookup by id, O(n) lookup
by type, and efficient spatial radius queries through a uniform grid.

The class implements the **singleton pattern** — calling
``EntityRegistry()`` always returns the same instance.  Use
:meth:`EntityRegistry.reset_instance` in tests to get a fresh registry.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional, Tuple, Type

import numpy as np

from .entity import Entity

logger = logging.getLogger(__name__)


class EntityRegistry:
    """Thread-unsafe singleton registry with spatial grid index.

    Parameters
    ----------
    grid_cell_size : float
        Side length of each cubic cell in the spatial grid.  Smaller cells
        speed up radius queries at the cost of memory.
    """

    _instance: Optional["EntityRegistry"] = None

    def __new__(cls, *args: Any, **kwargs: Any) -> "EntityRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialised = False
        return cls._instance

    def __init__(self, grid_cell_size: float = 20.0) -> None:
        if self._initialised:
            return
        self._entities: Dict[str, Entity] = {}
        self._type_index: Dict[str, Dict[str, Entity]] = {}
        self._grid_cell_size: float = grid_cell_size
        # Spatial grid: cell_key -> set of entity ids
        self._grid: Dict[Tuple[int, int, int], set] = {}
        self._initialised: bool = True
        logger.debug("EntityRegistry initialised (cell_size=%.1f)", grid_cell_size)

    # -- Singleton helpers --------------------------------------------------

    @classmethod
    def reset_instance(cls) -> None:
        """Destroy the singleton so the next call creates a fresh registry."""
        cls._instance = None

    # -- Grid helpers -------------------------------------------------------

    def _cell_key(self, position: np.ndarray) -> Tuple[int, int, int]:
        """Map a 3-D position to an integer grid cell key."""
        cs = self._grid_cell_size
        return (
            int(math.floor(position[0] / cs)),
            int(math.floor(position[1] / cs)),
            int(math.floor(position[2] / cs)),
        )

    def _insert_into_grid(self, entity: Entity) -> None:
        key = self._cell_key(entity.position)
        self._grid.setdefault(key, set()).add(entity.id)

    def _remove_from_grid(self, entity: Entity) -> None:
        key = self._cell_key(entity.position)
        bucket = self._grid.get(key)
        if bucket is not None:
            bucket.discard(entity.id)
            if not bucket:
                del self._grid[key]

    def update_grid_position(self, entity: Entity, old_position: np.ndarray) -> None:
        """Move *entity* from its old grid cell to its current one.

        Call this after the entity's position has been updated.
        """
        old_key = self._cell_key(old_position)
        new_key = self._cell_key(entity.position)
        if old_key == new_key:
            return
        old_bucket = self._grid.get(old_key)
        if old_bucket is not None:
            old_bucket.discard(entity.id)
            if not old_bucket:
                del self._grid[old_key]
        self._grid.setdefault(new_key, set()).add(entity.id)

    # -- Public API ---------------------------------------------------------

    def register(self, entity: Entity) -> None:
        """Add *entity* to the registry.

        Raises
        ------
        ValueError
            If an entity with the same id is already registered.
        """
        if entity.id in self._entities:
            raise ValueError(f"Entity {entity.id} is already registered.")
        self._entities[entity.id] = entity
        self._type_index.setdefault(entity.entity_type, {})[entity.id] = entity
        self._insert_into_grid(entity)
        logger.debug("Registered entity %s (%s)", entity.name, entity.id)

    def unregister(self, entity_id: str) -> Optional[Entity]:
        """Remove the entity with *entity_id* and return it, or ``None``."""
        entity = self._entities.pop(entity_id, None)
        if entity is None:
            logger.warning("Attempted to unregister unknown entity %s", entity_id)
            return None
        type_bucket = self._type_index.get(entity.entity_type)
        if type_bucket is not None:
            type_bucket.pop(entity_id, None)
            if not type_bucket:
                del self._type_index[entity.entity_type]
        self._remove_from_grid(entity)
        logger.debug("Unregistered entity %s (%s)", entity.name, entity.id)
        return entity

    def get(self, entity_id: str) -> Optional[Entity]:
        """Return the entity with *entity_id*, or ``None``."""
        return self._entities.get(entity_id)

    def get_by_type(self, entity_type: str) -> List[Entity]:
        """Return all entities whose *entity_type* matches."""
        bucket = self._type_index.get(entity_type)
        if bucket is None:
            return []
        return list(bucket.values())

    def get_all(self) -> List[Entity]:
        """Return every registered entity."""
        return list(self._entities.values())

    def get_in_radius(self, position: np.ndarray, radius: float) -> List[Entity]:
        """Return entities within *radius* of *position* (grid-accelerated).

        The method inspects only the grid cells that could possibly overlap
        the query sphere, then performs exact distance checks.
        """
        position = np.asarray(position, dtype=np.float64)
        cs = self._grid_cell_size
        radius_sq = radius * radius

        # Determine the range of cells to inspect.
        min_cell = (
            int(math.floor((position[0] - radius) / cs)),
            int(math.floor((position[1] - radius) / cs)),
            int(math.floor((position[2] - radius) / cs)),
        )
        max_cell = (
            int(math.floor((position[0] + radius) / cs)),
            int(math.floor((position[1] + radius) / cs)),
            int(math.floor((position[2] + radius) / cs)),
        )

        results: List[Entity] = []
        for cx in range(min_cell[0], max_cell[0] + 1):
            for cy in range(min_cell[1], max_cell[1] + 1):
                for cz in range(min_cell[2], max_cell[2] + 1):
                    bucket = self._grid.get((cx, cy, cz))
                    if bucket is None:
                        continue
                    for eid in bucket:
                        entity = self._entities.get(eid)
                        if entity is None:
                            continue
                        diff = entity.position - position
                        if float(np.dot(diff, diff)) <= radius_sq:
                            results.append(entity)
        return results

    # -- Introspection ------------------------------------------------------

    @property
    def count(self) -> int:
        """Total number of registered entities."""
        return len(self._entities)

    def __len__(self) -> int:
        return self.count

    def __contains__(self, entity_id: str) -> bool:
        return entity_id in self._entities

    def __repr__(self) -> str:
        return f"<EntityRegistry entities={self.count}>"
