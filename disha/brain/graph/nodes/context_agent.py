from __future__ import annotations

from ...governance import build_constitutional_audit, map_constitutional_context
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    state.constitutional_context = map_constitutional_context(state.input_text)
    audit = build_constitutional_audit(
        text=state.input_text,
        evidence_class=state.evidence_class.value,
        confidence_level=state.confidence_level.value,
        source_links=state.source_links,
    )
    state.metadata["constitutional_audit"] = audit.model_dump()
    if state.source_type in {"sensor", "cyber_telemetry"}:
        state.cyber_context = {
            "source_type": state.source_type,
            "scope": "authorized review required",
        }
    return state
