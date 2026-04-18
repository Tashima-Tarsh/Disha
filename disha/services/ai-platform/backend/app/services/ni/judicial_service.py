from typing import Any, Dict
import structlog

logger = structlog.get_logger(__name__)

class JudicialService:

    def __init__(self):
        self.logger = logger.bind(service="nyaya_service")

        self.district_metrics = {
            "Assam": {
                "backlog_count": 250000,
                "avg_disposal_time_days": 1200,
                "legal_oversight_intensity": 0.85,
                "critical_cases": 12
            },
            "Mumbai": {
                "backlog_count": 1200000,
                "avg_disposal_time_days": 1800,
                "legal_oversight_intensity": 0.95,
                "critical_cases": 45
            },
            "Kolkata": {
                "backlog_count": 750000,
                "avg_disposal_time_days": 1400,
                "legal_oversight_intensity": 0.70,
                "critical_cases": 28
            }
        }

    async def get_district_governance_score(self, region: str) -> Dict[str, Any]:
        metrics = self.district_metrics.get(region, {
            "backlog_count": 100000,
            "avg_disposal_time_days": 800,
            "legal_oversight_intensity": 0.5,
            "critical_cases": 5
        })

        normalized_backlog = min(1.0, metrics["backlog_count"] / 1000000.0)
        urgency_score = (normalized_backlog * 0.4) + (metrics["legal_oversight_intensity"] * 0.6)

        return {
            "region": region,
            "urgency_score": urgency_score,
            "status": "OVERLOADED" if urgency_score > 0.8 else "STRESSED" if urgency_score > 0.5 else "STABLE",
            "metrics": metrics
        }

    async def get_legal_priority_index(self, asset_name: str, region: str) -> float:
        gov_data = await self.get_district_governance_score(region)

        base_score = gov_data["urgency_score"]
        if "Bridge" in asset_name or "Sea Link" in asset_name:
            base_score = min(1.0, base_score * 1.1)

        return base_score
