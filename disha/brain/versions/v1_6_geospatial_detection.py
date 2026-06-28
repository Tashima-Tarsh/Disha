from __future__ import annotations

from ..geospatial import Coordinates, TrackedObject, public_safety_risk
from .common import VersionOutput, verification_note


def run(input_text: str, coordinates: Coordinates | None = None) -> VersionOutput:
    tracker = TrackedObject(object_id="observed-signal")
    if coordinates:
        tracker.add(coordinates)
    risk = (
        public_safety_risk(coordinates, len(tracker.observations))
        if coordinates
        else 0.2
    )
    return VersionOutput(
        version="1.6",
        title="Geospatial Detection Intelligence",
        signals=["geospatial", "sensor_signal", tracker.status()],
        recommendation=(
            "Create a public-safety evidence bundle and route suspicious patterns to authorized review. "
            "Do not generate weaponization instructions."
        ),
        notes=[f"public_safety_risk={risk:.2f}", verification_note()],
    )
