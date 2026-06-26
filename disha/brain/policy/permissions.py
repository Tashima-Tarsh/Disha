from __future__ import annotations

from pydantic import BaseModel


class PermissionContext(BaseModel):
    actor: str = "operator"
    authorized_environment: bool = False
    can_execute_actions: bool = False
    can_view_sensitive_evidence: bool = False


def can_execute(context: PermissionContext) -> bool:
    return context.authorized_environment and context.can_execute_actions
