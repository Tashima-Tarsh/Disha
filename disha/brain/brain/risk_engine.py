from __future__ import annotations

from ..models.schemas import (
    AnomalyResult,
    DecisionAction,
    RiskAssessment,
    RiskLevel,
    TelemetryEvent,
)


class RiskEngine:
    def assess(self, event: TelemetryEvent, anomaly: AnomalyResult) -> RiskAssessment:
        reasons = list(anomaly.contributors)
        score = anomaly.score

        if event.cpu_percent > 90:
            score += 0.25
            reasons.append("CPU greater than 90%")
        if event.process_count > 400:
            score += 0.15
            reasons.append("Unusually high process count")
        if event.network_recv_kb > 50_000 or event.network_sent_kb > 50_000:
            score += 0.20
            reasons.append("High network transfer volume")

        if score >= 0.75:
            return RiskAssessment(
                level=RiskLevel.high,
                score=round(score, 4),
                reasons=reasons or ["High composite anomaly score"],
                action=DecisionAction.isolate,
            )
        if score >= 0.35:
            return RiskAssessment(
                level=RiskLevel.medium,
                score=round(score, 4),
                reasons=reasons or ["Moderate anomaly score"],
                action=DecisionAction.limit,
            )
        return RiskAssessment(
            level=RiskLevel.low,
            score=round(score, 4),
            reasons=reasons or ["Baseline behavior"],
            action=DecisionAction.monitor,
        )
