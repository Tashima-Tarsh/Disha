"""Quantum-Inspired Reasoning — Probabilistic multi-path simulation.

Implements quantum-computing-inspired concepts for classical AI reasoning:
- Superposition: Maintain multiple hypotheses simultaneously
- Entanglement: Correlated decision variables
- Interference: Constructive/destructive combination of evidence
- Measurement: Collapsing to a final decision with probabilistic selection

This is NOT actual quantum computing — it uses quantum metaphors
to implement powerful probabilistic reasoning on classical hardware.
"""

from __future__ import annotations

import logging
import math
import random
from typing import Any

from ..types import (
    CognitiveEvent,
    QuantumState,
)

logger = logging.getLogger(__name__)


class QuantumSuperposition:
    """Maintains multiple hypotheses in superposition until measurement.
    
    Each hypothesis has an amplitude (complex-like, but we use real numbers)
    that determines its probability of being selected upon collapse.
    """

    def __init__(self, hypotheses: list[dict[str, Any]] | None = None) -> None:
        self._state = QuantumState()
        if hypotheses:
            total = sum(h.get("probability", 1.0) for h in hypotheses)
            for h in hypotheses:
                prob = h.get("probability", 1.0) / total if total > 0 else 1.0 / len(hypotheses)
                self._state.branches.append({
                    "state": h.get("state", h),
                    "probability": prob,
                    "amplitude": math.sqrt(prob),
                    "metadata": h.get("metadata", {}),
                })

    def add_branch(self, state: Any, probability: float, metadata: dict[str, Any] | None = None) -> None:
        """Add a new branch to the superposition."""
        self._state.branches.append({
            "state": state,
            "probability": probability,
            "amplitude": math.sqrt(max(probability, 0.001)),
            "metadata": metadata or {},
        })
        self._normalize()

    def interfere(self, branch_a: int, branch_b: int, constructive: bool = True) -> None:
        """Apply interference between two branches.
        
        Constructive interference: amplitudes add (strengthen).
        Destructive interference: amplitudes subtract (weaken).
        """
        if branch_a >= len(self._state.branches) or branch_b >= len(self._state.branches):
            return

        a = self._state.branches[branch_a]
        b = self._state.branches[branch_b]

        if constructive:
            # Constructive: boost both
            a["amplitude"] = min(a["amplitude"] * 1.2, 1.0)
            b["amplitude"] = min(b["amplitude"] * 1.2, 1.0)
        else:
            # Destructive: weaken the lower-probability branch
            if a["probability"] < b["probability"]:
                a["amplitude"] = max(a["amplitude"] * 0.5, 0.01)
            else:
                b["amplitude"] = max(b["amplitude"] * 0.5, 0.01)

        # Update probabilities from amplitudes
        for branch in self._state.branches:
            branch["probability"] = branch["amplitude"] ** 2

        self._normalize()

    def measure(self) -> dict[str, Any]:
        """Collapse the superposition to a single state (probabilistic selection)."""
        if self._state.collapsed:
            return self._state.branches[self._state.selected_branch or 0]

        # Probabilistic selection based on normalized probabilities
        probs = [b["probability"] for b in self._state.branches]
        total = sum(probs)
        if total == 0:
            idx = 0
        else:
            r = random.random() * total
            cumulative = 0.0
            idx = 0
            for i, p in enumerate(probs):
                cumulative += p
                if r <= cumulative:
                    idx = i
                    break

        result = self._state.collapse(idx)
        logger.info(
            "Superposition collapsed to branch %d (p=%.3f)",
            idx, result.get("probability", 0),
        )
        return result

    def measure_top_k(self, k: int = 3) -> list[dict[str, Any]]:
        """Return the top-k most probable branches without full collapse."""
        sorted_branches = sorted(
            enumerate(self._state.branches),
            key=lambda x: x[1]["probability"],
            reverse=True,
        )
        return [
            {"rank": i + 1, "branch_index": idx, **branch}
            for i, (idx, branch) in enumerate(sorted_branches[:k])
        ]

    @property
    def entropy(self) -> float:
        return self._state.entropy

    @property
    def branch_count(self) -> int:
        return len(self._state.branches)

    @property
    def is_collapsed(self) -> bool:
        return self._state.collapsed

    @property
    def coherence(self) -> float:
        return self._state.coherence

    def _normalize(self) -> None:
        """Normalize probabilities to sum to 1."""
        total = sum(b["probability"] for b in self._state.branches)
        if total > 0:
            for b in self._state.branches:
                b["probability"] /= total


class QuantumEntanglement:
    """Models correlated decision variables.
    
    When two variables are entangled, measuring one instantly
    constrains the other's possible values.
    """

    def __init__(self) -> None:
        self._pairs: list[tuple[str, str, dict[str, str]]] = []
        # pairs: (var_a, var_b, correlation_map)

    def entangle(
        self,
        var_a: str,
        var_b: str,
        correlations: dict[str, str],
    ) -> None:
        """Entangle two variables with a correlation map.
        
        Args:
            var_a: First variable name.
            var_b: Second variable name.
            correlations: Mapping of var_a values to var_b values.
        """
        self._pairs.append((var_a, var_b, correlations))

    def measure(self, variable: str, value: str) -> list[dict[str, Any]]:
        """Measure a variable and propagate constraints to entangled partners."""
        effects: list[dict[str, Any]] = []
        for var_a, var_b, corr in self._pairs:
            if variable == var_a and value in corr:
                effects.append({
                    "constrained_variable": var_b,
                    "constrained_value": corr[value],
                    "source": var_a,
                    "trigger_value": value,
                })
            elif variable == var_b:
                # Reverse lookup
                for k, v in corr.items():
                    if v == value:
                        effects.append({
                            "constrained_variable": var_a,
                            "constrained_value": k,
                            "source": var_b,
                            "trigger_value": value,
                        })
        return effects

    @property
    def pair_count(self) -> int:
        return len(self._pairs)


class ParallelPathSimulator:
    """Simulates multiple decision paths in parallel.
    
    Evaluates multiple strategies/approaches simultaneously and
    selects the best based on simulated outcomes.
    """

    def __init__(self, max_paths: int = 10, simulation_depth: int = 5) -> None:
        self._max_paths = max_paths
        self._simulation_depth = simulation_depth

    def simulate(
        self,
        initial_state: dict[str, Any],
        actions: list[dict[str, Any]],
        *,
        evaluation_fn: Any | None = None,
    ) -> list[dict[str, Any]]:
        """Simulate multiple action paths from an initial state.
        
        Args:
            initial_state: Starting conditions.
            actions: Available actions at each step.
            evaluation_fn: Optional function(state) -> score. Defaults to random scoring.
            
        Returns:
            Ranked list of simulated paths with scores.
        """
        paths: list[dict[str, Any]] = []

        for i, action in enumerate(actions[:self._max_paths]):
            # Simulate path
            state = dict(initial_state)
            steps: list[dict[str, Any]] = []

            for depth in range(self._simulation_depth):
                # Apply action to state
                state = self._apply_action(state, action, depth)
                score = evaluation_fn(state) if evaluation_fn else self._default_evaluate(state)
                steps.append({
                    "depth": depth,
                    "state_snapshot": dict(state),
                    "score": score,
                })

            final_score = steps[-1]["score"] if steps else 0.0
            paths.append({
                "path_index": i,
                "action": action,
                "steps": steps,
                "final_score": round(final_score, 3),
                "avg_score": round(
                    sum(s["score"] for s in steps) / len(steps), 3
                ) if steps else 0.0,
            })

        # Rank by final score
        paths.sort(key=lambda p: p["final_score"], reverse=True)
        return paths

    @staticmethod
    def _apply_action(state: dict[str, Any], action: dict[str, Any], depth: int) -> dict[str, Any]:
        """Simulate applying an action to a state."""
        new_state = dict(state)
        action_type = action.get("type", "default")
        new_state["last_action"] = action_type
        new_state["depth"] = depth
        # Simulate state evolution
        new_state["progress"] = state.get("progress", 0.0) + random.uniform(0.05, 0.2)
        new_state["risk"] = max(0, state.get("risk", 0.5) + random.uniform(-0.15, 0.1))
        new_state["cost"] = state.get("cost", 0.0) + random.uniform(0.01, 0.1)
        return new_state

    @staticmethod
    def _default_evaluate(state: dict[str, Any]) -> float:
        """Default state evaluation: progress - risk - cost."""
        progress = state.get("progress", 0.0)
        risk = state.get("risk", 0.5)
        cost = state.get("cost", 0.0)
        return max(0.0, min(1.0, progress * 0.5 - risk * 0.3 - cost * 0.2))


class QuantumReasoningEngine:
    """Main quantum-inspired reasoning engine.
    
    Combines superposition, entanglement, and parallel path simulation
    for probabilistic multi-path decision making.
    
    Example:
        engine = QuantumReasoningEngine()
        
        # Create hypothesis superposition
        result = engine.explore_hypotheses(
            hypotheses=[
                {"state": "SQL Injection", "probability": 0.4},
                {"state": "XSS Attack", "probability": 0.3},
                {"state": "False Positive", "probability": 0.3},
            ],
            evidence=["web traffic spike", "unusual query patterns"],
        )
        print(result["selected_hypothesis"])
        print(result["all_hypotheses"])
    """

    def __init__(self, max_paths: int = 10) -> None:
        self._path_simulator = ParallelPathSimulator(max_paths=max_paths)
        self._entanglement = QuantumEntanglement()
        self._event_log: list[CognitiveEvent] = []

    def explore_hypotheses(
        self,
        hypotheses: list[dict[str, Any]],
        *,
        evidence: list[str] | None = None,
        auto_collapse: bool = True,
    ) -> dict[str, Any]:
        """Explore multiple hypotheses in superposition.
        
        Optionally applies evidence as interference effects
        before collapsing to the most probable hypothesis.
        """
        superposition = QuantumSuperposition(hypotheses)

        # Apply evidence as interference
        if evidence:
            for ev in evidence:
                self._apply_evidence_interference(superposition, ev, hypotheses)

        result: dict[str, Any] = {
            "branch_count": superposition.branch_count,
            "entropy": round(superposition.entropy, 3),
            "coherence": superposition.coherence,
        }

        if auto_collapse:
            selected = superposition.measure()
            result["selected_hypothesis"] = selected.get("state")
            result["selected_probability"] = round(selected.get("probability", 0), 3)
        
        result["all_hypotheses"] = superposition.measure_top_k(len(hypotheses))

        self._event_log.append(CognitiveEvent(
            event_type="quantum_exploration",
            source_layer="quantum_reasoning",
            payload={
                "hypothesis_count": len(hypotheses),
                "evidence_count": len(evidence) if evidence else 0,
                "entropy": result["entropy"],
            },
        ))

        return result

    def parallel_decide(
        self,
        options: list[dict[str, Any]],
        initial_conditions: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Evaluate multiple options through parallel path simulation."""
        state = initial_conditions or {"progress": 0.0, "risk": 0.5, "cost": 0.0}
        paths = self._path_simulator.simulate(state, options)

        self._event_log.append(CognitiveEvent(
            event_type="parallel_decision",
            source_layer="quantum_reasoning",
            payload={
                "option_count": len(options),
                "best_score": paths[0]["final_score"] if paths else 0.0,
            },
        ))

        return {
            "best_option": paths[0] if paths else None,
            "all_paths": paths,
            "option_count": len(options),
        }

    def entangle_decisions(
        self,
        var_a: str,
        var_b: str,
        correlations: dict[str, str],
    ) -> None:
        """Establish correlation between decision variables."""
        self._entanglement.entangle(var_a, var_b, correlations)

    def constrain(self, variable: str, value: str) -> list[dict[str, Any]]:
        """Measure a variable and get entanglement constraints."""
        return self._entanglement.measure(variable, value)

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)

    @staticmethod
    def _apply_evidence_interference(
        superposition: QuantumSuperposition,
        evidence: str,
        hypotheses: list[dict[str, Any]],
    ) -> None:
        """Apply evidence as constructive/destructive interference on branches."""
        evidence_lower = evidence.lower()
        for i, hyp in enumerate(hypotheses):
            state_str = str(hyp.get("state", "")).lower()
            # Simple word overlap as relevance signal
            common_words = set(evidence_lower.split()) & set(state_str.split())
            if common_words and i + 1 < len(hypotheses):
                # Constructive interference for matching hypothesis
                superposition.interfere(i, i + 1 if i + 1 < superposition.branch_count else 0, constructive=True)
