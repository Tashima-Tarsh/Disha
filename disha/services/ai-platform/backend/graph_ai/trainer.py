"""Training utilities for Graph Neural Networks."""

from typing import Any

import numpy as np
import torch
from torch import optim

import structlog

from graph_ai.models import GCNEncoder, LinkPredictor

logger = structlog.get_logger(__name__)


class GNNTrainer:
    """Trainer for Graph Neural Network models."""

    def __init__(
        self,
        in_features: int = 16,
        hidden_dim: int = 64,
        embedding_dim: int = 32,
        learning_rate: float = 0.01,
    ):
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.embedding_dim = embedding_dim
        self.learning_rate = learning_rate

        self.encoder = GCNEncoder(in_features, hidden_dim, embedding_dim)
        self.link_predictor = LinkPredictor(embedding_dim)

        self.encoder_optimizer = optim.Adam(self.encoder.parameters(), lr=learning_rate)
        self.predictor_optimizer = optim.Adam(self.link_predictor.parameters(), lr=learning_rate)

    def train_link_prediction(
        self,
        node_features: np.ndarray,
        edge_index: np.ndarray,
        num_epochs: int = 100,
    ) -> dict[str, Any]:
        """Train the link prediction model."""
        x = torch.FloatTensor(node_features)
        edges = torch.LongTensor(edge_index)

        self.encoder.train()
        self.link_predictor.train()

        losses = []
        for epoch in range(num_epochs):
            self.encoder_optimizer.zero_grad()
            self.predictor_optimizer.zero_grad()

            # Get node embeddings
            z = self.encoder(x, edges)

            # Positive edges
            src, dst = edges[0], edges[1]
            pos_pred = self.link_predictor(z[src], z[dst])
            pos_loss = -torch.log(pos_pred + 1e-15).mean()

            # Negative sampling — ensure negatives differ from actual destinations
            neg_dst = torch.randint(0, x.size(0), (src.size(0),))
            # Re-sample any negative that accidentally equals the true destination
            collisions = neg_dst == dst
            max_retries = 10
            retry = 0
            while collisions.any() and retry < max_retries:
                neg_dst[collisions] = torch.randint(0, x.size(0), (collisions.sum(),))
                collisions = neg_dst == dst
                retry += 1
            neg_pred = self.link_predictor(z[src], z[neg_dst])
            neg_loss = -torch.log(1 - neg_pred + 1e-15).mean()

            loss = pos_loss + neg_loss
            loss.backward()

            self.encoder_optimizer.step()
            self.predictor_optimizer.step()

            losses.append(loss.item())

            if (epoch + 1) % 20 == 0:
                logger.info("training_epoch", epoch=epoch + 1, loss=loss.item())

        return {
            "final_loss": losses[-1] if losses else 0,
            "epochs": num_epochs,
            "loss_history": losses,
        }

    def predict_links(
        self,
        node_features: np.ndarray,
        edge_index: np.ndarray,
        candidate_pairs: list[tuple[int, int]],
    ) -> list[dict[str, Any]]:
        """Predict link probabilities for candidate node pairs."""
        self.encoder.eval()
        self.link_predictor.eval()

        x = torch.FloatTensor(node_features)
        edges = torch.LongTensor(edge_index)

        with torch.no_grad():
            z = self.encoder(x, edges)

            predictions = []
            for src_idx, dst_idx in candidate_pairs:
                if src_idx < z.size(0) and dst_idx < z.size(0):
                    prob = self.link_predictor(
                        z[src_idx].unsqueeze(0),
                        z[dst_idx].unsqueeze(0),
                    )
                    predictions.append({
                        "source": src_idx,
                        "target": dst_idx,
                        "probability": float(prob.item()),
                    })

        return sorted(predictions, key=lambda p: p["probability"], reverse=True)

    def get_embeddings(self, node_features: np.ndarray, edge_index: np.ndarray) -> np.ndarray:
        """Get node embeddings from the trained encoder."""
        self.encoder.eval()
        x = torch.FloatTensor(node_features)
        edges = torch.LongTensor(edge_index)

        with torch.no_grad():
            z = self.encoder(x, edges)
        return z.numpy()
