from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RiskScore:
    """
    Deterministic risk score.

    - severity: 0..100
    - confidence: 0..1
    """

    severity: int
    confidence: float

    def compute(self) -> float:
        sev = max(0, min(int(self.severity), 100))
        conf = max(0.0, min(float(self.confidence), 1.0))
        # Conservative: risk scales linearly with severity and confidence.
        return round((sev / 100.0) * conf, 4)


def compute_risk(severity: int, confidence: float) -> float:
    return RiskScore(severity=severity, confidence=confidence).compute()

