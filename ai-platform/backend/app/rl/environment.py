"""
Reinforcement Learning Environment for Intelligence Investigations.

Models each investigation as an episode where the orchestrator chooses
which agents to run, what depth to investigate, and how to prioritize.
"""
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from enum import IntEnum


class ActionType(IntEnum):
    """Available actions for the RL agent."""
    RUN_OSINT = 0
    RUN_CRYPTO = 1
    RUN_DETECTION = 2
    RUN_GRAPH = 3
    RUN_REASONING = 4
    INCREASE_DEPTH = 5
    DECREASE_DEPTH = 6
    STOP_INVESTIGATION = 7


@dataclass
class State:
    """Observation state for the RL agent."""
    entities_found: int = 0
    relationships_found: int = 0
    anomalies_found: int = 0
    current_risk_score: float = 0.0
    investigation_depth: int = 1
    agents_used: list = field(default_factory=lambda: [0] * 5)
    step_count: int = 0
    time_elapsed: float = 0.0

    def to_vector(self) -> np.ndarray:
        """Convert state to feature vector for policy network."""
        return np.array([
            self.entities_found / 100.0,
            self.relationships_found / 100.0,
            self.anomalies_found / 50.0,
            self.current_risk_score,
            self.investigation_depth / 5.0,
            *[float(a) for a in self.agents_used],
            self.step_count / 20.0,
            self.time_elapsed / 300.0,
        ], dtype=np.float32)


@dataclass
class Experience:
    """Single transition in the RL experience."""
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: bool


class InvestigationEnvironment:
    """
    RL Environment that wraps the investigation pipeline.

    The agent observes the current investigation state and decides
    which intelligence-gathering action to take next.
    """

    STATE_DIM = 13  # Matches State.to_vector() output
    ACTION_DIM = len(ActionType)
    MAX_STEPS = 20

    def __init__(self):
        self.state = State()
        self._done = False
        self._total_reward = 0.0

    def reset(self) -> np.ndarray:
        """Reset environment for a new investigation episode."""
        self.state = State()
        self._done = False
        self._total_reward = 0.0
        return self.state.to_vector()

    def step(self, action: int, outcome: Optional[dict] = None) -> tuple:
        """
        Execute action and return (next_state, reward, done, info).

        Args:
            action: ActionType integer
            outcome: Optional dict with actual results from executing the action
                     Keys: entities_found, relationships_found, anomalies_found,
                           risk_score, time_taken
        """
        reward = 0.0
        info = {"action": ActionType(action).name}

        if outcome:
            # Update state from actual investigation results
            prev_entities = self.state.entities_found
            prev_anomalies = self.state.anomalies_found
            prev_risk = self.state.current_risk_score

            self.state.entities_found += outcome.get("entities_found", 0)
            self.state.relationships_found += outcome.get("relationships_found", 0)
            self.state.anomalies_found += outcome.get("anomalies_found", 0)
            self.state.current_risk_score = max(
                self.state.current_risk_score,
                outcome.get("risk_score", 0.0)
            )
            self.state.time_elapsed += outcome.get("time_taken", 1.0)

            # Reward for new discoveries
            new_entities = self.state.entities_found - prev_entities
            reward += new_entities * 0.1

            # Reward for finding anomalies (important signals)
            new_anomalies = self.state.anomalies_found - prev_anomalies
            reward += new_anomalies * 0.5

            # Reward for risk score increases (finding threats)
            risk_increase = self.state.current_risk_score - prev_risk
            reward += risk_increase * 2.0

            # Penalty for time (encourage efficiency)
            reward -= outcome.get("time_taken", 1.0) * 0.01

        # Track which agents were used
        if action < 5:
            self.state.agents_used[action] = 1
            # Penalty for reusing same agent without new info
            if outcome and outcome.get("entities_found", 0) == 0:
                reward -= 0.2
        elif action == ActionType.INCREASE_DEPTH:
            if self.state.investigation_depth < 5:
                self.state.investigation_depth += 1
                reward += 0.1
            else:
                reward -= 0.3  # Penalty for exceeding max depth
        elif action == ActionType.DECREASE_DEPTH:
            if self.state.investigation_depth > 1:
                self.state.investigation_depth -= 1
            else:
                reward -= 0.1
        elif action == ActionType.STOP_INVESTIGATION:
            # Reward proportional to information gathered
            if self.state.entities_found > 0:
                completeness = sum(self.state.agents_used) / 5.0
                reward += completeness * 1.0
            self._done = True

        self.state.step_count += 1

        # Auto-stop at max steps
        if self.state.step_count >= self.MAX_STEPS:
            self._done = True
            reward -= 0.5  # Penalty for not stopping voluntarily

        self._total_reward += reward

        return self.state.to_vector(), reward, self._done, info

    def get_valid_actions(self) -> list:
        """Return list of valid action indices in current state."""
        valid = list(range(self.ACTION_DIM))
        if self.state.investigation_depth >= 5 and ActionType.INCREASE_DEPTH in valid:
            valid.remove(ActionType.INCREASE_DEPTH)
        if self.state.investigation_depth <= 1 and ActionType.DECREASE_DEPTH in valid:
            valid.remove(ActionType.DECREASE_DEPTH)
        return valid
