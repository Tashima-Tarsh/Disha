"""2-D spatial grid index for fast proximity queries.

Implements a uniform-grid spatial index supporting insert, remove,
radius queries, bounding-box queries, and k-nearest-neighbour lookups.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Dict, List, Set, Tuple


logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class Point2D:
    """A 2-D point used for spatial indexing.

    Attributes:
        x: X coordinate.
        y: Y coordinate.
    """

    x: float
    y: float

    def distance_to(self, other: Point2D) -> float:
        """Euclidean distance to another point."""
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)


class SpatialGrid:
    """Uniform-grid spatial index for 2-D point data.

    The grid divides the bounding area into cells of a given size.
    Each cell stores the set of entity IDs whose coordinates fall
    within that cell, enabling O(1) cell lookup and efficient
    neighbourhood searches.

    Args:
        cell_size: Edge length of each square grid cell.  A smaller
            value yields faster queries at the cost of more memory.
    """

    def __init__(self, cell_size: float = 100.0) -> None:
        if cell_size <= 0:
            raise ValueError(f"cell_size must be positive, got {cell_size}")
        self._cell_size: float = cell_size
        self._cells: Dict[Tuple[int, int], Set[str]] = {}
        self._points: Dict[str, Point2D] = {}
        logger.info("SpatialGrid created with cell_size=%f", cell_size)

    def _cell_key(self, point: Point2D) -> Tuple[int, int]:
        """Return the grid cell key for a given point."""
        cx = int(math.floor(point.x / self._cell_size))
        cy = int(math.floor(point.y / self._cell_size))
        return (cx, cy)

    @property
    def size(self) -> int:
        """Number of indexed entities."""
        return len(self._points)

    def insert(self, entity_id: str, coordinate: Point2D) -> None:
        """Insert an entity into the spatial index.

        If the entity already exists it is moved to the new position.

        Args:
            entity_id: Unique identifier for the entity.
            coordinate: 2-D position of the entity.
        """
        if entity_id in self._points:
            self.remove(entity_id)

        self._points[entity_id] = coordinate
        key = self._cell_key(coordinate)
        self._cells.setdefault(key, set()).add(entity_id)
        logger.debug(
            "Inserted %s at (%f, %f) -> cell %s",
            entity_id,
            coordinate.x,
            coordinate.y,
            key,
        )

    def remove(self, entity_id: str) -> None:
        """Remove an entity from the spatial index.

        Args:
            entity_id: Unique identifier for the entity to remove.

        Raises:
            KeyError: If the entity is not found.
        """
        if entity_id not in self._points:
            raise KeyError(f"Entity '{entity_id}' not found in index")

        point = self._points.pop(entity_id)
        key = self._cell_key(point)
        cell = self._cells.get(key)
        if cell is not None:
            cell.discard(entity_id)
            if not cell:
                del self._cells[key]
        logger.debug("Removed %s from cell %s", entity_id, key)

    def query_radius(self, center: Point2D, radius: float) -> List[str]:
        """Return all entity IDs within *radius* of *center*.

        Args:
            center: Centre of the search circle.
            radius: Search radius (same units as coordinates).

        Returns:
            List of entity IDs within the radius, unordered.
        """
        if radius < 0:
            raise ValueError(f"radius must be non-negative, got {radius}")

        results: List[str] = []
        cells_range = int(math.ceil(radius / self._cell_size))
        center_key = self._cell_key(center)

        for dx in range(-cells_range, cells_range + 1):
            for dy in range(-cells_range, cells_range + 1):
                key = (center_key[0] + dx, center_key[1] + dy)
                cell = self._cells.get(key)
                if cell is None:
                    continue
                for eid in cell:
                    if self._points[eid].distance_to(center) <= radius:
                        results.append(eid)

        logger.debug(
            "query_radius center=(%f,%f) r=%f -> %d results",
            center.x,
            center.y,
            radius,
            len(results),
        )
        return results

    def query_bbox(self, min_coord: Point2D, max_coord: Point2D) -> List[str]:
        """Return all entity IDs inside an axis-aligned bounding box.

        Args:
            min_coord: Lower-left corner of the bounding box.
            max_coord: Upper-right corner of the bounding box.

        Returns:
            List of entity IDs inside the box, unordered.
        """
        min_cx = int(math.floor(min_coord.x / self._cell_size))
        min_cy = int(math.floor(min_coord.y / self._cell_size))
        max_cx = int(math.floor(max_coord.x / self._cell_size))
        max_cy = int(math.floor(max_coord.y / self._cell_size))

        results: List[str] = []
        for cx in range(min_cx, max_cx + 1):
            for cy in range(min_cy, max_cy + 1):
                cell = self._cells.get((cx, cy))
                if cell is None:
                    continue
                for eid in cell:
                    pt = self._points[eid]
                    if (
                        min_coord.x <= pt.x <= max_coord.x
                        and min_coord.y <= pt.y <= max_coord.y
                    ):
                        results.append(eid)

        logger.debug(
            "query_bbox (%f,%f)-(%f,%f) -> %d results",
            min_coord.x,
            min_coord.y,
            max_coord.x,
            max_coord.y,
            len(results),
        )
        return results

    def nearest_neighbors(self, coord: Point2D, k: int) -> List[str]:
        """Return the *k* nearest entity IDs to *coord*.

        Uses an expanding-ring search: starts from the cell containing
        *coord* and widens until at least *k* candidates are found,
        then prunes by exact distance.

        Args:
            coord: Query point.
            k: Number of neighbours to return.

        Returns:
            List of up to *k* entity IDs sorted by ascending distance.
        """
        if k <= 0:
            return []
        if not self._points:
            return []

        center_key = self._cell_key(coord)
        candidates: List[Tuple[float, str]] = []
        ring = 0
        max_ring = (
            max(
                max(abs(ck[0] - center_key[0]), abs(ck[1] - center_key[1]))
                for ck in self._cells
            )
            if self._cells
            else 0
        )

        while ring <= max_ring:
            for dx in range(-ring, ring + 1):
                for dy in range(-ring, ring + 1):
                    if max(abs(dx), abs(dy)) != ring:
                        continue
                    cell = self._cells.get((center_key[0] + dx, center_key[1] + dy))
                    if cell is None:
                        continue
                    for eid in cell:
                        dist = self._points[eid].distance_to(coord)
                        candidates.append((dist, eid))

            if len(candidates) >= k:
                # We have enough; ensure no closer point exists in the next ring
                candidates.sort(key=lambda t: t[0])
                kth_dist = candidates[k - 1][0]
                next_ring_min_dist = ring * self._cell_size
                if kth_dist <= next_ring_min_dist or ring == max_ring:
                    break
            ring += 1

        candidates.sort(key=lambda t: t[0])
        result = [eid for _, eid in candidates[:k]]
        logger.debug(
            "nearest_neighbors (%f,%f) k=%d -> %s", coord.x, coord.y, k, result
        )
        return result
