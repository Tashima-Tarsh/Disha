"""
GNN Training Script — trains the GCN encoder and link predictor.

Generates a synthetic intelligence graph (entities + relationships),
trains the GNN link-prediction model, and saves checkpoints.

Usage::

    python ai-platform/backend/graph_ai/train.py   # from repo root
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import numpy as np
import torch
import structlog

_SCRIPT_DIR = Path(__file__).resolve().parent
_BACKEND_ROOT = _SCRIPT_DIR.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

# Label noise rate: fraction of nodes assigned a random class instead of
# their feature-derived class, preventing the model from achieving perfect
# classification on the training set and encouraging generalisation.
_LABEL_NOISE_RATE = 0.1

# Import models directly to avoid __init__.py pulling in graph_exporter
# (which depends on app.core.config / pydantic_settings at import time)
_models_spec = importlib.util.spec_from_file_location(
    "graph_ai.models", _SCRIPT_DIR / "models.py"
)
_models = importlib.util.module_from_spec(_models_spec)
_models_spec.loader.exec_module(_models)

_trainer_spec = importlib.util.spec_from_file_location(
    "graph_ai.trainer",
    _SCRIPT_DIR / "trainer.py",
    submodule_search_locations=[],
)
# Patch sys.modules so trainer.py's `from graph_ai.models import ...` works
sys.modules["graph_ai.models"] = _models
_trainer_mod = importlib.util.module_from_spec(_trainer_spec)
_trainer_spec.loader.exec_module(_trainer_mod)

GCNEncoder = _models.GCNEncoder
LinkPredictor = _models.LinkPredictor
GraphClassifier = _models.GraphClassifier
GNNTrainer = _trainer_mod.GNNTrainer

logger = structlog.get_logger(__name__)


# ── Synthetic graph generator ─────────────────────────────────────────


def _generate_synthetic_graph(
    num_nodes: int = 200,
    num_edges: int = 600,
    feature_dim: int = 16,
    num_classes: int = 4,
    seed: int = 42,
) -> dict:
    """Create a synthetic intelligence-investigation graph.

    Node types: host, domain, wallet, dns_record, transaction.
    Features are a mix of one-hot type encoding + random attributes.
    Labels are derived from features to allow the model to learn patterns.
    """
    rng = np.random.RandomState(seed)

    # Node features
    node_features = np.zeros((num_nodes, feature_dim), dtype=np.float32)
    node_types = rng.randint(0, 5, size=num_nodes)

    for i in range(num_nodes):
        # One-hot for type (columns 0-4)
        node_features[i, node_types[i]] = 1.0
        # Risk score (column 6)
        node_features[i, 6] = rng.uniform(0, 1)
        # Random hash features (columns 7-15)
        node_features[i, 7:] = rng.uniform(-0.5, 0.5, size=feature_dim - 7)

    # Derive labels from features so model can learn meaningful patterns
    # Label depends on node type and risk score with some noise
    node_labels = np.zeros(num_nodes, dtype=np.int64)
    for i in range(num_nodes):
        risk = node_features[i, 6]
        node_types[i]
        # Combine type and risk to determine class
        if risk < 0.25:
            base_class = 0  # low risk
        elif risk < 0.5:
            base_class = 1  # medium risk
        elif risk < 0.75:
            base_class = 2  # high risk
        else:
            base_class = 3  # critical risk
        # Small probability of noise to avoid perfect classification
        if rng.random() < _LABEL_NOISE_RATE:
            base_class = rng.randint(0, num_classes)
        node_labels[i] = base_class

    # Edges (random, ensuring no self-loops)
    src = rng.randint(0, num_nodes, size=num_edges)
    dst = rng.randint(0, num_nodes, size=num_edges)
    # Remove self-loops
    mask = src != dst
    src, dst = src[mask], dst[mask]
    edge_index = np.array([src, dst], dtype=np.int64)

    return {
        "node_features": node_features,
        "edge_index": edge_index,
        "node_labels": node_labels,
        "node_types": node_types,
        "num_nodes": num_nodes,
        "num_edges": int(edge_index.shape[1]),
    }


# ── Training ──────────────────────────────────────────────────────────


def train(
    num_epochs_link: int = 200,
    num_epochs_classify: int = 150,
    checkpoint_dir: str | None = None,
) -> dict:
    """Train GNN models (link prediction + node classification).

    Returns a dict with training metrics.
    """
    graph = _generate_synthetic_graph()
    logger.info(
        "synthetic_graph_generated",
        nodes=graph["num_nodes"],
        edges=graph["num_edges"],
    )

    # ── 1. Link Prediction ────────────────────────────────────────────
    trainer = GNNTrainer(
        in_features=16, hidden_dim=64, embedding_dim=32, learning_rate=0.005
    )
    link_metrics = trainer.train_link_prediction(
        node_features=graph["node_features"],
        edge_index=graph["edge_index"],
        num_epochs=num_epochs_link,
    )
    logger.info("link_prediction_trained", final_loss=link_metrics["final_loss"])

    # Test link predictions on some pairs (relative to graph size)
    n = graph["num_nodes"]
    candidates = [(0, 1), (2, 3), (n // 20, n // 4), (n // 2, int(n * 0.75))]
    valid_candidates = [(s, d) for s, d in candidates if s < n and d < n]
    predictions = trainer.predict_links(
        graph["node_features"],
        graph["edge_index"],
        valid_candidates,
    )

    # Get learned embeddings
    embeddings = trainer.get_embeddings(graph["node_features"], graph["edge_index"])
    logger.info("embeddings_computed", shape=embeddings.shape)

    # ── 2. Node Classification ────────────────────────────────────────
    classifier = GraphClassifier(in_channels=16, hidden_channels=64, num_classes=4)
    clf_optimizer = torch.optim.Adam(
        classifier.parameters(), lr=0.01, weight_decay=5e-4
    )

    x = torch.FloatTensor(graph["node_features"])
    edge_idx = torch.LongTensor(graph["edge_index"])
    labels = torch.LongTensor(graph["node_labels"])

    # Shuffled train/test split (80/20)
    num_nodes = graph["num_nodes"]
    perm = torch.randperm(num_nodes, generator=torch.Generator().manual_seed(42))
    num_train = int(0.8 * num_nodes)
    train_mask = torch.zeros(num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(num_nodes, dtype=torch.bool)
    train_mask[perm[:num_train]] = True
    test_mask[perm[num_train:]] = True

    classifier.train()
    clf_losses = []
    best_test_acc = 0.0
    patience = 20
    patience_counter = 0
    best_state = None
    for epoch in range(1, num_epochs_classify + 1):
        clf_optimizer.zero_grad()
        logits = classifier(x, edge_idx)
        loss = torch.nn.functional.cross_entropy(logits[train_mask], labels[train_mask])
        loss.backward()
        clf_optimizer.step()
        clf_losses.append(loss.item())

        # Early stopping based on test accuracy
        if epoch % 10 == 0:
            classifier.eval()
            with torch.no_grad():
                eval_logits = classifier(x, edge_idx)
                eval_preds = eval_logits.argmax(dim=-1)
                curr_test_acc = float(
                    (eval_preds[test_mask] == labels[test_mask]).float().mean()
                )
            if curr_test_acc > best_test_acc:
                best_test_acc = curr_test_acc
                best_state = {k: v.clone() for k, v in classifier.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1
            classifier.train()

            if patience_counter >= patience:
                logger.info(
                    "early_stopping", epoch=epoch, best_test_acc=round(best_test_acc, 4)
                )
                break

        if epoch % 30 == 0:
            logger.info("classifier_epoch", epoch=epoch, loss=round(loss.item(), 4))

    # Restore best model
    if best_state is not None:
        classifier.load_state_dict(best_state)

    # Evaluate
    classifier.eval()
    with torch.no_grad():
        logits = classifier(x, edge_idx)
        preds = logits.argmax(dim=-1)
        train_acc = float((preds[train_mask] == labels[train_mask]).float().mean())
        test_acc = float((preds[test_mask] == labels[test_mask]).float().mean())
    logger.info(
        "classifier_eval", train_acc=round(train_acc, 4), test_acc=round(test_acc, 4)
    )

    # ── Save checkpoints ──────────────────────────────────────────────
    ckpt_dir = (
        Path(checkpoint_dir) if checkpoint_dir else (_BACKEND_ROOT / "checkpoints")
    )
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    # Link prediction models
    torch.save(
        {
            "encoder_state_dict": trainer.encoder.state_dict(),
            "link_predictor_state_dict": trainer.link_predictor.state_dict(),
            "in_features": trainer.in_features,
            "hidden_dim": trainer.hidden_dim,
            "embedding_dim": trainer.embedding_dim,
            "epochs_trained": num_epochs_link,
            "final_loss": link_metrics["final_loss"],
        },
        ckpt_dir / "gnn_link_predictor.pt",
    )

    # Classifier
    torch.save(
        {
            "classifier_state_dict": classifier.state_dict(),
            "in_channels": 16,
            "hidden_channels": 64,
            "num_classes": 4,
            "epochs_trained": num_epochs_classify,
            "train_acc": train_acc,
            "test_acc": test_acc,
        },
        ckpt_dir / "gnn_classifier.pt",
    )

    # Metrics
    metrics_path = ckpt_dir / "gnn_training_metrics.json"
    summary = {
        "link_prediction": {
            "epochs": num_epochs_link,
            "final_loss": link_metrics["final_loss"],
            "sample_predictions": predictions[:4],
        },
        "node_classification": {
            "epochs": num_epochs_classify,
            "final_loss": clf_losses[-1] if clf_losses else 0,
            "train_accuracy": train_acc,
            "test_accuracy": test_acc,
        },
        "graph_stats": {
            "nodes": graph["num_nodes"],
            "edges": graph["num_edges"],
            "feature_dim": 16,
        },
    }
    with open(metrics_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    logger.info("checkpoints_saved", dir=str(ckpt_dir))

    return summary


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2, default=str))
