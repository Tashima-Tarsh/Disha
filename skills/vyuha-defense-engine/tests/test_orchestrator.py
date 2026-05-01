from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def _load_orchestrator():
    root = Path(__file__).resolve().parents[1]
    module_path = root / "orchestrator" / "orchestrator.py"
    spec = importlib.util.spec_from_file_location("vyuha_orchestrator", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules["vyuha_orchestrator"] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def test_orchestrator_denies_unknown_action() -> None:
    mod = _load_orchestrator()
    orch = mod.DefensiveOrchestrator()
    result = orch.execute(actions=[{"id": "unknown", "params": {}, "reason": "x"}])
    assert result.ok is False
    assert any(o["reason"] == "unknown_action" for o in result.outcomes)


def test_orchestrator_runs_defensive_action_and_collects_evidence() -> None:
    mod = _load_orchestrator()
    orch = mod.DefensiveOrchestrator()
    result = orch.execute(actions=[{"id": "capture_logs", "params": {"since_seconds": 600}, "reason": "capture"}])
    assert result.outcomes[0]["ok"] is True
    assert result.evidence_tasks


def test_orchestrator_fallback_on_failure() -> None:
    mod = _load_orchestrator()
    orch = mod.DefensiveOrchestrator()
    result = orch.execute(
        actions=[
            {"id": "block_ip", "params": {"ip": "1.2.3.4", "simulate_fail": True}, "reason": "test"},
        ]
    )
    # primary fails
    assert any(o["action"] == "block_ip" and o["ok"] is False for o in result.outcomes)
    # fallback executes (rate_limit_source) if policy allows
    assert any(o["action"] == "rate_limit_source" for o in result.outcomes)
