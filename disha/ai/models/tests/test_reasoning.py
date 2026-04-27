"""Reasoning engine tests."""

import os
import sys
import unittest

from core.reasoning_engine.reasoning import (
    DecisionFramework,
    Hypothesis,
    ReasoningEngine,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestReasoning(unittest.TestCase):
    def test_hypothesis_creation(self):
        h = Hypothesis(description="test", probability=0.7)
        self.assertEqual(h.description, "test")
        self.assertAlmostEqual(h.probability, 0.7)
        h2 = Hypothesis(description="clamp", probability=1.5)
        self.assertAlmostEqual(h2.probability, 1.0)

    def test_bayesian_update(self):
        engine = ReasoningEngine(seed=0)
        h1 = engine.add_hypothesis("A", initial_prob=0.5)
        h2 = engine.add_hypothesis("B", initial_prob=0.5)
        engine.update_evidence(h1, "strong_support", weight=2.0)
        engine.update_evidence(h2, "weak_support", weight=0.1)
        engine.bayesian_update()
        pa = engine.get_hypothesis(h1).probability
        pb = engine.get_hypothesis(h2).probability
        self.assertGreater(pa, pb)
        self.assertAlmostEqual(pa + pb, 1.0, places=5)

    def test_collapse_returns_highest(self):
        engine = ReasoningEngine(seed=0)
        engine.add_hypothesis("low", initial_prob=0.1)
        engine.add_hypothesis("high", initial_prob=0.9)
        chosen = engine.collapse(method="best")
        self.assertEqual(chosen.description, "high")

    def test_prune_removes_low_prob(self):
        engine = ReasoningEngine(seed=0)
        engine.add_hypothesis("keep", initial_prob=0.9)
        engine.add_hypothesis("remove", initial_prob=0.01)
        removed = engine.prune(threshold=0.05)
        self.assertEqual(len(removed), 1)
        superposition = engine.get_superposition()
        self.assertEqual(len(superposition), 1)

    def test_decision_framework_ranking(self):
        fw = DecisionFramework()
        options = [
            {"name": "A", "speed": 8, "cost": 3},
            {"name": "B", "speed": 5, "cost": 7},
            {"name": "C", "speed": 9, "cost": 1},
        ]
        ranked = fw.evaluate_options(options, {"speed": 0.6, "cost": -0.4})
        self.assertEqual(ranked[0]["name"], "C")
        self.assertEqual(ranked[0]["rank"], 1)


if __name__ == "__main__":
    unittest.main()
