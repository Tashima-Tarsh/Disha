"""Intelligence Layer — Hybrid reasoning combining LLM, symbolic, and rule-based systems.

Implements a three-tier intelligence architecture:
1. Neural Tier: LLM-based reasoning (abstract interface for any LLM)
2. Symbolic Tier: Formal logic and constraint satisfaction
3. Rule Tier: Domain-specific rule engines with forward/backward chaining

The hybrid approach routes queries to the most appropriate tier
and can combine results across tiers for robust conclusions.
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from ..types import (
    CognitiveEvent,
    ConfidenceLevel,
)

logger = logging.getLogger(__name__)


class Rule:
    """A production rule with conditions and actions."""

    def __init__(
        self,
        name: str,
        conditions: list[str],
        action: str,
        priority: float = 0.5,
        domain: str = "general",
    ) -> None:
        self.name = name
        self.conditions = conditions
        self.action = action
        self.priority = priority
        self.domain = domain
        self.fire_count = 0

    def matches(self, facts: set[str]) -> bool:
        """Check if all conditions are satisfied by the given facts."""
        return all(
            any(cond.lower() in fact.lower() for fact in facts)
            for cond in self.conditions
        )

    def fire(self) -> str:
        """Execute the rule and return the action."""
        self.fire_count += 1
        return self.action


class RuleEngine:
    """Forward-chaining rule engine for domain-specific reasoning."""

    def __init__(self) -> None:
        self._rules: list[Rule] = []
        self._facts: set[str] = set()

    def add_rule(
        self,
        name: str,
        conditions: list[str],
        action: str,
        priority: float = 0.5,
        domain: str = "general",
    ) -> Rule:
        """Add a production rule."""
        rule = Rule(name, conditions, action, priority, domain)
        self._rules.append(rule)
        return rule

    def assert_fact(self, fact: str) -> None:
        """Assert a fact into the working memory."""
        self._facts.add(fact)

    def retract_fact(self, fact: str) -> None:
        """Remove a fact from working memory."""
        self._facts.discard(fact)

    def forward_chain(self, max_iterations: int = 50) -> list[str]:
        """Run forward chaining until no new facts are derived.
        
        Returns list of derived conclusions (newly fired rule actions).
        """
        conclusions: list[str] = []
        fired_rules: set[str] = set()

        for _ in range(max_iterations):
            new_fires = False
            # Sort by priority
            eligible = sorted(
                [r for r in self._rules if r.name not in fired_rules],
                key=lambda r: r.priority,
                reverse=True,
            )

            for rule in eligible:
                if rule.matches(self._facts):
                    action = rule.fire()
                    fired_rules.add(rule.name)
                    conclusions.append(action)
                    # Add action as new fact (enables chaining)
                    self._facts.add(action)
                    new_fires = True

            if not new_fires:
                break

        return conclusions

    def query(self, question: str) -> list[str]:
        """Simple backward chaining: find rules whose action matches the question."""
        question_lower = question.lower()
        matches = []
        for rule in self._rules:
            if question_lower in rule.action.lower():
                if rule.matches(self._facts):
                    matches.append(rule.action)
        return matches

    @property
    def fact_count(self) -> int:
        return len(self._facts)

    @property
    def rule_count(self) -> int:
        return len(self._rules)

    def clear_facts(self) -> None:
        self._facts.clear()


class SymbolicReasoner:
    """Symbolic reasoning with propositional logic.
    
    Maintains a knowledge base of propositions and supports
    basic logical inference (modus ponens, modus tollens).
    """

    def __init__(self) -> None:
        self._propositions: dict[str, bool] = {}
        self._implications: list[tuple[str, str]] = []  # (antecedent, consequent)

    def assert_proposition(self, name: str, value: bool = True) -> None:
        """Assert a propositional truth value."""
        self._propositions[name] = value

    def add_implication(self, antecedent: str, consequent: str) -> None:
        """Add an implication: antecedent → consequent."""
        self._implications.append((antecedent, consequent))

    def infer(self, max_steps: int = 100) -> list[str]:
        """Apply modus ponens to derive new truths.
        
        Returns list of newly derived propositions.
        """
        derived: list[str] = []

        for _ in range(max_steps):
            new_derivations = False
            for antecedent, consequent in self._implications:
                if (
                    self._propositions.get(antecedent) is True
                    and consequent not in self._propositions
                ):
                    self._propositions[consequent] = True
                    derived.append(consequent)
                    new_derivations = True

            if not new_derivations:
                break

        return derived

    def query(self, proposition: str) -> bool | None:
        """Query the truth value of a proposition."""
        return self._propositions.get(proposition)

    def explain(self, proposition: str) -> list[str]:
        """Explain why a proposition is true by finding the implication chain."""
        if self._propositions.get(proposition) is not True:
            return [f"{proposition} is not known to be true"]

        chain = [f"{proposition} is TRUE"]
        for antecedent, consequent in self._implications:
            if consequent == proposition and self._propositions.get(antecedent) is True:
                chain.append(f"  because {antecedent} → {consequent}")
                chain.extend(f"    {line}" for line in self.explain(antecedent) if "TRUE" not in line)
        return chain

    @property
    def known_truths(self) -> list[str]:
        return [k for k, v in self._propositions.items() if v is True]


class NeuralInterface:
    """Abstract interface for LLM-based reasoning.
    
    Provides a pluggable interface for any LLM backend.
    When no LLM is configured, falls back to template-based responses.
    """

    def __init__(self, model_name: str = "default") -> None:
        self._model_name = model_name
        self._call_count = 0
        self._response_cache: dict[str, str] = {}

    def reason(
        self,
        prompt: str,
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        system_prompt: str = "",
    ) -> dict[str, Any]:
        """Send a reasoning query to the LLM interface.
        
        Returns dict with response, model, confidence, and metadata.
        Falls back to template responses when no LLM is configured.
        """
        self._call_count += 1

        # Check cache
        cache_key = f"{prompt[:100]}:{temperature}"
        if cache_key in self._response_cache:
            return {
                "response": self._response_cache[cache_key],
                "model": self._model_name,
                "confidence": 0.7,
                "cached": True,
            }

        # Template-based fallback (no external LLM required)
        response = self._template_response(prompt)
        self._response_cache[cache_key] = response

        return {
            "response": response,
            "model": self._model_name,
            "confidence": 0.5,  # Lower confidence for template responses
            "cached": False,
            "call_count": self._call_count,
        }

    @staticmethod
    def _template_response(prompt: str) -> str:
        """Generate a structured template response."""
        prompt_lower = prompt.lower()

        if "analyze" in prompt_lower or "analysis" in prompt_lower:
            return (
                "Analysis: The input requires systematic examination. "
                "Key factors have been identified for further investigation."
            )
        if "explain" in prompt_lower:
            return (
                "Explanation: Based on the available context, "
                "the subject involves multiple interrelated factors."
            )
        if "plan" in prompt_lower or "strategy" in prompt_lower:
            return (
                "Strategy: 1) Assess current state, 2) Identify objectives, "
                "3) Determine actions, 4) Execute and monitor, 5) Evaluate results."
            )
        if "compare" in prompt_lower:
            return (
                "Comparison: Both options have distinct advantages. "
                "A weighted evaluation based on criteria is recommended."
            )
        return f"Processing query ({len(prompt)} chars): Structured response generated."


class HybridIntelligence:
    """Unified hybrid intelligence combining neural, symbolic, and rule-based reasoning.
    
    Routes queries to the most appropriate reasoning tier and can
    combine results for higher confidence conclusions.
    
    Example:
        intel = HybridIntelligence()
        
        # Add domain rules
        intel.rules.add_rule("threat_detection", ["anomaly", "network"], "Investigate potential intrusion")
        intel.rules.assert_fact("anomaly detected in logs")
        intel.rules.assert_fact("network traffic spike")
        
        # Add symbolic knowledge
        intel.symbolic.assert_proposition("anomaly_detected", True)
        intel.symbolic.add_implication("anomaly_detected", "investigation_needed")
        
        # Hybrid reasoning
        result = intel.reason("What should we do about the anomaly?")
        print(result["conclusion"])
        print(result["tiers_consulted"])
    """

    def __init__(self, model_name: str = "default") -> None:
        self.neural = NeuralInterface(model_name)
        self.symbolic = SymbolicReasoner()
        self.rules = RuleEngine()
        self._event_log: list[CognitiveEvent] = []

    def reason(
        self,
        query: str,
        *,
        use_neural: bool = True,
        use_symbolic: bool = True,
        use_rules: bool = True,
    ) -> dict[str, Any]:
        """Perform hybrid reasoning across all intelligence tiers.
        
        Returns:
            Dict with conclusion, confidence, tiers_consulted, and per-tier results.
        """
        results: dict[str, Any] = {}
        tiers_consulted: list[str] = []

        # Rule engine
        if use_rules:
            rule_conclusions = self.rules.forward_chain()
            rule_queries = self.rules.query(query)
            if rule_conclusions or rule_queries:
                results["rules"] = {
                    "conclusions": rule_conclusions,
                    "direct_answers": rule_queries,
                    "confidence": 0.8 if rule_queries else 0.6,
                }
                tiers_consulted.append("rules")

        # Symbolic reasoning
        if use_symbolic:
            derived = self.symbolic.infer()
            relevant_truths = [
                t for t in self.symbolic.known_truths
                if any(word in t.lower() for word in query.lower().split() if len(word) > 3)
            ]
            if derived or relevant_truths:
                results["symbolic"] = {
                    "derived": derived,
                    "relevant_truths": relevant_truths,
                    "confidence": 0.85 if relevant_truths else 0.5,
                }
                tiers_consulted.append("symbolic")

        # Neural reasoning (always available as fallback)
        if use_neural:
            neural_result = self.neural.reason(query)
            results["neural"] = {
                "response": neural_result["response"],
                "confidence": neural_result["confidence"],
                "model": neural_result["model"],
            }
            tiers_consulted.append("neural")

        # Synthesize across tiers
        conclusion, confidence = self._synthesize(results, query)

        self._event_log.append(CognitiveEvent(
            event_type="hybrid_reasoning",
            source_layer="intelligence",
            payload={
                "query": query[:200],
                "tiers": tiers_consulted,
                "confidence": confidence,
            },
        ))

        return {
            "conclusion": conclusion,
            "confidence": round(confidence, 3),
            "confidence_level": self._confidence_level(confidence).value,
            "tiers_consulted": tiers_consulted,
            "tier_results": results,
        }

    @staticmethod
    def _synthesize(results: dict[str, Any], query: str) -> tuple[str, float]:
        """Synthesize results across tiers into a single conclusion."""
        parts: list[str] = []
        confidences: list[float] = []

        # Prefer rule-based answers (highest precision)
        if "rules" in results:
            r = results["rules"]
            if r["direct_answers"]:
                parts.extend(r["direct_answers"])
                confidences.append(r["confidence"])
            elif r["conclusions"]:
                parts.extend(r["conclusions"][:3])
                confidences.append(r["confidence"])

        # Add symbolic insights
        if "symbolic" in results:
            s = results["symbolic"]
            if s["relevant_truths"]:
                parts.append(f"Known: {', '.join(s['relevant_truths'][:3])}")
                confidences.append(s["confidence"])

        # Neural as fallback or supplement
        if "neural" in results:
            n = results["neural"]
            if not parts:
                parts.append(n["response"])
            confidences.append(n["confidence"])

        conclusion = "; ".join(parts) if parts else "No conclusion derived"
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return conclusion, avg_confidence

    @staticmethod
    def _confidence_level(score: float) -> ConfidenceLevel:
        if score >= 0.95:
            return ConfidenceLevel.CERTAIN
        if score >= 0.75:
            return ConfidenceLevel.HIGH
        if score >= 0.50:
            return ConfidenceLevel.MODERATE
        if score >= 0.25:
            return ConfidenceLevel.LOW
        return ConfidenceLevel.SPECULATIVE

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)

    def summary(self) -> dict[str, Any]:
        return {
            "rules": {"count": self.rules.rule_count, "facts": self.rules.fact_count},
            "symbolic": {"truths": len(self.symbolic.known_truths)},
            "neural": {"model": self.neural._model_name, "calls": self.neural._call_count},
        }
