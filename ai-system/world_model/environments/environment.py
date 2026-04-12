"""
Environment modelling for the World Model.

Provides :class:`Environment` (terrain, bounds, regions) and the
:class:`EnvironmentConditions` data-class for dynamic weather / lighting.

Terrain is stored as a 2-D numpy height-map that is queried via bilinear
interpolation.  Named :class:`Region` instances allow different physical
properties (temperature, friction, …) to co-exist in the same world.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class EnvironmentConditions:
    """Dynamic conditions that may change each tick.

    Attributes
    ----------
    wind_vector : np.ndarray
        3-D wind force vector.
    visibility : float
        View distance in world units (higher → clearer).
    time_of_day : float
        Normalised time in the range ``[0, 24)`` (hours).
    """

    wind_vector: np.ndarray = field(default_factory=lambda: np.zeros(3, dtype=np.float64))
    visibility: float = 1000.0
    time_of_day: float = 12.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wind_vector": self.wind_vector.tolist(),
            "visibility": self.visibility,
            "time_of_day": self.time_of_day,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EnvironmentConditions":
        return cls(
            wind_vector=np.array(data.get("wind_vector", [0, 0, 0]), dtype=np.float64),
            visibility=float(data.get("visibility", 1000.0)),
            time_of_day=float(data.get("time_of_day", 12.0)),
        )


@dataclass
class Region:
    """A named axis-aligned bounding box with its own physical properties.

    Attributes
    ----------
    name : str
        Human-readable label.
    bounds_min : np.ndarray
        Lower corner (3-D).
    bounds_max : np.ndarray
        Upper corner (3-D).
    properties : dict
        Region-local overrides (e.g. ``{"temperature": -10}``).
    """

    name: str = "default"
    bounds_min: np.ndarray = field(default_factory=lambda: np.zeros(3, dtype=np.float64))
    bounds_max: np.ndarray = field(default_factory=lambda: np.ones(3, dtype=np.float64) * 100.0)
    properties: Dict[str, Any] = field(default_factory=dict)

    def contains(self, position: np.ndarray) -> bool:
        """Return ``True`` if *position* lies within this region."""
        return bool(
            np.all(position >= self.bounds_min) and np.all(position <= self.bounds_max)
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "bounds_min": self.bounds_min.tolist(),
            "bounds_max": self.bounds_max.tolist(),
            "properties": self.properties,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Region":
        return cls(
            name=data.get("name", "default"),
            bounds_min=np.array(data.get("bounds_min", [0, 0, 0]), dtype=np.float64),
            bounds_max=np.array(data.get("bounds_max", [100, 100, 100]), dtype=np.float64),
            properties=data.get("properties", {}),
        )


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

class Environment:
    """Top-level environment container.

    Parameters
    ----------
    name : str
        A label for this environment.
    bounds_min, bounds_max : array-like
        Axis-aligned world bounds (3-D).
    terrain_resolution : tuple[int, int]
        ``(rows, cols)`` for the height-map grid.
    properties : dict, optional
        Default physical properties applied everywhere unless overridden by a
        :class:`Region`.
    """

    DEFAULT_PROPERTIES: Dict[str, float] = {
        "temperature": 20.0,
        "gravity_strength": 9.81,
        "friction": 0.5,
        "humidity": 0.4,
    }

    def __init__(
        self,
        name: str = "default_env",
        bounds_min: Optional[np.ndarray] = None,
        bounds_max: Optional[np.ndarray] = None,
        terrain_resolution: Tuple[int, int] = (64, 64),
        properties: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.name: str = name
        self.bounds_min: np.ndarray = (
            np.array(bounds_min, dtype=np.float64)
            if bounds_min is not None
            else np.zeros(3, dtype=np.float64)
        )
        self.bounds_max: np.ndarray = (
            np.array(bounds_max, dtype=np.float64)
            if bounds_max is not None
            else np.array([100.0, 100.0, 100.0], dtype=np.float64)
        )

        self.properties: Dict[str, Any] = {**self.DEFAULT_PROPERTIES}
        if properties:
            self.properties.update(properties)

        # Terrain height-map (rows × cols).  Initialised to zero (flat).
        self.terrain_resolution: Tuple[int, int] = terrain_resolution
        self.terrain_map: np.ndarray = np.zeros(terrain_resolution, dtype=np.float64)

        # Named regions with local property overrides
        self._regions: Dict[str, Region] = {}

        # Dynamic conditions
        self.conditions: EnvironmentConditions = EnvironmentConditions()

        logger.debug(
            "Environment '%s' created  bounds=[%s, %s]  terrain=%s",
            self.name,
            self.bounds_min.tolist(),
            self.bounds_max.tolist(),
            terrain_resolution,
        )

    # -- Terrain ------------------------------------------------------------

    def get_terrain_height(self, x: float, y: float) -> float:
        """Return the interpolated terrain height at world coordinates (x, y).

        Uses bilinear interpolation across the height-map.  Coordinates
        outside the bounds are clamped.
        """
        rows, cols = self.terrain_resolution
        # Normalise world (x, y) → grid (col, row) — x maps to cols, y to rows
        x_norm = (x - self.bounds_min[0]) / max(self.bounds_max[0] - self.bounds_min[0], 1e-9)
        y_norm = (y - self.bounds_min[1]) / max(self.bounds_max[1] - self.bounds_min[1], 1e-9)

        # Clamp to [0, 1]
        x_norm = max(0.0, min(1.0, x_norm))
        y_norm = max(0.0, min(1.0, y_norm))

        # Continuous grid coordinates
        gc = x_norm * (cols - 1)
        gr = y_norm * (rows - 1)

        c0 = int(gc)
        r0 = int(gr)
        c1 = min(c0 + 1, cols - 1)
        r1 = min(r0 + 1, rows - 1)
        fc = gc - c0
        fr = gr - r0

        # Bilinear interpolation
        h00 = self.terrain_map[r0, c0]
        h01 = self.terrain_map[r0, c1]
        h10 = self.terrain_map[r1, c0]
        h11 = self.terrain_map[r1, c1]

        height = (
            h00 * (1 - fc) * (1 - fr)
            + h01 * fc * (1 - fr)
            + h10 * (1 - fc) * fr
            + h11 * fc * fr
        )
        return float(height)

    # -- Bounds / regions ---------------------------------------------------

    def is_within_bounds(self, position: np.ndarray) -> bool:
        """Return ``True`` when *position* is inside the world AABB."""
        position = np.asarray(position, dtype=np.float64)
        return bool(
            np.all(position >= self.bounds_min) and np.all(position <= self.bounds_max)
        )

    def add_region(self, region: Region) -> None:
        """Register a named region.  Replaces any existing region with the
        same name."""
        self._regions[region.name] = region
        logger.debug("Region '%s' added to environment '%s'", region.name, self.name)

    def remove_region(self, name: str) -> Optional[Region]:
        """Remove and return the region with *name*, or ``None``."""
        return self._regions.pop(name, None)

    def get_regions(self) -> List[Region]:
        """Return all registered regions."""
        return list(self._regions.values())

    def get_local_properties(self, position: np.ndarray) -> Dict[str, Any]:
        """Return the effective properties at *position*.

        Starts with the environment defaults, then overlays properties from
        every region that contains the position (last-registered wins for
        duplicate keys).
        """
        position = np.asarray(position, dtype=np.float64)
        props: Dict[str, Any] = dict(self.properties)
        for region in self._regions.values():
            if region.contains(position):
                props.update(region.properties)
        return props

    # -- Serialisation ------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the full environment state to a plain dict."""
        return {
            "name": self.name,
            "bounds_min": self.bounds_min.tolist(),
            "bounds_max": self.bounds_max.tolist(),
            "properties": self.properties,
            "terrain_resolution": list(self.terrain_resolution),
            "terrain_map": self.terrain_map.tolist(),
            "regions": [r.to_dict() for r in self._regions.values()],
            "conditions": self.conditions.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Environment":
        """Reconstruct an :class:`Environment` from a dict produced by
        :meth:`to_dict`."""
        resolution = tuple(data.get("terrain_resolution", [64, 64]))
        env = cls(
            name=data.get("name", "default_env"),
            bounds_min=np.array(data.get("bounds_min", [0, 0, 0]), dtype=np.float64),
            bounds_max=np.array(data.get("bounds_max", [100, 100, 100]), dtype=np.float64),
            terrain_resolution=(resolution[0], resolution[1]),
            properties=data.get("properties"),
        )
        if "terrain_map" in data:
            env.terrain_map = np.array(data["terrain_map"], dtype=np.float64)
        for rd in data.get("regions", []):
            env.add_region(Region.from_dict(rd))
        if "conditions" in data:
            env.conditions = EnvironmentConditions.from_dict(data["conditions"])
        return env

    def __repr__(self) -> str:
        return (
            f"<Environment name={self.name!r} bounds=[{self.bounds_min.tolist()}, "
            f"{self.bounds_max.tolist()}] regions={len(self._regions)}>"
        )
