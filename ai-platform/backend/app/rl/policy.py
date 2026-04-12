"""
PPO Policy Network for RL-based investigation optimization.

Implements Proximal Policy Optimization with a simple MLP policy
that learns to select investigation actions based on current state.
"""
import numpy as np
from typing import Optional
import structlog

logger = structlog.get_logger(__name__)

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.distributions import Categorical
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class PolicyNetwork:
    """
    PPO-based policy network for investigation action selection.

    Falls back to heuristic policy if PyTorch is unavailable.
    """

    def __init__(
        self,
        state_dim: int = 12,
        action_dim: int = 8,
        hidden_dim: int = 64,
        lr: float = 3e-4,
        gamma: float = 0.99,
        clip_epsilon: float = 0.2,
        entropy_coeff: float = 0.01,
    ):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.clip_epsilon = clip_epsilon
        self.entropy_coeff = entropy_coeff

        if TORCH_AVAILABLE:
            self.actor = nn.Sequential(
                nn.Linear(state_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, action_dim),
                nn.Softmax(dim=-1),
            )
            self.critic = nn.Sequential(
                nn.Linear(state_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, 1),
            )
            self.optimizer = optim.Adam(
                list(self.actor.parameters()) + list(self.critic.parameters()),
                lr=lr,
            )
            logger.info("policy_network_initialized", backend="pytorch")
        else:
            self.actor = None
            self.critic = None
            self.optimizer = None
            logger.info("policy_network_initialized", backend="heuristic_fallback")

        # Experience buffer for PPO updates
        self.states = []
        self.actions = []
        self.rewards = []
        self.log_probs = []
        self.values = []
        self.dones = []

    def select_action(
        self,
        state: np.ndarray,
        valid_actions: Optional[list] = None,
    ) -> tuple:
        """
        Select action using current policy.

        Returns: (action_index, log_probability)
        """
        if not TORCH_AVAILABLE or self.actor is None:
            return self._heuristic_action(state, valid_actions)

        state_tensor = torch.FloatTensor(state).unsqueeze(0)

        with torch.no_grad():
            probs = self.actor(state_tensor).squeeze()
            _ = self.critic(state_tensor).squeeze()

        # Mask invalid actions
        if valid_actions is not None:
            mask = torch.zeros(self.action_dim)
            for a in valid_actions:
                mask[a] = 1.0
            probs = probs * mask
            prob_sum = probs.sum()
            if prob_sum > 0:
                probs = probs / prob_sum
            else:
                probs = mask / mask.sum()

        dist = Categorical(probs)
        action = dist.sample()
        log_prob = dist.log_prob(action)

        return action.item(), log_prob.item()

    def _heuristic_action(
        self,
        state: np.ndarray,
        valid_actions: Optional[list] = None,
    ) -> tuple:
        """Fallback heuristic policy when PyTorch is unavailable."""
        agents_used = state[5:10] if len(state) >= 12 else [0] * 5
        _ = int(state[10] * 20) if len(state) >= 12 else 0

        # Simple strategy: run each agent in order, then stop
        for i in range(5):
            if agents_used[i] < 0.5:
                action = i
                if valid_actions is None or action in valid_actions:
                    return action, 0.0

        # All agents used, stop investigation
        action = 7  # STOP_INVESTIGATION
        if valid_actions and action not in valid_actions:
            action = valid_actions[0] if valid_actions else 0

        return action, 0.0

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        log_prob: float,
        value: float,
        done: bool,
    ):
        """Store a transition for batch PPO update."""
        self.states.append(state)
        self.actions.append(action)
        self.rewards.append(reward)
        self.log_probs.append(log_prob)
        self.values.append(value)
        self.dones.append(done)

    def update(self, epochs: int = 4) -> dict:
        """
        Run PPO update on collected experience.

        Returns dict with training metrics.
        """
        if not TORCH_AVAILABLE or len(self.states) == 0:
            self._clear_buffer()
            return {"status": "skipped", "reason": "no_torch_or_empty_buffer"}

        # Compute discounted returns
        returns = []
        R = 0.0
        for reward, done in zip(reversed(self.rewards), reversed(self.dones)):
            if done:
                R = 0.0
            R = reward + self.gamma * R
            returns.insert(0, R)

        states = torch.FloatTensor(np.array(self.states))
        actions = torch.LongTensor(self.actions)
        old_log_probs = torch.FloatTensor(self.log_probs)
        returns_t = torch.FloatTensor(returns)

        # Normalize returns
        if len(returns_t) > 1:
            returns_t = (returns_t - returns_t.mean()) / (returns_t.std() + 1e-8)

        total_loss = 0.0

        for _ in range(epochs):
            probs = self.actor(states)
            dist = Categorical(probs)
            new_log_probs = dist.log_prob(actions)
            entropy = dist.entropy().mean()

            values = self.critic(states).squeeze()
            advantages = returns_t - values.detach()

            # PPO clipped objective
            ratio = torch.exp(new_log_probs - old_log_probs)
            surr1 = ratio * advantages
            surr2 = torch.clamp(ratio, 1 - self.clip_epsilon, 1 + self.clip_epsilon) * advantages

            actor_loss = -torch.min(surr1, surr2).mean()
            critic_loss = nn.functional.mse_loss(values, returns_t)

            loss = actor_loss + 0.5 * critic_loss - self.entropy_coeff * entropy

            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                list(self.actor.parameters()) + list(self.critic.parameters()),
                max_norm=0.5,
            )
            self.optimizer.step()

            total_loss += loss.item()

        metrics = {
            "status": "updated",
            "episodes": len(self.states),
            "avg_loss": total_loss / max(epochs, 1),
            "avg_reward": sum(self.rewards) / max(len(self.rewards), 1),
        }

        self._clear_buffer()
        logger.info("ppo_update_complete", **metrics)
        return metrics

    def _clear_buffer(self):
        """Clear experience buffer."""
        self.states.clear()
        self.actions.clear()
        self.rewards.clear()
        self.log_probs.clear()
        self.values.clear()
        self.dones.clear()

    def get_value(self, state: np.ndarray) -> float:
        """Get state value estimate from critic."""
        if not TORCH_AVAILABLE or self.critic is None:
            return 0.0
        with torch.no_grad():
            state_t = torch.FloatTensor(state).unsqueeze(0)
            return self.critic(state_t).item()
