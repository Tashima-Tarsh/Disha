from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True, slots=True)
class AuditEvent:
    ts: str
    request_id: str
    actor: str
    action: str
    outcome: str
    reason: str
    metadata: dict[str, Any]


class AuditLogger:
    """
    Minimal structured audit logger for the orchestrator.

    - Always emits JSON.
    - Safe default: writes to stdout and optionally to a file.
    """

    def __init__(self, log_path: str | None = None) -> None:
        self._path = Path(log_path) if log_path else None

    def emit(
        self,
        *,
        request_id: str,
        actor: str,
        action: str,
        outcome: str,
        reason: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        event = AuditEvent(
            ts=datetime.now(UTC).isoformat(),
            request_id=request_id,
            actor=actor,
            action=action,
            outcome=outcome,
            reason=reason,
            metadata=metadata or {},
        )
        line = json.dumps(asdict(event), separators=(",", ":"), ensure_ascii=True)
        print(line)
        if self._path:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.open("a", encoding="utf-8").write(line + "\n")
