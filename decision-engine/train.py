"""
Decision Engine Training Script — trains a confidence calibration model.

The multi-agent decision engine (political, legal, ideology, security)
currently uses static confidence values.  This script:

1. Generates synthetic training scenarios with known ground-truth ratings.
2. Runs each scenario through all four agents (mock LLM).
3. Trains a lightweight regression model that learns to calibrate the
   final confidence score based on agent features.
4. Saves the trained calibration model and scenario dataset.

Usage::

    DISHA_MODEL_PROVIDER=mock python decision-engine/train.py
    cd decision-engine && DISHA_MODEL_PROVIDER=mock python train.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

# Force mock for training data generation
os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")

from main_decision_engine import DecisionEngine  # noqa: E402
from utils.llm_wrapper import get_llm             # noqa: E402


# ── Synthetic Scenario Generator ──────────────────────────────────────

_SCENARIO_TEMPLATES = [
    "Should the government amend {article} to include {right}?",
    "Evaluate the proposal to implement {policy} in {region}.",
    "Assess the security implications of {event} near {border}.",
    "Should intelligence agencies monitor {activity} to prevent {threat}?",
    "Analyse the legal basis for restricting {freedom} during {crisis}.",
    "Evaluate diplomatic options regarding {country}'s stance on {issue}.",
    "Assess the risks of deploying {technology} for {purpose}.",
    "Should parliament approve {bill} concerning {sector}?",
    "Evaluate the ideological impact of {movement} on {institution}.",
    "Analyse cross-border {trade} implications under {treaty}.",
]

_FILLS = {
    "article": ["Article 14", "Article 19", "Article 21", "Article 25", "Article 32"],
    "right": ["digital privacy", "data sovereignty", "AI oversight", "cyber rights", "environmental protection"],
    "policy": ["uniform civil code", "digital ID mandate", "drone surveillance", "crypto regulation", "AI governance"],
    "region": ["northern states", "coastal regions", "border areas", "metropolitan zones", "tribal territories"],
    "event": ["military buildup", "cyber attack", "border incursion", "intelligence leak", "disinformation campaign"],
    "border": ["the northern border", "the western frontier", "the maritime boundary", "the eastern corridor"],
    "activity": ["encrypted communications", "financial transactions", "social media", "satellite imagery"],
    "threat": ["terrorism", "espionage", "sabotage", "insurgency", "radicalisation"],
    "freedom": ["movement", "expression", "assembly", "press", "religion"],
    "crisis": ["a pandemic", "armed conflict", "civil unrest", "natural disaster", "economic collapse"],
    "country": ["a neighbouring state", "a strategic partner", "an allied nation", "a regional power"],
    "issue": ["trade", "nuclear policy", "maritime rights", "climate action"],
    "technology": ["facial recognition", "autonomous drones", "AI surveillance", "quantum computing"],
    "purpose": ["border security", "law enforcement", "intelligence gathering", "disaster response"],
    "bill": ["the Data Protection Bill", "the National Security Amendment", "the Digital Rights Act"],
    "sector": ["defence", "healthcare", "education", "finance", "energy"],
    "movement": ["nationalism", "liberalism", "populism", "secularism"],
    "institution": ["judiciary", "parliament", "civil service", "media"],
    "trade": ["arms", "technology", "agricultural", "pharmaceutical"],
    "treaty": ["the WTO framework", "bilateral agreements", "regional pacts", "UN resolutions"],
}


def _generate_scenarios(n: int = 200, seed: int = 42) -> list[dict]:
    """Generate *n* synthetic scenarios with ground-truth quality scores."""
    rng = np.random.RandomState(seed)
    scenarios = []
    for i in range(n):
        template = _SCENARIO_TEMPLATES[i % len(_SCENARIO_TEMPLATES)]
        filled = template
        for key, values in _FILLS.items():
            placeholder = "{" + key + "}"
            if placeholder in filled:
                filled = filled.replace(placeholder, rng.choice(values), 1)
        # Ground-truth quality (simulated expert rating 0-1)
        gt_quality = float(np.clip(rng.beta(5, 3), 0.1, 0.95))
        scenarios.append({"text": filled, "ground_truth_quality": gt_quality, "id": i})
    return scenarios


# ── Feature extractor ─────────────────────────────────────────────────

def _extract_features(decision: dict) -> np.ndarray:
    """Extract numeric features from a DecisionEngine.decide() result."""
    agent_results = decision.get("agent_results", {})
    features = []
    for agent_name in ("political", "legal", "ideology", "security"):
        ar = agent_results.get(agent_name, {})
        features.append(ar.get("confidence", 0.0))
        features.append(len(ar.get("premises", [])))
        features.append(len(ar.get("inference_steps", [])))
        features.append(len(ar.get("recommendations", [])))
        features.append(len(ar.get("sources", [])))
    # Overall stats
    features.append(decision.get("confidence", 0.0))
    features.append(len(decision.get("recommendations", [])))
    features.append(len(decision.get("sources", [])))
    return np.array(features, dtype=np.float32)


# ── Calibration Model (lightweight numpy) ─────────────────────────────

class CalibrationModel:
    """Simple linear regression model for confidence calibration.

    Trainable without heavy ML libraries — uses numpy least-squares.
    Falls back to ridge regression for numerical stability.
    """

    def __init__(self):
        self.weights: np.ndarray | None = None
        self.bias: float = 0.0
        self.feature_mean: np.ndarray | None = None
        self.feature_std: np.ndarray | None = None

    def fit(self, X: np.ndarray, y: np.ndarray, alpha: float = 0.1) -> dict:
        """Fit using ridge regression (closed-form).

        Args:
            X: (n_samples, n_features) feature matrix
            y: (n_samples,) target quality scores
            alpha: L2 regularisation strength
        """
        # Normalise features
        self.feature_mean = X.mean(axis=0)
        self.feature_std = X.std(axis=0) + 1e-8
        X_norm = (X - self.feature_mean) / self.feature_std

        # Add bias column
        ones = np.ones((X_norm.shape[0], 1))
        X_aug = np.hstack([X_norm, ones])

        # Ridge: w = (X'X + αI)^{-1} X'y
        XtX = X_aug.T @ X_aug
        reg = alpha * np.eye(XtX.shape[0])
        reg[-1, -1] = 0  # Don't regularise bias
        w = np.linalg.solve(XtX + reg, X_aug.T @ y)

        self.weights = w[:-1]
        self.bias = float(w[-1])

        # Metrics
        preds = self.predict(X)
        mse = float(np.mean((preds - y) ** 2))
        mae = float(np.mean(np.abs(preds - y)))
        r2 = float(1 - np.sum((y - preds) ** 2) / (np.sum((y - np.mean(y)) ** 2) + 1e-8))

        return {"mse": mse, "mae": mae, "r2": r2}

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict calibrated confidence scores."""
        if self.weights is None:
            return np.full(X.shape[0], 0.5)
        X_norm = (X - self.feature_mean) / self.feature_std
        raw = X_norm @ self.weights + self.bias
        return np.clip(raw, 0.0, 1.0)

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict."""
        return {
            "weights": self.weights.tolist() if self.weights is not None else None,
            "bias": self.bias,
            "feature_mean": self.feature_mean.tolist() if self.feature_mean is not None else None,
            "feature_std": self.feature_std.tolist() if self.feature_std is not None else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "CalibrationModel":
        """Deserialise from a dict."""
        m = cls()
        m.weights = np.array(d["weights"]) if d.get("weights") is not None else None
        m.bias = d.get("bias", 0.0)
        m.feature_mean = np.array(d["feature_mean"]) if d.get("feature_mean") is not None else None
        m.feature_std = np.array(d["feature_std"]) if d.get("feature_std") is not None else None
        return m


# ── Main training loop ────────────────────────────────────────────────

def train(
    num_scenarios: int = 200,
    checkpoint_dir: str | None = None,
) -> dict:
    """Generate data, run the engine, train calibration, save results."""
    print("Generating synthetic scenarios…")
    scenarios = _generate_scenarios(num_scenarios)

    engine = DecisionEngine(seed=42)

    print(f"Running {len(scenarios)} scenarios through decision engine…")
    features_list = []
    targets = []

    for i, sc in enumerate(scenarios):
        decision = engine.decide(sc["text"])
        feat = _extract_features(decision)
        features_list.append(feat)
        targets.append(sc["ground_truth_quality"])
        if (i + 1) % 50 == 0:
            print(f"  Processed {i + 1}/{len(scenarios)} scenarios")

    X = np.array(features_list)
    y = np.array(targets)

    # Train/test split (80/20)
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print("Training calibration model…")
    model = CalibrationModel()
    train_metrics = model.fit(X_train, y_train)
    print(f"  Train — MSE: {train_metrics['mse']:.4f}  MAE: {train_metrics['mae']:.4f}  R²: {train_metrics['r2']:.4f}")

    # Test metrics
    test_preds = model.predict(X_test)
    test_mse = float(np.mean((test_preds - y_test) ** 2))
    test_mae = float(np.mean(np.abs(test_preds - y_test)))
    test_r2 = float(1 - np.sum((y_test - test_preds) ** 2) / (np.sum((y_test - np.mean(y_test)) ** 2) + 1e-8))
    print(f"  Test  — MSE: {test_mse:.4f}  MAE: {test_mae:.4f}  R²: {test_r2:.4f}")

    # ── Save ──────────────────────────────────────────────────────────
    ckpt_dir = Path(checkpoint_dir) if checkpoint_dir else (_SCRIPT_DIR / "checkpoints")
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    model_path = ckpt_dir / "calibration_model.json"
    with open(model_path, "w") as f:
        json.dump(model.to_dict(), f, indent=2)
    print(f"Calibration model saved → {model_path}")

    # Save training dataset for reproducibility
    dataset_path = ckpt_dir / "training_scenarios.json"
    with open(dataset_path, "w") as f:
        json.dump(scenarios, f, indent=2)

    metrics_path = ckpt_dir / "decision_training_metrics.json"
    summary = {
        "num_scenarios": num_scenarios,
        "train_size": split,
        "test_size": len(X) - split,
        "feature_dim": int(X.shape[1]),
        "train_metrics": train_metrics,
        "test_metrics": {"mse": test_mse, "mae": test_mae, "r2": test_r2},
    }
    with open(metrics_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"Metrics saved → {metrics_path}")

    return summary


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2))
