from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class FormationDecision:
    formation_id: str
    matched_triggers: list[dict[str, Any]]
    reason: str
    confidence: float


@dataclass(frozen=True, slots=True)
class SignalEvent:
    source: str
    type: str
    payload: dict[str, Any]
    ts_ms: int

