from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    accuracy_m: float | None = Field(default=None, ge=0.0)

    @field_validator("latitude", "longitude")
    @classmethod
    def finite_coordinate(cls, value: float) -> float:
        if value != value:
            raise ValueError("coordinate must be finite")
        return value

