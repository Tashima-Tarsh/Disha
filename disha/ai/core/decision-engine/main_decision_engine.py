"""Main decision engine — orchestrates all agents and merges results.

The engine runs each agent independently, then combines their outputs
into a single structured decision with a weighted confidence score.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ideology_engine import IdeologyAgent
from legal_engine import LegalAgent
from political_engine import PoliticalAgent
from security_engine import SecurityAgent
from utils.llm_wrapper import get_llm
from utils.osint import OSINTClient


# Default weights (sum to 1.0)
_DEFAULT_WEIGHTS: Dict[str, float] = {
    "political": 0.25,
    "legal": 0.30,
    "ideology": 0.20,
    "security": 0.25,
}


class DecisionEngine:
    """Multi-agent decision engine that combines political, legal,
    ideological, and security analyses.

    Parameters
    ----------
    weights:
        Dict mapping agent name to weight for the final confidence score.
    osint_client:
        Optional ``OSINTClient`` passed to the SecurityAgent.
    llm_provider / model_path / seed:
        Forwarded to ``get_llm()`` to obtain the shared LLM instance.
    clause_index / clause_meta / case_index / case_meta:
        Optional paths forwarded to LegalAgent for FAISS retrieval.
    """

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        osint_client: Optional[OSINTClient] = None,
        llm_provider: Optional[str] = None,
        model_path: Optional[str] = None,
        seed: Optional[int] = None,
        clause_index: Optional[str] = None,
        clause_meta: Optional[str] = None,
        case_index: Optional[str] = None,
        case_meta: Optional[str] = None,
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

    # ------------------------------------------------------------------
    def decide(self, scenario: str) -> Dict[str, Any]:
        """Analyse *scenario* through all agents and return a merged decision."""
        results: Dict[str, Dict[str, Any]] = {
            "political": self.political.analyze(scenario),
            "legal": self.legal.analyze(scenario),
            "ideology": self.ideology.analyze(scenario),
            "security": self.security.analyze(scenario),
        }

        # Weighted confidence
        total_weight = sum(self.weights.values())
        weighted_conf = sum(
            results[k]["confidence"] * self.weights.get(k, 0.0)
            for k in results
        ) / (total_weight or 1.0)

        # Merge sources
        all_sources: List[Dict[str, Any]] = []
        for r in results.values():
            all_sources.extend(r.get("sources", []))

        # Merge recommendations (deduplicate)
        seen: set = set()
        all_recs: List[str] = []
        for r in results.values():
            for rec in r.get("recommendations", []):
                if rec not in seen:
                    seen.add(rec)
                    all_recs.append(rec)

        return {
            "summary": f"Multi-agent decision on: {scenario[:100]}",
            "premises": [
                p
                for r in results.values()
                for p in r.get("premises", [])
            ],
            "inference_steps": [
                s
                for r in results.values()
                for s in r.get("inference_steps", [])
            ],
            "recommendations": all_recs,
            "confidence": round(weighted_conf, 4),
            "sources": all_sources,
            "agent_results": results,
        }
