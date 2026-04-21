from typing import Any, Dict, List
import structlog

logger = structlog.get_logger(__name__)


class InfrastructureService:
    def __init__(self):
        self.logger = logger.bind(service="setu_service")

        self.assets = {
            "Tezpur Bridge": {
                "id": "SETU-AS-001",
                "location": "Assam",
                "type": "Steel Truss",
                "material": "iron",
                "design_load_kn": 5000,
                "critical_strain_threshold": 0.02,
                "status": "operational",
            },
            "Bandra-Worli Sea Link": {
                "id": "SETU-MH-012",
                "location": "Mumbai",
                "type": "Cable-Stayed",
                "material": "iron",
                "design_load_kn": 12000,
                "critical_strain_threshold": 0.015,
                "status": "monitoring",
            },
            "Howrah Bridge": {
                "id": "SETU-WB-005",
                "location": "Kolkata",
                "type": "Cantilever",
                "material": "iron",
                "design_load_kn": 8000,
                "critical_strain_threshold": 0.025,
                "status": "heritage_maintenance",
            },
        }

    async def get_asset_details(self, name: str) -> Dict[str, Any] | None:
        return self.assets.get(name)

    async def calculate_environmental_load_force(
        self, asset_name: str, wind_speed_kmh: float
    ) -> List[float]:
        asset = await self.get_asset_details(asset_name)
        if not asset:
            return [0.0, 0.0, 0.0]

        v_ms = wind_speed_kmh / 3.6
        pressure = 0.613 * (v_ms**2)

        force_magnitude = (pressure / 1000.0) * 1.5

        return [force_magnitude, 0.0, 0.0]

    async def evaluate_failure_risk(
        self, asset_name: str, md_diagnostic: Dict[str, Any]
    ) -> Dict[str, Any]:
        asset = await self.get_asset_details(asset_name)
        if not asset:
            return {"status": "unknown", "risk_score": 0.0}

        ke = md_diagnostic.get("ke", 0.0)
        total_e = md_diagnostic.get("total_energy", 1.0)

        stress_ratio = ke / abs(total_e) if total_e != 0 else 0
        threshold = asset["critical_strain_threshold"] * 10.0

        risk_score = min(1.0, stress_ratio / threshold)

        return {
            "asset_id": asset["id"],
            "failure_probability": risk_score,
            "status": "CRITICAL_FAILURE"
            if risk_score >= 0.9
            else "VULNERABLE"
            if risk_score > 0.4
            else "STABLE",
            "threshold_exceeded": risk_score >= 0.9,
            "recommendation": "IMMEDIATE EVACUATION"
            if risk_score >= 0.9
            else "STRUCTURAL INSPECTION REQUIRED"
            if risk_score > 0.4
            else "MONITORING",
        }
