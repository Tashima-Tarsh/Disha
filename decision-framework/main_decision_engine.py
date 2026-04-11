"""
Main Decision Engine — orchestrates multi-agent debate and consensus.

Runs PoliticalAgent, LegalAgent, IdeologyAgent, and SecurityAgent in
parallel, then synthesises a weighted consensus or debate-style output.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from legal_engine import LegalAgent
from political_engine import PoliticalAgent
from ideology_engine import IdeologyAgent
from security_engine import SecurityAgent
from utils.llm_wrapper import LLMWrapper


def run_decision_pipeline(
    scenario: str,
    llm: LLMWrapper | None = None,
    osint_client: Optional[Any] = None,
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """Execute the full multi-agent decision pipeline.

    Parameters
    ----------
    scenario:
        Free-text description of the situation to analyse.
    llm:
        Shared LLM wrapper (default: a new ``LLMWrapper()``).
    osint_client:
        Optional OSINT client passed to the SecurityAgent.
    weights:
        Optional per-agent weight dict, e.g.
        ``{"political": 0.25, "legal": 0.30, "ideology": 0.20, "security": 0.25}``.

    Returns
    -------
    dict with keys: final_outputs, consensus, ideology_evaluation
    """
    llm = llm or LLMWrapper()
    weights = weights or {
        "political": 0.25,
        "legal": 0.30,
        "ideology": 0.20,
        "security": 0.25,
    }

    # --- Run all agents ---
    political = PoliticalAgent(llm=llm).analyze(scenario)
    legal = LegalAgent(llm=llm).analyze(scenario)
    ideology = IdeologyAgent(llm=llm).analyze(scenario)
    security = SecurityAgent(llm=llm, osint_client=osint_client).analyze(scenario)

    final_outputs = {
        "political": political,
        "legal": legal,
        "ideology": ideology,
        "security": security,
    }

    # --- Build consensus ---
    summary_parts = [
        f"[Political] {political['analysis'][:200]}",
        f"[Legal] {legal['analysis'][:200]}",
        f"[Ideology] {list(ideology.get('ideology_evaluation', {}).values())[0][:200] if ideology.get('ideology_evaluation') else ''}",
        f"[Security] {security['analysis'][:200]}",
    ]
    consensus_prompt = (
        "You are a senior decision analyst. Given the following agent analyses, "
        "produce a balanced consensus recommendation.\n\n"
        + "\n\n".join(summary_parts)
        + f"\n\nWeights: {weights}\n\n"
        "Provide a final consensus recommendation."
    )
    consensus_text = llm.generate(consensus_prompt)

    return {
        "final_outputs": final_outputs,
        "consensus": {
            "text": consensus_text,
            "weights": weights,
            "sources": legal.get("sources", []) + security.get("sources", []),
        },
        "ideology_evaluation": ideology.get("ideology_evaluation", {}),
    }
