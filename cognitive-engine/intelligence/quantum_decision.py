"""
QuantumDecisionEngine — Quantum-Inspired Decision Framework for DISHA.

IMPORTANT DISCLAIMER: This module is quantum-INSPIRED, not actual quantum computing.
It borrows the mathematical metaphors of quantum mechanics — superposition, amplitude,
interference, entanglement, collapse — to model multi-option decision-making under
uncertainty. No quantum hardware or libraries are used.

Core concepts modelled:
  Superposition  : Multiple candidate decisions exist simultaneously as weighted possibilities.
  Amplitude      : Each option's "quantum amplitude" represents its likelihood/fitness score.
  Interference   : Conflicting options destructively reduce each other's amplitudes.
  Constructive   : Reinforcing options constructively boost each other's amplitudes.
  Collapse       : Applying a constraint collapses the superposition to a single best option.
  Entanglement   : Shows how choosing decision A correlates with decision B's outcome space.

Role in architecture:
    QuantumDecisionEngine is available to the _act phase as an optional
    decision optimization layer. It is particularly useful when the AgentDeliberator
    produces multiple high-confidence options that are difficult to discriminate.
"""

from __future__ import annotations

import asyncio
import math
import time
from typing import Any

import structlog

log = structlog.get_logger(__name__)

# Context-keyword score table: if a keyword from the option appears in context,
# it gets a positive amplitude boost.
_CONTEXT_BOOST_WEIGHT = 0.15
_CONFLICT_PENALTY = 0.20
_REINFORCEMENT_BOOST = 0.12

# Known conflicting option pairs (simplified heuristic)
_CONFLICT_PAIRS: list[tuple[str, str]] = [
    ("approve", "reject"),
    ("proceed", "abort"),
    ("expand", "restrict"),
    ("disclose", "conceal"),
    ("accept", "decline"),
    ("increase", "decrease"),
    ("simplify", "elaborate"),
]

# Known reinforcing pairs
_REINFORCE_PAIRS: list[tuple[str, str]] = [
    ("explain", "clarify"),
    ("analyze", "evaluate"),
    ("plan", "execute"),
    ("confirm", "validate"),
    ("search", "retrieve"),
]


class QuantumDecisionEngine:
    """
    Quantum-inspired decision optimizer using superposition, interference, and collapse.

    The engine maintains no persistent state between calls; each method is stateless
    and operates on the provided superposition list.
    """

    def __init__(self) -> None:
        log.info("quantum_decision_engine.initialized")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def superpose(
        self, options: list[str], context: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """
        Place all options into superposition by computing initial amplitudes.

        Each option gets an amplitude score in [0, 1] based on context
        keyword matching and heuristics. Then interference is applied to
        reduce amplitudes of conflicting options.

        Args:
            options: List of candidate decision strings.
            context: Current cognitive context dict.

        Returns:
            List of superposition entries:
            [{option, amplitude, interference_factor, raw_amplitude}]
        """
        if not options:
            return []

        log.info(
            "quantum_decision.superpose",
            num_options=len(options),
            context_keys=list(context.keys()),
        )

        # Compute raw amplitudes in parallel (thread pool since it's CPU-bound heuristics)
        tasks = [
            asyncio.to_thread(self._compute_amplitude, opt, context) for opt in options
        ]
        raw_amplitudes = await asyncio.gather(*tasks)

        superposition: list[dict[str, Any]] = [
            {
                "option": opt,
                "amplitude": amp,
                "raw_amplitude": amp,
                "interference_factor": 1.0,
            }
            for opt, amp in zip(options, raw_amplitudes)
        ]

        # Apply destructive interference
        superposition = self._apply_interference(superposition)

        # Apply constructive interference (boost)
        superposition = self._apply_constructive(superposition)

        # Normalize amplitudes to [0, 1]
        max_amp = max((s["amplitude"] for s in superposition), default=1.0)
        if max_amp > 0:
            for s in superposition:
                s["amplitude"] = round(s["amplitude"] / max_amp, 4)

        # Sort by amplitude descending
        superposition.sort(key=lambda s: s["amplitude"], reverse=True)

        log.debug(
            "quantum_decision.superposition_created",
            options=[(s["option"][:30], s["amplitude"]) for s in superposition],
        )
        return superposition

    async def collapse(
        self, superposition: list[dict[str, Any]], constraint: str
    ) -> dict[str, Any]:
        """
        Collapse the superposition to a single decision by applying a constraint.

        The constraint is matched against each option as a keyword filter.
        Options that contain constraint keywords get an amplitude boost before
        the final collapse measurement.

        Args:
            superposition: Output of superpose().
            constraint:    Natural language constraint string (e.g. "must be safe").

        Returns:
            The collapsed (selected) option dict with {option, final_amplitude, reason}.
        """
        if not superposition:
            return {"option": "no_decision", "final_amplitude": 0.0, "reason": "empty_superposition"}

        log.info("quantum_decision.collapse", constraint=constraint[:60])

        constraint_words = set(constraint.lower().split())

        # Apply constraint boost
        boosted: list[dict[str, Any]] = []
        for entry in superposition:
            option_words = set(entry["option"].lower().split())
            overlap = len(constraint_words & option_words) / max(len(constraint_words), 1)
            boosted_amplitude = entry["amplitude"] * (1.0 + overlap * 0.5)
            boosted.append(
                {
                    **entry,
                    "amplitude": min(boosted_amplitude, 1.0),
                    "constraint_overlap": round(overlap, 3),
                }
            )

        # Measurement: select highest amplitude (wave function collapse)
        selected = max(boosted, key=lambda s: s["amplitude"])

        result = {
            "option": selected["option"],
            "final_amplitude": round(selected["amplitude"], 4),
            "constraint_overlap": selected.get("constraint_overlap", 0.0),
            "reason": (
                f"Highest post-constraint amplitude ({selected['amplitude']:.4f}) "
                f"after applying constraint '{constraint[:40]}'"
            ),
            "all_amplitudes": [
                {"option": s["option"][:40], "amplitude": round(s["amplitude"], 4)}
                for s in sorted(boosted, key=lambda x: x["amplitude"], reverse=True)
            ],
            "timestamp": time.time(),
        }

        log.info(
            "quantum_decision.collapsed",
            selected=selected["option"][:60],
            amplitude=selected["amplitude"],
        )
        return result

    async def entangle(
        self, decision_a: dict[str, Any], decision_b: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Analyse how decision A correlates with the outcome space of decision B.

        'Entanglement' here means: if A is chosen, what does it imply about
        which options in B become more or less likely? This is modelled as
        semantic keyword correlation between the two decisions' option spaces.

        Args:
            decision_a: A superposition dict or collapsed decision dict.
            decision_b: A superposition dict or collapsed decision dict.

        Returns:
            {
                "a_chosen": str,
                "b_implications": list[{option, correlation, direction}],
                "entanglement_strength": float,
                "explanation": str,
            }
        """
        log.info("quantum_decision.entangle")

        # Extract option strings from either format
        a_option: str = decision_a.get("option", str(decision_a))
        b_options: list[str] = []
        if "all_amplitudes" in decision_b:
            b_options = [x["option"] for x in decision_b["all_amplitudes"]]
        elif "option" in decision_b:
            b_options = [decision_b["option"]]
        else:
            b_options = [str(decision_b)]

        a_words = set(a_option.lower().split())

        # For each B option, compute semantic correlation with A
        implications: list[dict[str, Any]] = []
        for b_opt in b_options[:8]:  # limit to 8 options max
            b_words = set(b_opt.lower().split())

            # Semantic overlap
            overlap = len(a_words & b_words) / max(len(a_words | b_words), 1)

            # Check for known conflict or reinforcement
            direction = "neutral"
            for ca, cb in _CONFLICT_PAIRS:
                if (ca in a_option.lower() and cb in b_opt.lower()) or (
                    cb in a_option.lower() and ca in b_opt.lower()
                ):
                    direction = "conflicting"
                    break
            if direction == "neutral":
                for ra, rb in _REINFORCE_PAIRS:
                    if (ra in a_option.lower() and rb in b_opt.lower()) or (
                        rb in a_option.lower() and ra in b_opt.lower()
                    ):
                        direction = "reinforcing"
                        break

            implications.append(
                {
                    "option": b_opt,
                    "correlation": round(overlap + (0.2 if direction == "reinforcing" else -0.1 if direction == "conflicting" else 0.0), 4),
                    "direction": direction,
                }
            )

        implications.sort(key=lambda x: x["correlation"], reverse=True)

        entanglement_strength = (
            sum(abs(imp["correlation"]) for imp in implications) / max(len(implications), 1)
        )

        explanation = (
            f"Choosing '{a_option[:40]}' creates correlation structure across B's option space. "
            f"Strongest co-selection: '{implications[0]['option'][:30] if implications else 'N/A'}' "
            f"({implications[0]['direction'] if implications else 'N/A'}). "
            f"Overall entanglement strength: {entanglement_strength:.3f}."
        )

        return {
            "a_chosen": a_option,
            "b_implications": implications,
            "entanglement_strength": round(entanglement_strength, 4),
            "explanation": explanation,
            "timestamp": time.time(),
        }

    # ------------------------------------------------------------------
    # Internal quantum-inspired computations
    # ------------------------------------------------------------------

    def _compute_amplitude(self, option: str, context: dict[str, Any]) -> float:
        """
        Score an option against context using keyword matching and heuristics.

        Amplitude formula:
            base = 0.5  (equal prior)
            + context_keyword_boost (max +0.30)
            + intent_alignment (max +0.15)
            + recency_of_similar_episodes (max +0.10)

        Args:
            option:  The decision option string.
            context: Cognitive context dict.

        Returns:
            Raw amplitude score in [0.1, 1.0].
        """
        option_words = set(option.lower().split())
        amplitude = 0.5  # uniform prior (equal superposition)

        # Context keyword match
        context_text = str(context).lower()
        context_words = set(context_text.split())
        overlap = len(option_words & context_words) / max(len(option_words), 1)
        amplitude += overlap * _CONTEXT_BOOST_WEIGHT * 2

        # Intent alignment bonus
        intent = str(context.get("intent", "")).lower()
        if any(w in intent for w in option_words):
            amplitude += 0.10

        # Episodic memory: if similar action led to good outcome before, boost
        for ep in context.get("episodic_memories", [])[:5]:
            ep_text = str(ep.get("what", "") + " " + ep.get("outcome", "")).lower()
            ep_words = set(ep_text.split())
            ep_overlap = len(option_words & ep_words) / max(len(option_words), 1)
            if ep_overlap > 0.2 and ep.get("importance", 0.5) > 0.6:
                amplitude += ep_overlap * 0.10

        # Semantic memory alignment
        for sf in context.get("semantic_facts", [])[:3]:
            sf_text = str(sf.get("definition", "")).lower()
            sf_words = set(sf_text.split())
            sf_overlap = len(option_words & sf_words) / max(len(option_words), 1)
            amplitude += sf_overlap * 0.05

        # Apply sigmoid-like squashing to keep in [0.1, 0.95]
        amplitude = 0.1 + 0.85 * (1 / (1 + math.exp(-6 * (amplitude - 0.5))))

        return round(amplitude, 4)

    def _apply_interference(
        self, superposition: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Destructive interference: reduce amplitude of options that conflict with others.

        For each known conflict pair, if both options are present in the superposition,
        the lower-amplitude one receives a penalty.

        Args:
            superposition: Current superposition list.

        Returns:
            Updated superposition with destructive interference applied.
        """
        option_map = {s["option"].lower(): i for i, s in enumerate(superposition)}

        for ca, cb in _CONFLICT_PAIRS:
            # Find entries containing these conflict keywords
            a_indices = [i for opt, i in option_map.items() if ca in opt]
            b_indices = [i for opt, i in option_map.items() if cb in opt]

            for ai in a_indices:
                for bi in b_indices:
                    amp_a = superposition[ai]["amplitude"]
                    amp_b = superposition[bi]["amplitude"]
                    # Lower amplitude option gets destructive penalty
                    if amp_a < amp_b:
                        penalty = _CONFLICT_PENALTY * amp_a
                        superposition[ai]["amplitude"] = max(0.01, amp_a - penalty)
                        superposition[ai]["interference_factor"] = round(
                            superposition[ai]["interference_factor"] * (1 - _CONFLICT_PENALTY), 4
                        )
                    else:
                        penalty = _CONFLICT_PENALTY * amp_b
                        superposition[bi]["amplitude"] = max(0.01, amp_b - penalty)
                        superposition[bi]["interference_factor"] = round(
                            superposition[bi]["interference_factor"] * (1 - _CONFLICT_PENALTY), 4
                        )

        log.debug("quantum_decision.destructive_interference_applied")
        return superposition

    def _apply_constructive(
        self, superposition: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Constructive interference: boost amplitudes of options that reinforce each other.

        For each known reinforcement pair, if both options are present, both receive
        a proportional amplitude boost.

        Args:
            superposition: Current superposition list.

        Returns:
            Updated superposition with constructive interference applied.
        """
        for ra, rb in _REINFORCE_PAIRS:
            a_indices = [
                i for i, s in enumerate(superposition) if ra in s["option"].lower()
            ]
            b_indices = [
                i for i, s in enumerate(superposition) if rb in s["option"].lower()
            ]

            for ai in a_indices:
                for bi in b_indices:
                    # Both get a boost
                    boost_a = _REINFORCEMENT_BOOST * superposition[ai]["amplitude"]
                    boost_b = _REINFORCEMENT_BOOST * superposition[bi]["amplitude"]
                    superposition[ai]["amplitude"] = min(1.0, superposition[ai]["amplitude"] + boost_a)
                    superposition[bi]["amplitude"] = min(1.0, superposition[bi]["amplitude"] + boost_b)

        log.debug("quantum_decision.constructive_interference_applied")
        return superposition
