import uuid
from datetime import UTC, datetime
from typing import Any

import structlog


def setup_observability():
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )


class AuditLogger:
    def __init__(self, service_name: str):
        self.logger = structlog.get_logger(service_name)

    def log_event(self, event_type: str, actor: str, details: dict[str, Any]):
        self.logger.info(
            "audit_event",
            event_type=event_type,
            actor=actor,
            timestamp=datetime.now(UTC).isoformat(),
            **details,
        )


class RequestTracer:
    @staticmethod
    def generate_request_id() -> str:
        return str(uuid.uuid4())
