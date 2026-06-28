from __future__ import annotations

from ...yudh import assess_yudh
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    state.yudh_assessment = assess_yudh(
        state.risk_score, state.evidence_class.value
    ).model_dump()
    return state
