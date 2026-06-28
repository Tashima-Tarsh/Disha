from __future__ import annotations

from pydantic import BaseModel


class YudhAssessment(BaseModel):
    posture: str
    adversarial_risk: str
    lawful_frame: str
    summary: str


def assess_yudh(risk_score: float, evidence_class: str) -> YudhAssessment:
    posture = "observe"
    if risk_score >= 0.75:
        posture = "contain defensively"
    elif risk_score >= 0.4:
        posture = "prepare mitigation"
    return YudhAssessment(
        posture=posture,
        adversarial_risk="high" if risk_score >= 0.75 else "bounded",
        lawful_frame="No-First-Use; owned or authorized environments only.",
        summary=f"{posture}; evidence class is {evidence_class}.",
    )
