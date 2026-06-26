from __future__ import annotations

from ..sectors.development import resilience_score, setu_priority, varuna_signal
from .common import VersionOutput, verification_note


def run(input_text: str) -> VersionOutput:
    signals = [setu_priority(input_text), varuna_signal(input_text)]
    return VersionOutput(
        version="2.6",
        title="Sustainable Development Geospatial Intelligence",
        signals=["development", "resilience", *signals],
        recommendation="Prioritize public assets by verifiable infrastructure, climate, and resource signals.",
        notes=[f"resilience_score={resilience_score(signals):.2f}", verification_note()],
    )

