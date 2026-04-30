from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class GlobalIntelligenceService:
    def __init__(self):
        self.logger = logger.bind(service="global_intel_service")

        self.state = {
            "vix_index": 18.5,
            "geopolitical_tension": 0.45,
            "supply_chain_stress": 0.3,
            "trusted_sovereign_yield": 0.045,
        }

    async def get_global_pulse_summary(self) -> dict[str, Any]:
        return self.state

    async def set_global_pulse(self, metric: str, value: float):
        if metric in self.state:
            self.state[metric] = value
            self.logger.info("global_pulse_updated", metric=metric, value=value)

    async def get_growth_modifier(self) -> float:
        vix_boost = max(0.0, (self.state["vix_index"] - 25.0) / 100.0)
        geo_boost = self.state["geopolitical_tension"] * 0.2
        supply_boost = self.state["supply_chain_stress"] * 0.1

        return 1.0 + vix_boost + geo_boost + supply_boost
