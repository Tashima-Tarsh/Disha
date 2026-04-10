"""OSINT Intelligence Agent - Gathers open-source intelligence data."""

from typing import Any

import httpx

from app.agents.base_agent import BaseAgent
from app.core.config import get_settings


class OSINTAgent(BaseAgent):
    """Agent for gathering OSINT data from Shodan, SpiderFoot, and other sources."""

    def __init__(self):
        super().__init__(
            name="OSINTAgent",
            description="Gathers open-source intelligence from multiple data sources",
        )
        self.settings = get_settings()

    async def execute(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Gather OSINT data for the target."""
        options = options or {}
        results: dict[str, Any] = {"target": target, "sources": {}}

        # Gather from all available sources
        if self.settings.SHODAN_API_KEY:
            results["sources"]["shodan"] = await self._query_shodan(target)

        # DNS and WHOIS lookups (no API key required)
        results["sources"]["dns"] = await self._dns_lookup(target)

        # SpiderFoot integration
        if self.settings.SPIDERFOOT_API_KEY:
            results["sources"]["spiderfoot"] = await self._query_spiderfoot(target)

        # Extract entities from gathered data
        results["entities"] = self._extract_entities(results["sources"])
        return results

    async def _query_shodan(self, target: str) -> dict[str, Any]:
        """Query Shodan API for host information."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://api.shodan.io/shodan/host/{target}",
                    params={"key": self.settings.SHODAN_API_KEY},
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "ip": data.get("ip_str", target),
                        "hostnames": data.get("hostnames", []),
                        "ports": data.get("ports", []),
                        "vulns": data.get("vulns", []),
                        "os": data.get("os"),
                        "org": data.get("org"),
                        "country": data.get("country_code"),
                        "city": data.get("city"),
                        "latitude": data.get("latitude"),
                        "longitude": data.get("longitude"),
                    }
                return {"error": f"Shodan returned status {response.status_code}"}
        except Exception as e:
            self.logger.warning("shodan_query_failed", error=str(e))
            return {"error": str(e)}

    async def _dns_lookup(self, target: str) -> dict[str, Any]:
        """Perform DNS lookup for a domain."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"https://dns.google/resolve",
                    params={"name": target, "type": "A"},
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "domain": target,
                        "records": data.get("Answer", []),
                        "status": data.get("Status", -1),
                    }
                return {"error": f"DNS lookup returned status {response.status_code}"}
        except Exception as e:
            self.logger.warning("dns_lookup_failed", error=str(e))
            return {"error": str(e)}

    async def _query_spiderfoot(self, target: str) -> dict[str, Any]:
        """Query SpiderFoot for comprehensive OSINT data."""
        # SpiderFoot wrapper - would connect to a running SpiderFoot instance
        return {"status": "configured", "target": target, "note": "SpiderFoot integration ready"}

    def _extract_entities(self, sources: dict[str, Any]) -> list[dict[str, Any]]:
        """Extract structured entities from raw OSINT data."""
        entities = []
        shodan_data = sources.get("shodan", {})

        if shodan_data and "error" not in shodan_data:
            entities.append({
                "id": f"host-{shodan_data.get('ip', 'unknown')}",
                "label": shodan_data.get("ip", "Unknown Host"),
                "entity_type": "host",
                "properties": {
                    "hostnames": shodan_data.get("hostnames", []),
                    "ports": shodan_data.get("ports", []),
                    "org": shodan_data.get("org"),
                    "country": shodan_data.get("country"),
                    "vulns": shodan_data.get("vulns", []),
                },
                "risk_score": min(len(shodan_data.get("vulns", [])) * 0.15, 1.0),
            })

            for hostname in shodan_data.get("hostnames", []):
                entities.append({
                    "id": f"domain-{hostname}",
                    "label": hostname,
                    "entity_type": "domain",
                    "properties": {"ip": shodan_data.get("ip")},
                    "risk_score": 0.0,
                })

        dns_data = sources.get("dns", {})
        if dns_data and "error" not in dns_data:
            for record in dns_data.get("records", []):
                entities.append({
                    "id": f"dns-{record.get('data', 'unknown')}",
                    "label": record.get("data", ""),
                    "entity_type": "dns_record",
                    "properties": {"type": record.get("type"), "name": record.get("name")},
                    "risk_score": 0.0,
                })

        return entities
