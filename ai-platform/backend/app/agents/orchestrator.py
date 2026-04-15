"""Agent Orchestrator - Coordinates multi-agent intelligence gathering."""

import asyncio
import uuid
from typing import Any

import structlog

from app.agents.osint_agent import OSINTAgent
from app.agents.crypto_agent import CryptoAgent
from app.agents.detection_agent import DetectionAgent
from app.agents.graph_agent import GraphAgent
from app.agents.reasoning_agent import ReasoningAgent
from app.agents.legal_agent import LegalAgent
from app.agents.education_agent import EducationAgent
from app.agents.sentinel_agent import SentinelAgent
from app.agents.national_intelligence_agent import NationalIntelligenceAgent

logger = structlog.get_logger(__name__)


class Orchestrator:
    """Coordinates multiple intelligence agents and merges their outputs."""

    def __init__(self):
        self.osint_agent = OSINTAgent()
        self.crypto_agent = CryptoAgent()
        self.detection_agent = DetectionAgent()
        self.graph_agent = GraphAgent()
        self.reasoning_agent = ReasoningAgent()
        self.legal_agent = LegalAgent()
        self.education_agent = EducationAgent()
        self.sentinel_agent = SentinelAgent()
        self.ni_agent = NationalIntelligenceAgent()
        self.logger = logger.bind(component="orchestrator")

    async def investigate(
        self,
        target: str,
        investigation_type: str = "full",
        depth: int = 2,
        options: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Run a full investigation pipeline on a target."""
        investigation_id = str(uuid.uuid4())
        options = options or {}
        self.logger.info(
            "investigation_started",
            investigation_id=investigation_id,
            target=target,
            investigation_type=investigation_type,
            user_id=user_id,
        )

        # Phase 1: Data Collection (parallel)
        agent_results = await self._collect_data(target, investigation_type, options)

        # Phase 2: Anomaly Detection
        all_entities = []
        for result in agent_results.values():
            if result.get("status") == "success":
                all_entities.extend(result.get("data", {}).get("entities", []))

        if all_entities:
            detection_result = await self.detection_agent.run(
                target, {"data_points": all_entities}
            )
            agent_results["detection"] = detection_result

        # Phase 3: Knowledge Graph Storage
        relationships = self._build_relationships(all_entities)
        graph_result = await self.graph_agent.run(
            target,
            {"entities": all_entities, "relationships": relationships, "depth": depth},
        )
        agent_results["graph"] = graph_result

        # Phase 4: LLM Analysis
        reasoning_result = await self.reasoning_agent.run(
            target,
            {"agent_results": agent_results},
        )
        agent_results["reasoning"] = reasoning_result

        # Phase 5: Compile results
        result = self._compile_results(investigation_id, target, investigation_type, agent_results)

        self.logger.info(
            "investigation_completed",
            investigation_id=investigation_id,
            risk_score=result["risk_score"],
        )
        return result

    async def _collect_data(
        self, target: str, investigation_type: str, options: dict[str, Any]
    ) -> dict[str, Any]:
        """Collect data from agents in parallel based on investigation type."""
        tasks = {}

        if investigation_type in ("osint", "full", "threat"):
            tasks["osint"] = self.osint_agent.run(target, options)

        if investigation_type in ("crypto", "full"):
            tasks["crypto"] = self.crypto_agent.run(target, options)

        if investigation_type in ("legal", "full"):
            tasks["legal"] = self.legal_agent.run(target, options)

        if investigation_type in ("education", "full"):
            tasks["education"] = self.education_agent.run(target, options)

        if investigation_type in ("sentinel", "full"):
            tasks["sentinel"] = self.sentinel_agent.run(target, options)

        if investigation_type in ("ni", "full"):
            tasks["ni"] = self.ni_agent.run(target, options)

        if not tasks:
            tasks["osint"] = self.osint_agent.run(target, options)

        results = {}
        completed = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), completed):
            if isinstance(result, Exception):
                results[key] = {"agent": key, "status": "error", "error": str(result), "data": {}}
            else:
                results[key] = result

        return results

    def _build_relationships(self, entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Build relationships between extracted entities."""
        relationships = []
        for i, entity in enumerate(entities):
            for j, other in enumerate(entities):
                if i >= j:
                    continue

                # Connect entities of related types
                related = False
                if entity["entity_type"] == "host" and other["entity_type"] == "domain":
                    related = True
                    rel_type = "HOSTS"
                elif entity["entity_type"] == "wallet" and other["entity_type"] == "wallet":
                    related = True
                    rel_type = "TRANSACTED_WITH"
                elif entity["entity_type"] == "dns_record" and other["entity_type"] in ["host", "domain"]:
                    related = True
                    rel_type = "RESOLVES_TO"
                else:
                    continue

                if related:
                    relationships.append({
                        "source_id": entity["id"],
                        "target_id": other["id"],
                        "relationship_type": rel_type,
                        "confidence": 0.8,
                    })

        return relationships

    def _compile_results(
        self,
        investigation_id: str,
        target: str,
        investigation_type: str,
        agent_results: dict[str, Any],
    ) -> dict[str, Any]:
        """Compile all agent results into a final investigation report."""
        all_entities = []
        all_anomalies = []
        risk_scores = []

        for result in agent_results.values():
            if result.get("status") == "success":
                data = result.get("data", {})
                all_entities.extend(data.get("entities", []))
                all_anomalies.extend(data.get("anomalies", []))

                if "risk_analysis" in data:
                    risk_scores.append(data["risk_analysis"].get("risk_score", 0))
                if "risk_assessment" in data:
                    risk_scores.append(data["risk_assessment"].get("overall_risk_score", 0))

        overall_risk = max(risk_scores) if risk_scores else 0.0

        reasoning_data = agent_results.get("reasoning", {}).get("data", {})
        summary = reasoning_data.get("summary", "Investigation completed.")

        return {
            "investigation_id": investigation_id,
            "target": target,
            "investigation_type": investigation_type,
            "status": "completed",
            "entities": all_entities,
            "relationships": self._build_relationships(all_entities),
            "anomalies": all_anomalies,
            "risk_score": overall_risk,
            "summary": summary,
            "raw_data": {k: v.get("data", {}) for k, v in agent_results.items()},
        }

    async def multi_investigate(
        self,
        targets: list[str],
        investigation_type: str = "full",
        depth: int = 2,
        user_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Run investigations on multiple targets."""
        tasks = [
            self.investigate(
                target, investigation_type=investigation_type, depth=depth, user_id=user_id
            )
            for target in targets
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [
            r if not isinstance(r, Exception) else {"target": t, "status": "error", "error": str(r)}
            for t, r in zip(targets, results)
        ]
