from __future__ import annotations

from .coordinates import Coordinates


def public_safety_risk(point: Coordinates, signal_count: int) -> float:
    score = min(signal_count * 0.2, 0.8)
    if point.accuracy_m is not None and point.accuracy_m <= 25:
        score += 0.1
    return min(score, 1.0)
