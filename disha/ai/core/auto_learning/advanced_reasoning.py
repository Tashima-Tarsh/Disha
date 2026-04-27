from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class ComplexityClass(Enum):
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
    time_complexity: ComplexityClass = ComplexityClass.O_UNKNOWN
    space_complexity: ComplexityClass = ComplexityClass.O_UNKNOWN
    scalability_score: float = 0.0
    correctness_score: float = 0.0
    efficiency_score: float = 0.0
    elegance_score: float = 0.0

    @property
    def weighted_score(self) -> float:
        return (
            self.correctness_score * 0.50
            + self.efficiency_score * 0.30
            + self.elegance_score * 0.10
            + self.scalability_score * 0.10
        )


@dataclass
class SolutionPath:
    name: str
    description: str
    approach: str
    steps: list[str] = field(default_factory=list)
    evaluation: SolutionEvaluation = field(default_factory=SolutionEvaluation)
    edge_cases: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    rank: int = 0


@dataclass
class SubProblem:
    description: str
    dependencies: list[str] = field(default_factory=list)
    solutions: list[SolutionPath] = field(default_factory=list)
    selected_solution: SolutionPath | None = None


@dataclass
class ReasoningResult:
    problem: str
    sub_problems: list[SubProblem] = field(default_factory=list)
    all_solutions: list[SolutionPath] = field(default_factory=list)
    selected_approach: SolutionPath | None = None
    ambiguity_detected: bool = False
    alternative_solutions: list[SolutionPath] = field(default_factory=list)
    edge_cases: list[str] = field(default_factory=list)
    confidence: float = 0.0
    reasoning_time: float = 0.0
    reasoning_id: str = ""

    def __post_init__(self) -> None:
        if not self.reasoning_id:
            raw = f"{self.problem}:{time.time()}"
            self.reasoning_id = hashlib.sha256(raw.encode()).hexdigest()[:12]


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


def _estimate_complexity(approach: str) -> tuple[ComplexityClass, ComplexityClass]:
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


class AdvancedReasoningEngine:
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
        context_retriever: Any = None,
    ) -> None:
        self._context_retriever = context_retriever

    def decompose(self, problem: str) -> list[SubProblem]:

        for sep in [".", "?", ";"]:
            problem = problem.replace(sep, sep + "|||")
        parts = [p.strip().rstrip("|||") for p in problem.split("|||") if p.strip()]

        sub_problems = []
        for i, part in enumerate(parts):
            if len(part) < 5:
                continue
            deps = [f"sub_{j}" for j in range(i) if j < i]
            sub_problems.append(SubProblem(description=part, dependencies=deps))

        if not sub_problems:
            sub_problems = [SubProblem(description=problem)]

        logger.info("problem_decomposed", count=len(sub_problems))
        return sub_problems

    def generate_solutions(self, sub_problem: SubProblem) -> list[SolutionPath]:
        solutions = []
        desc = sub_problem.description.lower()

        applicable: list[str] = []
        if any(kw in desc for kw in ["search", "find", "locate", "lookup"]):
            applicable.extend(["binary_search", "direct", "heuristic"])
        elif any(kw in desc for kw in ["sort", "order", "rank", "arrange"]):
            applicable.extend(["divide_and_conquer", "greedy", "iterative"])
        elif any(
            kw in desc for kw in ["optimise", "optimize", "minimum", "maximum", "best"]
        ):
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

    def evaluate_solution(self, solution: SolutionPath) -> SolutionPath:
        ev = solution.evaluation

        time_rank = _COMPLEXITY_RANK.get(ev.time_complexity, 8)
        ev.efficiency_score = max(0, 10 - time_rank)

        space_rank = _COMPLEXITY_RANK.get(ev.space_complexity, 8)
        ev.scalability_score = max(0, 10 - space_rank * 0.5)

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

    def select_optimal(self, solutions: list[SolutionPath]) -> SolutionPath:
        if not solutions:
            return SolutionPath(
                name="none", description="No solutions available", approach="none"
            )

        ranked = sorted(
            solutions,
            key=lambda s: s.evaluation.weighted_score,
            reverse=True,
        )

        for i, sol in enumerate(ranked):
            sol.rank = i + 1

        return ranked[0]

    def identify_edge_cases(self, problem: str) -> list[str]:
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

    def detect_ambiguity(self, solutions: list[SolutionPath]) -> bool:
        if len(solutions) < 2:
            return False

        scores = sorted([s.evaluation.weighted_score for s in solutions], reverse=True)

        if scores[0] == 0:
            return False
        diff = abs(scores[0] - scores[1]) / scores[0]
        return diff < 0.10

    def reason(self, problem: str) -> ReasoningResult:
        start = time.time()

        if self._context_retriever is not None:
            try:
                self._context_retriever.query(problem, top_k=3)
            except Exception:
                pass

        sub_problems = self.decompose(problem)

        all_solutions: list[SolutionPath] = []
        for sp in sub_problems:
            solutions = self.generate_solutions(sp)
            evaluated = [self.evaluate_solution(s) for s in solutions]
            sp.solutions = evaluated
            sp.selected_solution = self.select_optimal(evaluated)
            all_solutions.extend(evaluated)

        selected = self.select_optimal(all_solutions)

        edge_cases = self.identify_edge_cases(problem)

        ambiguous = self.detect_ambiguity(all_solutions)
        alternatives = []
        if ambiguous:
            ranked = sorted(
                all_solutions,
                key=lambda s: s.evaluation.weighted_score,
                reverse=True,
            )
            alternatives = ranked[:3]

        elapsed = time.time() - start

        if all_solutions:
            avg_weighted = sum(
                s.evaluation.weighted_score for s in all_solutions
            ) / len(all_solutions)
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
        self, problem: str, context_texts: list[str]
    ) -> ReasoningResult:

        class _TempRetriever:
            def query(self_, query: str, top_k: int = 3) -> list[Any]:
                @dataclass
                class _R:
                    text: str

                return [_R(text=t) for t in context_texts[:top_k]]

        old = self._context_retriever
        self._context_retriever = _TempRetriever()
        result = self.reason(problem)
        self._context_retriever = old
        return result

    @staticmethod
    def format_result(result: ReasoningResult) -> str:
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
            lines.extend(
                [
                    "",
                    f"Selected approach: {sel.name}",
                    f"  Approach: {sel.approach}",
                    f"  Time: {sel.evaluation.time_complexity.value}",
                    f"  Space: {sel.evaluation.space_complexity.value}",
                    f"  Weighted score: {sel.evaluation.weighted_score:.2f}",
                ]
            )

        if result.ambiguity_detected:
            lines.extend(
                [
                    "",
                    "⚠ Ambiguity detected — alternative solutions:",
                ]
            )
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
