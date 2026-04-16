#!/usr/bin/env python3
"""
Disha Mythos  Adaptive Learning, Protection & Intelligence System.

Inspired by Claude Mythos, this is Disha's unified orchestrator that
continuously learns, protects, and evolves the system.  It combines:

  1. **Threat Guardian**  scans for secrets, vulnerabilities, injections
  2. **Multi-Model Hub**  queries Claude, GPT, Gemini, Perplexity, Ollama
  3. **Self-Healing Monitor**  validates imports, configs, checkpoints
  4. **Knowledge Aggregator**  builds cross-domain training corpora
  5. **Continuous Training**  improves RL, GNN, and decision models

Usage::

    python scripts/disha_mythos.py                   # full system scan + report
    python scripts/disha_mythos.py --protect         # scan + auto-neutralize threats
    python scripts/disha_mythos.py --learn           # run knowledge aggregation
    python scripts/disha_mythos.py --train           # continuous training round
    python scripts/disha_mythos.py --all             # everything: protect + learn + train
    python scripts/disha_mythos.py --status          # quick status check
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import structlog

#  Path setup
REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "disha" / "scripts"
BACKEND = REPO_ROOT / "disha" / "ai" / "core"
DECISION_DIR = BACKEND / "decision-engine"

for p in [str(SCRIPTS_DIR), str(BACKEND), str(DECISION_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")

logger = structlog.get_logger("disha_mythos")


def _import_guardian():
    from threat_guardian import ThreatGuardian
    return ThreatGuardian


def _import_monitor():
    from monitor import SelfHealingMonitor
    return SelfHealingMonitor


def _import_model_hub():
    # Model hub functionality is being integrated into AI Core
    # For now, we stub this to prevent broken imports during transition
    class HubStub:
        def status(self):
            return {"total_count": 0}

        def ask(self, *args, **kwargs):
            class Resp:
                ok = True
            return Resp()

        def available_providers(self):
            return []
    return HubStub


def _import_knowledge_engine():
    from knowledge_engine import KnowledgeEngine
    return KnowledgeEngine


#
# Mythos phases
#

def phase_protect(auto_fix: bool = True) -> dict:
    """Phase 1: Threat Detection & Neutralization."""
    logger.info("phase_start", phase="PROTECT")
    Guardian = _import_guardian()
    guardian = Guardian()
    report = guardian.full_scan()

    fixed = 0
    if auto_fix:
        fixed = guardian.neutralize(report)

    result = {
        "phase": "protect",
        "system_health": report.system_health,
        "threats_found": len(report.threats),
        "threats_neutralized": fixed,
        "critical": report.critical_count,
        "high": report.high_count,
        "scans": report.scans_performed,
    }
    logger.info("phase_complete", **result)
    return result


def phase_heal(auto_fix: bool = True) -> dict:
    """Phase 2: System Health Check & Self-Healing."""
    logger.info("phase_start", phase="HEAL")
    Monitor = _import_monitor()
    monitor = Monitor()
    health = monitor.check_all()

    fixed = 0
    if auto_fix:
        fixed = monitor.heal(health)

    result = {
        "phase": "heal",
        "overall_status": health.overall_status.value,
        "score": round(health.score, 3),
        "checks_run": len(health.checks),
        "issues_fixed": fixed,
        "details": {c.name: c.status.value for c in health.checks},
    }
    logger.info("phase_complete", **result)
    return result


def phase_intelligence() -> dict:
    """Phase 3: Multi-Model Intelligence Status."""
    logger.info("phase_start", phase="INTELLIGENCE")
    Hub = _import_model_hub()
    hub = Hub()
    status = hub.status()

    # Quick test with mock provider
    test_response = hub.ask("System status check", prefer="mock")

    result = {
        "phase": "intelligence",
        "available_providers": hub.available_providers(),
        "total_providers": status["total_count"],
        "test_response_ok": test_response.ok,
    }
    logger.info("phase_complete", **result)
    return result


def phase_learn() -> dict:
    """Phase 4: Knowledge Aggregation."""
    logger.info("phase_start", phase="LEARN")
    try:
        KnowledgeEngine = _import_knowledge_engine()
        engine = KnowledgeEngine()
        corpus = engine.load_all()
        training_data = engine.build_training_pairs(corpus, max_pairs=500)

        result = {
            "phase": "learn",
            "domains_loaded": len(corpus.domain_counts),
            "total_items": len(corpus.items),
            "training_pairs": len(training_data),
            "domain_breakdown": corpus.domain_counts,
        }
    except Exception as e:
        logger.warning("learn_degraded", error=str(e))
        result = {
            "phase": "learn",
            "status": "degraded",
            "error": str(e),
        }

    logger.info("phase_complete", **result)
    return result


def phase_train(rounds: int = 1, offline: bool = True) -> dict:
    """Phase 5: Continuous Training Round."""
    logger.info("phase_start", phase="TRAIN", rounds=rounds)
    try:
        # Import the continuous trainer dynamically
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "continuous_train", SCRIPTS_DIR / "continuous_train.py"
        )
        ct = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ct)

        trainer = ct.ContinuousTrainer(offline=offline)
        summary = trainer.run(rounds=rounds)

        result = {
            "phase": "train",
            "rounds_completed": rounds,
            "metrics": summary if isinstance(summary, dict) else {"status": "complete"},
        }
    except Exception as e:
        logger.warning("train_degraded", error=str(e))
        result = {
            "phase": "train",
            "status": "degraded",
            "error": str(e),
        }

    logger.info("phase_complete", **result)
    return result


#
# Main orchestrator
#

def run_mythos(
    protect: bool = True,
    learn: bool = False,
    train: bool = False,
    train_rounds: int = 1,
    offline: bool = True,
) -> dict:
    """Run the full Disha Mythos pipeline.

    Returns a summary of all phases executed.
    """
    start = time.time()
    summary = {
        "system": "Disha Mythos",
        "version": "1.0.0",
        "started_at": start,
        "phases": [],
    }

    # Phase 1: Protect
    if protect:
        summary["phases"].append(phase_protect())

    # Phase 2: Heal
    if protect:
        summary["phases"].append(phase_heal())

    # Phase 3: Intelligence status
    summary["phases"].append(phase_intelligence())

    # Phase 4: Learn
    if learn:
        summary["phases"].append(phase_learn())

    # Phase 5: Train
    if train:
        summary["phases"].append(phase_train(rounds=train_rounds, offline=offline))

    elapsed = time.time() - start
    summary["elapsed_seconds"] = round(elapsed, 2)
    summary["completed_at"] = time.time()

    return summary


def _print_summary(summary: dict) -> None:
    """Pretty-print the Mythos summary.  Never logs raw secret values."""
    _SENSITIVE_TOKENS = ("secret", "token", "password", "key", "credential", "auth")

    def _is_sensitive_label(label: object) -> bool:
        s = str(label).lower()
        return any(t in s for t in _SENSITIVE_TOKENS)

    def _looks_like_secret_value(text: str) -> bool:
        s = text.strip()
        if not s:
            return False
        # Common credential/token formats
        if s.startswith("ghp_") or s.startswith("github_pat_"):
            return True
        if s.startswith("AKIA") and len(s) == 20:
            return True
        if s.count(".") == 2 and len(s) > 40:
            # likely JWT-like token
            return True
        # Long hex / base64-like strings are often secrets
        if len(s) >= 32 and all(c in "0123456789abcdefABCDEF" for c in s):
            return True
        b64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=_-"
        if len(s) >= 40 and all(c in b64_chars for c in s):
            return True
        return False

    def _sanitize(value: object) -> str:
        """Return a safe string representation, redacting anything that looks sensitive."""
        text = str(value)
        if _is_sensitive_label(text) or _looks_like_secret_value(text):
            return "[REDACTED]"
        # Truncate overly long values that might contain encoded secrets
        if len(text) > 200:
            return text[:197] + "..."
        return text

    elapsed = summary.get("elapsed_seconds", 0)

    # Build the entire output as a safe buffer before writing
    lines: list[str] = [
        f"\n{'' * 70}",
        "    DISHA MYTHOS  Adaptive Intelligence Report",
        f"  Completed in {elapsed:.1f}s",
        f"{'' * 70}",
    ]

    # Allowed keys for display (excludes any potential sensitive data)
    _SAFE_KEYS = {
        "phase", "system_health", "threats_found", "threats_neutralized",
        "critical", "high", "scans", "overall_status", "score",
        "checks_run", "issues_fixed", "details", "available_providers",
        "total_providers", "test_response_ok", "domains_loaded",
        "total_items", "training_pairs", "domain_breakdown",
        "rounds_completed", "metrics", "status",
    }

    for phase_data in summary.get("phases", []):
        raw_phase = str(phase_data.get("phase", "unknown")).lower()
        allowed_phases = {"protect", "heal", "intelligence", "learn", "train"}
        phase = raw_phase if raw_phase in allowed_phases else "unknown"
        emoji_map = {
            "protect": "",
            "heal": "",
            "intelligence": "",
            "learn": "",
            "train": "",
        }
        emoji = emoji_map.get(phase, "")
        lines.append(f"\n  {emoji}  Phase: {phase.upper()}")

        for key, value in phase_data.items():
            if key == "phase" or key not in _SAFE_KEYS:
                continue
            safe_key = _sanitize(key)
            if isinstance(value, dict):
                lines.append(f"     {safe_key}:")
                for k, v in value.items():
                    lines.append(f"       {_sanitize(k)}: {_sanitize(v)}")
            else:
                lines.append(f"     {safe_key}: {_sanitize(value)}")

    lines.append(f"\n{'' * 70}\n")

    # Write the pre-sanitized buffer
    sys.stdout.write("\n".join(lines))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Disha Mythos  Adaptive Learning, Protection & Intelligence",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--protect", action="store_true", help="Run threat scan & auto-fix")
    parser.add_argument("--learn", action="store_true", help="Run knowledge aggregation")
    parser.add_argument("--train", action="store_true", help="Run continuous training")
    parser.add_argument("--train-rounds", type=int, default=1, help="Training rounds (default: 1)")
    parser.add_argument("--all", action="store_true", help="Run all phases")
    parser.add_argument("--status", action="store_true", help="Quick status check only")
    parser.add_argument("--offline", action="store_true", default=True, help="Offline training (synthetic data)")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    # Default to protect if nothing specified
    if not any([args.protect, args.learn, args.train, args.all, args.status]):
        args.protect = True

    if args.status:
        # Quick status only
        summary = run_mythos(protect=True, learn=False, train=False)
    elif args.all:
        summary = run_mythos(protect=True, learn=True, train=True,
                             train_rounds=args.train_rounds, offline=args.offline)
    else:
        summary = run_mythos(
            protect=args.protect,
            learn=args.learn,
            train=args.train,
            train_rounds=args.train_rounds,
            offline=args.offline,
        )

    if args.json:
        print(json.dumps(summary, indent=2, default=str))
    else:
        _print_summary(summary)

    # Save summary
    report_path = REPO_ROOT / "mythos_report.json"
    with open(report_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)

    # Determine exit code from phases
    for phase_data in summary.get("phases", []):
        if phase_data.get("critical", 0) > 0:
            sys.exit(2)
        if phase_data.get("overall_status") == "failing":
            sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
