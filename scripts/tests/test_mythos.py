"""Tests for the Disha Mythos subsystems — Guardian, Monitor, Hub."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

# ── Path setup ────────────────────────────────────────────────────────
_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _SCRIPTS_DIR.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))


# ═══════════════════════════════════════════════════════════════════════
# Threat Guardian tests
# ═══════════════════════════════════════════════════════════════════════

class TestThreatGuardian:
    def test_guardian_scan(self):
        from guardian.threat_guardian import ThreatGuardian
        guardian = ThreatGuardian(root=_REPO_ROOT)
        report = guardian.full_scan()
        assert report.system_health >= 0.0
        assert report.system_health <= 1.0
        assert len(report.scans_performed) > 0

    def test_report_serializable(self):
        from guardian.threat_guardian import ThreatGuardian
        guardian = ThreatGuardian(root=_REPO_ROOT)
        report = guardian.full_scan()
        data = report.to_dict()
        # Must be JSON-serializable
        json_str = json.dumps(data, default=str)
        assert len(json_str) > 10

    def test_secret_scanner_detects_fake_key(self):
        from guardian.threat_guardian import SecretScanner
        with tempfile.TemporaryDirectory() as tmpdir:
            # Use a non-test filename to avoid false-positive filtering
            fake_file = Path(tmpdir) / "config.py"
            fake_file.write_text('API_KEY = "sk-ant-realkey0123456789abcdefghijklmnopqr"\n')
            scanner = SecretScanner()
            threats = scanner.scan(Path(tmpdir))
            assert len(threats) >= 1
            assert any("Anthropic" in t.title for t in threats)

    def test_merge_conflict_scanner(self):
        from guardian.threat_guardian import MergeConflictScanner
        with tempfile.TemporaryDirectory() as tmpdir:
            clean_file = Path(tmpdir) / "clean.py"
            clean_file.write_text("# No conflicts here\nprint('hello')\n")
            scanner = MergeConflictScanner()
            threats = scanner.scan(Path(tmpdir))
            assert len(threats) == 0

    def test_health_calculation(self):
        from guardian.threat_guardian import ThreatGuardian
        health = ThreatGuardian._calculate_health(
            type("Report", (), {"threats": []})()
        )
        assert health == 1.0

    def test_trend_insufficient_data(self):
        from guardian.threat_guardian import ThreatGuardian
        guardian = ThreatGuardian(root=_REPO_ROOT)
        assert guardian.get_trend() == "insufficient_data"


# ═══════════════════════════════════════════════════════════════════════
# Self-Healing Monitor tests
# ═══════════════════════════════════════════════════════════════════════

class TestSelfHealingMonitor:
    def test_monitor_check_all(self):
        from self_heal.monitor import SelfHealingMonitor, HealthStatus
        monitor = SelfHealingMonitor(root=_REPO_ROOT)
        health = monitor.check_all()
        assert health.overall_status in (HealthStatus.HEALTHY, HealthStatus.DEGRADED)
        assert health.score > 0.0
        assert len(health.checks) > 0

    def test_health_report_serializable(self):
        from self_heal.monitor import SelfHealingMonitor
        monitor = SelfHealingMonitor(root=_REPO_ROOT)
        health = monitor.check_all()
        data = health.to_dict()
        json_str = json.dumps(data, default=str)
        assert len(json_str) > 10

    def test_python_syntax_checker(self):
        from self_heal.monitor import PythonImportChecker, HealthStatus
        checker = PythonImportChecker()
        result = checker.check(_REPO_ROOT)
        assert result.status == HealthStatus.HEALTHY
        assert result.details["total_files"] > 0

    def test_workflow_checker(self):
        from self_heal.monitor import WorkflowChecker, HealthStatus
        checker = WorkflowChecker()
        result = checker.check(_REPO_ROOT)
        assert result.status in (HealthStatus.HEALTHY, HealthStatus.DEGRADED)

    def test_knowledge_base_checker(self):
        from self_heal.monitor import KnowledgeBaseChecker, HealthStatus
        checker = KnowledgeBaseChecker()
        result = checker.check(_REPO_ROOT)
        assert result.status in (HealthStatus.HEALTHY, HealthStatus.DEGRADED)

    def test_subsystem_checker(self):
        from self_heal.monitor import SubsystemChecker
        checker = SubsystemChecker()
        result = checker.check(_REPO_ROOT)
        assert result.name == "subsystem_structure"


# ═══════════════════════════════════════════════════════════════════════
# Multi-Model Hub tests
# ═══════════════════════════════════════════════════════════════════════

class TestModelHub:
    def test_mock_provider(self):
        from multi_model.model_hub import MockProvider
        provider = MockProvider(seed=42)
        assert provider.available is True
        response = provider.generate("test prompt")
        assert response.ok
        assert "Mock response" in response.content

    def test_mock_deterministic(self):
        from multi_model.model_hub import MockProvider
        p1 = MockProvider(seed=99)
        p2 = MockProvider(seed=99)
        r1 = p1.generate("same prompt")
        r2 = p2.generate("same prompt")
        assert r1.content == r2.content

    def test_hub_with_mock_only(self):
        from multi_model.model_hub import ModelHub, MockProvider
        hub = ModelHub(providers=[MockProvider()])
        assert "mock" in hub.available_providers()
        response = hub.ask("test")
        assert response.ok

    def test_hub_ask_all(self):
        from multi_model.model_hub import ModelHub, MockProvider
        hub = ModelHub(providers=[MockProvider(seed=1), MockProvider(seed=2)])
        # Both have name "mock" so only one survives in dict — that's expected
        results = hub.ask_all("test query")
        assert len(results) >= 1

    def test_hub_consensus(self):
        from multi_model.model_hub import ModelHub, MockProvider
        hub = ModelHub(providers=[MockProvider()])
        consensus = hub.consensus("test query")
        assert consensus.agreement_score > 0

    def test_hub_status(self):
        from multi_model.model_hub import ModelHub, MockProvider
        hub = ModelHub(providers=[MockProvider()])
        status = hub.status()
        assert status["available_count"] >= 1
        assert "providers" in status

    def test_unavailable_provider_returns_error(self):
        from multi_model.model_hub import ClaudeProvider
        # No API key set
        provider = ClaudeProvider()
        if not provider.available:
            response = provider.generate("test")
            assert not response.ok
            assert response.error is not None

    def test_hub_auto_discover(self):
        from multi_model.model_hub import ModelHub
        hub = ModelHub()
        # Mock is always available
        assert "mock" in hub.available_providers()

    def test_add_provider(self):
        from multi_model.model_hub import ModelHub, MockProvider
        hub = ModelHub(providers=[])
        assert len(hub.available_providers()) == 0
        hub.add_provider(MockProvider())
        assert "mock" in hub.available_providers()


# ═══════════════════════════════════════════════════════════════════════
# Disha Mythos orchestrator tests
# ═══════════════════════════════════════════════════════════════════════

class TestDishaMythos:
    def test_phase_protect(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "disha_mythos", _SCRIPTS_DIR / "disha_mythos.py"
        )
        mythos = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mythos)

        result = mythos.phase_protect(auto_fix=False)
        assert result["phase"] == "protect"
        assert "system_health" in result
        assert "threats_found" in result

    def test_phase_heal(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "disha_mythos", _SCRIPTS_DIR / "disha_mythos.py"
        )
        mythos = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mythos)

        result = mythos.phase_heal(auto_fix=False)
        assert result["phase"] == "heal"
        assert "overall_status" in result
        assert "score" in result

    def test_phase_intelligence(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "disha_mythos", _SCRIPTS_DIR / "disha_mythos.py"
        )
        mythos = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mythos)

        result = mythos.phase_intelligence()
        assert result["phase"] == "intelligence"
        assert result["test_response_ok"] is True
