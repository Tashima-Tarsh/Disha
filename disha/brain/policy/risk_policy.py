from __future__ import annotations


def risk_level(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"


def requires_approval(score: float, nfu_status: str) -> bool:
    return score >= 0.4 or nfu_status != "nfu_compliant"
