from __future__ import annotations


def identify_gaps(text: str) -> list[str]:
    normalized = text.lower()
    gaps: list[str] = []
    for token, label in {
        "missing": "missing service or record",
        "delay": "delayed response",
        "contradiction": "contradictory records",
        "unsafe": "public safety risk",
        "unauthorized": "authorization gap",
    }.items():
        if token in normalized:
            gaps.append(label)
    return gaps or ["insufficient verified evidence"]

