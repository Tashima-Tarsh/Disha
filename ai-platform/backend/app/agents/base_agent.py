"""Base agent class for all intelligence agents."""

import uuid
from abc import ABC, abstractmethod
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class BaseAgent(ABC):
    """Abstract base class for all intelligence agents."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.agent_id = str(uuid.uuid4())
        self.logger = logger.bind(agent=name, agent_id=self.agent_id)

    @abstractmethod
    async def execute(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Execute the agent's primary task."""
        ...

    async def run(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Run the agent with error handling and logging."""
        self.logger.info("agent_started", target=target)
        try:
            result = await self.execute(target, options or {})
            self.logger.info("agent_completed", target=target, result_keys=list(result.keys()))
            return {"agent": self.name, "status": "success", "data": result}
        except Exception as e:
            self.logger.error("agent_failed", target=target, error=str(e))
            return {"agent": self.name, "status": "error", "error": str(e), "data": {}}
