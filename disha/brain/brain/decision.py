from __future__ import annotations

from ..models.schemas import DecisionAction, RiskAssessment


class DecisionEngine:
    def decide(self, assessment: RiskAssessment) -> tuple[DecisionAction, str]:
        if assessment.action is DecisionAction.isolate:
            return (
                DecisionAction.isolate,
                "Threat posture is high; isolate or disconnect the agent.",
            )
        if assessment.action is DecisionAction.limit:
            return (
                DecisionAction.limit,
                "Limit execution scope and continue monitoring.",
            )
        return (
            DecisionAction.monitor,
            "Behavior is within acceptable bounds; keep monitoring.",
        )
