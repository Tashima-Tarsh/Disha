from __future__ import annotations

from ...evidence import build_evidence_bundle
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    bundle = build_evidence_bundle(
        [state.input_text], state.source_type, state.source_links
    )
    state.evidence_items = bundle.items
    state.evidence_class = bundle.dominant_class
    state.confidence_level = bundle.confidence
    return state

