import asyncio
from collections.abc import Callable
from datetime import datetime
from typing import Any

import structlog

logger = structlog.get_logger("automation_orchestrator")


class WorkflowOrchestrator:
    """Event-driven automation engine (n8n style) for DISHA OS."""

    def __init__(self):
        self.registry: dict[str, list[Callable]] = {}
        self.history: list[dict[str, Any]] = []

    def register_workflow(self, event_type: str, handler: Callable):
        """Register a specific automation to an event (e.g. 'PR_CREATED', 'SECURITY_ALERT')."""
        if event_type not in self.registry:
            self.registry[event_type] = []
        self.registry[event_type].append(handler)
        logger.info("workflow_registered", event=event_type, handler=handler.__name__)

    async def trigger_event(self, event_type: str, data: dict[str, Any]):
        """Trigger all workflows associated with an event."""
        logger.info("event_triggered", event=event_type)

        if event_type in self.registry:
            tasks = []
            for handler in self.registry[event_type]:
                tasks.append(handler(data))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            record = {
                "timestamp": datetime.now().isoformat(),
                "event": event_type,
                "results": [str(r) for r in results],
            }
            self.history.append(record)
            logger.info("workflows_completed", event=event_type, count=len(results))
        else:
            logger.warning("no_workflows_found", event=event_type)


# Example Workflows (Implementations)
async def devops_pr_summary_workflow(data):
    """Summarizes a PR and posts to Slack/Logs."""
    logger.info("running_devops_pr_summary", pr_id=data.get("id"))
    return "PR Summary Generated"


async def security_incident_workflow(data):
    """Triggers autonomous hardening on threat detection."""
    logger.info("running_security_incident_response", threat=data.get("type"))
    return "Hardening Patches Applied"


if __name__ == "__main__":
    orchestrator = WorkflowOrchestrator()
    orchestrator.register_workflow("GITHUB_PR", devops_pr_summary_workflow)
    orchestrator.register_workflow("SECURITY_ALERT", security_incident_workflow)

    asyncio.run(orchestrator.trigger_event("GITHUB_PR", {"id": "PR-1234"}))
