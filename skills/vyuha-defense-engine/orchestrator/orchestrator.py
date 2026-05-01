from __future__ import annotations

import importlib.util
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4


def _load_sibling(rel_path: str, name: str):
    here = Path(__file__).resolve().parent
    module_path = here / rel_path
    spec = importlib.util.spec_from_file_location(name, module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Failed to load {rel_path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_audit = _load_sibling("audit_logger.py", "vyuha_orch_audit")
_base = _load_sibling("actions/base.py", "vyuha_orch_actions_base")
_impl = _load_sibling("actions/implementations.py", "vyuha_orch_actions_impl")

AuditLogger = _audit.AuditLogger
ActionContext = _base.ActionContext
ActionOutcome = _base.ActionOutcome
Principal = _base.Principal
impl = _impl


ALLOWED_ACTIONS: dict[str, tuple[str, Any]] = {
    "block_ip": ("traffic.block", impl.block_ip),
    "block_domain": ("traffic.block", impl.block_domain),
    "rate_limit_source": ("traffic.rate_limit", impl.rate_limit_source),
    "quarantine_file": ("file.quarantine", impl.quarantine_file),
    "kill_local_process": ("process.kill_local", impl.kill_local_process),
    "isolate_network": ("device.isolate", impl.isolate_network),
    "lock_sensitive_folder": ("file.quarantine", impl.lock_sensitive_folder),
    "revoke_session": ("session.revoke_local", impl.revoke_session),
    "rotate_keys": ("keys.rotate", impl.rotate_keys),
    "start_honeypot": ("honeypot.deploy_owned", impl.start_honeypot),
    "capture_logs": ("evidence.preserve", impl.capture_logs),
    "capture_process_tree": ("evidence.preserve", impl.capture_process_tree),
    "capture_network_flows": ("evidence.preserve", impl.capture_network_flows),
    "generate_evidence_report": ("report.generate", impl.generate_evidence_report),
    "notify_admin": ("alert.emit", impl.notify_admin),
    "start_recovery": ("system.recover", impl.start_recovery),
}


def _load_allowed_policy_ids() -> set[str]:
    """
    Loads policy allowlist from policies/allowed-defense-actions.yaml.

    We keep parsing minimal and deterministic (no YAML dependency). The file is
    treated as a line-based allowlist source.
    """
    root = Path(__file__).resolve().parents[3]
    path = root / "policies" / "allowed-defense-actions.yaml"
    if not path.exists():
        return set()
    allowed: set[str] = set()
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if line.startswith("- id:"):
            allowed.add(line.split(":", 1)[1].strip())
    return allowed


ALLOWED_POLICY_IDS = _load_allowed_policy_ids()


@dataclass(frozen=True, slots=True)
class OrchestratorResult:
    request_id: str
    ok: bool
    outcomes: list[dict[str, Any]]
    evidence_tasks: list[dict[str, Any]]


class DefensiveOrchestrator:
    def __init__(self, audit_logger: AuditLogger | None = None) -> None:
        self.audit = audit_logger or AuditLogger()

    def execute(
        self,
        *,
        actions: list[dict[str, Any]],
        principal: Principal | None = None,
        request_id: str | None = None,
    ) -> OrchestratorResult:
        rid = request_id or str(uuid4())
        actor = (principal.user_id if principal else "system")
        ctx = ActionContext(request_id=rid, principal=principal or Principal(user_id=actor))
        outcomes: list[dict[str, Any]] = []

        for item in actions:
            action_id = str(item.get("id", "")).strip()
            params = dict(item.get("params", {}) or {})
            reason = str(item.get("reason", "")).strip() or "no_reason_provided"

            # 1) Permission check (allowlist + policy mapping)
            if action_id not in ALLOWED_ACTIONS:
                self.audit.emit(
                    request_id=rid,
                    actor=actor,
                    action=f"orchestrator.action.{action_id}",
                    outcome="deny",
                    reason="unknown_action",
                    metadata={"action_id": action_id},
                )
                outcomes.append({"action": action_id, "ok": False, "reason": "unknown_action", "rollback": None})
                continue

            policy_id, fn = ALLOWED_ACTIONS[action_id]
            if ALLOWED_POLICY_IDS and policy_id not in ALLOWED_POLICY_IDS:
                self.audit.emit(
                    request_id=rid,
                    actor=actor,
                    action=f"orchestrator.action.{action_id}",
                    outcome="deny",
                    reason="policy_not_allowed",
                    metadata={"policy_id": policy_id},
                )
                outcomes.append({"action": action_id, "ok": False, "reason": "policy_not_allowed", "rollback": None})
                continue

            # 2) Safety check (lightweight bounds + explicit reason)
            if len(json.dumps(params)) > 20_000:
                self.audit.emit(
                    request_id=rid,
                    actor=actor,
                    action=f"orchestrator.action.{action_id}",
                    outcome="deny",
                    reason="params_too_large",
                    metadata={},
                )
                outcomes.append({"action": action_id, "ok": False, "reason": "params_too_large", "rollback": None})
                continue

            # 3) Audit log (pre)
            self.audit.emit(
                request_id=rid,
                actor=actor,
                action=f"orchestrator.action.{action_id}",
                outcome="start",
                reason=reason,
                metadata={"policy_id": policy_id},
            )

            # 4) Execute (stub) with rollback/fallback metadata
            try:
                outcome: ActionOutcome = fn(ctx, params)
            except PermissionError as exc:
                outcome = ActionOutcome(
                    ok=False,
                    action_id=action_id,
                    reason=f"permission_error:{exc}",
                    metadata={},
                    rollback=None,
                    fallback={"id": "capture_logs", "params": {"since_seconds": 1800}, "reason": "capture evidence on deny"},
                )
            except Exception as exc:  # defensive engine must not crash
                outcome = ActionOutcome(
                    ok=False,
                    action_id=action_id,
                    reason=f"exception:{type(exc).__name__}",
                    metadata={},
                    rollback=None,
                    fallback={"id": "isolate_network", "params": {"profile": "limited-egress"}, "reason": "contain on error"},
                )

            # 5) Evidence capture (always append at least a log capture if none)
            if not ctx.evidence_tasks:
                ctx.evidence_tasks.append({"artifact": "logs.system", "params": {"since_seconds": 600}})

            # 6) Audit log (post)
            self.audit.emit(
                request_id=rid,
                actor=actor,
                action=f"orchestrator.action.{action_id}",
                outcome="success" if outcome.ok else "failure",
                reason=outcome.reason,
                metadata={"rollback": outcome.rollback, "fallback": outcome.fallback},
            )

            outcomes.append(
                {
                    "action": action_id,
                    "ok": outcome.ok,
                    "reason": outcome.reason,
                    "rollback": outcome.rollback,
                    "fallback": outcome.fallback,
                    "metadata": outcome.metadata,
                }
            )

            # Failure fallback (execute safest fallback once, if provided)
            if not outcome.ok and outcome.fallback:
                fb_id = str(outcome.fallback.get("id", "")).strip()
                fb_params = dict(outcome.fallback.get("params", {}) or {})
                fb_reason = str(outcome.fallback.get("reason", "")).strip() or "fallback"
                if fb_id in ALLOWED_ACTIONS:
                    fb_policy, fb_fn = ALLOWED_ACTIONS[fb_id]
                    if not ALLOWED_POLICY_IDS or fb_policy in ALLOWED_POLICY_IDS:
                        self.audit.emit(
                            request_id=rid,
                            actor=actor,
                            action=f"orchestrator.fallback.{fb_id}",
                            outcome="start",
                            reason=fb_reason,
                            metadata={"policy_id": fb_policy},
                        )
                        fb_out = fb_fn(ctx, fb_params)
                        self.audit.emit(
                            request_id=rid,
                            actor=actor,
                            action=f"orchestrator.fallback.{fb_id}",
                            outcome="success" if fb_out.ok else "failure",
                            reason=fb_out.reason,
                            metadata={},
                        )
                        outcomes.append(
                            {"action": fb_id, "ok": fb_out.ok, "reason": fb_out.reason, "rollback": fb_out.rollback}
                        )

        ok = all(bool(o.get("ok")) for o in outcomes) if outcomes else True
        return OrchestratorResult(request_id=rid, ok=ok, outcomes=outcomes, evidence_tasks=ctx.evidence_tasks)
