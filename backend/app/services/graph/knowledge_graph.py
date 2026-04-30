"""Knowledge Graph service for entity and relationship management."""

from typing import Any

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class KnowledgeGraph:
    """Neo4j-based knowledge graph for entity intelligence."""

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

    async def add_entity(self, entity: dict[str, Any]) -> bool:
        """Add an entity node to the knowledge graph."""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                session.run(
                    """
                    MERGE (e:Entity {id: $id})
                    SET e += {label: $label, entity_type: $type, risk_score: $risk}
                    """,
                    id=entity["id"],
                    label=entity.get("label", ""),
                    type=entity.get("entity_type", "unknown"),
                    risk=entity.get("risk_score", 0.0),
                )
            return True
        except Exception as e:
            logger.error("add_entity_failed", error=str(e))
            return False

    async def add_relationship(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        properties: dict[str, Any] | None = None,
    ) -> bool:
        """Add a relationship between entities."""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                session.run(
                    """
                    MATCH (a:Entity {id: $source})
                    MATCH (b:Entity {id: $target})
                    MERGE (a)-[r:RELATED_TO {type: $rel_type}]->(b)
                    SET r += $props
                    """,
                    source=source_id,
                    target=target_id,
                    rel_type=rel_type,
                    props=properties or {},
                )
            return True
        except Exception as e:
            logger.error("add_relationship_failed", error=str(e))
            return False

    async def get_entity(self, entity_id: str) -> dict[str, Any] | None:
        """Get an entity by ID."""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                result = session.run(
                    "MATCH (e:Entity {id: $id}) RETURN e",
                    id=entity_id,
                )
                record = result.single()
                if record:
                    node = record["e"]
                    return dict(node)
                return None
        except Exception as e:
            logger.error("get_entity_failed", error=str(e))
            return None

    async def get_subgraph(
        self, entity_id: str, depth: int = 2, limit: int = 50
    ) -> dict[str, Any]:
        """Get a subgraph around an entity."""
        try:
            driver = self._get_driver()
            safe_depth = max(1, min(depth, 5))
            with driver.session() as session:
                result = session.run(
                    f"""
                    MATCH path = (e:Entity {{id: $id}})-[*1..{safe_depth}]-(n:Entity)
                    WITH nodes(path) AS ns, relationships(path) AS rs
                    UNWIND ns AS node
                    WITH COLLECT(DISTINCT {{id: node.id, label: node.label, type: node.entity_type, risk: node.risk_score}}) AS nodes,
                         rs
                    UNWIND rs AS rel
                    RETURN nodes,
                           COLLECT(DISTINCT {{source: startNode(rel).id, target: endNode(rel).id, type: rel.type}}) AS edges
                    LIMIT 1
                    """,
                    id=entity_id,
                )
                record = result.single()
                if record:
                    return {
                        "nodes": record["nodes"][:limit],
                        "edges": record["edges"][:limit],
                    }
                return {"nodes": [], "edges": []}
        except Exception as e:
            logger.error("get_subgraph_failed", error=str(e))
            return {"nodes": [], "edges": []}

    async def get_centrality(self, limit: int = 10) -> list[dict[str, Any]]:
        """Get entities ranked by degree centrality."""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                result = session.run(
                    """
                    MATCH (e:Entity)-[r]-()
                    RETURN e.id AS id, e.label AS label, e.entity_type AS type,
                           e.risk_score AS risk_score, count(r) AS degree
                    ORDER BY degree DESC
                    LIMIT $limit
                    """,
                    limit=limit,
                )
                return [dict(record) for record in result]
        except Exception as e:
            logger.error("get_centrality_failed", error=str(e))
            return []

    def close(self):
        """Close the driver."""
        if self._driver:
            self._driver.close()
            self._driver = None
