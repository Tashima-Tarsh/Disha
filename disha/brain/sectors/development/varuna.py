from __future__ import annotations


def varuna_signal(text: str) -> str:
    if any(token in text.lower() for token in ("flood", "water", "rain", "climate")):
        return "water_climate_resilience_signal"
    return "no_climate_signal"

