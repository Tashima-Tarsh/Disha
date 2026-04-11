"""
Strategy Classifier and Recommender for Historical Strategy Intelligence System.
Wraps RandomForestClassifier with additional utilities for strategy recommendation.
"""

import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from typing import List, Dict, Any, Optional


class StrategyClassifier:
    """
    Random Forest-based classifier for predicting optimal military strategies
    based on historical conflict features.
    """

    def __init__(self, n_estimators: int = 200, max_depth: int = 15, random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            class_weight="balanced",
            min_samples_split=2,
            min_samples_leaf=1,
        )
        self.classes_: Optional[np.ndarray] = None
        self.feature_names_: Optional[List[str]] = None
        self.is_trained: bool = False

    def train(self, X: np.ndarray, y: np.ndarray, feature_names: Optional[List[str]] = None) -> "StrategyClassifier":
        """
        Train the classifier on feature matrix X and labels y.
        """
        self.model.fit(X, y)
        self.classes_ = self.model.classes_
        self.feature_names_ = feature_names or [f"feature_{i}" for i in range(X.shape[1])]
        self.is_trained = True
        print(f"[Classifier] Trained on {X.shape[0]} samples, {X.shape[1]} features, {len(np.unique(y))} classes.")
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict strategy class indices."""
        if not self.is_trained:
            raise RuntimeError("Model must be trained before prediction.")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return probability estimates for each class."""
        if not self.is_trained:
            raise RuntimeError("Model must be trained before prediction.")
        return self.model.predict_proba(X)

    def get_feature_importance(self) -> Dict[str, float]:
        """Return feature importances as a dict sorted descending."""
        if not self.is_trained:
            raise RuntimeError("Model must be trained before getting feature importances.")
        importances = self.model.feature_importances_
        names = self.feature_names_ or [f"feature_{i}" for i in range(len(importances))]
        importance_dict = dict(sorted(zip(names, importances.tolist()), key=lambda x: -x[1]))
        return importance_dict

    def save(self, path: str) -> None:
        """Serialize model and metadata to disk using joblib."""
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "model": self.model,
            "classes_": self.classes_,
            "feature_names_": self.feature_names_,
            "is_trained": self.is_trained,
        }
        joblib.dump(payload, save_path)
        print(f"[Classifier] Saved model to {save_path}")

    def load(self, path: str) -> "StrategyClassifier":
        """Load model and metadata from disk."""
        payload = joblib.load(path)
        self.model = payload["model"]
        self.classes_ = payload["classes_"]
        self.feature_names_ = payload["feature_names_"]
        self.is_trained = payload["is_trained"]
        print(f"[Classifier] Loaded model from {path}")
        return self


class StrategyRecommender:
    """
    High-level recommender that wraps StrategyClassifier to return
    human-readable strategy recommendations with confidence scores.
    """

    STRATEGY_DESCRIPTIONS: Dict[str, str] = {
        "Guerrilla": "Irregular warfare using small mobile forces for hit-and-run attacks. Highly effective in forests and mountains.",
        "Conventional": "Standard large-scale military operations using organized armies. Best on open terrain with technological parity.",
        "Naval": "Sea-based power projection and control of maritime lanes. Decisive for island campaigns and trade disruption.",
        "Siege": "Systematic reduction of fortified positions. Effective against urban centers and fortresses.",
        "Blitzkrieg": "Rapid armored penetration combined with air support to shatter enemy command. Best on open terrain.",
        "Attrition": "Wearing down the enemy through sustained casualties and resource depletion. Favors larger forces.",
        "Flanking": "Envelopment of enemy forces to attack from multiple directions. Classic strategy for decisive encirclement.",
        "Deception": "Misleading the enemy about intentions, capabilities, or location. Multiplies effect of smaller forces.",
        "Psychological": "Targeting enemy morale and will to fight through terror, propaganda, or symbolic acts.",
        "Coalition": "Uniting multiple parties against a common enemy. Provides resource and legitimacy advantages.",
    }

    def __init__(self, classifier: Optional[StrategyClassifier] = None,
                 label_encoder: Optional[LabelEncoder] = None):
        self.classifier = classifier
        self.label_encoder = label_encoder

    def recommend(self, X: np.ndarray, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Given feature vector(s), return top-k strategy recommendations with confidence scores.

        Returns a list of dicts: [{"strategy": str, "confidence": float, "description": str}]
        """
        if self.classifier is None or not self.classifier.is_trained:
            raise RuntimeError("Classifier must be initialized and trained.")

        proba = self.classifier.predict_proba(X)
        classes = self.classifier.classes_

        results = []
        for sample_proba in proba:
            top_indices = np.argsort(sample_proba)[::-1][:top_k]
            recommendations = []
            for idx in top_indices:
                class_idx = classes[idx]
                if self.label_encoder is not None:
                    strategy_name = self.label_encoder.inverse_transform([class_idx])[0]
                else:
                    strategy_name = str(class_idx)
                confidence = float(sample_proba[idx])
                recommendations.append({
                    "strategy": strategy_name,
                    "confidence": round(confidence, 4),
                    "description": self.STRATEGY_DESCRIPTIONS.get(strategy_name, "No description available."),
                    "rank": len(recommendations) + 1,
                })
            results.append(recommendations)

        return results[0] if len(results) == 1 else results

    def recommend_from_params(
            self, params: Dict[str, Any], encoders: Dict[str, LabelEncoder],
            feature_names: List[str]) -> List[Dict[str, Any]]:
        """
        Recommend strategies from a raw parameter dictionary.
        Handles encoding and normalization internally.

        params: dict with keys era, region, terrain, technology_level, year,
                duration_days, casualties_estimate, outcome (optional)
        """
        feature_vector = self._encode_params(params, encoders, feature_names)
        return self.recommend(feature_vector.reshape(1, -1))

    def _encode_params(
            self, params: Dict[str, Any], encoders: Dict[str, LabelEncoder],
            feature_names: List[str]) -> np.ndarray:
        """Encode raw parameters into feature vector."""
        feature_map: Dict[str, float] = {}

        categorical_fields = ["era", "region", "terrain", "technology_level"]
        for field in categorical_fields:
            enc_key = field + "_enc"
            if field in params and field in encoders:
                value = str(params[field])
                encoder = encoders[field]
                if value in encoder.classes_:
                    feature_map[enc_key] = float(encoder.transform([value])[0])
                else:
                    feature_map[enc_key] = float(encoder.transform([encoder.classes_[0]])[0])
            else:
                feature_map[enc_key] = 0.0

        # Numeric features (use defaults if not provided)
        year = float(params.get("year", 1900))
        duration = float(params.get("duration_days", 30))
        casualties = float(params.get("casualties_estimate", 10000))

        feature_map["year_norm"] = np.clip((year + 1000) / 3000.0, 0, 1)
        feature_map["duration_norm"] = np.clip(duration / 10000.0, 0, 1)
        feature_map["casualties_norm"] = np.clip(casualties / 5000000.0, 0, 1)
        feature_map["log_casualties"] = float(np.log1p(casualties))

        outcome_map = {"Victory": 1.0, "Draw": 0.5, "Defeat": 0.0}
        feature_map["outcome_score"] = outcome_map.get(str(params.get("outcome", "Draw")), 0.5)

        vector = np.array([feature_map.get(name, 0.0) for name in feature_names], dtype=np.float32)
        return vector
