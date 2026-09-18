from __future__ import annotations

from typing import Any

from ..graph.nodes import (
    action_agent,
    context_agent,
    evidence_agent,
    human_approval_agent,
    intake_agent,
    policy_guard_agent,
    reasoning_agent,
    vyuha_agent,
    yudh_agent,
)
from ..graph.router import route_version
from ..graph.state import GraphInput
from .base import GovernedAnalysisInput


class DishaBrainAnalyzer:
    component = "disha-brain"

    def analyze(self, payload: GovernedAnalysisInput) -> dict[str, Any]:
        graph_input = GraphInput(
            input_text=payload.raw_text,
            source_type="operator",
            source_links=[],
            requested_actions=["report", "preserve_evidence"],
            authorized_environment=False,
            metadata={
                "mission_id": payload.mission_id,
                "request_id": payload.request_id,
                "component": self.component,
                "sensitivity": payload.sensitivity,
                "read_only": True,
            },
        )
        # Deliberately excludes audit_agent and memory_update_agent. The governed
        # research contract promises no state mutation, so this path must be pure.
        state = intake_agent.run(graph_input)
        state = evidence_agent.run(state)
        state = context_agent.run(state)
        state = reasoning_agent.run(state)
        state.version = route_version(state.input_text, state.source_type)
        state = action_agent.run(state)
        state = yudh_agent.run(state)
        state = vyuha_agent.run(state)
        state = policy_guard_agent.run(state)
        state = human_approval_agent.run(state)

        confidence = {"low": 0.35, "medium": 0.65, "high": 0.9}.get(
            str(state.confidence_level.value), 0.5
        )
        observations = [
            {
                "title": "Read-only strategic assessment",
                "description": state.final_answer or state.risk_reason,
                "confidence": confidence,
                "sourceHashes": payload.source_hashes[:20],
            },
            {
                "title": "Governance and risk posture",
                "description": (
                    f"Version {state.version}; risk score {state.risk_score:.3f}; "
                    f"NFU status {state.nfu_status}; human approval required={state.human_approval_required}."
                ),
                "confidence": 0.95,
                "sourceHashes": payload.source_hashes[:20],
            },
        ]
        return {
            "summary": state.final_answer or state.risk_reason or "Read-only DISHA Brain analysis completed.",
            "observations": observations,
            "limitations": [
                "This read-only component executes the strategic/risk policy graph without audit or memory mutation.",
                "No external action or state-changing node is available in the governed runtime.",
            ],
        }
