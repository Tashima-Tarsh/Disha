"""Raster map layers with bilinear interpolation and composite map stacks.

Provides :class:`MapLayer` for single-band raster data and
:class:`MapStack` for combining multiple layers with weighted
compositing.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class MapLayer:
    """A single-band 2-D raster map layer.

    The layer stores values on a regular grid.  World coordinates are
    mapped to grid indices via *resolution* and *origin*.

    Args:
        name: Human-readable layer name (e.g. ``"elevation"``).
        data: 2-D numpy array of grid values.
        resolution: Size of one grid cell in world units.
        origin: ``(x, y)`` world coordinates of the grid origin
            (lower-left corner of cell ``[0, 0]``).
    """

    def __init__(
        self,
        name: str,
        data: np.ndarray,
        resolution: float = 1.0,
        origin: Tuple[float, float] = (0.0, 0.0),
    ) -> None:
        if data.ndim != 2:
            raise ValueError(f"data must be 2-D, got {data.ndim}-D")
        if resolution <= 0:
            raise ValueError(f"resolution must be positive, got {resolution}")

        self.name: str = name
        self.data: np.ndarray = np.asarray(data, dtype=np.float64)
        self.resolution: float = resolution
        self.origin: Tuple[float, float] = origin
        self._rows: int = self.data.shape[0]
        self._cols: int = self.data.shape[1]
        logger.info(
            "MapLayer '%s' created: shape=%s res=%f origin=%s",
            name, self.data.shape, resolution, origin,
        )

    def _world_to_grid(self, x: float, y: float) -> Tuple[float, float]:
        """Convert world coordinates to continuous grid indices."""
        gx = (x - self.origin[0]) / self.resolution
        gy = (y - self.origin[1]) / self.resolution
        return gx, gy

    def _check_bounds(self, row: int, col: int) -> None:
        if not (0 <= row < self._rows and 0 <= col < self._cols):
            raise IndexError(
                f"Grid index ({row}, {col}) out of bounds for shape ({self._rows}, {self._cols})"
            )

    def get_value(self, x: float, y: float) -> float:
        """Return the grid value at the nearest cell to world (x, y).

        Args:
            x: World x-coordinate.
            y: World y-coordinate.

        Returns:
            Grid value at the nearest cell.
        """
        gx, gy = self._world_to_grid(x, y)
        col = int(round(gx))
        row = int(round(gy))
        col = max(0, min(col, self._cols - 1))
        row = max(0, min(row, self._rows - 1))
        return float(self.data[row, col])

    def set_value(self, x: float, y: float, value: float) -> None:
        """Set the grid value at the nearest cell to world (x, y).

        Args:
            x: World x-coordinate.
            y: World y-coordinate.
            value: New value to store.
        """
        gx, gy = self._world_to_grid(x, y)
        col = int(round(gx))
        row = int(round(gy))
        self._check_bounds(row, col)
        self.data[row, col] = value
        logger.debug("set_value '%s': (%f, %f) -> grid[%d,%d] = %f", self.name, x, y, row, col, value)

    def interpolate(self, x: float, y: float) -> float:
        """Bilinear interpolation at world coordinates (x, y).

        Args:
            x: World x-coordinate.
            y: World y-coordinate.

        Returns:
            Interpolated value.
        """
        gx, gy = self._world_to_grid(x, y)

        # Clamp to valid grid range
        gx = max(0.0, min(gx, self._cols - 1.0))
        gy = max(0.0, min(gy, self._rows - 1.0))

        x0 = int(np.floor(gx))
        x1 = min(x0 + 1, self._cols - 1)
        y0 = int(np.floor(gy))
        y1 = min(y0 + 1, self._rows - 1)

        xd = gx - x0
        yd = gy - y0

        c00 = self.data[y0, x0]
        c10 = self.data[y0, x1]
        c01 = self.data[y1, x0]
        c11 = self.data[y1, x1]

        value = (
            c00 * (1 - xd) * (1 - yd)
            + c10 * xd * (1 - yd)
            + c01 * (1 - xd) * yd
            + c11 * xd * yd
        )
        return float(value)


class MapStack:
    """A stack of named :class:`MapLayer` objects with weighted compositing.

    Layers are stored by name and can be queried individually or as a
    weighted composite.
    """

    def __init__(self) -> None:
        self._layers: Dict[str, MapLayer] = {}
        logger.info("MapStack created")

    def add_layer(self, layer: MapLayer) -> None:
        """Add or replace a layer in the stack.

        Args:
            layer: The map layer to add.
        """
        self._layers[layer.name] = layer
        logger.info("MapStack: added layer '%s'", layer.name)

    def remove_layer(self, name: str) -> None:
        """Remove a layer by name.

        Args:
            name: Name of the layer to remove.

        Raises:
            KeyError: If the layer does not exist.
        """
        if name not in self._layers:
            raise KeyError(f"Layer '{name}' not found in stack")
        del self._layers[name]
        logger.info("MapStack: removed layer '%s'", name)

    def get_layer(self, name: str) -> MapLayer:
        """Retrieve a layer by name.

        Args:
            name: Layer name.

        Returns:
            The requested :class:`MapLayer`.

        Raises:
            KeyError: If the layer does not exist.
        """
        if name not in self._layers:
            raise KeyError(f"Layer '{name}' not found in stack")
        return self._layers[name]

    @property
    def layer_names(self) -> List[str]:
        """List of layer names in the stack."""
        return list(self._layers.keys())

    def composite_value(
        self,
        x: float,
        y: float,
        weights: Dict[str, float],
    ) -> float:
        """Compute a weighted composite of layer values at world (x, y).

        Each layer value is obtained via bilinear interpolation and
        multiplied by its corresponding weight.  The result is the
        sum of weighted values divided by the sum of weights.

        Args:
            x: World x-coordinate.
            y: World y-coordinate.
            weights: Mapping of layer name → weight.

        Returns:
            Weighted composite value.

        Raises:
            KeyError: If a weight references a non-existent layer.
            ValueError: If weights are empty or all zero.
        """
        if not weights:
            raise ValueError("weights must not be empty")

        total_weight = 0.0
        weighted_sum = 0.0

        for layer_name, w in weights.items():
            layer = self.get_layer(layer_name)
            val = layer.interpolate(x, y)
            weighted_sum += val * w
            total_weight += w

        if abs(total_weight) < 1e-12:
            raise ValueError("Sum of weights is zero")

        result = weighted_sum / total_weight
        logger.debug("composite_value at (%f, %f) = %f", x, y, result)
        return result
