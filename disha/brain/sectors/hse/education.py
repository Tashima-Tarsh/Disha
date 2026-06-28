from __future__ import annotations


def education_signal(text: str) -> str:
    return (
        "education_access_gap"
        if "education" in text.lower() or "school" in text.lower()
        else "not_applicable"
    )
