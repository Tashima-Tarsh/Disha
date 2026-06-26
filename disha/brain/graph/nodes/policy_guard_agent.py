from __future__ import annotations

from ...policy import evaluate_actions, requires_approval
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    result = evaluate_actions(state.requested_actions, state.authorized_environment)
    state.nfu_status = result.status
    state.human_approval_required = requires_approval(state.risk_score, result.status)
    if result.decision.value == "forbidden":
        state.human_approval_required = True
    return state
