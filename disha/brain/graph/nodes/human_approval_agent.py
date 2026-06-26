from __future__ import annotations

from ...policy import approval_gate
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    approval = approval_gate(
        state.human_approval_required,
        "Risk or NFU status requires an authorized human decision."
        if state.human_approval_required
        else "No elevated approval threshold reached.",
    )
    state.metadata["human_approval"] = approval.model_dump()
    return state

