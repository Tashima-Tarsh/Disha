from __future__ import annotations


def nyaya_summary(evidence_class: str, contradiction_count: int) -> str:
    if contradiction_count:
        return "NYAYA review: contradictions require source-by-source public accountability review."
    return f"NYAYA review: proceed with {evidence_class} evidence and explicit verification notes."

