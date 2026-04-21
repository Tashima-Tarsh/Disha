from __future__ import annotations

import asyncio
import math
import time
from typing import Any

import structlog

log = structlog.get_logger(__name__)

_CONTEXT_BOOST_WEIGHT = 0.15
_CONFLICT_PENALTY = 0.20
_REINFORCEMENT_BOOST = 0.12

_CONFLICT_PAIRS: list[tuple[str, str]] = [
    ("approve", "reject"),
    ("proceed", "abort"),
    ("expand", "restrict"),
    ("disclose", "conceal"),
    ("accept", "decline"),
    ("increase", "decrease"),
    ("simplify", "elaborate"),
]

_REINFORCE_PAIRS: list[tuple[str, str]] = [
    ("explain", "clarify"),
    ("analyze", "evaluate"),
    ("plan", "execute"),
    ("confirm", "validate"),
    ("search", "retrieve"),
]


class QuantumDecisionEngine:
    def __init__(self) -> None:
        log.info("quantum_decision_engine.initialized")

    async def superpose(
        self, options: list[str], context: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if not options:
            return []

        log.info(
            "quantum_decision.superpose",
            num_options=len(options),
            context_keys=list(context.keys()),
        )

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

        superposition = self._apply_interference(superposition)

        superposition = self._apply_constructive(superposition)

        max_amp = max((s["amplitude"] for s in superposition), default=1.0)
        if max_amp > 0:
            for s in superposition:
                s["amplitude"] = round(s["amplitude"] / max_amp, 4)

        superposition.sort(key=lambda s: s["amplitude"], reverse=True)

        log.debug(
            "quantum_decision.superposition_created",
            options=[(s["option"][:30], s["amplitude"]) for s in superposition],
        )
        return superposition

    async def collapse(
        self, superposition: list[dict[str, Any]], constraint: str
    ) -> dict[str, Any]:
        if not superposition:
            return {
                "option": "no_decision",
                "final_amplitude": 0.0,
                "reason": "empty_superposition",
            }

        log.info("quantum_decision.collapse", constraint=constraint[:60])

        constraint_words = set(constraint.lower().split())

        boosted: list[dict[str, Any]] = []
        for entry in superposition:
            option_words = set(entry["option"].lower().split())
            overlap = len(constraint_words & option_words) / max(
                len(constraint_words), 1
            )
            boosted_amplitude = entry["amplitude"] * (1.0 + overlap * 0.5)
            boosted.append(
                {
                    **entry,
                    "amplitude": min(boosted_amplitude, 1.0),
                    "constraint_overlap": round(overlap, 3),
                }
            )

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
        log.info("quantum_decision.entangle")

        a_option: str = decision_a.get("option", str(decision_a))
        b_options: list[str] = []
        if "all_amplitudes" in decision_b:
            b_options = [x["option"] for x in decision_b["all_amplitudes"]]
        elif "option" in decision_b:
            b_options = [decision_b["option"]]
        else:
            b_options = [str(decision_b)]

        a_words = set(a_option.lower().split())

        implications: list[dict[str, Any]] = []
        for b_opt in b_options[:8]:
            b_words = set(b_opt.lower().split())

            overlap = len(a_words & b_words) / max(len(a_words | b_words), 1)

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
                    "correlation": round(
                        overlap
                        + (
                            0.2
                            if direction == "reinforcing"
                            else -0.1
                            if direction == "conflicting"
                            else 0.0
                        ),
                        4,
                    ),
                    "direction": direction,
                }
            )

        implications.sort(key=lambda x: x["correlation"], reverse=True)

        entanglement_strength = sum(
            abs(imp["correlation"]) for imp in implications
        ) / max(len(implications), 1)

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

    def _compute_amplitude(self, option: str, context: dict[str, Any]) -> float:
        option_words = set(option.lower().split())
        amplitude = 0.5

        context_text = str(context).lower()
        context_words = set(context_text.split())
        overlap = len(option_words & context_words) / max(len(option_words), 1)
        amplitude += overlap * _CONTEXT_BOOST_WEIGHT * 2

        intent = str(context.get("intent", "")).lower()
        if any(w in intent for w in option_words):
            amplitude += 0.10

        for ep in context.get("episodic_memories", [])[:5]:
            ep_text = str(ep.get("what", "") + " " + ep.get("outcome", "")).lower()
            ep_words = set(ep_text.split())
            ep_overlap = len(option_words & ep_words) / max(len(option_words), 1)
            if ep_overlap > 0.2 and ep.get("importance", 0.5) > 0.6:
                amplitude += ep_overlap * 0.10

        for sf in context.get("semantic_facts", [])[:3]:
            sf_text = str(sf.get("definition", "")).lower()
            sf_words = set(sf_text.split())
            sf_overlap = len(option_words & sf_words) / max(len(option_words), 1)
            amplitude += sf_overlap * 0.05

        amplitude = 0.1 + 0.85 * (1 / (1 + math.exp(-6 * (amplitude - 0.5))))

        return round(amplitude, 4)

    def _apply_interference(
        self, superposition: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        option_map = {s["option"].lower(): i for i, s in enumerate(superposition)}

        for ca, cb in _CONFLICT_PAIRS:
            a_indices = [i for opt, i in option_map.items() if ca in opt]
            b_indices = [i for opt, i in option_map.items() if cb in opt]

            for ai in a_indices:
                for bi in b_indices:
                    amp_a = superposition[ai]["amplitude"]
                    amp_b = superposition[bi]["amplitude"]

                    if amp_a < amp_b:
                        penalty = _CONFLICT_PENALTY * amp_a
                        superposition[ai]["amplitude"] = max(0.01, amp_a - penalty)
                        superposition[ai]["interference_factor"] = round(
                            superposition[ai]["interference_factor"]
                            * (1 - _CONFLICT_PENALTY),
                            4,
                        )
                    else:
                        penalty = _CONFLICT_PENALTY * amp_b
                        superposition[bi]["amplitude"] = max(0.01, amp_b - penalty)
                        superposition[bi]["interference_factor"] = round(
                            superposition[bi]["interference_factor"]
                            * (1 - _CONFLICT_PENALTY),
                            4,
                        )

        log.debug("quantum_decision.destructive_interference_applied")
        return superposition

    def _apply_constructive(
        self, superposition: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        for ra, rb in _REINFORCE_PAIRS:
            a_indices = [
                i for i, s in enumerate(superposition) if ra in s["option"].lower()
            ]
            b_indices = [
                i for i, s in enumerate(superposition) if rb in s["option"].lower()
            ]

            for ai in a_indices:
                for bi in b_indices:
                    boost_a = _REINFORCEMENT_BOOST * superposition[ai]["amplitude"]
                    boost_b = _REINFORCEMENT_BOOST * superposition[bi]["amplitude"]
                    superposition[ai]["amplitude"] = min(
                        1.0, superposition[ai]["amplitude"] + boost_a
                    )
                    superposition[bi]["amplitude"] = min(
                        1.0, superposition[bi]["amplitude"] + boost_b
                    )

        log.debug("quantum_decision.constructive_interference_applied")
        return superposition
