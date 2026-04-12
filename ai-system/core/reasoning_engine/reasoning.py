"""
Quantum-Inspired Reasoning Engine and Decision Framework.

Provides Bayesian hypothesis management with entropy measurement and a
multi-criteria decision framework using the TOPSIS method.
"""

from __future__ import annotations

import logging
import math
import random
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# =========================================================================
# Hypothesis
# =========================================================================
@dataclass
class Hypothesis:
    """A single hypothesis with associated evidence and probability.

    Attributes:
        id: Unique identifier (auto-generated if not provided).
        description: Human-readable description.
        evidence: List of ``(evidence_label, weight)`` tuples.
        probability: Current probability in [0, 1].
        metadata: Arbitrary extra information.
    """

    description: str
    probability: float = 0.5
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    evidence: List[Tuple[str, float]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.probability = max(0.0, min(1.0, self.probability))


# =========================================================================
# Reasoning Engine
# =========================================================================
class ReasoningEngine:
    """Bayesian reasoning over a set of competing hypotheses.

    Inspired by quantum superposition: all hypotheses coexist with
    associated probabilities until *collapsed* into a single selection.

    Example::

        engine = ReasoningEngine()
        h1 = engine.add_hypothesis("It will rain", initial_prob=0.4)
        h2 = engine.add_hypothesis("It will be sunny", initial_prob=0.6)
        engine.update_evidence(h1, "dark clouds", weight=0.8)
        engine.bayesian_update()
        best = engine.collapse()
    """

    def __init__(self, seed: Optional[int] = None) -> None:
        self._hypotheses: Dict[str, Hypothesis] = {}
        self._rng = random.Random(seed)

    # -- Hypothesis management ----------------------------------------------

    def add_hypothesis(
        self,
        description: str,
        initial_prob: float = 0.5,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Create a new hypothesis and return its id.

        Args:
            description: Human-readable description.
            initial_prob: Starting probability in [0, 1].
            metadata: Optional extra data.

        Returns:
            The auto-generated hypothesis id.
        """
        h = Hypothesis(
            description=description,
            probability=initial_prob,
            metadata=metadata or {},
        )
        self._hypotheses[h.id] = h
        logger.info("Added hypothesis '%s' (id=%s, p=%.4f)", description, h.id, h.probability)
        return h.id

    def get_hypothesis(self, hypothesis_id: str) -> Hypothesis:
        """Return the :class:`Hypothesis` with the given *hypothesis_id*."""
        try:
            return self._hypotheses[hypothesis_id]
        except KeyError:
            raise KeyError(f"Unknown hypothesis id: {hypothesis_id}") from None

    # -- Evidence -----------------------------------------------------------

    def update_evidence(
        self,
        hypothesis_id: str,
        evidence: str,
        weight: float = 1.0,
    ) -> None:
        """Attach a piece of evidence to a hypothesis.

        The *weight* represents how strongly the evidence supports (> 0) or
        contradicts (< 0) the hypothesis.

        Args:
            hypothesis_id: Target hypothesis.
            evidence: Label describing the evidence.
            weight: Support weight (positive = supports, negative = opposes).
        """
        h = self.get_hypothesis(hypothesis_id)
        h.evidence.append((evidence, weight))
        logger.debug("Evidence '%s' (w=%.2f) added to hypothesis %s", evidence, weight, hypothesis_id)

    # -- Bayesian update ----------------------------------------------------

    def bayesian_update(self) -> None:
        """Perform a Bayesian-style update across all hypotheses.

        For each hypothesis the accumulated evidence weights are used to
        compute a likelihood, and probabilities are then normalised so they
        sum to 1.  The likelihood model uses a sigmoid-like transformation
        of cumulative evidence weight to keep values in (0, 1).
        """
        if not self._hypotheses:
            return

        likelihoods: Dict[str, float] = {}
        for hid, h in self._hypotheses.items():
            cumulative = sum(w for _, w in h.evidence) if h.evidence else 0.0
            # Sigmoid mapping: higher cumulative weight → higher likelihood
            likelihood = 1.0 / (1.0 + math.exp(-cumulative))
            likelihoods[hid] = likelihood * h.probability

        total = sum(likelihoods.values())
        if total <= 0:
            # Uniform fallback
            n = len(self._hypotheses)
            for h in self._hypotheses.values():
                h.probability = 1.0 / n
        else:
            for hid, h in self._hypotheses.items():
                h.probability = likelihoods[hid] / total

        logger.info(
            "Bayesian update complete – probabilities: %s",
            {hid: round(h.probability, 4) for hid, h in self._hypotheses.items()},
        )

    # -- Superposition & collapse -------------------------------------------

    def get_superposition(self) -> List[Tuple[str, str, float]]:
        """Return all hypotheses with their current probabilities.

        Returns:
            List of ``(id, description, probability)`` tuples sorted by
            descending probability.
        """
        items = [
            (h.id, h.description, h.probability)
            for h in self._hypotheses.values()
        ]
        items.sort(key=lambda t: t[2], reverse=True)
        return items

    def collapse(self, method: str = "best") -> Hypothesis:
        """Select a single hypothesis, collapsing the superposition.

        Args:
            method: ``"best"`` returns the highest-probability hypothesis.
                ``"weighted"`` samples randomly weighted by probability.

        Returns:
            The selected :class:`Hypothesis`.

        Raises:
            RuntimeError: If there are no hypotheses.
        """
        if not self._hypotheses:
            raise RuntimeError("No hypotheses to collapse.")

        hypotheses = list(self._hypotheses.values())

        if method == "weighted":
            probs = [h.probability for h in hypotheses]
            total = sum(probs)
            if total <= 0:
                chosen = self._rng.choice(hypotheses)
            else:
                chosen = self._rng.choices(hypotheses, weights=probs, k=1)[0]
        else:
            chosen = max(hypotheses, key=lambda h: h.probability)

        logger.info("Collapsed to hypothesis '%s' (p=%.4f)", chosen.description, chosen.probability)
        return chosen

    # -- Entropy ------------------------------------------------------------

    def get_entropy(self) -> float:
        """Compute Shannon entropy over hypothesis probabilities.

        Returns:
            Entropy in *nats* (natural log).  Zero means total certainty.
        """
        probs = [h.probability for h in self._hypotheses.values() if h.probability > 0]
        if not probs:
            return 0.0
        return -sum(p * math.log(p) for p in probs)

    # -- Pruning ------------------------------------------------------------

    def prune(self, threshold: float = 0.01) -> List[str]:
        """Remove hypotheses with probability below *threshold*.

        Args:
            threshold: Minimum probability to keep.

        Returns:
            List of removed hypothesis ids.
        """
        to_remove = [
            hid for hid, h in self._hypotheses.items() if h.probability < threshold
        ]
        for hid in to_remove:
            del self._hypotheses[hid]
        if to_remove:
            logger.info("Pruned %d hypotheses below threshold %.4f", len(to_remove), threshold)
        return to_remove


# =========================================================================
# Decision Framework
# =========================================================================
class DecisionFramework:
    """Multi-criteria decision analysis utilities.

    Provides option evaluation, TOPSIS ranking, and basic sensitivity
    analysis over criteria weights.
    """

    def evaluate_options(
        self,
        options: List[Dict[str, Any]],
        criteria_weights: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Score and rank a list of options against weighted criteria.

        Each option is a dict with at least a ``"name"`` key and numeric
        values for every key present in *criteria_weights*.

        Args:
            options: List of option dicts.
            criteria_weights: ``{criterion_name: weight}`` mapping.

        Returns:
            A new list of dicts with added ``"score"`` and ``"rank"`` keys,
            sorted by descending score.
        """
        if not options or not criteria_weights:
            return []

        total_weight = sum(abs(w) for w in criteria_weights.values()) or 1.0
        normed_weights = {k: w / total_weight for k, w in criteria_weights.items()}

        scored: List[Dict[str, Any]] = []
        for opt in options:
            score = 0.0
            for criterion, weight in normed_weights.items():
                score += weight * float(opt.get(criterion, 0))
            entry = dict(opt)
            entry["score"] = score
            scored.append(entry)

        scored.sort(key=lambda o: o["score"], reverse=True)
        for rank, entry in enumerate(scored, start=1):
            entry["rank"] = rank

        return scored

    def multi_criteria_decision(
        self,
        matrix: np.ndarray,
        weights: np.ndarray,
        beneficial: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """Rank alternatives using the TOPSIS method.

        Args:
            matrix: ``(n_alternatives, n_criteria)`` performance matrix.
            weights: ``(n_criteria,)`` importance weights (will be normalised).
            beneficial: ``(n_criteria,)`` boolean array.  ``True`` means
                higher is better; ``False`` means lower is better.
                Defaults to all beneficial.

        Returns:
            ``(n_alternatives,)`` array of closeness coefficients in [0, 1],
            where higher is better.
        """
        mat = np.array(matrix, dtype=np.float64)
        w = np.array(weights, dtype=np.float64)
        w = w / w.sum()

        if mat.ndim != 2:
            raise ValueError("matrix must be 2-D (alternatives × criteria)")
        n_alt, n_cri = mat.shape
        if w.shape[0] != n_cri:
            raise ValueError("weights length must match number of criteria")

        if beneficial is None:
            beneficial = np.ones(n_cri, dtype=bool)
        else:
            beneficial = np.asarray(beneficial, dtype=bool)

        # Step 1 – normalise
        norms = np.sqrt((mat ** 2).sum(axis=0))
        norms[norms == 0] = 1.0
        normed = mat / norms

        # Step 2 – weighted normalised matrix
        weighted = normed * w

        # Step 3 – ideal best / worst
        ideal_best = np.where(beneficial, weighted.max(axis=0), weighted.min(axis=0))
        ideal_worst = np.where(beneficial, weighted.min(axis=0), weighted.max(axis=0))

        # Step 4 – distances
        dist_best = np.sqrt(((weighted - ideal_best) ** 2).sum(axis=1))
        dist_worst = np.sqrt(((weighted - ideal_worst) ** 2).sum(axis=1))

        # Step 5 – closeness coefficient
        denom = dist_best + dist_worst
        denom[denom == 0] = 1.0
        closeness = dist_worst / denom

        logger.debug("TOPSIS closeness coefficients: %s", closeness)
        return closeness

    def sensitivity_analysis(
        self,
        base_matrix: np.ndarray,
        base_weights: np.ndarray,
        vary_index: int,
        n_samples: int = 50,
        beneficial: Optional[np.ndarray] = None,
    ) -> Dict[str, np.ndarray]:
        """Vary one criterion weight and observe changes in TOPSIS ranking.

        The weight at *vary_index* is swept from 0 to 1 while the remaining
        weights are proportionally rescaled to keep the total constant.

        Args:
            base_matrix: Performance matrix.
            base_weights: Baseline weights.
            vary_index: Index of the criterion to vary.
            n_samples: Number of sample points.
            beneficial: Beneficial array passed to TOPSIS.

        Returns:
            Dictionary with ``"weight_values"`` and ``"closeness"`` arrays.
        """
        base_w = np.array(base_weights, dtype=np.float64)
        n_cri = base_w.shape[0]
        if vary_index < 0 or vary_index >= n_cri:
            raise IndexError(f"vary_index {vary_index} out of range [0, {n_cri})")

        weight_values = np.linspace(0.0, 1.0, n_samples)
        all_closeness: List[np.ndarray] = []

        others_total = base_w.sum() - base_w[vary_index]

        for wv in weight_values:
            w = base_w.copy()
            w[vary_index] = wv
            remaining = 1.0 - wv
            if others_total > 0:
                scale = remaining / others_total
                for j in range(n_cri):
                    if j != vary_index:
                        w[j] = base_w[j] * scale
            else:
                for j in range(n_cri):
                    if j != vary_index:
                        w[j] = remaining / (n_cri - 1)
            closeness = self.multi_criteria_decision(base_matrix, w, beneficial)
            all_closeness.append(closeness)

        return {
            "weight_values": weight_values,
            "closeness": np.array(all_closeness),
        }
