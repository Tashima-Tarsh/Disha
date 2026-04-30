from datetime import UTC, datetime
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class LearningLoop:
    def __init__(self):
        self.logger = logger.bind(service="learning_loop")

    async def log_search_relevance(
        self,
        query: str,
        results_count: int,
        avg_distance: float,
        user_id: str | None = None,
    ) -> None:
        is_knowledge_gap = results_count == 0 or avg_distance > 0.8

        log_data = {
            "query": query,
            "results_count": results_count,
            "avg_distance": avg_distance,
            "timestamp": datetime.now(UTC).isoformat(),
            "user_id": user_id,
            "is_knowledge_gap": is_knowledge_gap,
        }

        if is_knowledge_gap:
            self.logger.warning("knowledge_gap_detected", **log_data)
            await self._trigger_knowledge_expansion(query)
        else:
            self.logger.info("search_success_logged", **log_data)

    async def _trigger_knowledge_expansion(self, query: str) -> None:

        self.logger.info("queueing_intelligence_expansion", query=query)

    async def capture_feedback(
        self, investigation_id: str, feedback: dict[str, Any]
    ) -> None:
        self.logger.info(
            "feedback_captured", investigation_id=investigation_id, **feedback
        )
