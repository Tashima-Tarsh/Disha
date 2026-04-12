"""Tests for the advanced reasoning protocol."""

import pytest

from auto_learning.advanced_reasoning import (
    AdvancedReasoningEngine,
    ComplexityClass,
    ReasoningResult,
    SolutionEvaluation,
    SolutionPath,
    SubProblem,
    _estimate_complexity,
)


# ---------------------------------------------------------------------------
# Complexity estimator tests
# ---------------------------------------------------------------------------
class TestComplexityEstimator:
    def test_known_approaches(self):
        assert _estimate_complexity("direct")[0] == ComplexityClass.O_N
        assert _estimate_complexity("binary_search")[0] == ComplexityClass.O_LOG_N
        assert _estimate_complexity("dynamic_programming")[0] == ComplexityClass.O_N2

    def test_unknown_approach(self):
        tc, sc = _estimate_complexity("mystery_approach")
        assert tc == ComplexityClass.O_UNKNOWN
        assert sc == ComplexityClass.O_UNKNOWN


# ---------------------------------------------------------------------------
# SolutionEvaluation tests
# ---------------------------------------------------------------------------
class TestSolutionEvaluation:
    def test_weighted_score_priority(self):
        # Correctness > Efficiency > Elegance
        eval1 = SolutionEvaluation(
            correctness_score=10, efficiency_score=5, elegance_score=5, scalability_score=5
        )
        eval2 = SolutionEvaluation(
            correctness_score=5, efficiency_score=10, elegance_score=10, scalability_score=5
        )
        assert eval1.weighted_score > eval2.weighted_score

    def test_weighted_score_range(self):
        ev = SolutionEvaluation(
            correctness_score=10, efficiency_score=10, elegance_score=10, scalability_score=10
        )
        assert ev.weighted_score == pytest.approx(10.0)


# ---------------------------------------------------------------------------
# Decomposition tests
# ---------------------------------------------------------------------------
class TestDecomposition:
    def test_simple_problem(self):
        engine = AdvancedReasoningEngine()
        sps = engine.decompose("Sort a list of integers")
        assert len(sps) >= 1
        assert all(isinstance(sp, SubProblem) for sp in sps)

    def test_complex_problem(self):
        engine = AdvancedReasoningEngine()
        sps = engine.decompose(
            "Build a distributed cache. Support replication across nodes. "
            "Handle cache invalidation. Ensure consistency."
        )
        assert len(sps) >= 2

    def test_empty_problem(self):
        engine = AdvancedReasoningEngine()
        sps = engine.decompose("")
        assert len(sps) >= 1


# ---------------------------------------------------------------------------
# Solution generation tests
# ---------------------------------------------------------------------------
class TestSolutionGeneration:
    def test_search_problem(self):
        engine = AdvancedReasoningEngine()
        sp = SubProblem(description="Search for an element in a sorted array")
        solutions = engine.generate_solutions(sp)
        assert len(solutions) >= 1
        approaches = [s.approach for s in solutions]
        assert "binary_search" in approaches

    def test_optimisation_problem(self):
        engine = AdvancedReasoningEngine()
        sp = SubProblem(description="Optimise the route to minimise travel time")
        solutions = engine.generate_solutions(sp)
        assert len(solutions) >= 1
        approaches = [s.approach for s in solutions]
        assert "dynamic_programming" in approaches or "greedy" in approaches

    def test_generic_problem(self):
        engine = AdvancedReasoningEngine()
        sp = SubProblem(description="Process incoming data stream")
        solutions = engine.generate_solutions(sp)
        assert len(solutions) >= 1


# ---------------------------------------------------------------------------
# Evaluation tests
# ---------------------------------------------------------------------------
class TestEvaluation:
    def test_evaluate_sets_scores(self):
        engine = AdvancedReasoningEngine()
        path = SolutionPath(
            name="test",
            description="Test solution",
            approach="binary_search",
            evaluation=SolutionEvaluation(
                time_complexity=ComplexityClass.O_LOG_N,
                space_complexity=ComplexityClass.O_1,
            ),
        )
        evaluated = engine.evaluate_solution(path)
        assert evaluated.evaluation.correctness_score > 0
        assert evaluated.evaluation.efficiency_score > 0

    def test_select_optimal(self):
        engine = AdvancedReasoningEngine()
        solutions = [
            SolutionPath(
                name="sol1",
                description="",
                approach="brute_force",
                evaluation=SolutionEvaluation(correctness_score=9.5, efficiency_score=3),
            ),
            SolutionPath(
                name="sol2",
                description="",
                approach="binary_search",
                evaluation=SolutionEvaluation(correctness_score=9.5, efficiency_score=8),
            ),
        ]
        for s in solutions:
            engine.evaluate_solution(s)
        best = engine.select_optimal(solutions)
        assert best.rank == 1

    def test_select_optimal_empty(self):
        engine = AdvancedReasoningEngine()
        result = engine.select_optimal([])
        assert result.name == "none"


# ---------------------------------------------------------------------------
# Edge case identification tests
# ---------------------------------------------------------------------------
class TestEdgeCases:
    def test_data_problem(self):
        engine = AdvancedReasoningEngine()
        cases = engine.identify_edge_cases("Process training data for model learning")
        assert any("data" in c.lower() for c in cases)

    def test_network_problem(self):
        engine = AdvancedReasoningEngine()
        cases = engine.identify_edge_cases("Handle API requests over the network")
        assert any("timeout" in c.lower() for c in cases)

    def test_always_includes_basics(self):
        engine = AdvancedReasoningEngine()
        cases = engine.identify_edge_cases("Simple task")
        assert any("empty" in c.lower() or "null" in c.lower() for c in cases)


# ---------------------------------------------------------------------------
# Ambiguity detection tests
# ---------------------------------------------------------------------------
class TestAmbiguityDetection:
    def test_no_ambiguity(self):
        engine = AdvancedReasoningEngine()
        solutions = [
            SolutionPath(
                name="a", description="", approach="",
                evaluation=SolutionEvaluation(correctness_score=10, efficiency_score=10),
            ),
            SolutionPath(
                name="b", description="", approach="",
                evaluation=SolutionEvaluation(correctness_score=2, efficiency_score=2),
            ),
        ]
        assert engine.detect_ambiguity(solutions) is False

    def test_ambiguity_detected(self):
        engine = AdvancedReasoningEngine()
        solutions = [
            SolutionPath(
                name="a", description="", approach="",
                evaluation=SolutionEvaluation(
                    correctness_score=8, efficiency_score=7, elegance_score=7, scalability_score=7
                ),
            ),
            SolutionPath(
                name="b", description="", approach="",
                evaluation=SolutionEvaluation(
                    correctness_score=7.8, efficiency_score=7.2, elegance_score=7.1, scalability_score=7.1
                ),
            ),
        ]
        assert engine.detect_ambiguity(solutions) is True

    def test_single_solution_no_ambiguity(self):
        engine = AdvancedReasoningEngine()
        assert engine.detect_ambiguity([SolutionPath(name="a", description="", approach="")]) is False


# ---------------------------------------------------------------------------
# Full reasoning pipeline tests
# ---------------------------------------------------------------------------
class TestFullPipeline:
    def test_reason_simple(self):
        engine = AdvancedReasoningEngine()
        result = engine.reason("Sort an array of integers efficiently")
        assert isinstance(result, ReasoningResult)
        assert result.confidence > 0
        assert result.reasoning_time >= 0
        assert len(result.sub_problems) >= 1
        assert len(result.all_solutions) >= 1
        assert result.selected_approach is not None

    def test_reason_complex(self):
        engine = AdvancedReasoningEngine()
        result = engine.reason(
            "Build a real-time recommendation system that handles millions "
            "of users. Optimise for low latency. Ensure data consistency. "
            "Support A/B testing."
        )
        assert len(result.sub_problems) >= 2
        assert result.selected_approach is not None
        assert len(result.edge_cases) >= 3

    def test_reason_with_context(self):
        engine = AdvancedReasoningEngine()
        result = engine.reason_with_context(
            "Optimise the search algorithm",
            context_texts=["Binary search is O(log n)", "Hash tables offer O(1) lookup"],
        )
        assert isinstance(result, ReasoningResult)

    def test_format_result(self):
        engine = AdvancedReasoningEngine()
        result = engine.reason("Find the shortest path in a graph")
        formatted = AdvancedReasoningEngine.format_result(result)
        assert "REASONING RESULT" in formatted
        assert "Confidence:" in formatted
        assert "Edge cases" in formatted

    def test_reasoning_id_unique(self):
        engine = AdvancedReasoningEngine()
        r1 = engine.reason("Problem A")
        r2 = engine.reason("Problem B")
        assert r1.reasoning_id != r2.reasoning_id
