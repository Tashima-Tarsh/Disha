import time
from dataclasses import dataclass, field
from typing import Optional
from collections import deque
import numpy as np
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class InvestigationFeedback:
    investigation_id: str
    timestamp: float = field(default_factory=time.time)
    true_positive: Optional[bool] = None
    user_rating: Optional[float] = None
    false_positive_count: int = 0
    actionable_findings: int = 0
    time_to_resolution: Optional[float] = None


class RewardComputer:
    DISCOVERY_WEIGHT = 0.3
    ACCURACY_WEIGHT = 0.3
    EFFICIENCY_WEIGHT = 0.2
    FEEDBACK_WEIGHT = 0.2

    def __init__(self, history_size: int = 1000):
        self.feedback_history: deque = deque(maxlen=history_size)
        self.reward_history: deque = deque(maxlen=history_size)
        self._baseline_reward = 0.0

    def compute_step_reward(
        self,
        entities_found: int,
        anomalies_found: int,
        risk_delta: float,
        time_taken: float,
    ) -> float:
        discovery = (
            entities_found * 0.1 + anomalies_found * 0.5
        ) * self.DISCOVERY_WEIGHT
        risk_reward = risk_delta * 2.0 * self.ACCURACY_WEIGHT
        efficiency = -time_taken * 0.01 * self.EFFICIENCY_WEIGHT

        reward = discovery + risk_reward + efficiency
        return reward

    def compute_episode_reward(
        self,
        investigation_result: dict,
        feedback: Optional[InvestigationFeedback] = None,
    ) -> float:

        entities = investigation_result.get("entities", [])
        anomalies = investigation_result.get("anomalies", [])
        risk_score = investigation_result.get("risk_score", 0.0)

        discovery_reward = (
            len(entities) * 0.05 + len(anomalies) * 0.3
        ) * self.DISCOVERY_WEIGHT

        risk_reward = 0.0
        if risk_score > 0.0:
            risk_reward = risk_score * self.ACCURACY_WEIGHT

        steps = investigation_result.get("steps_taken", 10)
        efficiency_reward = max(0, (20 - steps) / 20.0) * self.EFFICIENCY_WEIGHT

        feedback_reward = 0.0
        if feedback:
            self.feedback_history.append(feedback)
            if feedback.true_positive is not None:
                feedback_reward += (1.0 if feedback.true_positive else -1.0) * 0.5
            if feedback.user_rating is not None:
                feedback_reward += (feedback.user_rating - 0.5) * 0.5
            if feedback.actionable_findings > 0:
                feedback_reward += min(feedback.actionable_findings * 0.1, 0.5)
            feedback_reward *= self.FEEDBACK_WEIGHT

        total = discovery_reward + risk_reward + efficiency_reward + feedback_reward

        total -= self._baseline_reward

        self.reward_history.append(total + self._baseline_reward)
        if len(self.reward_history) > 10:
            self._baseline_reward = float(np.mean(list(self.reward_history)))

        logger.info(
            "episode_reward_computed",
            total=round(total, 4),
            discovery=round(discovery_reward, 4),
            risk=round(risk_reward, 4),
            efficiency=round(efficiency_reward, 4),
            feedback=round(feedback_reward, 4),
        )

        return total

    def get_metrics(self) -> dict:
        rewards = list(self.reward_history)
        feedbacks = list(self.feedback_history)

        tp_count = sum(1 for f in feedbacks if f.true_positive is True)
        fp_count = sum(1 for f in feedbacks if f.true_positive is False)
        total_labeled = tp_count + fp_count

        return {
            "total_episodes": len(rewards),
            "avg_reward": float(np.mean(rewards)) if rewards else 0.0,
            "reward_std": float(np.std(rewards)) if rewards else 0.0,
            "baseline": self._baseline_reward,
            "true_positive_rate": tp_count / max(total_labeled, 1),
            "false_positive_rate": fp_count / max(total_labeled, 1),
            "total_feedback": len(feedbacks),
            "avg_user_rating": float(
                np.mean([f.user_rating for f in feedbacks if f.user_rating is not None])
            )
            if any(f.user_rating is not None for f in feedbacks)
            else None,
        }
