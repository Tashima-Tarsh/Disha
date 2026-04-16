#!/usr/bin/env python3
"""Decision-Making Example
============================

Demonstrates the ReasoningEngine and DecisionFramework.

* Creates 5 hypotheses about a threat assessment scenario.
* Feeds evidence: distance decreasing, speed increasing, communication signals.
* Performs Bayesian updates to revise probabilities.
* Shows the superposition state (all hypotheses with probabilities).
* Collapses to a single decision.
* Uses DecisionFramework for multi-criteria decision analysis.
"""

from core.reasoning_engine.reasoning import (
    DecisionFramework,
    ReasoningEngine,
)
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


def main() -> None:
    print("=" * 60)
    print("  Threat Assessment Decision-Making Demo")
    print("=" * 60)

    # --- Create reasoning engine with 5 hypotheses ---
    engine = ReasoningEngine(seed=42)

    h_friendly = engine.add_hypothesis(
        "Entity is friendly (allied unit)",
        initial_prob=0.25,
        metadata={"category": "friendly"},
    )
    h_neutral = engine.add_hypothesis(
        "Entity is neutral (civilian)",
        initial_prob=0.25,
        metadata={"category": "neutral"},
    )
    h_hostile = engine.add_hypothesis(
        "Entity is hostile (enemy combatant)",
        initial_prob=0.20,
        metadata={"category": "hostile"},
    )
    h_unknown = engine.add_hypothesis(
        "Entity is unknown (unidentified)",
        initial_prob=0.20,
        metadata={"category": "unknown"},
    )
    h_decoy = engine.add_hypothesis(
        "Entity is a decoy (electronic warfare)",
        initial_prob=0.10,
        metadata={"category": "decoy"},
    )

    print("\n--- Initial Superposition State ---")
    for hid, desc, prob in engine.get_superposition():
        print(f"  [{prob:.4f}] {desc}")
    print(f"  Entropy: {engine.get_entropy():.4f} nats")

    # --- Feed evidence round 1: distance is decreasing ---
    print("\n--- Evidence Round 1: Distance decreasing rapidly ---")
    engine.update_evidence(h_hostile, "distance_decreasing", weight=0.8)
    engine.update_evidence(h_friendly, "distance_decreasing", weight=0.3)
    engine.update_evidence(h_neutral, "distance_decreasing", weight=-0.2)
    engine.update_evidence(h_decoy, "distance_decreasing", weight=-0.5)
    engine.update_evidence(h_unknown, "distance_decreasing", weight=0.1)

    engine.bayesian_update()
    print("  After Bayesian update:")
    for hid, desc, prob in engine.get_superposition():
        print(f"  [{prob:.4f}] {desc}")
    print(f"  Entropy: {engine.get_entropy():.4f} nats")

    # --- Feed evidence round 2: speed is high ---
    print("\n--- Evidence Round 2: High approach speed ---")
    engine.update_evidence(h_hostile, "high_speed", weight=0.9)
    engine.update_evidence(h_friendly, "high_speed", weight=0.2)
    engine.update_evidence(h_neutral, "high_speed", weight=-0.4)
    engine.update_evidence(h_decoy, "high_speed", weight=0.3)
    engine.update_evidence(h_unknown, "high_speed", weight=0.1)

    engine.bayesian_update()
    print("  After Bayesian update:")
    for hid, desc, prob in engine.get_superposition():
        print(f"  [{prob:.4f}] {desc}")
    print(f"  Entropy: {engine.get_entropy():.4f} nats")

    # --- Feed evidence round 3: no friendly IFF signal ---
    print("\n--- Evidence Round 3: No IFF transponder signal ---")
    engine.update_evidence(h_hostile, "no_iff", weight=0.7)
    engine.update_evidence(h_friendly, "no_iff", weight=-1.5)
    engine.update_evidence(h_neutral, "no_iff", weight=0.3)
    engine.update_evidence(h_decoy, "no_iff", weight=0.4)
    engine.update_evidence(h_unknown, "no_iff", weight=0.5)

    engine.bayesian_update()
    print("  After Bayesian update:")
    for hid, desc, prob in engine.get_superposition():
        print(f"  [{prob:.4f}] {desc}")
    print(f"  Entropy: {engine.get_entropy():.4f} nats")

    # --- Prune low-probability hypotheses ---
    print("\n--- Pruning hypotheses below 5% probability ---")
    pruned = engine.prune(threshold=0.05)
    print(f"  Pruned {len(pruned)} hypothesis(es)")

    print("\n  Remaining hypotheses:")
    for hid, desc, prob in engine.get_superposition():
        print(f"  [{prob:.4f}] {desc}")

    # --- Collapse to final decision ---
    print("\n--- Collapsing Superposition ---")
    decision = engine.collapse(method="best")
    print(f"  Decision: {decision.description}")
    print(f"  Probability: {decision.probability:.4f}")
    print(f"  Category: {decision.metadata.get('category', 'N/A')}")
    print(f"  Evidence pieces: {len(decision.evidence)}")

    # ========================================================
    # Multi-criteria decision making
    # ========================================================
    print("\n" + "=" * 60)
    print("  Multi-Criteria Response Decision")
    print("=" * 60)

    framework = DecisionFramework()

    # Options for responding to the threat
    options = [
        {"name": "Engage immediately", "effectiveness": 9, "risk": 8, "cost": 7, "speed": 10},
        {"name": "Request identification", "effectiveness": 6, "risk": 3, "cost": 2, "speed": 5},
        {"name": "Deploy countermeasures", "effectiveness": 7, "risk": 5, "cost": 6, "speed": 8},
        {"name": "Evade and report", "effectiveness": 4, "risk": 2, "cost": 1, "speed": 9},
        {"name": "Monitor passively", "effectiveness": 3, "risk": 1, "cost": 1, "speed": 3},
    ]

    criteria_weights = {
        "effectiveness": 0.35,
        "risk": -0.25,  # negative = lower is better
        "cost": -0.15,
        "speed": 0.25,
    }

    print("\n--- Weighted Score Evaluation ---")
    ranked = framework.evaluate_options(options, criteria_weights)
    for opt in ranked:
        print(f"  #{opt['rank']}: {opt['name']} (score={opt['score']:.4f})")

    # --- TOPSIS analysis ---
    print("\n--- TOPSIS Analysis ---")
    matrix = np.array([
        [9, 8, 7, 10],
        [6, 3, 2, 5],
        [7, 5, 6, 8],
        [4, 2, 1, 9],
        [3, 1, 1, 3],
    ], dtype=np.float64)

    weights = np.array([0.35, 0.25, 0.15, 0.25])
    # effectiveness and speed are beneficial; risk and cost are not
    beneficial = np.array([True, False, False, True])

    closeness = framework.multi_criteria_decision(matrix, weights, beneficial)
    option_names = [o["name"] for o in options]

    ranked_idx = np.argsort(-closeness)
    print("  Closeness coefficients (higher = better):")
    for rank, idx in enumerate(ranked_idx, 1):
        print(f"  #{rank}: {option_names[idx]} (C={closeness[idx]:.4f})")

    print(f"\n  Recommended action: {option_names[ranked_idx[0]]}")
    print("\n[OK] Decision-making demo completed successfully!")


if __name__ == "__main__":
    main()
