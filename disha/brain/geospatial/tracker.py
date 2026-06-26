from __future__ import annotations

from pydantic import BaseModel, Field

from .coordinates import Coordinates


class TrackedObject(BaseModel):
    object_id: str
    observations: list[Coordinates] = Field(default_factory=list)

    def add(self, coordinates: Coordinates) -> None:
        self.observations.append(coordinates)

    def status(self) -> str:
        if len(self.observations) >= 3:
            return "pattern_observable"
        if self.observations:
            return "single_or_sparse_signal"
        return "no_signal"

