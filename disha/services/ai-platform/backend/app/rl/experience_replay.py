import random
from collections import deque
from dataclasses import dataclass
from typing import Optional
import numpy as np
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class Transition:
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: bool
    log_prob: float = 0.0
    value: float = 0.0
    priority: float = 1.0


class ExperienceReplayBuffer:
    def __init__(self, capacity: int = 10000, alpha: float = 0.6):
        self.capacity = capacity
        self.alpha = alpha
        self.buffer: deque = deque(maxlen=capacity)
        self._episode_buffer: list = []

    def add(self, transition: Transition):
        self.buffer.append(transition)

    def start_episode(self):
        self._episode_buffer = []

    def add_step(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
        log_prob: float = 0.0,
        value: float = 0.0,
    ):
        transition = Transition(
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            done=done,
            log_prob=log_prob,
            value=value,
            priority=abs(reward) + 1e-6,
        )
        self._episode_buffer.append(transition)

    def end_episode(self, final_reward: Optional[float] = None):
        if not self._episode_buffer:
            return

        if final_reward is not None and self._episode_buffer:
            self._episode_buffer[-1].reward = final_reward
            self._episode_buffer[-1].priority = abs(final_reward) + 1e-6

        for transition in self._episode_buffer:
            self.buffer.append(transition)

        episode_len = len(self._episode_buffer)
        self._episode_buffer = []
        logger.info(
            "episode_stored", transitions=episode_len, buffer_size=len(self.buffer)
        )

    def sample(self, batch_size: int = 32) -> list:
        if len(self.buffer) < batch_size:
            return list(self.buffer)

        if self.alpha == 0:
            return random.sample(list(self.buffer), batch_size)

        priorities = np.array([t.priority**self.alpha for t in self.buffer])
        total = priorities.sum()
        if total == 0:
            return random.sample(list(self.buffer), batch_size)
        probs = priorities / total

        indices = np.random.choice(
            len(self.buffer), size=batch_size, p=probs, replace=True
        )
        return [self.buffer[i] for i in indices]

    def get_batch_arrays(self, batch_size: int = 32) -> Optional[dict]:
        batch = self.sample(batch_size)
        if not batch:
            return None

        return {
            "states": np.array([t.state for t in batch]),
            "actions": np.array([t.action for t in batch]),
            "rewards": np.array([t.reward for t in batch]),
            "next_states": np.array([t.next_state for t in batch]),
            "dones": np.array([t.done for t in batch]),
            "log_probs": np.array([t.log_prob for t in batch]),
        }

    def __len__(self) -> int:
        return len(self.buffer)

    def get_stats(self) -> dict:
        if not self.buffer:
            return {"size": 0, "capacity": self.capacity}

        rewards = [t.reward for t in self.buffer]
        return {
            "size": len(self.buffer),
            "capacity": self.capacity,
            "avg_reward": float(np.mean(rewards)),
            "max_reward": float(np.max(rewards)),
            "min_reward": float(np.min(rewards)),
        }
