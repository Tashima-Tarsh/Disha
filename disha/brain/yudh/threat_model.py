from __future__ import annotations


def threat_score(text: str, evidence_class: str) -> float:
    normalized = text.lower()
    score = 0.15
    if any(token in normalized for token in ("explosive", "intrusion", "malware", "critical", "breach")):
        score += 0.35
    if any(token in normalized for token in ("contradiction", "gap", "failure", "missing")):
        score += 0.2
    if evidence_class in {"official_record", "sensor_signal", "audit_record"}:
        score += 0.1
    return min(score, 1.0)

