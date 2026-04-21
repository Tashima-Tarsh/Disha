from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import structlog

_SCRIPT_DIR = Path(__file__).resolve().parent
_BACKEND_ROOT = _SCRIPT_DIR.parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.rl.environment import InvestigationEnvironment, ActionType
from app.rl.policy import PolicyNetwork, TORCH_AVAILABLE
from app.rl.experience_replay import ExperienceReplayBuffer
from app.rl.reward import RewardComputer

logger = structlog.get_logger(__name__)

_RNG = np.random.RandomState(42)


def _synthetic_outcome(action: int) -> dict:
    if action >= 5:
        return {}
    base = {
        "entities_found": int(_RNG.poisson(3)),
        "relationships_found": int(_RNG.poisson(2)),
        "anomalies_found": int(_RNG.binomial(1, 0.3)),
        "risk_score": float(np.clip(_RNG.normal(0.4, 0.2), 0.0, 1.0)),
        "time_taken": float(np.clip(_RNG.exponential(2.0), 0.5, 10.0)),
    }

    if action == ActionType.RUN_OSINT:
        base["entities_found"] += int(_RNG.poisson(5))
    elif action == ActionType.RUN_CRYPTO:
        base["anomalies_found"] += int(_RNG.binomial(2, 0.4))
    elif action == ActionType.RUN_DETECTION:
        base["risk_score"] = float(np.clip(base["risk_score"] + 0.15, 0, 1))
    elif action == ActionType.RUN_GRAPH:
        base["relationships_found"] += int(_RNG.poisson(4))
    elif action == ActionType.RUN_REASONING:
        base["anomalies_found"] += int(_RNG.binomial(1, 0.5))
    return base


def train(
    num_episodes: int = 500,
    update_every: int = 20,
    checkpoint_dir: str | None = None,
) -> dict:
    if not TORCH_AVAILABLE:
        logger.warning("torch_not_available", msg="Training requires PyTorch")
        return {"status": "skipped", "reason": "torch_not_available"}

    env = InvestigationEnvironment()
    policy = PolicyNetwork(
        state_dim=env.STATE_DIM,
        action_dim=env.ACTION_DIM,
        hidden_dim=128,
        lr=3e-4,
    )
    replay = ExperienceReplayBuffer(capacity=20_000)
    reward_computer = RewardComputer()

    episode_rewards: list[float] = []
    update_metrics: list[dict] = []

    for ep in range(1, num_episodes + 1):
        state = env.reset()
        replay.start_episode()
        ep_reward = 0.0

        while True:
            valid = env.get_valid_actions()
            action, log_prob = policy.select_action(state, valid)
            value = policy.get_value(state)

            outcome = _synthetic_outcome(action)
            next_state, reward, done, info = env.step(action, outcome or None)

            policy.store_transition(state, action, reward, log_prob, value, done)
            replay.add_step(state, action, reward, next_state, done, log_prob, value)

            ep_reward += reward
            state = next_state

            if done:
                break

        ep_result = {
            "entities": list(range(env.state.entities_found)),
            "anomalies": list(range(env.state.anomalies_found)),
            "risk_score": env.state.current_risk_score,
            "steps_taken": env.state.step_count,
        }
        final_r = reward_computer.compute_episode_reward(ep_result)
        replay.end_episode(final_reward=final_r)
        episode_rewards.append(ep_reward)

        if ep % update_every == 0:
            metrics = policy.update(epochs=4)
            update_metrics.append(metrics)
            avg_r = float(np.mean(episode_rewards[-update_every:]))
            logger.info(
                "training_progress",
                episode=ep,
                avg_reward=round(avg_r, 4),
                buffer_size=len(replay),
                loss=round(metrics.get("avg_loss", 0), 4),
            )

    import torch

    ckpt_dir = (
        Path(checkpoint_dir) if checkpoint_dir else (_BACKEND_ROOT / "checkpoints")
    )
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = ckpt_dir / "rl_policy.pt"

    torch.save(
        {
            "actor_state_dict": policy.actor.state_dict(),
            "critic_state_dict": policy.critic.state_dict(),
            "state_dim": policy.state_dim,
            "action_dim": policy.action_dim,
            "hidden_dim": 128,
            "episodes_trained": num_episodes,
        },
        ckpt_path,
    )
    logger.info("checkpoint_saved", path=str(ckpt_path))

    metrics_path = ckpt_dir / "rl_training_metrics.json"
    summary = {
        "episodes_trained": num_episodes,
        "final_avg_reward": float(np.mean(episode_rewards[-50:])),
        "total_updates": len(update_metrics),
        "replay_buffer_size": len(replay),
        "reward_metrics": reward_computer.get_metrics(),
    }
    with open(metrics_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    logger.info("metrics_saved", path=str(metrics_path))

    return summary


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2, default=str))
