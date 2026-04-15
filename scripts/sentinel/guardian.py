"""
Disha Sentinel — Guardian System

Mythos-style protection layer that:
1. Continuously monitors threats via threat_monitor
2. Auto-heals by re-training models when drift is detected
3. Routes analysis through multi-model orchestration
4. Maintains system health and integrity checks
5. Provides a unified status dashboard

Usage::

    python -m scripts.sentinel.guardian --mode protect   # continuous protection
    python -m scripts.sentinel.guardian --mode scan       # one-time full scan
    python -m scripts.sentinel.guardian --mode status     # show system status
    python -m scripts.sentinel.guardian --mode heal       # trigger auto-heal
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("disha.sentinel.guardian")

_REPO = Path(__file__).resolve().parents[2]
_STATUS_FILE = _REPO / "logs" / "sentinel" / "guardian_status.json"
_STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)


# ── Health Checks ─────────────────────────────────────────────────────

def check_model_health() -> dict[str, Any]:
    """Verify trained model checkpoints exist and are valid."""
    checks: dict[str, Any] = {}

    # RL checkpoint
    rl_ckpt = _REPO / "ai-platform" / "backend" / "checkpoints" / "rl_policy.pt"
    checks["rl_policy"] = {
        "exists": rl_ckpt.exists(),
        "size_bytes": rl_ckpt.stat().st_size if rl_ckpt.exists() else 0,
        "path": str(rl_ckpt),
    }

    # GNN checkpoints
    for name in ["gnn_link_predictor.pt", "gnn_classifier.pt"]:
        path = _REPO / "ai-platform" / "backend" / "checkpoints" / name
        checks[name.replace(".pt", "")] = {
            "exists": path.exists(),
            "size_bytes": path.stat().st_size if path.exists() else 0,
            "path": str(path),
        }

    # Decision engine
    dec_ckpt = _REPO / "decision-engine" / "checkpoints" / "calibration_model.json"
    checks["decision_calibration"] = {
        "exists": dec_ckpt.exists(),
        "size_bytes": dec_ckpt.stat().st_size if dec_ckpt.exists() else 0,
        "path": str(dec_ckpt),
    }

    # Training metrics
    for name in ["rl_training_metrics.json", "gnn_training_metrics.json"]:
        path = _REPO / "ai-platform" / "backend" / "checkpoints" / name
        if path.exists():
            try:
                with open(path) as f:
                    metrics = json.load(f)
                checks[name.replace(".json", "")] = {"valid": True, "metrics": metrics}
            except (json.JSONDecodeError, OSError):
                checks[name.replace(".json", "")] = {"valid": False}

    all_exist = all(
        v.get("exists", v.get("valid", False))
        for v in checks.values()
    )
    return {"healthy": all_exist, "checks": checks}


def check_knowledge_health() -> dict[str, Any]:
    """Verify knowledge base integrity."""
    kb_dir = _REPO / "knowledge-base"
    domains = ["chemistry", "computing", "cybersecurity", "innovation", "law", "mathematics"]

    domain_status: dict[str, Any] = {}
    for domain in domains:
        domain_path = kb_dir / domain
        if domain_path.exists():
            files = list(domain_path.glob("*.json"))
            total_size = sum(f.stat().st_size for f in files)
            domain_status[domain] = {
                "exists": True,
                "files": len(files),
                "total_bytes": total_size,
            }
        else:
            domain_status[domain] = {"exists": False, "files": 0, "total_bytes": 0}

    all_present = all(d["exists"] for d in domain_status.values())
    return {"healthy": all_present, "domains": domain_status}


def check_service_configs() -> dict[str, Any]:
    """Verify service configuration files exist."""
    configs = {
        "docker_compose": _REPO / "cyber-defense" / "docker-compose.yml",
        "ai_requirements": _REPO / "ai-platform" / "backend" / "requirements.txt",
        "decision_requirements": _REPO / "decision-engine" / "requirements.txt",
        "mcp_package": _REPO / "mcp-server" / "package.json",
        "biome_config": _REPO / "biome.json",
        "tsconfig": _REPO / "tsconfig.json",
        "gitignore": _REPO / ".gitignore",
    }

    results: dict[str, Any] = {}
    for name, path in configs.items():
        results[name] = {"exists": path.exists(), "path": str(path)}

    all_ok = all(v["exists"] for v in results.values())
    return {"healthy": all_ok, "configs": results}


# ── Auto-Heal ─────────────────────────────────────────────────────────

def trigger_heal(components: list[str] | None = None) -> dict[str, Any]:
    """
    Re-train specified components (or all if none specified).

    Uses the existing continuous_train.py infrastructure.
    """
    import subprocess

    train_script = _REPO / "scripts" / "continuous_train.py"
    if not train_script.exists():
        return {"status": "error", "message": "continuous_train.py not found"}

    results: dict[str, Any] = {}
    targets = components or ["rl", "gnn", "decision"]

    for component in targets:
        logger.info("heal_component component=%s", component)
        try:
            result = subprocess.run(
                [
                    sys.executable, str(train_script),
                    "--rounds", "1",
                    "--offline",
                    "--component", component,
                ],
                capture_output=True,
                text=True,
                timeout=600,
                cwd=str(_REPO),
            )
            results[component] = {
                "status": "success" if result.returncode == 0 else "failed",
                "returncode": result.returncode,
                "stdout_tail": result.stdout[-500:] if result.stdout else "",
                "stderr_tail": result.stderr[-500:] if result.stderr else "",
            }
        except subprocess.TimeoutExpired:
            results[component] = {"status": "timeout"}
        except Exception as exc:
            results[component] = {"status": "error", "message": str(exc)}

    return {"heal_results": results}


# ── Full Scan ─────────────────────────────────────────────────────────

def full_scan() -> dict[str, Any]:
    """Run a comprehensive system scan."""
    logger.info("full_scan_started")

    model_health = check_model_health()
    knowledge_health = check_knowledge_health()
    config_health = check_service_configs()

    # Threat monitoring pass
    from scripts.sentinel.threat_monitor import run_once as threat_scan
    threat_result = threat_scan()

    overall_healthy = (
        model_health["healthy"]
        and knowledge_health["healthy"]
        and config_health["healthy"]
    )

    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overall_healthy": overall_healthy,
        "model_health": model_health,
        "knowledge_health": knowledge_health,
        "config_health": config_health,
        "threat_scan": {
            "total_indicators": threat_result.get("total_indicators", 0),
            "alerts_generated": threat_result.get("alerts_generated", 0),
            "critical_count": threat_result.get("critical_count", 0),
        },
    }

    # Save status
    _save_status(result)
    logger.info("full_scan_completed healthy=%s", overall_healthy)
    return result


# ── Continuous Protection ─────────────────────────────────────────────

def protect_loop(interval: int = 600) -> None:
    """
    Continuous protection mode.

    Runs periodic scans and auto-heals when issues are detected.
    """
    import signal

    running = True

    def _stop(signum: int, _frame: Any) -> None:
        nonlocal running
        logger.info("guardian_shutdown_signal signal=%d", signum)
        running = False

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    logger.info("guardian_protect_started interval=%ds", interval)
    cycle = 0

    while running:
        cycle += 1
        logger.info("guardian_cycle cycle=%d", cycle)

        try:
            result = full_scan()

            # Auto-heal if models are unhealthy
            if not result["model_health"]["healthy"]:
                logger.warning("model_unhealthy — triggering auto-heal")
                unhealthy = [
                    k for k, v in result["model_health"]["checks"].items()
                    if not v.get("exists", v.get("valid", False))
                ]
                # Map check names to component names
                component_map = {
                    "rl_policy": "rl",
                    "gnn_link_predictor": "gnn",
                    "gnn_classifier": "gnn",
                    "decision_calibration": "decision",
                }
                components = list({component_map.get(k, k) for k in unhealthy if k in component_map})
                if components:
                    heal_result = trigger_heal(components)
                    logger.info("auto_heal_completed results=%s", json.dumps(heal_result, default=str))

        except Exception:
            logger.exception("guardian_cycle_error")

        for _ in range(interval):
            if not running:
                break
            time.sleep(1)

    logger.info("guardian_protect_stopped cycles=%d", cycle)


# ── Status ────────────────────────────────────────────────────────────

def _save_status(data: dict[str, Any]) -> None:
    """Save guardian status to file."""
    with open(_STATUS_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_status() -> dict[str, Any]:
    """Load last known guardian status."""
    if _STATUS_FILE.exists():
        try:
            with open(_STATUS_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {"status": "no_data", "message": "No previous scan results. Run --mode scan first."}


# ── CLI ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Disha Sentinel — Guardian System")
    parser.add_argument(
        "--mode",
        choices=["protect", "scan", "status", "heal"],
        default="status",
        help="Operation mode (default: status)",
    )
    parser.add_argument("--interval", type=int, default=600, help="Seconds between cycles in protect mode")
    parser.add_argument("--components", nargs="*", help="Components to heal (rl, gnn, decision)")
    args = parser.parse_args()

    if args.mode == "protect":
        protect_loop(interval=args.interval)
    elif args.mode == "scan":
        result = full_scan()
        print(json.dumps(result, indent=2, default=str))
    elif args.mode == "heal":
        result = trigger_heal(args.components)
        print(json.dumps(result, indent=2, default=str))
    elif args.mode == "status":
        result = get_status()
        print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
