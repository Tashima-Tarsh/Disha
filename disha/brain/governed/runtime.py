from __future__ import annotations

from typing import Any

from ..database.store import SQLiteStore
from .base import GovernedAnalysisInput
from .brain_runtime import DishaBrainAnalyzer
from .cognitive_runtime import CognitiveEngineAnalyzer
from .memory_runtime import MemoryGraphAnalyzer


class GovernedRuntimeRegistry:
    def __init__(self, store: SQLiteStore) -> None:
        analyzers = [
            DishaBrainAnalyzer(),
            CognitiveEngineAnalyzer(),
            MemoryGraphAnalyzer(store),
        ]
        self._analyzers = {analyzer.component: analyzer for analyzer in analyzers}

    @property
    def components(self) -> list[str]:
        return list(self._analyzers)

    def analyze(self, component: str, payload: GovernedAnalysisInput) -> dict[str, Any]:
        analyzer = self._analyzers.get(component)
        if analyzer is None:
            raise KeyError(component)
        return analyzer.analyze(payload)
