from __future__ import annotations


def health_signal(text: str) -> str:
    return "health_service_gap" if "health" in text.lower() else "not_applicable"

