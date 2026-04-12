#!/usr/bin/env python3
"""
Continuous Training Runner — fetches open-source data, trains all models,
evaluates performance, and promotes improved checkpoints.

Features:
  - Open-source data ingestion (abuse.ch, OSINT feeds, synthetic enrichment)
  - Incremental training that loads previous checkpoints and continues
  - Model self-enhancement: auto hyperparameter tuning, curriculum learning
  - Metric tracking across rounds with improvement gating
  - Safe checkpoint promotion (only if metrics improve)

Usage::

    python scripts/continuous_train.py                    # full pipeline
    python scripts/continuous_train.py --rounds 5         # 5 training rounds
    python scripts/continuous_train.py --component rl     # RL only
    python scripts/continuous_train.py --offline           # no network (synthetic only)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from copy import deepcopy
from pathlib import Path

import numpy as np
import structlog

# ── Path setup ────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND = REPO_ROOT / "ai-platform" / "backend"
DECISION_DIR = REPO_ROOT / "decision-engine"
SCRIPTS_DIR = REPO_ROOT / "scripts"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
if str(DECISION_DIR) not in sys.path:
    sys.path.insert(0, str(DECISION_DIR))
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")

logger = structlog.get_logger("continuous_train")


# ═════════════════════════════════════════════════════════════════════
# Hyperparameter schedules for self-enhancement
# ═════════════════════════════════════════════════════════════════════

class HyperparamScheduler:
    """Auto-tunes hyperparameters based on training metrics history."""

    # Stagnation detection: if reward changes less than this fraction, boost LR
    STAGNATION_THRESHOLD = 0.01
    # Minimum denominator to avoid division by zero
    EPSILON = 1e-8

    def __init__(self):
        self.history: list[dict] = []

    def record(self, metrics: dict):
        self.history.append(metrics)

    def get_rl_params(self, round_num: int) -> dict:
        """Return RL hyperparameters, adapting based on history."""
        base = {
            "num_episodes": 300 + round_num * 100,  # More episodes each round
            "update_every": 20,
            "hidden_dim": 128,
            "lr": 3e-4,
        }
        # If reward is stagnating, increase exploration
        if len(self.history) >= 2:
            prev = self.history[-2].get("rl", {}).get("final_avg_reward", 0)
            curr = self.history[-1].get("rl", {}).get("final_avg_reward", 0)
            if abs(curr - prev) < self.STAGNATION_THRESHOLD * abs(prev + self.EPSILON):
                base["lr"] = min(base["lr"] * 1.5, 1e-3)
                logger.info("rl_lr_increased", new_lr=base["lr"], reason="stagnation")
        return base

    def get_gnn_params(self, round_num: int) -> dict:
        """Return GNN hyperparameters, adapting based on history."""
        base = {
            "num_epochs_link": 150 + round_num * 50,
            "num_epochs_classify": 100 + round_num * 30,
            "lr": 0.005,
            "weight_decay": 1e-3,
        }
        # If link loss is still high, boost epochs
        if self.history:
            last_loss = self.history[-1].get("gnn", {}).get("link_final_loss", 999)
            if last_loss > 1.3:
                base["num_epochs_link"] += 100
                logger.info("gnn_epochs_increased", reason="high_loss", loss=last_loss)
        return base

    def get_de_params(self, round_num: int) -> dict:
        """Return Decision Engine hyperparameters."""
        return {
            "num_scenarios": 200 + round_num * 100,
            "alpha": max(0.01, 0.1 - round_num * 0.01),  # Decrease regularisation
        }


# ═════════════════════════════════════════════════════════════════════
# Graph merging utility
# ═════════════════════════════════════════════════════════════════════

def _merge_graphs(threat_graph, knowledge_graph: dict):
    """Merge threat intelligence graph with knowledge graph for richer training."""
    from data_fetchers import GraphDataset

    tg_feats = threat_graph.node_features
    tg_edges = threat_graph.edge_index
    tg_labels = threat_graph.node_labels
    tg_types = threat_graph.node_types

    kg_feats = knowledge_graph["node_features"]
    kg_edges = knowledge_graph["edge_index"]
    kg_labels = knowledge_graph["node_labels"]
    kg_types = knowledge_graph["node_types"]

    # Align feature dimensions
    tg_dim = tg_feats.shape[1]
    kg_dim = kg_feats.shape[1]
    if tg_dim != kg_dim:
        target_dim = max(tg_dim, kg_dim)
        if tg_dim < target_dim:
            pad = np.zeros((tg_feats.shape[0], target_dim - tg_dim), dtype=np.float32)
            tg_feats = np.concatenate([tg_feats, pad], axis=1)
        if kg_dim < target_dim:
            pad = np.zeros((kg_feats.shape[0], target_dim - kg_dim), dtype=np.float32)
            kg_feats = np.concatenate([kg_feats, pad], axis=1)

    offset = tg_feats.shape[0]

    # Merge features
    merged_feats = np.concatenate([tg_feats, kg_feats], axis=0)
    merged_labels = np.concatenate([tg_labels, kg_labels], axis=0)
    merged_types = np.concatenate([tg_types, kg_types], axis=0)

    # Offset knowledge graph edges
    if kg_edges.size > 0:
        kg_edges_offset = kg_edges + offset
    else:
        kg_edges_offset = kg_edges

    # Merge edges
    if tg_edges.size > 0 and kg_edges_offset.size > 0:
        merged_edges = np.concatenate([tg_edges, kg_edges_offset], axis=1)
    elif tg_edges.size > 0:
        merged_edges = tg_edges
    else:
        merged_edges = kg_edges_offset

    logger.info("graphs_merged",
                threat_nodes=offset,
                knowledge_nodes=kg_feats.shape[0],
                total_nodes=merged_feats.shape[0],
                total_edges=merged_edges.shape[1] if merged_edges.size else 0)

    return GraphDataset(
        node_features=merged_feats,
        edge_index=merged_edges,
        node_labels=merged_labels,
        node_types=merged_types,
        metadata={
            "threat_nodes": offset,
            "knowledge_nodes": int(kg_feats.shape[0]),
            "total_nodes": int(merged_feats.shape[0]),
        },
    )


# ═════════════════════════════════════════════════════════════════════
# Component trainers
# ═════════════════════════════════════════════════════════════════════

def _train_rl(
    scenarios: list,
    params: dict,
    checkpoint_dir: Path,
    prev_checkpoint: Path | None = None,
) -> dict:
    """Train RL policy on threat scenarios (incremental)."""
    import torch
    from app.rl.environment import InvestigationEnvironment, ActionType
    from app.rl.policy import PolicyNetwork, TORCH_AVAILABLE
    from app.rl.experience_replay import ExperienceReplayBuffer
    from app.rl.reward import RewardComputer

    if not TORCH_AVAILABLE:
        return {"status": "skipped", "reason": "torch_not_available"}

    env = InvestigationEnvironment()
    hidden_dim = params.get("hidden_dim", 128)
    policy = PolicyNetwork(
        state_dim=env.STATE_DIM,
        action_dim=env.ACTION_DIM,
        hidden_dim=hidden_dim,
        lr=params.get("lr", 3e-4),
    )

    # Load previous checkpoint for incremental training
    if prev_checkpoint and prev_checkpoint.exists():
        ckpt = torch.load(prev_checkpoint, weights_only=True)
        if ckpt.get("hidden_dim", 64) == hidden_dim:
            policy.actor.load_state_dict(ckpt["actor_state_dict"])
            policy.critic.load_state_dict(ckpt["critic_state_dict"])
            logger.info("rl_checkpoint_loaded", path=str(prev_checkpoint))
        else:
            logger.warning("rl_checkpoint_dim_mismatch", expected=hidden_dim, got=ckpt.get("hidden_dim"))

    replay = ExperienceReplayBuffer(capacity=30_000)
    reward_computer = RewardComputer()
    rng = np.random.RandomState(int(time.time()) % 2**31)

    num_episodes = params.get("num_episodes", 500)
    update_every = params.get("update_every", 20)
    episode_rewards: list[float] = []

    for ep in range(1, num_episodes + 1):
        state = env.reset()
        replay.start_episode()
        ep_reward = 0.0

        # Use real scenario data to shape outcomes
        scenario = scenarios[ep % len(scenarios)] if scenarios else None

        while True:
            valid = env.get_valid_actions()
            action, log_prob = policy.select_action(state, valid)
            value = policy.get_value(state)

            outcome = _scenario_outcome(action, scenario, rng)
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
            policy.update(epochs=4)

    # Save checkpoint
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = checkpoint_dir / "rl_policy.pt"
    torch.save({
        "actor_state_dict": policy.actor.state_dict(),
        "critic_state_dict": policy.critic.state_dict(),
        "state_dim": policy.state_dim,
        "action_dim": policy.action_dim,
        "hidden_dim": hidden_dim,
        "episodes_trained": num_episodes,
    }, ckpt_path)

    metrics = {
        "episodes_trained": num_episodes,
        "final_avg_reward": float(np.mean(episode_rewards[-50:])) if episode_rewards else 0,
        "reward_std": float(np.std(episode_rewards[-50:])) if episode_rewards else 0,
        "replay_buffer_size": len(replay),
        "data_source_scenarios": len(scenarios),
    }
    with open(checkpoint_dir / "rl_training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    logger.info("rl_training_complete", **{k: round(v, 4) if isinstance(v, float) else v for k, v in metrics.items()})
    return metrics


def _scenario_outcome(action: int, scenario, rng: np.random.RandomState) -> dict:
    """Generate investigation outcome enriched by real threat data."""
    if action >= 5:
        return {}

    base = {
        "entities_found": int(rng.poisson(3)),
        "relationships_found": int(rng.poisson(2)),
        "anomalies_found": int(rng.binomial(1, 0.3)),
        "risk_score": float(np.clip(rng.normal(0.4, 0.2), 0.0, 1.0)),
        "time_taken": float(np.clip(rng.exponential(2.0), 0.5, 10.0)),
    }

    # Enrich from real scenario data
    if scenario is not None:
        num_indicators = len(getattr(scenario, "indicators", []))
        real_risk = getattr(scenario, "risk_score", 0.5)

        if action == 0:  # OSINT
            base["entities_found"] += min(num_indicators, 8)
            base["risk_score"] = max(base["risk_score"], real_risk * 0.8)
        elif action == 1:  # CRYPTO
            base["anomalies_found"] += int(rng.binomial(2, real_risk))
        elif action == 2:  # DETECTION
            base["risk_score"] = float(np.clip(base["risk_score"] + real_risk * 0.3, 0, 1))
        elif action == 3:  # GRAPH
            base["relationships_found"] += int(num_indicators * 0.5)
        elif action == 4:  # REASONING
            base["anomalies_found"] += int(rng.binomial(1, real_risk))

    return base


def _train_gnn(
    graph_data,
    params: dict,
    checkpoint_dir: Path,
    prev_checkpoint: Path | None = None,
) -> dict:
    """Train GNN on graph data (incremental)."""
    import importlib.util
    import torch

    _GRAPH_DIR = BACKEND / "graph_ai"

    # Load models directly to avoid __init__.py issues
    _models_spec = importlib.util.spec_from_file_location(
        "graph_ai.models", _GRAPH_DIR / "models.py"
    )
    _models = importlib.util.module_from_spec(_models_spec)
    _models_spec.loader.exec_module(_models)

    _trainer_spec = importlib.util.spec_from_file_location(
        "graph_ai.trainer", _GRAPH_DIR / "trainer.py",
        submodule_search_locations=[],
    )
    sys.modules["graph_ai.models"] = _models
    _trainer_mod = importlib.util.module_from_spec(_trainer_spec)
    _trainer_spec.loader.exec_module(_trainer_mod)

    GNNTrainer = _trainer_mod.GNNTrainer
    GraphClassifier = _models.GraphClassifier

    feature_dim = graph_data.node_features.shape[1]

    # Link prediction
    trainer = GNNTrainer(
        in_features=feature_dim,
        hidden_dim=64,
        embedding_dim=32,
        learning_rate=params.get("lr", 0.005),
    )

    # Load previous weights if available
    if prev_checkpoint and (prev_checkpoint / "gnn_link_predictor.pt").exists():
        try:
            ckpt = torch.load(prev_checkpoint / "gnn_link_predictor.pt", weights_only=True)
            if ckpt.get("in_features") == feature_dim:
                trainer.encoder.load_state_dict(ckpt["encoder_state_dict"])
                trainer.link_predictor.load_state_dict(ckpt["link_predictor_state_dict"])
                logger.info("gnn_link_checkpoint_loaded")
        except Exception as e:
            logger.warning("gnn_checkpoint_load_failed", error=str(e))

    link_metrics = trainer.train_link_prediction(
        node_features=graph_data.node_features,
        edge_index=graph_data.edge_index,
        num_epochs=params.get("num_epochs_link", 200),
    )

    # Node classification
    num_classes = int(graph_data.node_labels.max()) + 1
    classifier = GraphClassifier(in_channels=feature_dim, hidden_channels=64, num_classes=num_classes)

    if prev_checkpoint and (prev_checkpoint / "gnn_classifier.pt").exists():
        try:
            ckpt = torch.load(prev_checkpoint / "gnn_classifier.pt", weights_only=True)
            if ckpt.get("in_channels") == feature_dim and ckpt.get("num_classes") == num_classes:
                classifier.load_state_dict(ckpt["classifier_state_dict"])
                logger.info("gnn_classifier_checkpoint_loaded")
        except Exception as e:
            logger.warning("gnn_clf_checkpoint_load_failed", error=str(e))

    clf_optimizer = torch.optim.Adam(
        classifier.parameters(),
        lr=0.01,
        weight_decay=params.get("weight_decay", 1e-3),
    )

    x = torch.FloatTensor(graph_data.node_features)
    edge_idx = torch.LongTensor(graph_data.edge_index)
    labels = torch.LongTensor(graph_data.node_labels)

    num_train = int(0.8 * len(labels))
    train_mask = torch.zeros(len(labels), dtype=torch.bool)
    train_mask[:num_train] = True
    test_mask = ~train_mask

    classifier.train()
    for epoch in range(1, params.get("num_epochs_classify", 150) + 1):
        clf_optimizer.zero_grad()
        logits = classifier(x, edge_idx)
        loss = torch.nn.functional.cross_entropy(logits[train_mask], labels[train_mask])
        loss.backward()
        clf_optimizer.step()

    classifier.eval()
    with torch.no_grad():
        logits = classifier(x, edge_idx)
        preds = logits.argmax(dim=-1)
        train_acc = float((preds[train_mask] == labels[train_mask]).float().mean())
        test_acc = float((preds[test_mask] == labels[test_mask]).float().mean()) if test_mask.sum() > 0 else 0.0

    # Save
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    torch.save({
        "encoder_state_dict": trainer.encoder.state_dict(),
        "link_predictor_state_dict": trainer.link_predictor.state_dict(),
        "in_features": feature_dim,
        "hidden_dim": 64,
        "embedding_dim": 32,
        "epochs_trained": params.get("num_epochs_link", 200),
        "final_loss": link_metrics["final_loss"],
    }, checkpoint_dir / "gnn_link_predictor.pt")

    torch.save({
        "classifier_state_dict": classifier.state_dict(),
        "in_channels": feature_dim,
        "hidden_channels": 64,
        "num_classes": num_classes,
        "epochs_trained": params.get("num_epochs_classify", 150),
        "train_acc": train_acc,
        "test_acc": test_acc,
    }, checkpoint_dir / "gnn_classifier.pt")

    metrics = {
        "link_final_loss": link_metrics["final_loss"],
        "train_accuracy": train_acc,
        "test_accuracy": test_acc,
        "graph_nodes": graph_data.node_features.shape[0],
        "graph_edges": int(graph_data.edge_index.shape[1]) if graph_data.edge_index.size else 0,
    }
    # Write metrics in the format expected by test_trained_models.py
    metrics_file = {
        "link_prediction": {
            "epochs": params.get("num_epochs_link", 200),
            "final_loss": link_metrics["final_loss"],
        },
        "node_classification": {
            "epochs": params.get("num_epochs_classify", 150),
            "train_accuracy": train_acc,
            "test_accuracy": test_acc,
        },
        "graph_stats": {
            "nodes": graph_data.node_features.shape[0],
            "edges": int(graph_data.edge_index.shape[1]) if graph_data.edge_index.size else 0,
            "feature_dim": feature_dim,
        },
    }
    with open(checkpoint_dir / "gnn_training_metrics.json", "w") as f:
        json.dump(metrics_file, f, indent=2, default=str)

    logger.info("gnn_training_complete", **{k: round(v, 4) if isinstance(v, float) else v for k, v in metrics.items()})
    return metrics


def _train_decision_engine(
    scenarios: list[dict],
    params: dict,
    checkpoint_dir: Path,
) -> dict:
    """Train decision engine calibration on enriched scenarios."""
    from main_decision_engine import DecisionEngine
    # Import CalibrationModel and _extract_features from the existing train module
    de_train_path = DECISION_DIR / "train.py"
    import importlib.util
    spec = importlib.util.spec_from_file_location("de_train", de_train_path)
    de_train = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(de_train)
    CalibrationModel = de_train.CalibrationModel
    _extract_features = de_train._extract_features

    engine = DecisionEngine(seed=int(time.time()) % 2**31)

    features_list = []
    targets = []
    for sc in scenarios:
        decision = engine.decide(sc["text"])
        feat = _extract_features(decision)
        features_list.append(feat)
        targets.append(sc["ground_truth_quality"])

    X = np.array(features_list)
    y = np.array(targets)

    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = CalibrationModel()
    train_metrics = model.fit(X_train, y_train, alpha=params.get("alpha", 0.1))

    test_preds = model.predict(X_test)
    test_mse = float(np.mean((test_preds - y_test) ** 2))
    test_mae = float(np.mean(np.abs(test_preds - y_test)))

    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    with open(checkpoint_dir / "calibration_model.json", "w") as f:
        json.dump(model.to_dict(), f, indent=2)
    with open(checkpoint_dir / "training_scenarios.json", "w") as f:
        json.dump(scenarios, f, indent=2)

    metrics = {
        "num_scenarios": len(scenarios),
        "train_mse": train_metrics["mse"],
        "train_mae": train_metrics["mae"],
        "test_mse": test_mse,
        "test_mae": test_mae,
    }
    # Write metrics in the format expected by test_trained_models.py
    metrics_file = {
        "num_scenarios": len(scenarios),
        "train_size": split,
        "test_size": len(X) - split,
        "feature_dim": int(X.shape[1]),
        "train_metrics": train_metrics,
        "test_metrics": {"mse": test_mse, "mae": test_mae},
    }
    with open(checkpoint_dir / "decision_training_metrics.json", "w") as f:
        json.dump(metrics_file, f, indent=2)

    logger.info("de_training_complete", **{k: round(v, 4) if isinstance(v, float) else v for k, v in metrics.items()})
    return metrics


# ═════════════════════════════════════════════════════════════════════
# Checkpoint promotion with improvement gating
# ═════════════════════════════════════════════════════════════════════

def _should_promote(current: dict, previous: dict | None, component: str) -> bool:
    """Decide if new checkpoint should replace the previous one."""
    if previous is None:
        return True

    if component == "rl":
        cur_reward = current.get("final_avg_reward", 0)
        prev_reward = previous.get("final_avg_reward", 0)
        return cur_reward >= prev_reward * 0.95  # Allow 5% regression tolerance

    if component == "gnn":
        cur_loss = current.get("link_final_loss", 999)
        prev_loss = previous.get("link_final_loss", 999)
        return cur_loss <= prev_loss * 1.05  # Allow 5% regression

    if component == "decision":
        cur_mse = current.get("test_mse", 999)
        prev_mse = previous.get("test_mse", 999)
        return cur_mse <= prev_mse * 1.05

    return True


def _promote_checkpoint(staging_dir: Path, production_dir: Path, component: str):
    """Copy staging checkpoint to production."""
    import shutil
    production_dir.mkdir(parents=True, exist_ok=True)

    for item in staging_dir.iterdir():
        if item.is_file():
            dest = production_dir / item.name
            shutil.copy2(item, dest)

    logger.info("checkpoint_promoted", component=component, src=str(staging_dir), dst=str(production_dir))


# ═════════════════════════════════════════════════════════════════════
# Main continuous training loop
# ═════════════════════════════════════════════════════════════════════

def run_continuous_training(
    rounds: int = 3,
    component: str | None = None,
    offline: bool = False,
) -> dict:
    """Run multiple rounds of continuous training with self-enhancement."""
    from data_fetchers import (
        fetch_all_rl_data,
        generate_synthetic_threats,
        build_graph_from_threats,
        generate_advanced_scenarios,
    )
    from knowledge_engine import (
        load_all_knowledge,
        build_knowledge_graph,
        generate_cross_domain_scenarios,
        generate_knowledge_rl_scenarios,
    )

    scheduler = HyperparamScheduler()
    round_results: list[dict] = []

    # Production checkpoint dirs (where deployed models live)
    rl_prod_dir = BACKEND / "checkpoints"
    gnn_prod_dir = BACKEND / "checkpoints"
    de_prod_dir = DECISION_DIR / "checkpoints"

    # Load previous metrics for improvement gating
    prev_rl_metrics = _load_metrics(rl_prod_dir / "rl_training_metrics.json")
    prev_gnn_metrics = _load_metrics(gnn_prod_dir / "gnn_training_metrics.json")
    prev_de_metrics = _load_metrics(de_prod_dir / "decision_training_metrics.json")

    # ── Load universal knowledge corpus once ──────────────────────────
    logger.info("loading_knowledge_corpus")
    knowledge_corpus = load_all_knowledge()
    logger.info("knowledge_corpus_loaded",
                total_items=len(knowledge_corpus.items),
                domains=list(knowledge_corpus.domain_counts.keys()))

    for round_num in range(1, rounds + 1):
        logger.info("round_start", round=round_num, total=rounds)
        t0 = time.time()
        round_metrics: dict[str, Any] = {"round": round_num}

        # ── 1. Fetch fresh data ───────────────────────────────────────
        logger.info("fetching_data", offline=offline)
        if offline:
            threat_scenarios = generate_synthetic_threats(n=150, seed=round_num * 42)
        else:
            threat_scenarios = fetch_all_rl_data()
            if not threat_scenarios:
                logger.warning("network_fetch_empty_fallback_to_synthetic")
                threat_scenarios = generate_synthetic_threats(n=150, seed=round_num * 42)

        # Build GNN graph from threat data + knowledge graph
        threat_graph = build_graph_from_threats(threat_scenarios)

        # Build cross-domain knowledge graph and merge
        if component is None or component in ("gnn", "knowledge"):
            kg = build_knowledge_graph(knowledge_corpus, feature_dim=threat_graph.node_features.shape[1])
            graph_data = _merge_graphs(threat_graph, kg)
        else:
            graph_data = threat_graph

        # Generate decision engine scenarios (original + cross-domain)
        de_count = scheduler.get_de_params(round_num)["num_scenarios"]
        de_scenarios = generate_advanced_scenarios(
            n=de_count // 2,
            seed=round_num * 17,
        )
        # Add cross-domain knowledge scenarios
        cross_scenarios = generate_cross_domain_scenarios(
            knowledge_corpus,
            n=de_count // 2,
            seed=round_num * 23,
        )
        de_scenarios.extend(cross_scenarios)

        # ── 2. Train each component ──────────────────────────────────
        # Staging dir for this round
        staging = REPO_ROOT / "checkpoints_staging" / f"round_{round_num}"

        if component is None or component == "rl":
            rl_staging = staging / "rl"
            rl_params = scheduler.get_rl_params(round_num)
            rl_metrics = _train_rl(
                scenarios=threat_scenarios,
                params=rl_params,
                checkpoint_dir=rl_staging,
                prev_checkpoint=rl_prod_dir / "rl_policy.pt",
            )
            round_metrics["rl"] = rl_metrics

            if _should_promote(rl_metrics, prev_rl_metrics, "rl"):
                _promote_checkpoint(rl_staging, rl_prod_dir, "rl")
                prev_rl_metrics = rl_metrics
                logger.info("rl_promoted", reward=rl_metrics.get("final_avg_reward"))
            else:
                logger.warning("rl_not_promoted", reason="regression")

        if component is None or component in ("gnn", "knowledge"):
            gnn_staging = staging / "gnn"
            gnn_params = scheduler.get_gnn_params(round_num)
            gnn_metrics = _train_gnn(
                graph_data=graph_data,
                params=gnn_params,
                checkpoint_dir=gnn_staging,
                prev_checkpoint=gnn_prod_dir,
            )
            round_metrics["gnn"] = gnn_metrics

            if _should_promote(gnn_metrics, prev_gnn_metrics, "gnn"):
                _promote_checkpoint(gnn_staging, gnn_prod_dir, "gnn")
                prev_gnn_metrics = gnn_metrics
                logger.info("gnn_promoted", loss=gnn_metrics.get("link_final_loss"))
            else:
                logger.warning("gnn_not_promoted", reason="regression")

        if component is None or component in ("decision", "knowledge"):
            de_staging = staging / "decision"
            de_params = scheduler.get_de_params(round_num)
            de_metrics = _train_decision_engine(
                scenarios=de_scenarios,
                params=de_params,
                checkpoint_dir=de_staging,
            )
            round_metrics["decision"] = de_metrics

            if _should_promote(de_metrics, prev_de_metrics, "decision"):
                _promote_checkpoint(de_staging, de_prod_dir, "decision")
                prev_de_metrics = de_metrics
                logger.info("de_promoted", mse=de_metrics.get("test_mse"))
            else:
                logger.warning("de_not_promoted", reason="regression")

        # ── 3. Record for self-enhancement ────────────────────────────
        elapsed = time.time() - t0
        round_metrics["elapsed_seconds"] = round(elapsed, 1)
        scheduler.record(round_metrics)
        round_results.append(round_metrics)

        logger.info("round_complete", round=round_num, elapsed=f"{elapsed:.1f}s")

    # ── Final summary ─────────────────────────────────────────────────
    summary = {
        "total_rounds": rounds,
        "rounds": round_results,
        "knowledge_domains": list(knowledge_corpus.domain_counts.keys()),
        "knowledge_items_total": len(knowledge_corpus.items),
        "knowledge_domain_counts": knowledge_corpus.domain_counts,
        "final_metrics": {
            "rl": prev_rl_metrics,
            "gnn": prev_gnn_metrics,
            "decision": prev_de_metrics,
        },
    }

    summary_path = REPO_ROOT / "training_summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    logger.info("training_summary_saved", path=str(summary_path))

    # Clean up staging dirs
    staging_root = REPO_ROOT / "checkpoints_staging"
    if staging_root.exists():
        import shutil
        shutil.rmtree(staging_root, ignore_errors=True)

    return summary


def _load_metrics(path: Path) -> dict | None:
    """Load metrics JSON, returning None if not found."""
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


# ═════════════════════════════════════════════════════════════════════
# CLI
# ═════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Continuous AI Training Pipeline")
    parser.add_argument("--rounds", type=int, default=3, help="Number of training rounds")
    parser.add_argument("--component", choices=["rl", "gnn", "decision", "knowledge"],
                        help="Train specific component only (knowledge = cross-domain GNN+DE)")
    parser.add_argument("--offline", action="store_true", help="Use synthetic data only (no network)")
    args = parser.parse_args()

    result = run_continuous_training(
        rounds=args.rounds,
        component=args.component,
        offline=args.offline,
    )

    print(f"\n{'='*60}")
    print("  CONTINUOUS TRAINING COMPLETE")
    print(f"{'='*60}")

    # Show knowledge domains loaded
    kd = result.get("knowledge_domains", [])
    ki = result.get("knowledge_items_total", 0)
    if kd:
        print(f"\n  Knowledge domains loaded: {', '.join(kd)}")
        print(f"  Total knowledge items:    {ki}")

    for r in result["rounds"]:
        print(f"\n  Round {r['round']} ({r['elapsed_seconds']}s):")
        if "rl" in r:
            print(f"    RL:  avg_reward={r['rl'].get('final_avg_reward', 'N/A'):.4f}")
        if "gnn" in r:
            print(f"    GNN: link_loss={r['gnn'].get('link_final_loss', 'N/A'):.4f}  "
                  f"train_acc={r['gnn'].get('train_accuracy', 'N/A'):.4f}")
        if "decision" in r:
            print(f"    DE:  test_mse={r['decision'].get('test_mse', 'N/A'):.4f}")


if __name__ == "__main__":
    main()
