from __future__ import annotations

from pydantic import BaseModel


class HumanApproval(BaseModel):
    required: bool
    reason: str
    approver_role: str = "authorized_human_operator"


def approval_gate(required: bool, reason: str) -> HumanApproval:
    return HumanApproval(required=required, reason=reason)
