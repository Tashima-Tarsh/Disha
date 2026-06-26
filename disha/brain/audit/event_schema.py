from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class AuditEvent(BaseModel):
    event_id: str
    action: str
    actor: str = "disha_brain"
    version: str | None = None
    outcome: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

