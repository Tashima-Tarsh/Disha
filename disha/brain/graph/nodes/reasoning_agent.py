from __future__ import annotations

from ...yudh import threat_score
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    state.risk_score = threat_score(state.input_text, state.evidence_class.value)
    state.risk_reason = (
        "Risk derived from evidence class and public-interest threat indicators."
    )
    return state
