from __future__ import annotations

from ...vyuha import build_dharma_yudh_vyuha_plan
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    signals = [
        state.version or "",
        state.source_type,
        state.evidence_class.value,
        state.input_text,
    ]
    plan = build_dharma_yudh_vyuha_plan(
        signals,
        state.risk_score,
        evidence_class=state.evidence_class.value,
        confidence_level=state.confidence_level.value,
        source_links=state.source_links,
        requested_actions=state.requested_actions,
        constitutional_audit=state.metadata.get("constitutional_audit", {}),
    )
    state.vyuha_recommendation = plan.model_dump()
    return state
