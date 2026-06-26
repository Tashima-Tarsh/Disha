from __future__ import annotations

from ...governance import map_constitutional_context
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    state.constitutional_context = map_constitutional_context(state.input_text)
    if state.source_type in {"sensor", "cyber_telemetry"}:
        state.cyber_context = {
            "source_type": state.source_type,
            "scope": "authorized review required",
        }
    return state
