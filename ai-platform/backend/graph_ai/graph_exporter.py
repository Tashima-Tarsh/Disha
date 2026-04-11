"""Export graph data from Neo4j for GNN training."""

from typing import Any

import numpy as np
import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class GraphExporter:
    """Exports graph data from Neo4j into tensors for GNN training."""

    def __init__(self):
        self.settings = get_settings()
        self._driver = None

    def _get_driver(self):
        """Get or create Neo4j driver."""
        if self._driver is None:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(
                self.settings.NEO4J_URI,
                auth=(self.settings.NEO4J_USER, self.settings.NEO4J_PASSWORD),
            )
        return self._driver

    def export_graph(self) -> dict[str, Any]:
        """Export the full knowledge graph as node features and edge indices."""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                # Get all entities
                nodes_result = session.run(
                    """
                    MATCH (e:Entity)
                    RETURN e.id AS id, e.label AS label, e.entity_type AS type,
                           e.risk_score AS risk_score
                    ORDER BY e.id
                    """
                )
                nodes = [dict(record) for record in nodes_result]

                if not nodes:
                    return {"node_features": np.zeros((0, 16)), "edge_index": np.zeros((2, 0), dtype=int), "node_ids": [], "node_map": {}}

                # Create node ID mapping
                node_map = {node["id"]: i for i, node in enumerate(nodes)}

                # Get all relationships
                edges_result = session.run(
                    """
                    MATCH (a:Entity)-[r]->(b:Entity)
                    RETURN a.id AS source, b.id AS target, type(r) AS rel_type
                    """
                )
                edges = [dict(record) for record in edges_result]

            # Build feature matrix
            node_features = self._build_features(nodes)

            # Build edge index
            edge_index = self._build_edge_index(edges, node_map)

            logger.info("graph_exported", num_nodes=len(nodes), num_edges=edge_index.shape[1])

            return {
                "node_features": node_features,
                "edge_index": edge_index,
                "node_ids": [n["id"] for n in nodes],
                "node_map": node_map,
                "nodes": nodes,
            }

        except Exception as e:
            logger.error("graph_export_failed", error=str(e))
            return {"node_features": np.zeros((0, 16)), "edge_index": np.zeros((2, 0), dtype=int), "node_ids": [], "node_map": {}}

    def _build_features(self, nodes: list[dict[str, Any]], feature_dim: int = 16) -> np.ndarray:
        """Build node feature matrix from entity properties."""
        features = np.zeros((len(nodes), feature_dim))

        # Entity type encoding
        type_map = {"host": 0, "domain": 1, "wallet": 2, "dns_record": 3, "transaction": 4}

        for i, node in enumerate(nodes):
            # One-hot encode entity type
            type_idx = type_map.get(node.get("type", ""), 5)
            if type_idx < feature_dim:
                features[i, type_idx] = 1.0

            # Risk score
            features[i, 6] = node.get("risk_score", 0.0) or 0.0

            # Hash-based features from label
            label = node.get("label", "")
            if label:
                hash_val = hash(label) % (2**31)
                for j in range(7, min(feature_dim, 16)):
                    features[i, j] = ((hash_val >> (j - 7)) & 1) * 0.5

        return features

    def _build_edge_index(self, edges: list[dict[str, Any]], node_map: dict[str, int]) -> np.ndarray:
        """Build edge index tensor from relationships."""
        if not edges:
            return np.zeros((2, 0), dtype=int)

        src_indices = []
        dst_indices = []

        for edge in edges:
            src = node_map.get(edge["source"])
            dst = node_map.get(edge["target"])
            if src is not None and dst is not None:
                src_indices.append(src)
                dst_indices.append(dst)

        if not src_indices:
            return np.zeros((2, 0), dtype=int)

        return np.array([src_indices, dst_indices], dtype=int)

    def close(self):
        """Close the Neo4j driver."""
        if self._driver:
            self._driver.close()
            self._driver = None
