"""Detection Agent - Performs anomaly detection using PyOD."""

from typing import Any

import numpy as np

from app.agents.base_agent import BaseAgent


class DetectionAgent(BaseAgent):
    """Agent for detecting anomalies in intelligence data using PyOD."""

    def __init__(self):
        super().__init__(
            name="DetectionAgent",
            description="Detects anomalies and outliers in intelligence data",
        )

    async def execute(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Analyze data for anomalies."""
        options = options or {}
        data_points = options.get("data_points", [])

        if not data_points:
            return {"anomalies": [], "message": "No data points provided for analysis"}

        anomalies = self._detect_anomalies(data_points)
        return {
            "target": target,
            "total_points": len(data_points),
            "anomalies": anomalies,
            "anomaly_count": len(anomalies),
        }

    def _detect_anomalies(self, data_points: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Detect anomalies using statistical methods and PyOD."""
        try:
            from pyod.models.iforest import IForest

            # Extract numerical features
            features = self._extract_features(data_points)
            if len(features) < 5:
                return self._simple_anomaly_detection(data_points)

            feature_array = np.array(features)
            if feature_array.shape[1] == 0:
                return []

            # Use Isolation Forest for anomaly detection
            detector = IForest(contamination=0.1, random_state=42)
            detector.fit(feature_array)

            labels = detector.labels_
            scores = detector.decision_scores_

            anomalies = []
            for i, (label, score) in enumerate(zip(labels, scores)):
                if label == 1:  # Anomaly
                    anomalies.append({
                        "index": i,
                        "data": data_points[i] if i < len(data_points) else {},
                        "anomaly_score": float(score),
                        "is_anomaly": True,
                    })

            return sorted(anomalies, key=lambda x: x["anomaly_score"], reverse=True)

        except ImportError:
            self.logger.warning("pyod_not_available", msg="Falling back to simple detection")
            return self._simple_anomaly_detection(data_points)
        except Exception as e:
            self.logger.error("anomaly_detection_failed", error=str(e))
            return self._simple_anomaly_detection(data_points)

    def _extract_features(self, data_points: list[dict[str, Any]]) -> list[list[float]]:
        """Extract numerical features from data points with uniform dimensions."""
        # Collect all numeric keys across all data points for a consistent schema
        numeric_keys: list[str] = []
        for point in data_points:
            for key, value in point.items():
                if isinstance(value, (int, float)) and key not in numeric_keys:
                    numeric_keys.append(key)

        if not numeric_keys:
            return []

        features = []
        for point in data_points:
            row = [float(point.get(key, 0.0)) for key in numeric_keys]
            features.append(row)
        return features

    def _simple_anomaly_detection(self, data_points: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Simple statistical anomaly detection fallback."""
        features = self._extract_features(data_points)
        if not features:
            return []

        feature_array = np.array(features)
        mean = np.mean(feature_array, axis=0)
        std = np.std(feature_array, axis=0)
        std = np.where(std == 0, 1, std)  # Avoid division by zero

        anomalies = []
        for i, row in enumerate(feature_array):
            z_scores = np.abs((row - mean) / std)
            max_z = float(np.max(z_scores))
            if max_z > 2.5:
                anomalies.append({
                    "index": i,
                    "data": data_points[i] if i < len(data_points) else {},
                    "anomaly_score": max_z,
                    "is_anomaly": True,
                })

        return sorted(anomalies, key=lambda x: x["anomaly_score"], reverse=True)
