from __future__ import annotations


def welfare_signal(text: str) -> str:
    return "social_welfare_gap" if "welfare" in text.lower() else "not_applicable"
