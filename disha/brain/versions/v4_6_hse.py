from __future__ import annotations

from ..sectors.hse import education_signal, health_signal, welfare_signal
from .common import VersionOutput, verification_note


def run(input_text: str) -> VersionOutput:
    signals = [
        health_signal(input_text),
        welfare_signal(input_text),
        education_signal(input_text),
    ]
    active = [signal for signal in signals if signal != "not_applicable"]
    return VersionOutput(
        version="4.6",
        title="HSE Intelligence",
        signals=["hse", "service_gap", *active],
        recommendation="Produce a district-level service gap report with privacy protection and source-linked evidence.",
        notes=[verification_note()],
    )
