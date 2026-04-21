"""
Tests for trained model loading and inference.

Validates that:
1. RL policy checkpoint loads and produces actions
2. GNN checkpoints load and produce predictions
3. Decision engine calibration model loads and produces scores
"""

from __future__ import annotations

import importlib
import importlib.util
import json
import os
import sys
from pathlib import Path

import numpy as np
import pytest

torch = pytest.importorskip(
    "torch", reason="PyTorch not installed — skipping trained-model tests"
)

# ── Path setup ────────────────────────────────────────────────────────
_THIS = Path(__file__).resolve()
_REPO_ROOT = _THIS.parents[5]
_BACKEND = _REPO_ROOT / "disha" / "services" / "ai-platform" / "backend"
_DECISION = _REPO_ROOT / "disha" / "ai" / "core" / "decision_engine"

for p in [str(_REPO_ROOT), str(_BACKEND / "app"), str(_BACKEND), str(_DECISION)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")


# ── RL Tests ──────────────────────────────────────────────────────────


class TestRLTrainedModel:
    CKPT_DIR = _BACKEND / "checkpoints"
    RL_CKPT = CKPT_DIR / "rl_policy.pt"

    @pytest.mark.skipif(
        not (CKPT_DIR / "rl_policy.pt").exists(), reason="rl_policy.pt missing"
    )
    def test_checkpoint_exists(self):
        assert (self.CKPT_DIR / "rl_policy.pt").exists()
        assert (self.CKPT_DIR / "rl_training_metrics.json").exists()

    @pytest.mark.skipif(
        not (CKPT_DIR / "rl_policy.pt").exists(), reason="rl_policy.pt missing"
    )
    def test_load_and_infer(self):
        from app.rl.policy import PolicyNetwork
        from app.rl.environment import InvestigationEnvironment

        ckpt = torch.load(self.CKPT_DIR / "rl_policy.pt", weights_only=True)
        policy = PolicyNetwork(
            state_dim=ckpt["state_dim"],
            action_dim=ckpt["action_dim"],
            hidden_dim=ckpt.get("hidden_dim", 64),
        )
        policy.actor.load_state_dict(ckpt["actor_state_dict"])
        policy.critic.load_state_dict(ckpt["critic_state_dict"])

        env = InvestigationEnvironment()
        state = env.reset()
        action, log_prob = policy.select_action(state, env.get_valid_actions())
        assert 0 <= action < env.ACTION_DIM
        assert isinstance(log_prob, float)

    @pytest.mark.skipif(
        not (CKPT_DIR / "rl_training_metrics.json").exists(),
        reason="rl_training_metrics.json missing",
    )
    def test_metrics_valid(self):
        with open(self.CKPT_DIR / "rl_training_metrics.json") as f:
            m = json.load(f)
        assert m["episodes_trained"] >= 100
        assert "final_avg_reward" in m


# ── GNN Tests ─────────────────────────────────────────────────────────


class TestGNNTrainedModel:
    CKPT_DIR = _BACKEND / "checkpoints"

    @pytest.mark.skipif(
        not (_BACKEND / "checkpoints" / "gnn_link_predictor.pt").exists(),
        reason="GNN checkpoints missing",
    )
    def test_checkpoints_exist(self):
        assert (self.CKPT_DIR / "gnn_link_predictor.pt").exists()
        assert (self.CKPT_DIR / "gnn_classifier.pt").exists()
        assert (self.CKPT_DIR / "gnn_training_metrics.json").exists()

    @pytest.mark.skipif(
        not (_BACKEND / "checkpoints" / "gnn_link_predictor.pt").exists(),
        reason="gnn_link_predictor.pt missing",
    )
    def test_load_link_predictor(self):
        # Import models directly to avoid __init__.py/graph_exporter
        _models_spec = importlib.util.spec_from_file_location(
            "graph_ai_models",
            _BACKEND / "graph_ai" / "models.py",
        )
        _models = importlib.util.module_from_spec(_models_spec)
        _models_spec.loader.exec_module(_models)

        ckpt = torch.load(self.CKPT_DIR / "gnn_link_predictor.pt", weights_only=True)
        encoder = _models.GCNEncoder(
            ckpt["in_features"],
            ckpt["hidden_dim"],
            ckpt["embedding_dim"],
        )
        encoder.load_state_dict(ckpt["encoder_state_dict"])
        predictor = _models.LinkPredictor(ckpt["embedding_dim"])
        predictor.load_state_dict(ckpt["link_predictor_state_dict"])

        # Inference
        x = torch.randn(10, ckpt["in_features"])
        encoder.eval()
        predictor.eval()
        with torch.no_grad():
            z = encoder(x)
            prob = predictor(z[0:1], z[1:2])
        assert 0 <= prob.item() <= 1

    @pytest.mark.skipif(
        not (_BACKEND / "checkpoints" / "gnn_classifier.pt").exists(),
        reason="gnn_classifier.pt missing",
    )
    def test_load_classifier(self):
        _models_spec = importlib.util.spec_from_file_location(
            "graph_ai_models_clf",
            _BACKEND / "graph_ai" / "models.py",
        )
        _models = importlib.util.module_from_spec(_models_spec)
        _models_spec.loader.exec_module(_models)

        ckpt = torch.load(self.CKPT_DIR / "gnn_classifier.pt", weights_only=True)
        clf = _models.GraphClassifier(
            ckpt["in_channels"],
            ckpt["hidden_channels"],
            ckpt["num_classes"],
        )
        clf.load_state_dict(ckpt["classifier_state_dict"])
        clf.eval()

        with torch.no_grad():
            logits = clf(torch.randn(5, ckpt["in_channels"]))
        assert logits.shape == (5, ckpt["num_classes"])

    @pytest.mark.skipif(
        not (CKPT_DIR / "gnn_training_metrics.json").exists(),
        reason="gnn_training_metrics.json missing",
    )
    def test_metrics_valid(self):
        with open(self.CKPT_DIR / "gnn_training_metrics.json") as f:
            m = json.load(f)
        assert "link_prediction" in m
        assert "node_classification" in m
        assert m["node_classification"]["train_accuracy"] > 0.5


# ── Decision Engine Tests ─────────────────────────────────────────────


class TestDecisionEngineTrainedModel:
    CKPT_DIR = _DECISION / "checkpoints"

    @pytest.mark.skipif(
        not (_DECISION / "checkpoints" / "calibration_model.json").exists(),
        reason="Decision checkpoints missing",
    )
    def test_checkpoint_exists(self):
        assert (self.CKPT_DIR / "calibration_model.json").exists()
        assert (self.CKPT_DIR / "decision_training_metrics.json").exists()
        assert (self.CKPT_DIR / "training_scenarios.json").exists()

    @pytest.mark.skipif(
        not (_DECISION / "checkpoints" / "calibration_model.json").exists(),
        reason="calibration_model.json missing",
    )
    def test_load_and_predict(self):
        sys.path.insert(0, str(_DECISION))
        from train import CalibrationModel

        with open(self.CKPT_DIR / "calibration_model.json") as f:
            data = json.load(f)
        model = CalibrationModel.from_dict(data)

        # Derive feature dimension from loaded model weights.
        # _extract_features produces: 4 agents × 5 features + 3 overall = 23
        # but we use the model's actual weight shape to stay in sync.
        _NUM_AGENTS = 4
        _FEATURES_PER_AGENT = 5
        _OVERALL_FEATURES = 3
        _DEFAULT_DIM = _NUM_AGENTS * _FEATURES_PER_AGENT + _OVERALL_FEATURES
        feature_dim = len(model.weights) if model.weights is not None else _DEFAULT_DIM
        X = np.random.rand(5, feature_dim).astype(np.float32)
        preds = model.predict(X)
        assert preds.shape == (5,)
        assert all(0 <= p <= 1 for p in preds)

    @pytest.mark.skipif(
        not (_DECISION / "checkpoints" / "calibration_model.json").exists(),
        reason="calibration_model.json missing",
    )
    def test_full_pipeline_with_calibration(self):
        """Run engine + calibration together."""
        from main_decision_engine import DecisionEngine
        from train import CalibrationModel, _extract_features

        engine = DecisionEngine(seed=42)
        with open(self.CKPT_DIR / "calibration_model.json") as f:
            model = CalibrationModel.from_dict(json.load(f))

        decision = engine.decide("Test scenario for calibration")
        features = _extract_features(decision)
        calibrated = model.predict(features.reshape(1, -1))
        assert 0 <= calibrated[0] <= 1

    @pytest.mark.skipif(
        not (CKPT_DIR / "decision_training_metrics.json").exists(),
        reason="decision_training_metrics.json missing",
    )
    def test_metrics_valid(self):
        with open(self.CKPT_DIR / "decision_training_metrics.json") as f:
            m = json.load(f)
        assert m["num_scenarios"] >= 100
        assert "train_metrics" in m
        assert "test_metrics" in m
