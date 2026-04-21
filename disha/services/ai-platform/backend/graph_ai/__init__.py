"""Graph AI module for GNN-based entity intelligence."""

from graph_ai.models import GCNEncoder, LinkPredictor, GraphClassifier
from graph_ai.trainer import GNNTrainer


def __getattr__(name: str):
    """Lazy import for GraphExporter (requires pydantic_settings)."""
    if name == "GraphExporter":
        from graph_ai.graph_exporter import GraphExporter

        return GraphExporter
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "GCNEncoder",
    "LinkPredictor",
    "GraphClassifier",
    "GNNTrainer",
    "GraphExporter",
]
