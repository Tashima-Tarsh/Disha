from __future__ import annotations


def resilience_score(signals: list[str]) -> float:
    base = 0.45
    if "public_asset_priority" in signals:
        base += 0.15
    if "water_climate_resilience_signal" in signals:
        base += 0.2
    return min(base, 1.0)
