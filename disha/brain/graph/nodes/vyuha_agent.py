from __future__ import annotations

from ...vyuha import build_recommendation, select_vyuha
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    signals = [
        state.version or "",
        state.source_type,
        state.evidence_class.value,
        state.input_text,
    ]
    formation = select_vyuha(signals, state.risk_score)
    state.vyuha_recommendation = build_recommendation(formation).model_dump()
    return state
