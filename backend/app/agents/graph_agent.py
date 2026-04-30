"""Graph Intelligence Agent - Manages knowledge graph operations."""

from typing import Any

from app.agents.base_agent import BaseAgent
from app.core.config import get_settings


class GraphAgent(BaseAgent):
    """Agent for knowledge graph operations using Neo4j."""

    def __init__(self):
        super().__init__(
            name="GraphAgent",
            description="Manages knowledge graph entities and relationships",
        )
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

    async def execute(
        self, target: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Execute graph operations for the target."""
        options = options or {}
        entities = options.get("entities", [])
        relationships = options.get("relationships", [])

        stored_entities = 0
        stored_relationships = 0

        if entities:
            stored_entities = await self._store_entities(entities)
        if relationships:
            stored_relationships = await self._store_relationships(relationships)

        neighbors = await self._get_neighbors(target, depth=options.get("depth", 2))

        communities = await self._detect_communities()

        return {
            "target": target,
            "stored_entities": stored_entities,
            "stored_relationships": stored_relationships,
            "neighbors": neighbors,
            "communities": communities,
        }

    async def _store_entities(self, entities: list[dict[str, Any]]) -> int:
        """Store entities as nodes in Neo4j using a single UNWIND batch.

        Previous implementation issued one MERGE per entity (N+1 round-trips).
        UNWIND sends the entire list in one query, reducing latency by ~N×.
        """
        if not entities:
            return 0
        try:
            driver = self._get_driver()
            rows = [
                {
                    "id": e["id"],
                    "label": e.get("label", ""),
                    "entity_type": e.get("entity_type", "unknown"),
                    "risk_score": float(e.get("risk_score", 0.0)),
                    "properties": str(e.get("properties", {})),
                }
                for e in entities
            ]
            with driver.session() as session:
                session.run(
                    """
                    UNWIND $rows AS row
                    MERGE (e:Entity {id: row.id})
                    SET e.label        = row.label,
                        e.entity_type  = row.entity_type,
                        e.risk_score   = row.risk_score,
                        e.properties   = row.properties
                    """,
                    rows=rows,
                )
            return len(rows)
        except Exception as e:
            self.logger.error("store_entities_failed", error=str(e))
            return 0

    async def _store_relationships(self, relationships: list[dict[str, Any]]) -> int:
        """Store relationships as edges in Neo4j using a single UNWIND batch."""
        if not relationships:
            return 0
        try:
            driver = self._get_driver()
            rows = [
                {
                    "source_id": r["source_id"],
                    "target_id": r["target_id"],
                    "rel_type": r.get("relationship_type", "RELATED_TO"),
                    "confidence": float(r.get("confidence", 1.0)),
                    "properties": str(r.get("properties", {})),
                }
                for r in relationships
            ]
            with driver.session() as session:
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (a:Entity {id: row.source_id})
                    MATCH (b:Entity {id: row.target_id})
                    MERGE (a)-[r:RELATED_TO {type: row.rel_type}]->(b)
                    SET r.confidence = row.confidence,
                        r.properties = row.properties
                    """,
                    rows=rows,
                )
            return len(rows)
        except Exception as e:
            self.logger.error("store_relationships_failed", error=str(e))
            return 0

    async def _get_neighbors(self, target: str, depth: int = 2) -> list[dict[str, Any]]:
        """Get neighboring entities within a given depth."""
        try:
            driver = self._get_driver()
            safe_depth = max(1, min(int(depth), 5))
            query = f"""
                    MATCH (e:Entity)
                    WHERE e.id CONTAINS $target OR e.label CONTAINS $target
                    CALL {{
                        WITH e
                        MATCH path = (e)-[*1..{safe_depth}]-(neighbor:Entity)
                        RETURN neighbor, length(path) as distance
                    }}
                    RETURN DISTINCT neighbor.id AS id, neighbor.label AS label,
                           neighbor.entity_type AS entity_type,
                           neighbor.risk_score AS risk_score,
                           min(distance) AS distance
                    ORDER BY distance
                    LIMIT 50
                    """
            with driver.session() as session:
                result = session.run(query, target=target)
                return [dict(record) for record in result]
        except Exception as e:
            self.logger.error("get_neighbors_failed", error=str(e))
            return []

    async def _detect_communities(self) -> list[dict[str, Any]]:
        """Detect communities in the knowledge graph."""
        try:
            driver = self._get_driver()
            with driver.session() as session:
                result = session.run(
                    """
                    MATCH (e:Entity)-[:RELATED_TO]-(neighbor:Entity)
                    RETURN e.entity_type AS community,
                           count(DISTINCT e) AS size,
                           collect(DISTINCT e.id)[..5] AS sample_members
                    ORDER BY size DESC
                    LIMIT 10
                    """
                )
                return [dict(record) for record in result]
        except Exception as e:
            self.logger.error("detect_communities_failed", error=str(e))
            return []

    def close(self):
        """Close the Neo4j driver."""
        if self._driver:
            self._driver.close()
            self._driver = None
