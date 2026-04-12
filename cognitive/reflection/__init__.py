"""Reflection Layer — Self-monitoring and meta-cognition for the cognitive architecture.

Implements self-reflection capabilities:
- Performance monitoring across all cognitive layers
- Anomaly detection in behavior patterns
- Strategy effectiveness evaluation
- Continuous improvement recommendations
- Meta-cognitive awareness of system limitations

Inspired by metacognition research and self-monitoring in AGI architectures.
"""

from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from ..types import (
    CognitiveEvent,
    CognitiveSnapshot,
    ConfidenceLevel,
    ReflectionReport,
    ReflectionTrigger,
)

logger = logging.getLogger(__name__)


class PerformanceTracker:
    """Tracks performance metrics across cognitive layers."""

    def __init__(self, window_size: int = 100) -> None:
        self._metrics: dict[str, list[float]] = defaultdict(list)
        self._window_size = window_size
        self._timestamps: dict[str, list[str]] = defaultdict(list)

    def record(self, metric_name: str, value: float) -> None:
        """Record a metric value."""
        self._metrics[metric_name].append(value)
        self._timestamps[metric_name].append(
            datetime.now(timezone.utc).isoformat()
        )
        # Keep only recent values
        if len(self._metrics[metric_name]) > self._window_size:
            self._metrics[metric_name] = self._metrics[metric_name][-self._window_size:]
            self._timestamps[metric_name] = self._timestamps[metric_name][-self._window_size:]

    def get_average(self, metric_name: str) -> float:
        values = self._metrics.get(metric_name, [])
        return sum(values) / len(values) if values else 0.0

    def get_trend(self, metric_name: str) -> str:
        """Detect trend: improving, declining, or stable."""
        values = self._metrics.get(metric_name, [])
        if len(values) < 3:
            return "insufficient_data"
        
        mid = len(values) // 2
        first_half = sum(values[:mid]) / mid
        second_half = sum(values[mid:]) / (len(values) - mid)
        
        diff = second_half - first_half
        threshold = 0.05 * abs(first_half) if first_half != 0 else 0.05
        
        if diff > threshold:
            return "improving"
        if diff < -threshold:
            return "declining"
        return "stable"

    def get_anomalies(self, metric_name: str, z_threshold: float = 2.0) -> list[dict[str, Any]]:
        """Detect anomalous values using z-score."""
        values = self._metrics.get(metric_name, [])
        if len(values) < 5:
            return []
        
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = math.sqrt(variance) if variance > 0 else 0.001
        
        anomalies = []
        for i, v in enumerate(values):
            z = abs(v - mean) / std
            if z > z_threshold:
                anomalies.append({
                    "index": i,
                    "value": v,
                    "z_score": round(z, 2),
                    "timestamp": self._timestamps[metric_name][i] if i < len(self._timestamps[metric_name]) else "",
                })
        return anomalies

    def summary(self) -> dict[str, Any]:
        return {
            metric: {
                "count": len(values),
                "average": round(sum(values) / len(values), 3) if values else 0,
                "min": round(min(values), 3) if values else 0,
                "max": round(max(values), 3) if values else 0,
                "trend": self.get_trend(metric),
            }
            for metric, values in self._metrics.items()
        }


class StrategyEvaluator:
    """Evaluates the effectiveness of reasoning and action strategies."""

    def __init__(self) -> None:
        self._strategy_outcomes: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def record_outcome(
        self,
        strategy: str,
        success: bool,
        confidence: float = 0.5,
        context: str = "",
    ) -> None:
        """Record the outcome of a strategy application."""
        self._strategy_outcomes[strategy].append({
            "success": success,
            "confidence": confidence,
            "context": context[:200],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def effectiveness(self, strategy: str) -> dict[str, Any]:
        """Compute effectiveness metrics for a strategy."""
        outcomes = self._strategy_outcomes.get(strategy, [])
        if not outcomes:
            return {"success_rate": 0.0, "sample_size": 0, "recommendation": "no_data"}

        successes = sum(1 for o in outcomes if o["success"])
        rate = successes / len(outcomes)
        avg_conf = sum(o["confidence"] for o in outcomes) / len(outcomes)

        recommendation = "recommended" if rate > 0.7 else "use_cautiously" if rate > 0.4 else "avoid"

        return {
            "success_rate": round(rate, 3),
            "avg_confidence": round(avg_conf, 3),
            "sample_size": len(outcomes),
            "recommendation": recommendation,
        }

    def best_strategies(self, limit: int = 5) -> list[tuple[str, float]]:
        """Return strategies ranked by effectiveness."""
        rankings = []
        for strategy in self._strategy_outcomes:
            eff = self.effectiveness(strategy)
            score = eff["success_rate"] * math.log1p(eff["sample_size"])
            rankings.append((strategy, round(score, 3)))
        rankings.sort(key=lambda x: x[1], reverse=True)
        return rankings[:limit]


class ReflectionEngine:
    """Main reflection engine for meta-cognitive self-analysis.
    
    Monitors system performance, detects anomalies, evaluates strategies,
    and generates improvement recommendations.
    
    Example:
        engine = ReflectionEngine()
        engine.observe("reasoning_confidence", 0.85)
        engine.observe("action_success_rate", 0.72)
        engine.record_strategy("deductive", success=True)
        report = engine.reflect(trigger=ReflectionTrigger.PERIODIC)
        print(report.diagnosis)
        print(report.recommendations)
    """

    def __init__(self, reflection_depth: int = 3) -> None:
        self._performance = PerformanceTracker()
        self._strategy_eval = StrategyEvaluator()
        self._reflection_depth = reflection_depth
        self._reports: list[ReflectionReport] = []
        self._event_log: list[CognitiveEvent] = []

    def observe(self, metric_name: str, value: float) -> None:
        """Record an observation for performance tracking."""
        self._performance.record(metric_name, value)

    def record_strategy(
        self,
        strategy: str,
        success: bool,
        confidence: float = 0.5,
        context: str = "",
    ) -> None:
        """Record a strategy outcome for evaluation."""
        self._strategy_eval.record_outcome(strategy, success, confidence, context)

    def reflect(
        self,
        trigger: ReflectionTrigger = ReflectionTrigger.PERIODIC,
        *,
        cognitive_snapshot: CognitiveSnapshot | None = None,
    ) -> ReflectionReport:
        """Perform a self-reflection cycle.
        
        Analyzes performance metrics, detects anomalies, evaluates strategies,
        and generates a report with observations and recommendations.
        """
        observations: list[str] = []
        recommendations: list[str] = []
        metrics: dict[str, float] = {}

        # Analyze performance trends
        perf_summary = self._performance.summary()
        for metric_name, stats in perf_summary.items():
            trend = stats["trend"]
            if trend == "declining":
                observations.append(
                    f"Performance declining for '{metric_name}' "
                    f"(avg: {stats['average']})"
                )
                recommendations.append(
                    f"Investigate declining {metric_name} — consider strategy adjustment"
                )
            elif trend == "improving":
                observations.append(
                    f"Performance improving for '{metric_name}' "
                    f"(avg: {stats['average']})"
                )
            metrics[f"avg_{metric_name}"] = stats["average"]

        # Detect anomalies
        for metric_name in perf_summary:
            anomalies = self._performance.get_anomalies(metric_name)
            if anomalies:
                observations.append(
                    f"Detected {len(anomalies)} anomalies in '{metric_name}'"
                )
                recommendations.append(
                    f"Review anomalous values in {metric_name} for potential issues"
                )

        # Evaluate strategies
        best = self._strategy_eval.best_strategies(3)
        if best:
            observations.append(
                f"Top strategies: {', '.join(f'{s}({sc:.2f})' for s, sc in best)}"
            )

        # Check cognitive load if snapshot provided
        if cognitive_snapshot:
            if cognitive_snapshot.working_memory_load > 0.8:
                observations.append("Working memory near capacity — risk of information loss")
                recommendations.append("Consolidate working memory to long-term stores")
            metrics["memory_load"] = cognitive_snapshot.working_memory_load
            metrics["reasoning_depth"] = float(cognitive_snapshot.reasoning_depth)

        # Generate diagnosis
        diagnosis = self._synthesize_diagnosis(observations, trigger)

        # Compute overall confidence in reflection
        confidence = min(
            0.3 + 0.1 * len(observations),
            0.95,
        )

        report = ReflectionReport(
            trigger=trigger,
            observations=observations,
            diagnosis=diagnosis,
            recommendations=recommendations,
            confidence=confidence,
            metrics=metrics,
        )

        self._reports.append(report)
        self._event_log.append(CognitiveEvent(
            event_type="reflection_complete",
            source_layer="reflection",
            payload={
                "trigger": trigger.value,
                "observation_count": len(observations),
                "recommendation_count": len(recommendations),
                "confidence": confidence,
            },
        ))

        logger.info(
            "Reflection [%s]: %d observations, %d recommendations (confidence=%.2f)",
            trigger.value, len(observations), len(recommendations), confidence,
        )

        return report

    def meta_reflect(self) -> dict[str, Any]:
        """Meta-reflection: reflect on the quality of past reflections."""
        if len(self._reports) < 2:
            return {"status": "insufficient_data", "reflection_count": len(self._reports)}

        # Analyze reflection quality over time
        confidence_trend = [r.confidence for r in self._reports]
        obs_counts = [len(r.observations) for r in self._reports]
        rec_counts = [len(r.recommendations) for r in self._reports]

        return {
            "total_reflections": len(self._reports),
            "avg_confidence": round(sum(confidence_trend) / len(confidence_trend), 3),
            "avg_observations": round(sum(obs_counts) / len(obs_counts), 1),
            "avg_recommendations": round(sum(rec_counts) / len(rec_counts), 1),
            "confidence_trend": (
                "improving" if len(confidence_trend) > 2 and confidence_trend[-1] > confidence_trend[0]
                else "declining" if len(confidence_trend) > 2 and confidence_trend[-1] < confidence_trend[0]
                else "stable"
            ),
            "most_common_trigger": self._most_common_trigger(),
        }

    @property
    def reports(self) -> list[ReflectionReport]:
        return list(self._reports)

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)

    def _synthesize_diagnosis(
        self,
        observations: list[str],
        trigger: ReflectionTrigger,
    ) -> str:
        """Synthesize observations into a concise diagnosis."""
        if not observations:
            return "System operating normally — no significant issues detected."

        declining = sum(1 for o in observations if "declining" in o.lower())
        anomalies = sum(1 for o in observations if "anomal" in o.lower())
        improving = sum(1 for o in observations if "improving" in o.lower())

        parts = []
        if declining > 0:
            parts.append(f"{declining} declining metric(s)")
        if anomalies > 0:
            parts.append(f"{anomalies} anomaly detection(s)")
        if improving > 0:
            parts.append(f"{improving} improving metric(s)")

        trigger_context = {
            ReflectionTrigger.FAILURE: "Post-failure analysis",
            ReflectionTrigger.UNCERTAINTY: "High-uncertainty review",
            ReflectionTrigger.PERIODIC: "Periodic health check",
            ReflectionTrigger.GOAL_COMPLETION: "Post-goal evaluation",
            ReflectionTrigger.ANOMALY: "Anomaly-triggered review",
            ReflectionTrigger.EXTERNAL_REQUEST: "Requested review",
        }

        context = trigger_context.get(trigger, "Review")
        return f"{context}: {'; '.join(parts) if parts else 'All metrics within normal range'}."

    def _most_common_trigger(self) -> str:
        counts: dict[str, int] = defaultdict(int)
        for r in self._reports:
            counts[r.trigger.value] += 1
        if not counts:
            return "none"
        return max(counts.items(), key=lambda x: x[1])[0]
