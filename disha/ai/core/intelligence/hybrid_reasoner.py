"""
HybridReasoner — Three-Mode Reasoning Engine for the DISHA Cognitive Architecture.

Combines three classical reasoning paradigms in parallel:

  Deductive  — Apply if-then rules derived from known facts to reach a certain conclusion.
  Inductive  — Identify patterns across context evidence to generalize a hypothesis.
  Abductive  — Find the simplest, most parsimonious explanation for all observed evidence.

Each mode produces one hypothesis dict. The three are compared for coherence and
the best is selected by the select_best() method.

Role in architecture:
    HybridReasoner is called during the _reason phase of the cognitive loop.
    Its output (list of 3 hypotheses) is stored in CognitiveState.hypotheses
    and consumed by both AgentDeliberator and the _reflect phase.
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Any

import structlog

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Heuristic rule base for deductive reasoning
# ---------------------------------------------------------------------------

# Each rule: (condition_keywords, conclusion_template)
_DEDUCTIVE_RULES: list[tuple[list[str], str]] = [
    (["what", "is", "define", "explain", "describe"],
     "This is an information-retrieval request requiring a factual definition or explanation."),
    (["how", "do", "can", "should", "implement", "create", "build"],
     "This is a procedural request requiring step-by-step guidance."),
    (["why", "reason", "cause", "because"], "This is a causal-analysis request requiring explanation of underlying mechanisms."),
    (["compare", "difference", "versus", "vs", "better"],
     "This is a comparative request requiring evaluation across multiple options."),
    (["help", "assist", "support", "need"], "This is an assistance request requiring empathetic, action-oriented support."),
    (["error", "bug", "fix", "problem", "issue", "fail"],
     "This is a debugging request requiring systematic root-cause analysis."),
    (["predict", "forecast", "future", "will", "expect"],
     "This is a predictive request requiring probabilistic reasoning about future states."),
    (["sentiment", "feel", "emotion", "mood", "opinion"],
     "This is a sentiment/opinion request requiring affective understanding."),
]

# ---------------------------------------------------------------------------
# Pattern heuristics for inductive reasoning
# ---------------------------------------------------------------------------

_INDUCTIVE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(always|never|every|all|none)\b", re.I), "universal_quantification"),
    (re.compile(r"\b(sometimes|often|usually|frequently|rarely)\b", re.I), "probabilistic_claim"),
    (re.compile(r"\b(increase|decrease|grow|shrink|trend|over time)\b", re.I), "temporal_trend"),
    (re.compile(r"\b(similar|like|same|parallel|analogous)\b", re.I), "analogy_pattern"),
    (re.compile(r"\b(if|when|unless|provided|given that)\b", re.I), "conditional_pattern"),
    (re.compile(r"\b(example|instance|case|such as|e\.g\.)\b", re.I), "exemplification_pattern"),
    (re.compile(r"\d+", re.I), "quantitative_data_present"),
    (re.compile(r"\b(first|second|third|finally|then|next|lastly)\b", re.I), "sequential_structure"),
]

# ---------------------------------------------------------------------------
# HybridReasoner
# ---------------------------------------------------------------------------


class HybridReasoner:
    """
    Parallel three-mode reasoner producing deductive, inductive, and abductive hypotheses.

    TODO: Replace heuristic methods with LLM-backed reasoning chains:
        async def _deductive(self, query, context):
            prompt = f"Apply formal deductive logic to: '{query}'. Known facts: {context}"
            llm_output = await call_llm(prompt)
            return parse_hypothesis(llm_output, mode="deductive")
    """

    def __init__(self) -> None:
        log.info("hybrid_reasoner.initialized")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def reason(self, query: str, context: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Generate three hypotheses in parallel — one per reasoning mode.

        Args:
            query:   The raw input or distilled question to reason about.
            context: Enriched context dict from the _perceive/_attend phases.

        Returns:
            List of 3 hypothesis dicts:
            [
                {mode, hypothesis, confidence, evidence, chain_of_thought},
                ...
            ]
        """
        log.info("hybrid_reasoner.reasoning", query=query[:80])

        # Run all three reasoning modes concurrently
        deductive_h, inductive_h, abductive_h = await asyncio.gather(
            asyncio.to_thread(self._deductive, query, context),
            asyncio.to_thread(self._inductive, query, context),
            asyncio.to_thread(self._abductive, query, context),
        )

        hypotheses = [deductive_h, inductive_h, abductive_h]
        log.info(
            "hybrid_reasoner.hypotheses_generated",
            deductive_conf=deductive_h["confidence"],
            inductive_conf=inductive_h["confidence"],
            abductive_conf=abductive_h["confidence"],
        )
        return hypotheses

    def select_best(self, hypotheses: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Select the hypothesis with the highest confidence, applying a coherence check.

        Coherence check: if the top-2 hypotheses are within 0.05 of each other,
        prefer the abductive one (Occam's razor — prefer the simpler explanation).

        Args:
            hypotheses: List of hypothesis dicts (from reason()).

        Returns:
            The selected best hypothesis dict.
        """
        if not hypotheses:
            return {
                "mode": "none",
                "hypothesis": "Insufficient data to form a hypothesis.",
                "confidence": 0.0,
                "evidence": [],
                "chain_of_thought": [],
            }

        sorted_h = sorted(hypotheses, key=lambda h: h.get("confidence", 0.0), reverse=True)
        best = sorted_h[0]

        # Coherence check: prefer abductive when top-2 are close
        if len(sorted_h) > 1:
            gap = best["confidence"] - sorted_h[1]["confidence"]
            if gap < 0.05:
                # Tiebreak: prefer abductive (simplest explanation)
                abductive_options = [h for h in sorted_h if h.get("mode") == "abductive"]
                if abductive_options:
                    best = abductive_options[0]
                    log.debug("hybrid_reasoner.coherence_tiebreak", selected="abductive")

        log.debug(
            "hybrid_reasoner.best_selected",
            mode=best["mode"],
            confidence=best["confidence"],
        )
        return best

    # ------------------------------------------------------------------
    # Reasoning mode implementations
    # ------------------------------------------------------------------

    def _deductive(self, query: str, context: dict[str, Any]) -> dict[str, Any]:
        """
        Deductive reasoning: match query against known if-then rules to derive a conclusion.

        Logic:
          1. Tokenize the query into lowercase words.
          2. For each rule, count how many condition keywords match.
          3. Select the rule with the most matches as the deductive premise.
          4. Derive conclusion from the premise.

        TODO: Integrate formal logic engine or LLM for real deductive proofs.
        """
        query_lower = query.lower()
        query_tokens = set(query_lower.split())

        best_match_count = 0
        best_conclusion = "No applicable deductive rule found; conclusion uncertain."
        best_rule_keywords: list[str] = []

        for keywords, conclusion in _DEDUCTIVE_RULES:
            match_count = sum(1 for k in keywords if k in query_tokens or k in query_lower)
            if match_count > best_match_count:
                best_match_count = match_count
                best_conclusion = conclusion
                best_rule_keywords = keywords

        # Confidence is proportional to how many rule keywords matched
        max_possible = max(len(kws) for kws, _ in _DEDUCTIVE_RULES)
        rule_coverage = best_match_count / max(max_possible, 1)
        confidence = 0.45 + (rule_coverage * 0.45)

        # Boost confidence if context contains supporting episodic/semantic data
        if context.get("episodic_memories"):
            confidence = min(confidence + 0.05, 0.99)
        if context.get("semantic_facts"):
            confidence = min(confidence + 0.05, 0.99)

        # Build chain of thought
        chain: list[str] = [
            f"Query: '{query[:80]}'",
            f"Matched rule keywords: {best_rule_keywords or ['(none)']}",
            f"Rule coverage: {rule_coverage:.2%}",
            f"Applied deductive rule → {best_conclusion}",
        ]

        # Collect evidence from context
        evidence: list[str] = []
        for ep in context.get("episodic_memories", [])[:2]:
            evidence.append(f"Past episode: {ep.get('what', '')[:80]}")
        for sf in context.get("semantic_facts", [])[:2]:
            evidence.append(f"Known fact: {sf.get('definition', '')[:80]}")

        return {
            "mode": "deductive",
            "hypothesis": best_conclusion,
            "confidence": round(confidence, 3),
            "evidence": evidence,
            "chain_of_thought": chain,
            "matched_keywords": best_rule_keywords,
            "timestamp": time.time(),
        }

    def _inductive(self, query: str, context: dict[str, Any]) -> dict[str, Any]:
        """
        Inductive reasoning: detect patterns in the query and context to form a generalization.

        Logic:
          1. Scan query and context for pattern markers (regex-based).
          2. For each matched pattern type, build a partial generalization.
          3. Synthesize all matched patterns into a single inductive hypothesis.

        TODO: Replace with LLM few-shot inductive reasoning chains.
        """
        matched_patterns: list[str] = []
        for pattern, label in _INDUCTIVE_PATTERNS:
            if pattern.search(query):
                matched_patterns.append(label)

        # Check for patterns in context working memory items
        context_text = " ".join(
            str(item.get("content", "")) for item in context.get("working_memory", [])
        )
        for pattern, label in _INDUCTIVE_PATTERNS:
            if pattern.search(context_text) and label not in matched_patterns:
                matched_patterns.append(f"context:{label}")

        # Build inductive hypothesis from matched patterns
        if not matched_patterns:
            hypothesis = (
                "No strong patterns detected; the input appears to be an isolated, "
                "novel statement requiring further context to generalize."
            )
            confidence = 0.35
        else:
            pattern_descriptions: list[str] = []
            for p in matched_patterns:
                clean = p.replace("context:", "").replace("_", " ")
                pattern_descriptions.append(clean)

            hypothesis = (
                f"Pattern analysis identifies {len(matched_patterns)} structural signals "
                f"({', '.join(pattern_descriptions[:3])}). "
                f"Generalizing: this input follows a {pattern_descriptions[0]} structure, "
                f"suggesting the response should address this recurring pattern type."
            )
            confidence = 0.40 + min(len(matched_patterns) * 0.08, 0.45)

        chain: list[str] = [
            f"Query scanned for {len(_INDUCTIVE_PATTERNS)} pattern types",
            f"Matched patterns: {matched_patterns or ['none']}",
            f"Generalization formed from {len(matched_patterns)} pattern signals",
            f"Inductive conclusion: {hypothesis[:100]}...",
        ]

        evidence = [f"Pattern signal: {p}" for p in matched_patterns[:5]]

        return {
            "mode": "inductive",
            "hypothesis": hypothesis,
            "confidence": round(confidence, 3),
            "evidence": evidence,
            "chain_of_thought": chain,
            "matched_patterns": matched_patterns,
            "timestamp": time.time(),
        }

    def _abductive(self, query: str, context: dict[str, Any]) -> dict[str, Any]:
        """
        Abductive reasoning: find the simplest explanation consistent with all evidence.

        Logic:
          1. Collect all evidence fragments (query tokens, context entities, memories).
          2. Identify the most prominent theme (highest-frequency content word).
          3. Propose the minimal explanation that accounts for all evidence.

        Based on Peirce's abduction: "Choose the hypothesis that would make
        the observations most likely / most natural."

        TODO: Replace with LLM chain-of-thought abductive reasoning.
        """
        # Gather all evidence
        query_words = [w.strip(".,!?:;\"'") for w in query.lower().split() if len(w) > 3]

        entity_words: list[str] = []
        for ent in context.get("entities", []):
            if isinstance(ent, dict):
                entity_words.append(str(ent.get("value", ent.get("text", ""))).lower())
            else:
                entity_words.append(str(ent).lower())

        memory_words: list[str] = []
        for ep in context.get("episodic_memories", [])[:3]:
            memory_words += ep.get("what", "").lower().split()[:5]

        all_evidence = query_words + entity_words + memory_words

        # Word frequency analysis — find the dominant theme
        freq: dict[str, int] = {}
        for w in all_evidence:
            if len(w) > 3:
                freq[w] = freq.get(w, 0) + 1

        # Sort by frequency
        dominant_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:5]

        if not dominant_words:
            hypothesis = (
                "The simplest explanation is that this is a novel input with no clear "
                "prior context. The best action is to treat it as a fresh information request."
            )
            confidence = 0.40
        else:
            top_word, top_freq = dominant_words[0]
            all_top = [w for w, _ in dominant_words]
            hypothesis = (
                f"The simplest explanation unifying all evidence: this input is primarily "
                f"about '{top_word}' (appears {top_freq}× across query and context). "
                f"Related themes ({', '.join(all_top[1:4])}) support this reading. "
                f"The most parsimonious response addresses '{top_word}' directly."
            )
            # Confidence scales with evidence density and entity presence
            confidence = 0.50 + min(len(all_evidence) / 40.0, 0.30)
            if entity_words:
                confidence = min(confidence + 0.08, 0.92)

        chain: list[str] = [
            f"Evidence collected: {len(query_words)} query words, "
            f"{len(entity_words)} entities, {len(memory_words)} memory fragments",
            f"Dominant themes: {[w for w, _ in dominant_words[:3]] or ['none']}",
            "Occam's razor applied: selecting minimal hypothesis",
            f"Abductive conclusion: {hypothesis[:100]}...",
        ]

        evidence = [
            f"Dominant term: '{w}' (freq={f})" for w, f in dominant_words[:5]
        ] + [f"Entity: {e}" for e in entity_words[:3]]

        return {
            "mode": "abductive",
            "hypothesis": hypothesis,
            "confidence": round(confidence, 3),
            "evidence": evidence,
            "chain_of_thought": chain,
            "dominant_themes": [w for w, _ in dominant_words],
            "timestamp": time.time(),
        }
