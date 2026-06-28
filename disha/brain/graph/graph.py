from __future__ import annotations

from ..audit import AuditLedger
from ..memory import MemoryStore
from .nodes import (
    action_agent,
    audit_agent,
    context_agent,
    evidence_agent,
    human_approval_agent,
    intake_agent,
    memory_update_agent,
    policy_guard_agent,
    reasoning_agent,
    vyuha_agent,
    yudh_agent,
)
from .router import route_version
from .state import DishaGraphResult, GraphInput


class DishaAgenticGraph:
    def __init__(
        self, ledger: AuditLedger | None = None, memory: MemoryStore | None = None
    ) -> None:
        self.ledger = ledger or AuditLedger()
        self.memory = memory or MemoryStore()

    def invoke(self, payload: GraphInput) -> DishaGraphResult:
        state = intake_agent.run(payload)
        state = evidence_agent.run(state)
        state = context_agent.run(state)
        state = reasoning_agent.run(state)
        state.version = route_version(state.input_text, state.source_type)
        state = action_agent.run(state)
        state = yudh_agent.run(state)
        state = vyuha_agent.run(state)
        state = policy_guard_agent.run(state)
        state = human_approval_agent.run(state)
        state = audit_agent.run(state, self.ledger)
        state = memory_update_agent.run(state, self.memory)
        if state.audit_record is None:
            raise RuntimeError("audit event was not created")
        return DishaGraphResult(
            version=state.version or "unknown",
            evidence_class=state.evidence_class,
            source_list=state.source_links,
            confidence_level=state.confidence_level,
            risk_score=state.risk_score,
            reasoning_summary=state.risk_reason,
            yudh_assessment=state.yudh_assessment,
            vyuha_recommendation=state.vyuha_recommendation,
            nfu_policy_status=state.nfu_status,
            human_approval_required=state.human_approval_required,
            final_recommendation=state.final_answer,
            audit_event=state.audit_record,
        )


def run_disha_graph(payload: GraphInput) -> DishaGraphResult:
    return DishaAgenticGraph().invoke(payload)
