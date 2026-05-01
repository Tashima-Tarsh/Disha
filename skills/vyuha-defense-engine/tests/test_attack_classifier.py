from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_attack_classifier():
    root = Path(__file__).resolve().parents[1]
    module_path = root / "analyzer" / "attack_classifier.py"
    spec = importlib.util.spec_from_file_location("vyuha_attack_classifier", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


ALLOWED_ACTIONS = {
    "traffic.block",
    "traffic.rate_limit",
    "device.isolate",
    "file.quarantine",
    "process.kill_local",
    "session.revoke_local",
    "keys.rotate",
    "evidence.preserve",
    "report.generate",
    "system.recover",
    "honeypot.deploy_owned",
    "simulation.run_internal",
}


def test_classifies_all_sample_events_defensively() -> None:
    mod = _load_attack_classifier()
    path = Path(__file__).resolve().parents[1] / "analyzer" / "sample_events.json"
    events = mod.load_sample_events(path)
    assert len(events) >= 10

    for e in events:
        result = mod.classify_event(e)
        assert result.severity >= 0
        assert result.severity <= 100
        assert result.confidence >= 0.0
        assert result.confidence <= 1.0
        assert result.risk >= 0.0
        assert result.risk <= 1.0
        assert result.formation_id.startswith("formation.")
        assert result.defensive_response

        for action in result.defensive_response:
            assert action["action"] in ALLOWED_ACTIONS
            assert "reason" in action
