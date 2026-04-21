"""
Tests for the continuous training pipeline.

Validates:
1. Data fetchers produce valid data structures
2. Graph builder creates valid graph datasets from threat scenarios
3. Scenario generator creates diverse training data
4. Continuous training runs end-to-end (offline mode)
5. Checkpoint promotion logic works correctly
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


# Path setup
_THIS = Path(__file__).resolve()
_REPO_ROOT = _THIS.parents[5]
_SCRIPTS = _REPO_ROOT / "disha" / "scripts"
_BACKEND = _REPO_ROOT / "disha" / "services" / "ai-platform" / "backend" / "app"
_DECISION = _REPO_ROOT / "disha" / "ai" / "core" / "decision-engine"

# Ensure the package root is in path for "from disha.ai..." imports
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

for p in [str(_SCRIPTS), str(_BACKEND), str(_DECISION)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")


# ── Data Fetcher Tests ────────────────────────────────────────────────


class TestDataFetchers:
    def test_synthetic_threats(self):
        from data_fetchers import generate_synthetic_threats

        threats = generate_synthetic_threats(n=50, seed=42)
        assert len(threats) == 50
        for t in threats:
            assert t.source.startswith("synthetic_")
            assert len(t.indicators) >= 3
            assert 0.0 < t.risk_score < 1.0
            assert t.indicator_type in ("ip", "domain", "url", "hash")

    def test_graph_from_threats(self):
        from data_fetchers import generate_synthetic_threats, build_graph_from_threats

        threats = generate_synthetic_threats(n=20, seed=42)
        graph = build_graph_from_threats(threats)

        assert graph.node_features.ndim == 2
        assert graph.node_features.shape[1] == 16
        assert graph.edge_index.shape[0] == 2
        assert len(graph.node_labels) == graph.node_features.shape[0]
        assert graph.node_features.shape[0] > 0
        assert graph.edge_index.shape[1] > 0

    def test_advanced_scenarios(self):
        from data_fetchers import generate_advanced_scenarios

        scenarios = generate_advanced_scenarios(n=100, seed=42)
        assert len(scenarios) == 100
        for s in scenarios:
            assert "text" in s
            assert "ground_truth_quality" in s
            assert 0.0 < s["ground_truth_quality"] < 1.0
            assert len(s["text"]) > 20
            # Ensure placeholders are filled
            assert "{" not in s["text"]

    def test_scenarios_are_diverse(self):
        from data_fetchers import generate_advanced_scenarios

        scenarios = generate_advanced_scenarios(n=200, seed=42)
        texts = [s["text"] for s in scenarios]
        unique_texts = set(texts)
        # At least 80% should be unique
        assert len(unique_texts) >= len(texts) * 0.8

    def test_empty_graph_handled(self):
        from data_fetchers import build_graph_from_threats

        graph = build_graph_from_threats([])
        assert graph.node_features.shape[0] >= 1  # At least 1 placeholder node


# ── Hyperparameter Scheduler Tests ────────────────────────────────────


class TestHyperparamScheduler:
    def test_rl_params_increase_episodes(self):
        from continuous_train import HyperparamScheduler

        sched = HyperparamScheduler()
        p1 = sched.get_rl_params(1)
        p3 = sched.get_rl_params(3)
        assert p3["num_episodes"] > p1["num_episodes"]

    def test_gnn_params_adjust_on_high_loss(self):
        from continuous_train import HyperparamScheduler

        sched = HyperparamScheduler()
        sched.record({"gnn": {"link_final_loss": 2.0}})
        params = sched.get_gnn_params(1)
        base_epochs = 200  # round 1 = 150 + 1*50
        assert params["num_epochs_link"] > base_epochs

    def test_rl_lr_increases_on_stagnation(self):
        from continuous_train import HyperparamScheduler

        sched = HyperparamScheduler()
        sched.record({"rl": {"final_avg_reward": 10.0}})
        sched.record({"rl": {"final_avg_reward": 10.001}})
        params = sched.get_rl_params(2)
        assert params["lr"] > 3e-4  # Should have boosted lr


# ── Checkpoint Promotion Tests ────────────────────────────────────────


class TestCheckpointPromotion:
    def test_promote_on_improvement(self):
        from continuous_train import _should_promote

        current = {"final_avg_reward": 15.0}
        previous = {"final_avg_reward": 12.0}
        assert _should_promote(current, previous, "rl") is True

    def test_promote_on_first_run(self):
        from continuous_train import _should_promote

        current = {"final_avg_reward": 10.0}
        assert _should_promote(current, None, "rl") is True

    def test_no_promote_on_major_regression(self):
        from continuous_train import _should_promote

        current = {"final_avg_reward": 5.0}
        previous = {"final_avg_reward": 15.0}
        assert _should_promote(current, previous, "rl") is False

    def test_allow_minor_regression(self):
        from continuous_train import _should_promote

        # 5% tolerance: 10 * 0.95 = 9.5
        current = {"final_avg_reward": 9.6}
        previous = {"final_avg_reward": 10.0}
        assert _should_promote(current, previous, "rl") is True

    def test_gnn_promotion(self):
        from continuous_train import _should_promote

        # Lower loss = better
        current = {"link_final_loss": 1.2}
        previous = {"link_final_loss": 1.3}
        assert _should_promote(current, previous, "gnn") is True

        # Much worse
        current = {"link_final_loss": 2.0}
        previous = {"link_final_loss": 1.3}
        assert _should_promote(current, previous, "gnn") is False


# ── End-to-end test (offline, 1 round) ───────────────────────────────


class TestContinuousTrainingE2E:
    def test_offline_single_round(self):
        """Run 1 round of continuous training in offline mode."""
        from continuous_train import run_continuous_training

        result = run_continuous_training(rounds=1, offline=True)

        assert result["total_rounds"] == 1
        assert len(result["rounds"]) == 1

        r = result["rounds"][0]
        assert "rl" in r
        assert "gnn" in r
        assert "decision" in r

        # RL and GNN may be skipped if torch is not installed
        if r["rl"].get("status") == "skipped":
            assert r["rl"]["reason"] == "torch_not_available"
        else:
            assert r["rl"]["episodes_trained"] >= 100

        if r["gnn"].get("status") == "skipped":
            assert r["gnn"]["reason"] == "torch_not_available"
        else:
            assert r["gnn"]["graph_nodes"] > 0

        assert r["decision"]["num_scenarios"] >= 50
