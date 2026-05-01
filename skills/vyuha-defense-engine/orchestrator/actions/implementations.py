from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any


def _load_base():
    here = Path(__file__).resolve().parent
    module_path = here / "base.py"
    name = "vyuha_orch_actions_base"
    spec = importlib.util.spec_from_file_location(name, module_path)
    if not spec or not spec.loader:
        raise RuntimeError("Failed to load base.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_base = _load_base()

ActionContext = _base.ActionContext
ActionOutcome = _base.ActionOutcome
require_role = _base.require_role


def _simulate_fail(params: dict[str, Any]) -> bool:
    return bool(params.get("simulate_fail", False))


def block_ip(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    ip = str(params.get("ip", "")).strip()
    if not ip:
        return ActionOutcome(ok=False, action_id="block_ip", reason="missing_ip", metadata={})
    if _simulate_fail(params):
        return ActionOutcome(
            ok=False,
            action_id="block_ip",
            reason="simulated_failure",
            metadata={"ip": ip},
            fallback={"id": "rate_limit_source", "params": {"source": ip, "profile": "strict"}},
        )
    ctx.evidence_tasks.append({"artifact": "network.block_event", "params": {"ip": ip}})
    return ActionOutcome(
        ok=True,
        action_id="block_ip",
        reason="blocked_ip",
        metadata={"ip": ip},
        rollback={"id": "unblock_ip", "params": {"ip": ip}},
    )


def block_domain(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    domain = str(params.get("domain", "")).strip().lower()
    if not domain:
        return ActionOutcome(ok=False, action_id="block_domain", reason="missing_domain", metadata={})
    if _simulate_fail(params):
        return ActionOutcome(
            ok=False,
            action_id="block_domain",
            reason="simulated_failure",
            metadata={"domain": domain},
            fallback={"id": "rate_limit_source", "params": {"source": domain, "profile": "observe"}},
        )
    ctx.evidence_tasks.append({"artifact": "dns.block_event", "params": {"domain": domain}})
    return ActionOutcome(
        ok=True,
        action_id="block_domain",
        reason="blocked_domain",
        metadata={"domain": domain},
        rollback={"id": "unblock_domain", "params": {"domain": domain}},
    )


def rate_limit_source(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    source = str(params.get("source", "")).strip()
    profile = str(params.get("profile", "balanced")).strip()
    if not source:
        return ActionOutcome(ok=False, action_id="rate_limit_source", reason="missing_source", metadata={})
    if _simulate_fail(params):
        return ActionOutcome(
            ok=False,
            action_id="rate_limit_source",
            reason="simulated_failure",
            metadata={"source": source, "profile": profile},
            fallback={"id": "isolate_network", "params": {"profile": "limited-egress"}},
        )
    ctx.evidence_tasks.append({"artifact": "network.rate_limit_event", "params": {"source": source, "profile": profile}})
    return ActionOutcome(
        ok=True,
        action_id="rate_limit_source",
        reason="rate_limited",
        metadata={"source": source, "profile": profile},
        rollback={"id": "remove_rate_limit", "params": {"source": source}},
    )


def quarantine_file(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    path = str(params.get("path", "")).strip()
    if not path:
        return ActionOutcome(ok=False, action_id="quarantine_file", reason="missing_path", metadata={})
    if _simulate_fail(params):
        return ActionOutcome(
            ok=False,
            action_id="quarantine_file",
            reason="simulated_failure",
            metadata={"path": path},
            fallback={"id": "isolate_network", "params": {"profile": "lockdown"}},
        )
    ctx.evidence_tasks.append({"artifact": "file.quarantine_event", "params": {"path": path}})
    return ActionOutcome(
        ok=True,
        action_id="quarantine_file",
        reason="quarantined",
        metadata={"path": path},
        rollback={"id": "release_quarantine", "params": {"path": path}},
    )


def kill_local_process(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    pid = params.get("pid")
    name = str(params.get("name", "")).strip()
    if pid is None and not name:
        return ActionOutcome(ok=False, action_id="kill_local_process", reason="missing_pid_or_name", metadata={})
    if _simulate_fail(params):
        return ActionOutcome(
            ok=False,
            action_id="kill_local_process",
            reason="simulated_failure",
            metadata={"pid": pid, "name": name},
            fallback={"id": "isolate_network", "params": {"profile": "limited-egress"}},
        )
    ctx.evidence_tasks.append({"artifact": "process.kill_event", "params": {"pid": pid, "name": name}})
    return ActionOutcome(
        ok=True,
        action_id="kill_local_process",
        reason="terminated",
        metadata={"pid": pid, "name": name},
        rollback=None,
    )


def isolate_network(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    profile = str(params.get("profile", "limited-egress")).strip()
    if profile not in {"limited-egress", "lockdown", "trusted-triangle"}:
        return ActionOutcome(ok=False, action_id="isolate_network", reason="invalid_profile", metadata={"profile": profile})
    ctx.evidence_tasks.append({"artifact": "network.isolation_event", "params": {"profile": profile}})
    return ActionOutcome(
        ok=True,
        action_id="isolate_network",
        reason="isolated",
        metadata={"profile": profile},
        rollback={"id": "restore_network", "params": {}},
    )


def lock_sensitive_folder(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    path = str(params.get("path", "")).strip()
    if not path:
        return ActionOutcome(ok=False, action_id="lock_sensitive_folder", reason="missing_path", metadata={})
    ctx.evidence_tasks.append({"artifact": "file.lock_event", "params": {"path": path}})
    return ActionOutcome(
        ok=True,
        action_id="lock_sensitive_folder",
        reason="locked",
        metadata={"path": path},
        rollback={"id": "unlock_folder", "params": {"path": path}},
    )


def revoke_session(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    session_id = params.get("session_id")
    ctx.evidence_tasks.append({"artifact": "auth.revocation_event", "params": {"session_id": session_id}})
    return ActionOutcome(ok=True, action_id="revoke_session", reason="revoked", metadata={"session_id": session_id})


def rotate_keys(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    scope = str(params.get("scope", "local_device"))
    ctx.evidence_tasks.append({"artifact": "crypto.rotation_event", "params": {"scope": scope}})
    return ActionOutcome(ok=True, action_id="rotate_keys", reason="rotated", metadata={"scope": scope})


def start_honeypot(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    template = str(params.get("template", "ssh-canary"))
    # Honeypots are allowed only in owned lab environments; enforce a simple guard here.
    if str(params.get("owned_lab", "false")).lower() not in {"true", "1", "yes"}:
        return ActionOutcome(ok=False, action_id="start_honeypot", reason="not_owned_lab", metadata={"template": template})
    ctx.evidence_tasks.append({"artifact": "honeypot.deploy_event", "params": {"template": template}})
    return ActionOutcome(ok=True, action_id="start_honeypot", reason="started", metadata={"template": template})


def capture_logs(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    since_seconds = int(params.get("since_seconds", 600))
    since_seconds = max(60, min(since_seconds, 24 * 3600))
    ctx.evidence_tasks.append({"artifact": "logs.system", "params": {"since_seconds": since_seconds}})
    return ActionOutcome(ok=True, action_id="capture_logs", reason="captured", metadata={"since_seconds": since_seconds})


def capture_process_tree(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    depth = int(params.get("depth", 6))
    depth = max(2, min(depth, 16))
    ctx.evidence_tasks.append({"artifact": "process.tree_snapshot", "params": {"depth": depth}})
    return ActionOutcome(ok=True, action_id="capture_process_tree", reason="captured", metadata={"depth": depth})


def capture_network_flows(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    since_seconds = int(params.get("since_seconds", 600))
    since_seconds = max(60, min(since_seconds, 24 * 3600))
    ctx.evidence_tasks.append({"artifact": "network.flow_summary", "params": {"since_seconds": since_seconds}})
    return ActionOutcome(ok=True, action_id="capture_network_flows", reason="captured", metadata={"since_seconds": since_seconds})


def generate_evidence_report(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    fmt = str(params.get("format", "markdown")).lower()
    if fmt not in {"markdown", "json", "pdf"}:
        return ActionOutcome(ok=False, action_id="generate_evidence_report", reason="invalid_format", metadata={"format": fmt})
    ctx.evidence_tasks.append({"artifact": "report.request", "params": {"format": fmt}})
    return ActionOutcome(ok=True, action_id="generate_evidence_report", reason="generated", metadata={"format": fmt})


def notify_admin(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    channel = str(params.get("channel", "log")).lower()
    message = str(params.get("message", "")).strip()
    if not message:
        return ActionOutcome(ok=False, action_id="notify_admin", reason="missing_message", metadata={"channel": channel})
    ctx.evidence_tasks.append({"artifact": "alert.emit", "params": {"channel": channel}})
    return ActionOutcome(ok=True, action_id="notify_admin", reason="notified", metadata={"channel": channel})


def start_recovery(ctx: ActionContext, params: dict[str, Any]) -> ActionOutcome:
    require_role(ctx.principal, "admin")
    mode = str(params.get("mode", "soft")).lower()
    if mode not in {"soft", "hard"}:
        return ActionOutcome(ok=False, action_id="start_recovery", reason="invalid_mode", metadata={"mode": mode})
    ctx.evidence_tasks.append({"artifact": "recovery.start", "params": {"mode": mode}})
    return ActionOutcome(ok=True, action_id="start_recovery", reason="started", metadata={"mode": mode})
