from typing import Any

import structlog

from app.agents.base_agent import BaseAgent
from app.services.ni.disaster_service import DisasterService
from app.services.ni.global_intelligence_service import GlobalIntelligenceService
from app.services.ni.infrastructure_service import InfrastructureService
from app.services.ni.judicial_service import JudicialService

logger = structlog.get_logger(__name__)


class GrowthAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="GrowthAgent",
            description="Performs Sovereign Growth Analytics and determines funding priorities for national resilience.",
        )
        self.infra_service = InfrastructureService()
        self.judicial_service = JudicialService()
        self.disaster_service = DisasterService()
        self.global_service = GlobalIntelligenceService()

    async def execute(
        self, target: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        options = options or {}

        targets = [t.strip() for t in target.split(",")]

        priorities = []
        for t in targets:
            priority = await self._analyze_asset_priority(t, options)
            priorities.append(priority)

        priorities.sort(key=lambda x: x["rfpi_index"], reverse=True)

        global_summary = await self.global_service.get_global_pulse_summary()

        return {
            "mission": "SOVEREIGN GROWTH ANALYTICS (SYNCHRONIZED)",
            "targets_analyzed": len(targets),
            "global_context": global_summary,
            "funding_priorities": priorities,
            "top_recommendation": priorities[0] if priorities else None,
            "entities": self._get_growth_entities(priorities),
        }

    async def _analyze_asset_priority(
        self, asset_name: str, options: dict[str, Any]
    ) -> dict[str, Any]:

        asset_details = await self.infra_service.get_asset_details(asset_name)
        if not asset_details:
            return {"asset": asset_name, "rfpi_index": 0.0, "status": "unknown"}

        region = asset_details["location"]

        legal_urgency = await self.judicial_service.get_legal_priority_index(
            asset_name, region
        )

        weather_risk = 0.8 if region == "Assam" or region == "Mumbai" else 0.3

        global_modifier = await self.global_service.get_growth_modifier()

        physical_risk = 0.9 if "Tezpur" in asset_name else 0.5
        base_index = (
            (physical_risk * 0.4) + (legal_urgency * 0.4) + (weather_risk * 0.2)
        )
        rfpi_index = min(1.0, base_index * global_modifier)

        return {
            "asset": asset_name,
            "region": region,
            "rfpi_index": round(rfpi_index, 4),
            "global_modifier": round(global_modifier, 4),
            "indicators": {
                "physical_risk": physical_risk,
                "legal_urgency": legal_urgency,
                "climate_threat": weather_risk,
            },
            "recommendation": self._get_budget_directive(rfpi_index),
        }

    def _get_budget_directive(self, score: float) -> str:
        if score > 0.8:
            return "IMMEDIATE SOVEREIGN FUNDING - TIER 1"
        elif score > 0.6:
            return "STRATEGIC INVESTMENT - TIER 2"
        return "MAINTENANCE & MONITORING - TIER 3"

    def _get_growth_entities(self, priorities: list[dict]) -> list[dict]:
        entities = []
        for p in priorities:
            entities.append(
                {
                    "id": f"funding-node-{p['asset'].replace(' ', '-')}",
                    "label": f"Priority: {p['asset']}",
                    "entity_type": "strategic_priority",
                    "properties": {
                        "rfpi_score": p["rfpi_index"],
                        "directive": p["recommendation"],
                    },
                    "risk_score": p["rfpi_index"],
                }
            )
        return entities
