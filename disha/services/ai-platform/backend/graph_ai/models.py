"""Graph Neural Network models for entity intelligence."""


import torch
import torch.nn.functional as F
from torch import nn


class GCNEncoder(nn.Module):
    """Graph Convolutional Network encoder for node embeddings."""

    def __init__(self, in_channels: int, hidden_channels: int, out_channels: int, dropout: float = 0.5):
        super().__init__()
        try:
            from torch_geometric.nn import GCNConv
            self.conv1 = GCNConv(in_channels, hidden_channels)
            self.conv2 = GCNConv(hidden_channels, out_channels)
        except ImportError:
            # Fallback to simple linear layers if torch_geometric not available
            self.conv1 = nn.Linear(in_channels, hidden_channels)
            self.conv2 = nn.Linear(hidden_channels, out_channels)
        self.bn1 = nn.BatchNorm1d(hidden_channels)
        self.dropout = dropout
        self._use_geometric = self._check_geometric()

    def _check_geometric(self) -> bool:
        """Check if torch_geometric is available."""
        try:
            from torch_geometric.nn import GCNConv
            return isinstance(self.conv1, GCNConv)
        except ImportError:
            return False

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor | None = None) -> torch.Tensor:
        """Forward pass through GCN layers."""
        if self._use_geometric:
            if edge_index is None:
                # Default to self-loops if no edges provided
                num_nodes = x.size(0)
                edge_index = torch.arange(num_nodes, device=x.device).unsqueeze(0).repeat(2, 1)

            x = self.conv1(x, edge_index)
            x = self.bn1(x)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
            x = self.conv2(x, edge_index)
        else:
            x = self.conv1(x)
            x = self.bn1(x)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
            x = self.conv2(x)
        return x


class LinkPredictor(nn.Module):
    """Link prediction model using node embeddings."""

    def __init__(self, embedding_dim: int, hidden_dim: int = 64):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(embedding_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),
        )

    def forward(self, z_src: torch.Tensor, z_dst: torch.Tensor) -> torch.Tensor:
        """Predict link probability between source and destination nodes."""
        combined = torch.cat([z_src, z_dst], dim=-1)
        return self.network(combined).squeeze(-1)


class GraphClassifier(nn.Module):
    """Node classification model for entity risk scoring."""

    def __init__(self, in_channels: int, hidden_channels: int = 64, num_classes: int = 4):
        super().__init__()
        self.encoder = GCNEncoder(in_channels, hidden_channels, hidden_channels, dropout=0.5)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels // 2),
            nn.BatchNorm1d(hidden_channels // 2),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(hidden_channels // 2, num_classes),
        )

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor | None = None) -> torch.Tensor:
        """Classify nodes in the graph."""
        embeddings = self.encoder(x, edge_index)
        return self.classifier(embeddings)
