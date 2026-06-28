from __future__ import annotations

from .formations import FORMATIONS, VyuhaFormation


def select_vyuha(signals: list[str], risk_score: float = 0.0) -> VyuhaFormation:
    normalized = {signal.lower().replace(" ", "_") for signal in signals}
    if risk_score >= 0.75:
        normalized.add("high")
    best = FORMATIONS[0]
    best_score = -1
    for formation in FORMATIONS:
        score = len(normalized & set(formation.triggers))
        if score > best_score:
            best = formation
            best_score = score
    return best
