from __future__ import annotations

from ..yudh import identify_gaps
from .common import VersionOutput, verification_note


def run(input_text: str) -> VersionOutput:
    gaps = identify_gaps(input_text)
    return VersionOutput(
        version="6.6",
        title="Gap Closure Intelligence",
        signals=["gap_closure", "mitigation", *gaps],
        recommendation="Create a lawful corrective action plan gated by NFU, risk policy, and human approval where needed.",
        notes=[verification_note()],
    )

