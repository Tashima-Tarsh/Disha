from __future__ import annotations

from .coordinates import Coordinates


class SpatialIndex:
    def __init__(self) -> None:
        self._points: list[Coordinates] = []

    def add(self, point: Coordinates) -> None:
        self._points.append(point)

    def all_points(self) -> list[Coordinates]:
        return list(self._points)
