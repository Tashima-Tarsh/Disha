#!/usr/bin/env python3
"""
Unified Training Orchestrator — trains all three AI sub-systems.

Usage::

    python scripts/train_all.py          # from repo root
    python scripts/train_all.py --skip-decision  # skip decision engine

Components trained:
  1. RL Environment  → PPO policy for investigation action selection
  2. Graph Neural Net → GCN encoder + link predictor + node classifier
  3. Decision Engine  → Confidence calibration model
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _run(label: str, cmd: list[str], cwd: str, env_extra: dict | None = None) -> bool:
    """Run *cmd* in a subprocess, printing live output. Return True on success."""
    env = dict(os.environ)
    if env_extra:
        env.update(env_extra)
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    t0 = time.time()
    proc = subprocess.run(cmd, cwd=cwd, env=env)
    elapsed = time.time() - t0
    ok = proc.returncode == 0
    status = "✅ PASSED" if ok else "❌ FAILED"
    print(f"\n  {status} ({elapsed:.1f}s)")
    return ok


def main():
    parser = argparse.ArgumentParser(description="Train all AI components")
    parser.add_argument("--skip-rl", action="store_true", help="Skip RL training")
    parser.add_argument("--skip-gnn", action="store_true", help="Skip GNN training")
    parser.add_argument("--skip-decision", action="store_true", help="Skip Decision Engine training")
    parser.add_argument("--rl-episodes", type=int, default=500, help="RL training episodes")
    parser.add_argument("--gnn-epochs", type=int, default=200, help="GNN training epochs")
    parser.add_argument("--de-scenarios", type=int, default=200, help="Decision engine scenarios")
    args = parser.parse_args()

    results = {}
    all_ok = True

    # ── 1. RL Environment ─────────────────────────────────────────────
    if not args.skip_rl:
        ok = _run(
            "RL Environment — PPO Training",
            [sys.executable, "-m", "app.rl.train"],
            cwd=str(REPO_ROOT / "ai-platform" / "backend"),
        )
        results["rl"] = "trained" if ok else "failed"
        all_ok &= ok
    else:
        results["rl"] = "skipped"

    # ── 2. Graph Neural Network ───────────────────────────────────────
    if not args.skip_gnn:
        ok = _run(
            "Graph Neural Network — GCN + Link Prediction + Classifier",
            [sys.executable, "graph_ai/train.py"],
            cwd=str(REPO_ROOT / "ai-platform" / "backend"),
        )
        results["gnn"] = "trained" if ok else "failed"
        all_ok &= ok
    else:
        results["gnn"] = "skipped"

    # ── 3. Decision Engine ────────────────────────────────────────────
    if not args.skip_decision:
        ok = _run(
            "Decision Engine — Calibration Training",
            [sys.executable, "train.py"],
            cwd=str(REPO_ROOT / "decision-engine"),
            env_extra={"DISHA_MODEL_PROVIDER": "mock"},
        )
        results["decision_engine"] = "trained" if ok else "failed"
        all_ok &= ok
    else:
        results["decision_engine"] = "skipped"

    # ── Summary ───────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print("  TRAINING SUMMARY")
    print(f"{'='*60}")
    for component, status in results.items():
        icon = {"trained": "✅", "skipped": "⏭️", "failed": "❌"}.get(status, "?")
        print(f"  {icon} {component}: {status}")

    if all_ok:
        print("\n  All components trained successfully! 🎉")
    else:
        print("\n  Some components failed. Check logs above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
