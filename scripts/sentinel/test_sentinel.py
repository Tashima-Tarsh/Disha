from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

# ── Path setup ────────────────────────────────────────────────────────

_REPO = Path(__file__).resolve().parents[2]
import sys  # noqa: E402
sys.path.insert(0, str(_REPO))

from scripts.sentinel.threat_monitor import (  # noqa: E402
    analyze_indicators,
    _severity_for,
    FEEDS,
)
from scripts.sentinel.model_orchestrator import (  # noqa: E402
    ModelOrchestrator,
    PROVIDER_CONFIGS,
    TASK_ROUTING,
    ModelResponse,
    ConsensusResult,
)
from scripts.sentinel.guardian import (  # noqa: E402
    check_model_health,
    check_knowledge_health,
    check_service_configs,
    get_status,
)


# ── Threat Monitor Tests ──────────────────────────────────────────────

class TestSeverityMapping:
    def test_critical_threshold(self):
        assert _severity_for(0.95) == "critical"

    def test_high_threshold(self):
        assert _severity_for(0.80) == "high"

    def test_medium_threshold(self):
        assert _severity_for(0.55) == "medium"

    def test_low_threshold(self):
        assert _severity_for(0.30) == "low"

    def test_info_threshold(self):
        assert _severity_for(0.05) == "info"


class TestAnalyzeIndicators:
    def test_empty_feeds(self):
        result = analyze_indicators({})
        assert result == []

    def test_single_feed(self):
        feed_data = {"feed1": ["1.2.3.4", "5.6.7.8"]}
        alerts = analyze_indicators(feed_data)
        # Single-feed indicators score 1.0 (only feed, boosted)
        assert len(alerts) > 0
        assert all(a["severity"] in ("critical", "high", "medium", "low") for a in alerts)

    def test_cross_feed_correlation(self):
        feed_data = {
            "feed1": ["1.2.3.4", "5.6.7.8"],
            "feed2": ["1.2.3.4", "9.10.11.12"],
            "feed3": ["1.2.3.4"],
        }
        alerts = analyze_indicators(feed_data)
        # 1.2.3.4 appears in 3/3 feeds → highest score
        if alerts:
            top = alerts[0]
            assert top["indicator"] == "1.2.3.4"
            assert top["feed_count"] == 3

    def test_dedup_across_feeds(self):
        feed_data = {
            "feed1": ["1.2.3.4"],
            "feed2": ["1.2.3.4"],
        }
        alerts = analyze_indicators(feed_data)
        ips = [a["indicator"] for a in alerts]
        assert ips.count("1.2.3.4") == 1  # Deduplicated

    def test_hash_present(self):
        feed_data = {"feed1": ["evil.example.com"]}
        alerts = analyze_indicators(feed_data)
        if alerts:
            assert "hash" in alerts[0]
            assert len(alerts[0]["hash"]) == 16


class TestFeedConfig:
    def test_feeds_defined(self):
        assert len(FEEDS) >= 4

    def test_feed_urls_are_https_or_http(self):
        for name, url in FEEDS.items():
            assert url.startswith("http://") or url.startswith("https://"), (
                f"Feed {name} has invalid URL: {url}"
            )


# ── Model Orchestrator Tests ──────────────────────────────────────────

class TestOrchestratorInit:
    def test_provider_configs_complete(self):
        for name, cfg in PROVIDER_CONFIGS.items():
            assert "default_model" in cfg
            assert "strengths" in cfg
            assert "max_tokens" in cfg

    def test_task_routing_keys(self):
        expected = {"security", "code", "analysis", "general"}
        assert expected.issubset(set(TASK_ROUTING.keys()))

    def test_orchestrator_init_no_keys(self):
        """Orchestrator should init even without API keys."""
        with patch.dict("os.environ", {}, clear=True):
            orch = ModelOrchestrator()
            assert "ollama" in orch.available  # Always available

    def test_orchestrator_status(self):
        orch = ModelOrchestrator()
        status = orch.status()
        assert "available_providers" in status
        assert "provider_count" in status


class TestModelResponse:
    def test_to_dict(self):
        resp = ModelResponse(
            provider="test", model="test-model", content="hello",
            usage={"input_tokens": 10}, latency_ms=100.5,
        )
        d = resp.to_dict()
        assert d["provider"] == "test"
        assert d["content"] == "hello"
        assert d["latency_ms"] == 100.5


class TestConsensusResult:
    def test_to_dict(self):
        primary = ModelResponse(provider="a", model="m1", content="yes")
        supporting = [ModelResponse(provider="b", model="m2", content="yes")]
        cr = ConsensusResult(primary=primary, supporting=supporting, consensus_score=0.9, method="parallel")
        d = cr.to_dict()
        assert d["consensus_score"] == 0.9
        assert d["method"] == "parallel"
        assert len(d["supporting"]) == 1


# ── Guardian Tests ────────────────────────────────────────────────────

class TestGuardianHealthChecks:
    def test_model_health_returns_dict(self):
        result = check_model_health()
        assert "healthy" in result
        assert "checks" in result

    def test_knowledge_health_returns_dict(self):
        result = check_knowledge_health()
        assert "healthy" in result
        assert "domains" in result
        assert "mathematics" in result["domains"]

    def test_config_health_returns_dict(self):
        result = check_service_configs()
        assert "healthy" in result
        assert "configs" in result

    def test_get_status(self):
        result = get_status()
        assert isinstance(result, dict)


# ── Alert Engine Tests ────────────────────────────────────────────────
# We import the module directly since it's not in a standard package path.

def _load_alert_engine():
    """Load alert_engine from the non-standard path."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "alert_engine",
        str(_REPO / "integrations" / "cyber-intelligence-platform" / "alerts" / "alert_engine.py"),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestAlertEngine:
    def setup_method(self):
        self.engine = _load_alert_engine()
        self.engine.clear_alerts()

    def test_generate_alert(self):
        record = {"type": "malware", "text": "Trojan detected on 1.2.3.4"}
        alert = self.engine.generate_alert(record)
        assert alert is not None
        assert alert["severity"] == "HIGH"
        assert alert["crime"] == "malware"
        assert "alert_id" in alert
        assert "timestamp" in alert

    def test_dedup_alerts(self):
        record = {"type": "phishing", "text": "Phishing email from evil.com"}
        a1 = self.engine.generate_alert(record)
        a2 = self.engine.generate_alert(record)
        assert a1 is not None
        assert a2 is None  # Duplicate

    def test_severity_classification(self):
        critical = {"type": "ransomware", "text": "Ransomware encrypted files"}
        alert = self.engine.generate_alert(critical)
        assert alert is not None
        assert alert["severity"] == "CRITICAL"

    def test_get_alerts(self):
        self.engine.generate_alert({"type": "scan", "text": "Port scan from 10.0.0.1"})
        self.engine.generate_alert({"type": "malware", "text": "Malware on server"})
        all_alerts = self.engine.get_alerts()
        assert len(all_alerts) == 2

    def test_get_alerts_filtered(self):
        self.engine.generate_alert({"type": "scan", "text": "Port scan from 10.0.0.1"})
        self.engine.generate_alert({"type": "malware", "text": "Malware on server"})
        high = self.engine.get_alerts(severity="HIGH")
        medium = self.engine.get_alerts(severity="MEDIUM")
        assert len(high) == 1
        assert len(medium) == 1

    def test_clear_alerts(self):
        self.engine.generate_alert({"type": "test", "text": "Test alert"})
        count = self.engine.clear_alerts()
        assert count == 1
        assert self.engine.get_alerts() == []
