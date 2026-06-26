from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class NFUDecision(str, Enum):
    allowed = "allowed"
    forbidden = "forbidden"
    requires_human_approval = "requires_human_approval"


ALLOWED_ACTIONS = {
    "monitor",
    "block",
    "rate_limit",
    "contain",
    "quarantine",
    "terminate_local_process",
    "revoke_session",
    "rotate_key",
    "preserve_evidence",
    "report",
    "alert",
    "recover",
    "owned_honeypot",
}

FORBIDDEN_ACTIONS = {
    "hack_back",
    "exploit_attacker_system",
    "credential_theft",
    "deploy_malware",
    "ddos",
    "destructive_retaliation",
    "unauthorized_scan",
    "attack_third_party",
    "unauthorized_access",
    "brute_force",
    "auth_bypass",
    "self_propagate",
}


class NFUResult(BaseModel):
    decision: NFUDecision
    status: str
    allowed_actions: list[str] = Field(default_factory=list)
    forbidden_actions: list[str] = Field(default_factory=list)
    reason: str


def evaluate_actions(actions: list[str], authorized_environment: bool = False) -> NFUResult:
    normalized = {action.strip().lower().replace(" ", "_") for action in actions}
    forbidden = sorted(normalized & FORBIDDEN_ACTIONS)
    unknown = sorted(normalized - ALLOWED_ACTIONS - FORBIDDEN_ACTIONS)
    allowed = sorted(normalized & ALLOWED_ACTIONS)

    if forbidden:
        return NFUResult(
            decision=NFUDecision.forbidden,
            status="blocked_by_no_first_use",
            allowed_actions=allowed,
            forbidden_actions=forbidden,
            reason="NFU forbids offensive, retaliatory, unauthorized, or destructive action.",
        )
    if "owned_honeypot" in normalized and not authorized_environment:
        return NFUResult(
            decision=NFUDecision.forbidden,
            status="blocked_unowned_honeypot",
            allowed_actions=allowed,
            reason="Honeypots are allowed only in owned or authorized environments.",
        )
    if unknown:
        return NFUResult(
            decision=NFUDecision.requires_human_approval,
            status="ambiguous_action_requires_approval",
            allowed_actions=allowed,
            forbidden_actions=unknown,
            reason="Ambiguous actions are escalated before execution.",
        )
    return NFUResult(
        decision=NFUDecision.allowed,
        status="nfu_compliant",
        allowed_actions=allowed,
        reason="All requested actions are defensive and evidence-preserving.",
    )

