from __future__ import annotations

from typing import Any

from .ideology_engine import IdeologyAgent
from .legal_engine import LegalAgent
from .political_engine import PoliticalAgent
from .security_engine import SecurityAgent
from .utils.llm_wrapper import get_llm
from .utils.osint import OSINTClient

_DEFAULT_WEIGHTS: dict[str, float] = {
    "political": 0.25,
    "legal": 0.30,
    "ideology": 0.20,
    "security": 0.25,
}


class DecisionEngine:
    def __init__(
        self,
        weights: dict[str, float] | None = None,
        osint_client: OSINTClient | None = None,
        llm_provider: str | None = None,
        model_path: str | None = None,
        seed: int | None = None,
        clause_index: str | None = None,
        clause_meta: str | None = None,
        case_index: str | None = None,
        case_meta: str | None = None,
    ) -> None:
        self.weights = weights or dict(_DEFAULT_WEIGHTS)
        llm = get_llm(provider=llm_provider, model_path=model_path, seed=seed)

        self.political = PoliticalAgent(llm=llm)
        self.legal = LegalAgent(
            clause_index=clause_index,
            clause_meta=clause_meta,
            case_index=case_index,
            case_meta=case_meta,
            llm=llm,
        )
        self.ideology = IdeologyAgent(llm=llm)
        self.security = SecurityAgent(osint_client=osint_client, llm=llm)

    def decide(self, scenario: str) -> dict[str, Any]:
        results: dict[str, dict[str, Any]] = {
            "political": self.political.analyze(scenario),
            "legal": self.legal.analyze(scenario),
            "ideology": self.ideology.analyze(scenario),
            "security": self.security.analyze(scenario),
        }

        total_weight = sum(self.weights.values())
        weighted_conf = sum(
            results[k]["confidence"] * self.weights.get(k, 0.0) for k in results
        ) / (total_weight or 1.0)

        all_sources: list[dict[str, Any]] = []
        for r in results.values():
            all_sources.extend(r.get("sources", []))

        seen: set[str] = set()
        all_recs: list[str] = []
        for r in results.values():
            for rec in r.get("recommendations", []):
                if rec not in seen:
                    seen.add(rec)
                    all_recs.append(rec)

        return {
            "summary": f"Multi-agent decision on: {scenario[:100]}",
            "premises": [p for r in results.values() for p in r.get("premises", [])],
            "inference_steps": [
                s for r in results.values() for s in r.get("inference_steps", [])
            ],
            "recommendations": all_recs,
            "confidence": round(weighted_conf, 4),
            "sources": all_sources,
            "agent_results": results,
        }
