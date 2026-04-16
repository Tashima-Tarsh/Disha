"""Mythos-style advanced reasoning protocol.

ADVANCED REASONING PROTOCOL:

For complex problems:
    1. Decompose problem
    2. Generate multiple solution paths
    3. Evaluate each path:
       - Time complexity
       - Space complexity
       - Scalability
    4. Select optimal approach
    5. Validate with edge cases

If ambiguity exists:
    - Present multiple valid solutions
    - Rank them

Always prioritise: Correctness > Efficiency > Elegance
"""

from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
class ComplexityClass(Enum):
    """Standard algorithmic complexity classes."""

    O_1 = "O(1)"
    O_LOG_N = "O(log n)"
    O_N = "O(n)"
    O_N_LOG_N = "O(n log n)"
    O_N2 = "O(n²)"
    O_N3 = "O(n³)"
    O_2N = "O(2^n)"
    O_UNKNOWN = "unknown"


@dataclass
class SolutionEvaluation:
    """Evaluation of a single solution path."""

    time_complexity: ComplexityClass = ComplexityClass.O_UNKNOWN
    space_complexity: ComplexityClass = ComplexityClass.O_UNKNOWN
    scalability_score: float = 0.0  # 0–10
    correctness_score: float = 0.0  # 0–10
    efficiency_score: float = 0.0  # 0–10
    elegance_score: float = 0.0  # 0–10

    @property
    def weighted_score(self) -> float:
        """Correctness > Efficiency > Elegance weighting."""
        return (
            self.correctness_score * 0.50
            + self.efficiency_score * 0.30
            + self.elegance_score * 0.10
            + self.scalability_score * 0.10
        )


@dataclass
class SolutionPath:
    """A candidate solution with its evaluation."""

    name: str
    description: str
    approach: str  # "direct", "divide_and_conquer", "dynamic_programming", etc.
    steps: List[str] = field(default_factory=list)
    evaluation: SolutionEvaluation = field(default_factory=SolutionEvaluation)
    edge_cases: List[str] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)
    rank: int = 0


@dataclass
class SubProblem:
    """A decomposed sub-problem from the original problem."""

    description: str
    dependencies: List[str] = field(default_factory=list)
    solutions: List[SolutionPath] = field(default_factory=list)
    selected_solution: Optional[SolutionPath] = None


@dataclass
class ReasoningResult:
    """Complete result of the advanced reasoning protocol."""

    problem: str
    sub_problems: List[SubProblem] = field(default_factory=list)
    all_solutions: List[SolutionPath] = field(default_factory=list)
    selected_approach: Optional[SolutionPath] = None
    ambiguity_detected: bool = False
    alternative_solutions: List[SolutionPath] = field(default_factory=list)
    edge_cases: List[str] = field(default_factory=list)
    confidence: float = 0.0
    reasoning_time: float = 0.0
    reasoning_id: str = ""

    def __post_init__(self) -> None:
        if not self.reasoning_id:
            raw = f"{self.problem}:{time.time()}"
            self.reasoning_id = hashlib.sha256(raw.encode()).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Complexity estimator
# ---------------------------------------------------------------------------
_COMPLEXITY_RANK = {
    ComplexityClass.O_1: 1,
    ComplexityClass.O_LOG_N: 2,
    ComplexityClass.O_N: 3,
    ComplexityClass.O_N_LOG_N: 4,
    ComplexityClass.O_N2: 5,
    ComplexityClass.O_N3: 6,
    ComplexityClass.O_2N: 7,
    ComplexityClass.O_UNKNOWN: 8,
}


def _estimate_complexity(approach: str) -> tuple:
    """Heuristic: estimate time/space complexity from approach name."""
    lookup = {
        "direct": (ComplexityClass.O_N, ComplexityClass.O_1),
        "brute_force": (ComplexityClass.O_N2, ComplexityClass.O_N),
        "divide_and_conquer": (ComplexityClass.O_N_LOG_N, ComplexityClass.O_N),
        "dynamic_programming": (ComplexityClass.O_N2, ComplexityClass.O_N),
        "greedy": (ComplexityClass.O_N_LOG_N, ComplexityClass.O_1),
        "binary_search": (ComplexityClass.O_LOG_N, ComplexityClass.O_1),
        "graph_traversal": (ComplexityClass.O_N, ComplexityClass.O_N),
        "heuristic": (ComplexityClass.O_N, ComplexityClass.O_N),
        "recursive": (ComplexityClass.O_2N, ComplexityClass.O_N),
        "iterative": (ComplexityClass.O_N, ComplexityClass.O_1),
    }
    return lookup.get(approach, (ComplexityClass.O_UNKNOWN, ComplexityClass.O_UNKNOWN))


# ---------------------------------------------------------------------------
# Advanced Reasoning Engine
# ---------------------------------------------------------------------------
class AdvancedReasoningEngine:
    """Mythos-style multi-path reasoning engine.

    Protocol:
        1. Decompose the problem into manageable sub-problems
        2. Generate multiple solution paths for each sub-problem
        3. Evaluate each path on complexity, scalability, correctness
        4. Select the optimal approach
        5. Validate against edge cases
        6. If ambiguity exists, present ranked alternatives
    """

    # Canonical approach catalogue
    APPROACHES = [
        "direct",
        "divide_and_conquer",
        "dynamic_programming",
        "greedy",
        "heuristic",
        "iterative",
        "graph_traversal",
    ]

    def __init__(
        self,
        context_retriever: Any = None,  # Optional RAG pipeline for context
    ) -> None:
        self._context_retriever = context_retriever

    # ------------------------------------------------------------------
    # Step 1: Decompose
    # ------------------------------------------------------------------
    def decompose(self, problem: str) -> List[SubProblem]:
        """Decompose a problem into sub-problems."""
        # Heuristic decomposition based on sentence structure
        for sep in [".", "?", ";"]:
            problem = problem.replace(sep, sep + "|||")
        parts = [p.strip().rstrip("|||") for p in problem.split("|||") if p.strip()]

        sub_problems = []
        for i, part in enumerate(parts):
            if len(part) < 5:
                continue
            deps = [f"sub_{j}" for j in range(i) if j < i]
            sub_problems.append(
                SubProblem(description=part, dependencies=deps)
            )

        if not sub_problems:
            sub_problems = [SubProblem(description=problem)]

        logger.info("problem_decomposed", count=len(sub_problems))
        return sub_problems

    # ------------------------------------------------------------------
    # Step 2: Generate solution paths
    # ------------------------------------------------------------------
    def generate_solutions(self, sub_problem: SubProblem) -> List[SolutionPath]:
        """Generate multiple solution paths for a sub-problem."""
        solutions = []
        desc = sub_problem.description.lower()

        # Select applicable approaches based on problem characteristics
        applicable: List[str] = []
        if any(kw in desc for kw in ["search", "find", "locate", "lookup"]):
            applicable.extend(["binary_search", "direct", "heuristic"])
        elif any(kw in desc for kw in ["sort", "order", "rank", "arrange"]):
            applicable.extend(["divide_and_conquer", "greedy", "iterative"])
        elif any(kw in desc for kw in ["optimise", "optimize", "minimum", "maximum", "best"]):
            applicable.extend(["dynamic_programming", "greedy", "heuristic"])
        elif any(kw in desc for kw in ["graph", "network", "path", "traverse"]):
            applicable.extend(["graph_traversal", "greedy", "dynamic_programming"])
        else:
            applicable.extend(["direct", "iterative", "heuristic"])

        for approach in applicable:
            time_c, space_c = _estimate_complexity(approach)
            path = SolutionPath(
                name=f"{approach}_solution",
                description=f"Apply {approach} to: {sub_problem.description[:80]}",
                approach=approach,
                steps=[
                    f"Analyse {sub_problem.description[:50]}",
                    f"Apply {approach} strategy",
                    "Validate correctness",
                    "Optimise if possible",
                ],
                evaluation=SolutionEvaluation(
                    time_complexity=time_c,
                    space_complexity=space_c,
                ),
            )
            solutions.append(path)

        return solutions

    # ------------------------------------------------------------------
    # Step 3: Evaluate
    # ------------------------------------------------------------------
    def evaluate_solution(self, solution: SolutionPath) -> SolutionPath:
        """Evaluate a solution path on all criteria."""
        ev = solution.evaluation

        # Time complexity scoring (lower rank = better)
        time_rank = _COMPLEXITY_RANK.get(ev.time_complexity, 8)
        ev.efficiency_score = max(0, 10 - time_rank)

        # Space complexity scoring
        space_rank = _COMPLEXITY_RANK.get(ev.space_complexity, 8)
        ev.scalability_score = max(0, 10 - space_rank * 0.5)

        # Correctness based on approach reliability
        correctness_map = {
            "direct": 9.0,
            "divide_and_conquer": 8.5,
            "dynamic_programming": 9.0,
            "greedy": 7.0,
            "binary_search": 9.5,
            "graph_traversal": 8.0,
            "heuristic": 6.5,
            "iterative": 8.5,
            "brute_force": 9.5,
            "recursive": 7.5,
        }
        ev.correctness_score = correctness_map.get(solution.approach, 5.0)

        # Elegance
        elegance_map = {
            "direct": 7.0,
            "divide_and_conquer": 9.0,
            "dynamic_programming": 8.5,
            "greedy": 8.0,
            "binary_search": 9.0,
            "graph_traversal": 7.5,
            "heuristic": 6.0,
            "iterative": 7.0,
        }
        ev.elegance_score = elegance_map.get(solution.approach, 5.0)

        return solution

    # ------------------------------------------------------------------
    # Step 4: Select optimal
    # ------------------------------------------------------------------
    def select_optimal(self, solutions: List[SolutionPath]) -> SolutionPath:
        """Select the best solution path. Correctness > Efficiency > Elegance."""
        if not solutions:
            return SolutionPath(name="none", description="No solutions available", approach="none")

        # Sort by weighted score (highest first)
        ranked = sorted(
            solutions,
            key=lambda s: s.evaluation.weighted_score,
            reverse=True,
        )

        # Assign ranks
        for i, sol in enumerate(ranked):
            sol.rank = i + 1

        return ranked[0]

    # ------------------------------------------------------------------
    # Step 5: Edge case validation
    # ------------------------------------------------------------------
    def identify_edge_cases(self, problem: str) -> List[str]:
        """Identify potential edge cases for the problem."""
        cases = [
            "Empty or null input",
            "Single-element input",
            "Very large input (stress test)",
        ]
        lower = problem.lower()

        if any(kw in lower for kw in ["list", "array", "collection"]):
            cases.append("Unsorted input when sorted expected")
            cases.append("Duplicate elements")
        if any(kw in lower for kw in ["number", "integer", "numeric"]):
            cases.append("Negative numbers")
            cases.append("Integer overflow")
            cases.append("Zero value")
        if any(kw in lower for kw in ["string", "text", "parse"]):
            cases.append("Unicode characters")
            cases.append("Empty string")
        if any(kw in lower for kw in ["concurrent", "parallel", "thread"]):
            cases.append("Race conditions")
            cases.append("Deadlock scenarios")
        if any(kw in lower for kw in ["network", "api", "request"]):
            cases.append("Network timeout")
            cases.append("Partial response")
        if any(kw in lower for kw in ["data", "learn", "train"]):
            cases.append("Adversarial input data")
            cases.append("Data drift / distribution shift")
        if any(kw in lower for kw in ["memory", "store", "cache"]):
            cases.append("Memory exhaustion")
            cases.append("Cache invalidation")

        return cases

    # ------------------------------------------------------------------
    # Step 6: Detect ambiguity
    # ------------------------------------------------------------------
    def detect_ambiguity(self, solutions: List[SolutionPath]) -> bool:
        """Check if multiple solutions are close in quality."""
        if len(solutions) < 2:
            return False

        scores = sorted(
            [s.evaluation.weighted_score for s in solutions], reverse=True
        )
        # Ambiguous if top two scores are within 10% of each other
        if scores[0] == 0:
            return False
        diff = abs(scores[0] - scores[1]) / scores[0]
        return diff < 0.10

    # ------------------------------------------------------------------
    # Full reasoning pipeline
    # ------------------------------------------------------------------
    def reason(self, problem: str) -> ReasoningResult:
        """Execute the full advanced reasoning protocol."""
        start = time.time()

        if self._context_retriever is not None:
            try:
                self._context_retriever.query(problem, top_k=3)
            except Exception:
                pass

        # Step 1: Decompose
        sub_problems = self.decompose(problem)

        # Steps 2–4: For each sub-problem, generate, evaluate, and select
        all_solutions: List[SolutionPath] = []
        for sp in sub_problems:
            solutions = self.generate_solutions(sp)
            evaluated = [self.evaluate_solution(s) for s in solutions]
            sp.solutions = evaluated
            sp.selected_solution = self.select_optimal(evaluated)
            all_solutions.extend(evaluated)

        # Global selection
        selected = self.select_optimal(all_solutions)

        # Step 5: Edge cases
        edge_cases = self.identify_edge_cases(problem)

        # Step 6: Ambiguity check
        ambiguous = self.detect_ambiguity(all_solutions)
        alternatives = []
        if ambiguous:
            ranked = sorted(
                all_solutions,
                key=lambda s: s.evaluation.weighted_score,
                reverse=True,
            )
            alternatives = ranked[:3]  # Top 3 alternatives

        elapsed = time.time() - start

        # Confidence
        if all_solutions:
            avg_weighted = sum(s.evaluation.weighted_score for s in all_solutions) / len(all_solutions)
            confidence = min(avg_weighted / 10.0, 1.0)
        else:
            confidence = 0.0

        result = ReasoningResult(
            problem=problem,
            sub_problems=sub_problems,
            all_solutions=all_solutions,
            selected_approach=selected,
            ambiguity_detected=ambiguous,
            alternative_solutions=alternatives,
            edge_cases=edge_cases,
            confidence=round(confidence, 3),
            reasoning_time=round(elapsed, 4),
        )

        logger.info(
            "reasoning_completed",
            sub_problems=len(sub_problems),
            solutions=len(all_solutions),
            selected=selected.name,
            ambiguous=ambiguous,
            confidence=result.confidence,
        )
        return result

    def reason_with_context(
        self, problem: str, context_texts: List[str]
    ) -> ReasoningResult:
        """Reason with explicitly provided context."""
        # Temporarily provide context via a simple wrapper
        class _TempRetriever:
            def query(self_, query: str, top_k: int = 3) -> list:
                @dataclass
                class _R:
                    text: str
                return [_R(text=t) for t in context_texts[:top_k]]

        old = self._context_retriever
        self._context_retriever = _TempRetriever()
        result = self.reason(problem)
        self._context_retriever = old
        return result

    # ------------------------------------------------------------------
    # Utility: format result as text
    # ------------------------------------------------------------------
    @staticmethod
    def format_result(result: ReasoningResult) -> str:
        """Format a reasoning result as human-readable text."""
        lines = [
            f"═══ REASONING RESULT [{result.reasoning_id}] ═══",
            f"Problem: {result.problem}",
            f"Confidence: {result.confidence:.1%}",
            f"Time: {result.reasoning_time:.3f}s",
            "",
            f"Decomposition ({len(result.sub_problems)} sub-problems):",
        ]

        for i, sp in enumerate(result.sub_problems, 1):
            lines.append(f"  {i}. {sp.description[:80]}")
            if sp.selected_solution:
                sel = sp.selected_solution
                lines.append(
                    f"     → {sel.name} "
                    f"(T={sel.evaluation.time_complexity.value}, "
                    f"S={sel.evaluation.space_complexity.value}, "
                    f"score={sel.evaluation.weighted_score:.2f})"
                )

        if result.selected_approach:
            sel = result.selected_approach
            lines.extend([
                "",
                f"Selected approach: {sel.name}",
                f"  Approach: {sel.approach}",
                f"  Time: {sel.evaluation.time_complexity.value}",
                f"  Space: {sel.evaluation.space_complexity.value}",
                f"  Weighted score: {sel.evaluation.weighted_score:.2f}",
            ])

        if result.ambiguity_detected:
            lines.extend([
                "",
                "⚠ Ambiguity detected — alternative solutions:",
            ])
            for alt in result.alternative_solutions:
                lines.append(
                    f"  #{alt.rank}: {alt.name} "
                    f"(score={alt.evaluation.weighted_score:.2f})"
                )

        if result.edge_cases:
            lines.extend(["", "Edge cases to validate:"])
            for ec in result.edge_cases:
                lines.append(f"  • {ec}")

        lines.append("═══════════════════════════════════════")
        return "\n".join(lines)
