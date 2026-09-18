from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class GovernedAnalysisInput:
    request_id: str
    mission_id: str
    raw_text: str
    selected_lenses: list[str]
    evidence_event_ids: list[str]
    sensitivity: str
    source_hashes: list[str]


class GovernedAnalyzer(Protocol):
    component: str

    def analyze(self, payload: GovernedAnalysisInput) -> dict[str, Any]: ...
