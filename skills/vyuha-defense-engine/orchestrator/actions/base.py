from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class Principal:
    user_id: str
    roles: tuple[str, ...] = ("operator",)


@dataclass(frozen=True, slots=True)
class ActionContext:
    request_id: str
    principal: Principal
    # All actions should attach evidence tasks here.
    evidence_tasks: list[dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class ActionOutcome:
    ok: bool
    action_id: str
    reason: str
    metadata: dict[str, Any]
    rollback: dict[str, Any] | None = None
    fallback: dict[str, Any] | None = None


def require_role(principal: Principal, required: str) -> None:
    if required not in principal.roles:
        raise PermissionError(f"missing_role:{required}")

