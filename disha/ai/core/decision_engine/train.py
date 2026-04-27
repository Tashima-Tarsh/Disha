from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
from main_decision_engine import DecisionEngine

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")

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
    "right": [
        "digital privacy",
        "data sovereignty",
        "AI oversight",
        "cyber rights",
        "environmental protection",
    ],
    "policy": [
        "uniform civil code",
        "digital ID mandate",
        "drone surveillance",
        "crypto regulation",
        "AI governance",
    ],
    "region": [
        "northern states",
        "coastal regions",
        "border areas",
        "metropolitan zones",
        "tribal territories",
    ],
    "event": [
        "military buildup",
        "cyber attack",
        "border incursion",
        "intelligence leak",
        "disinformation campaign",
    ],
    "border": [
        "the northern border",
        "the western frontier",
        "the maritime boundary",
        "the eastern corridor",
    ],
    "activity": [
        "encrypted communications",
        "financial transactions",
        "social media",
        "satellite imagery",
    ],
    "threat": ["terrorism", "espionage", "sabotage", "insurgency", "radicalisation"],
    "freedom": ["movement", "expression", "assembly", "press", "religion"],
    "crisis": [
        "a pandemic",
        "armed conflict",
        "civil unrest",
        "natural disaster",
        "economic collapse",
    ],
    "country": [
        "a neighbouring state",
        "a strategic partner",
        "an allied nation",
        "a regional power",
    ],
    "issue": ["trade", "nuclear policy", "maritime rights", "climate action"],
    "technology": [
        "facial recognition",
        "autonomous drones",
        "AI surveillance",
        "quantum computing",
    ],
    "purpose": [
        "border security",
        "law enforcement",
        "intelligence gathering",
        "disaster response",
    ],
    "bill": [
        "the Data Protection Bill",
        "the National Security Amendment",
        "the Digital Rights Act",
    ],
    "sector": ["defence", "healthcare", "education", "finance", "energy"],
    "movement": ["nationalism", "liberalism", "populism", "secularism"],
    "institution": ["judiciary", "parliament", "civil service", "media"],
    "trade": ["arms", "technology", "agricultural", "pharmaceutical"],
    "treaty": [
        "the WTO framework",
        "bilateral agreements",
        "regional pacts",
        "UN resolutions",
    ],
}


def _generate_scenarios(n: int = 200, seed: int = 42) -> list[dict[str, Any]]:
    rng = np.random.RandomState(seed)
    scenarios = []
    for i in range(n):
        template = _SCENARIO_TEMPLATES[i % len(_SCENARIO_TEMPLATES)]
        filled = template
        for key, values in _FILLS.items():
            placeholder = "{" + key + "}"
            if placeholder in filled:
                filled = filled.replace(placeholder, rng.choice(values), 1)

        gt_quality = float(np.clip(rng.beta(5, 3), 0.1, 0.95))
        scenarios.append({"text": filled, "ground_truth_quality": gt_quality, "id": i})
    return scenarios


def _extract_features(decision: dict[str, Any]) -> np.ndarray:
    agent_results = decision.get("agent_results", {})
    features = []
    for agent_name in ("political", "legal", "ideology", "security"):
        ar = agent_results.get(agent_name, {})
        features.append(ar.get("confidence", 0.0))
        features.append(len(ar.get("premises", [])))
        features.append(len(ar.get("inference_steps", [])))
        features.append(len(ar.get("recommendations", [])))
        features.append(len(ar.get("sources", [])))

    features.append(decision.get("confidence", 0.0))
    features.append(len(decision.get("recommendations", [])))
    features.append(len(decision.get("sources", [])))
    return np.array(features, dtype=np.float32)


class CalibrationModel:
    def __init__(self) -> None:
        self.weights: np.ndarray | None = None
        self.bias: float = 0.0
        self.feature_mean: np.ndarray | None = None
        self.feature_std: np.ndarray | None = None

    def fit(self, X: np.ndarray, y: np.ndarray, alpha: float = 0.1) -> dict[str, float]:

        self.feature_mean = X.mean(axis=0)
        self.feature_std = X.std(axis=0) + 1e-8
        X_norm = (X - self.feature_mean) / self.feature_std

        ones = np.ones((X_norm.shape[0], 1))
        X_aug = np.hstack([X_norm, ones])

        XtX = X_aug.T @ X_aug
        reg = alpha * np.eye(XtX.shape[0])
        reg[-1, -1] = 0
        w = np.linalg.solve(XtX + reg, X_aug.T @ y)

        self.weights = w[:-1]
        self.bias = float(w[-1])

        preds = self.predict(X)
        mse = float(np.mean((preds - y) ** 2))
        mae = float(np.mean(np.abs(preds - y)))
        r2 = float(
            1 - np.sum((y - preds) ** 2) / (np.sum((y - np.mean(y)) ** 2) + 1e-8)
        )

        return {"mse": mse, "mae": mae, "r2": r2}

    def predict(self, X: np.ndarray) -> np.ndarray:
        if self.weights is None:
            return np.full(X.shape[0], 0.5)
        X_norm = (X - self.feature_mean) / self.feature_std
        raw = X_norm @ self.weights + self.bias
        return np.clip(raw, 0.0, 1.0)

    def to_dict(self) -> dict[str, Any]:
        return {
            "weights": self.weights.tolist() if self.weights is not None else None,
            "bias": self.bias,
            "feature_mean": self.feature_mean.tolist()
            if self.feature_mean is not None
            else None,
            "feature_std": self.feature_std.tolist()
            if self.feature_std is not None
            else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> CalibrationModel:
        m = cls()
        m.weights = np.array(d["weights"]) if d.get("weights") is not None else None
        m.bias = d.get("bias", 0.0)
        m.feature_mean = (
            np.array(d["feature_mean"]) if d.get("feature_mean") is not None else None
        )
        m.feature_std = (
            np.array(d["feature_std"]) if d.get("feature_std") is not None else None
        )
        return m


def train(
    num_scenarios: int = 200,
    checkpoint_dir: str | None = None,
) -> dict[str, Any]:
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

    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print("Training calibration model…")
    model = CalibrationModel()
    train_metrics = model.fit(X_train, y_train)
    print(
        f"  Train — MSE: {train_metrics['mse']:.4f}  MAE: {train_metrics['mae']:.4f}  R²: {train_metrics['r2']:.4f}"
    )

    test_preds = model.predict(X_test)
    test_mse = float(np.mean((test_preds - y_test) ** 2))
    test_mae = float(np.mean(np.abs(test_preds - y_test)))
    test_r2 = float(
        1
        - np.sum((y_test - test_preds) ** 2)
        / (np.sum((y_test - np.mean(y_test)) ** 2) + 1e-8)
    )
    print(f"  Test  — MSE: {test_mse:.4f}  MAE: {test_mae:.4f}  R²: {test_r2:.4f}")

    ckpt_dir = Path(checkpoint_dir) if checkpoint_dir else (_SCRIPT_DIR / "checkpoints")
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    model_path = ckpt_dir / "calibration_model.json"
    with open(model_path, "w") as f:
        json.dump(model.to_dict(), f, indent=2)
    print(f"Calibration model saved → {model_path}")

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
