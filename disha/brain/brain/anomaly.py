from __future__ import annotations

from math import sqrt
from statistics import mean

from ..config import settings
from ..models.schemas import AnomalyResult, BaselineProfile, TelemetryEvent

try:
    from sklearn.ensemble import IsolationForest  # type: ignore
except Exception:  # pragma: no cover - runtime fallback
    IsolationForest = None


class AnomalyDetector:
    def __init__(self) -> None:
        self.model = (
            IsolationForest(contamination=0.12, random_state=42)
            if IsolationForest
            else None
        )

    @staticmethod
    def features(event: TelemetryEvent) -> list[float]:
        return [
            event.cpu_percent,
            event.memory_percent,
            float(event.process_count),
            event.network_sent_kb,
            event.network_recv_kb,
        ]

    def baseline(self, recent_events: list[dict]) -> BaselineProfile:
        if not recent_events:
            return BaselineProfile(
                avg_cpu_percent=0.0,
                avg_memory_percent=0.0,
                avg_process_count=0.0,
                avg_network_sent_kb=0.0,
                avg_network_recv_kb=0.0,
            )
        return BaselineProfile(
            avg_cpu_percent=mean(item["cpu_percent"] for item in recent_events),
            avg_memory_percent=mean(item["memory_percent"] for item in recent_events),
            avg_process_count=mean(item["process_count"] for item in recent_events),
            avg_network_sent_kb=mean(item["network_sent_kb"] for item in recent_events),
            avg_network_recv_kb=mean(item["network_recv_kb"] for item in recent_events),
        )

    def assess(self, event: TelemetryEvent, recent_events: list[dict]) -> AnomalyResult:
        current = self.features(event)
        contributors: list[str] = []

        if len(recent_events) >= 8 and self.model is not None:
            training = [
                [
                    row["cpu_percent"],
                    row["memory_percent"],
                    float(row["process_count"]),
                    row["network_sent_kb"],
                    row["network_recv_kb"],
                ]
                for row in recent_events[-settings.anomaly_window :]
            ]
            self.model.fit(training)
            prediction = self.model.predict([current])[0]
            score = float(-self.model.score_samples([current])[0])
            if current[0] > mean(x[0] for x in training) * 1.8:
                contributors.append("CPU spike above learned baseline")
            if current[1] > mean(x[1] for x in training) * 1.5:
                contributors.append("Memory usage above learned baseline")
            return AnomalyResult(
                is_anomaly=prediction == -1,
                score=round(score, 4),
                explanation="Isolation Forest analysis on host telemetry",
                contributors=contributors,
            )

        baseline = self.baseline(recent_events)
        deltas = {
            "cpu": abs(event.cpu_percent - baseline.avg_cpu_percent),
            "memory": abs(event.memory_percent - baseline.avg_memory_percent),
            "process": abs(event.process_count - baseline.avg_process_count),
            "network_send": abs(event.network_sent_kb - baseline.avg_network_sent_kb),
            "network_recv": abs(event.network_recv_kb - baseline.avg_network_recv_kb),
        }
        magnitude = sqrt(sum(delta * delta for delta in deltas.values()))
        for key, value in deltas.items():
            if value > 20:
                contributors.append(f"{key} deviates from baseline")
        return AnomalyResult(
            is_anomaly=magnitude > 35,
            score=round(magnitude / 100.0, 4),
            explanation="Statistical deviation fallback",
            contributors=contributors,
        )
