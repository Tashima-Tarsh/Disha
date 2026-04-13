"""
GoalEngine — Priority-Queue Goal Manager for the DISHA Cognitive Architecture.

Implements a heapq-based goal management system with:
  - Priority ordering (1=highest, 10=lowest)
  - Dependency tracking (goals unlock only when dependencies are complete)
  - Rule-based goal decomposition into ordered subtasks
  - Goal status lifecycle: pending → active → complete/failed
  - Dependency propagation: failing a goal marks dependent goals as blocked

Role in architecture:
    GoalEngine is maintained by CognitiveEngine across sessions. New goals are
    added via the POST /cognitive/goal API endpoint. During each cognitive turn,
    get_next_actionable() provides the highest-priority actionable goal to the
    _deliberate phase. Completed goals unlock dependent goals automatically.
"""

from __future__ import annotations

import heapq
import time
import uuid
from typing import Any

import structlog

log = structlog.get_logger(__name__)

# Goal status constants
STATUS_PENDING = "pending"
STATUS_ACTIVE = "active"
STATUS_COMPLETE = "complete"
STATUS_FAILED = "failed"
STATUS_BLOCKED = "blocked"

# Rule-based decomposition templates (intent keyword → subtask list)
_DECOMPOSITION_TEMPLATES: dict[str, list[str]] = {
    "research": [
        "define_scope_and_search_terms",
        "retrieve_relevant_memories",
        "synthesize_information",
        "validate_findings",
        "report_results",
    ],
    "build": [
        "specify_requirements",
        "design_architecture",
        "implement_components",
        "test_and_validate",
        "deploy_and_monitor",
    ],
    "analyze": [
        "gather_data",
        "preprocess_data",
        "apply_analytical_framework",
        "interpret_results",
        "formulate_conclusions",
    ],
    "communicate": [
        "understand_audience",
        "draft_message",
        "review_tone_and_clarity",
        "deliver_message",
        "confirm_receipt",
    ],
    "solve": [
        "identify_root_cause",
        "generate_candidate_solutions",
        "evaluate_solutions",
        "implement_best_solution",
        "verify_resolution",
    ],
    "plan": [
        "clarify_objectives",
        "identify_constraints",
        "enumerate_options",
        "select_optimal_path",
        "create_execution_schedule",
    ],
    "learn": [
        "identify_knowledge_gap",
        "gather_learning_materials",
        "process_and_understand",
        "test_comprehension",
        "integrate_into_memory",
    ],
    "default": [
        "clarify_goal",
        "gather_context",
        "formulate_approach",
        "execute_approach",
        "evaluate_outcome",
    ],
}


class _GoalEntry:
    """
    Heap-compatible wrapper for a goal dict.

    heapq is a min-heap; since priority 1 = highest importance, we negate
    priority for the heap ordering and use timestamp as tiebreaker.
    """

    __slots__ = ("priority", "timestamp", "goal")

    def __init__(self, goal: dict[str, Any]) -> None:
        self.priority = -goal["priority"]  # negate for min-heap → highest priority first
        self.timestamp = goal["created_at"]
        self.goal = goal

    def __lt__(self, other: "_GoalEntry") -> bool:
        if self.priority != other.priority:
            return self.priority < other.priority  # lower neg = higher priority
        return self.timestamp < other.timestamp  # FIFO tiebreaker

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, _GoalEntry):
            return False
        return self.goal["goal_id"] == other.goal["goal_id"]


class GoalEngine:
    """
    Priority-queue goal manager with dependency resolution and subtask decomposition.
    """

    def __init__(self) -> None:
        self._heap: list[_GoalEntry] = []
        self._goals: dict[str, dict[str, Any]] = {}  # goal_id → goal dict (fast lookup)
        log.info("goal_engine.initialized")

    # ------------------------------------------------------------------
    # Goal creation
    # ------------------------------------------------------------------

    def add_goal(
        self,
        description: str,
        priority: int = 5,
        dependencies: list[str] | None = None,
    ) -> str:
        """
        Add a new goal to the priority queue.

        Args:
            description:  Human-readable goal description.
            priority:     Integer 1 (highest) to 10 (lowest). Clamped to [1, 10].
            dependencies: List of goal_ids that must be complete before this goal
                          becomes actionable. Defaults to [].

        Returns:
            The generated goal_id (UUID string).
        """
        goal_id = str(uuid.uuid4())
        priority = max(1, min(10, priority))
        deps = dependencies or []

        goal: dict[str, Any] = {
            "goal_id": goal_id,
            "description": description,
            "priority": priority,
            "dependencies": deps,
            "status": STATUS_PENDING,
            "subtasks": [],
            "outcome": None,
            "failure_reason": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }

        self._goals[goal_id] = goal
        heapq.heappush(self._heap, _GoalEntry(goal))

        log.info(
            "goal_engine.goal_added",
            goal_id=goal_id,
            priority=priority,
            dependencies=deps,
            description=description[:80],
        )
        return goal_id

    # ------------------------------------------------------------------
    # Goal decomposition
    # ------------------------------------------------------------------

    def decompose(self, goal_id: str) -> list[dict[str, Any]]:
        """
        Break a goal into ordered subtasks using rule-based decomposition.

        The decomposition template is selected by matching keywords from the
        goal description against template keys. Each subtask gets a unique ID,
        an order index, and a 'pending' status.

        Args:
            goal_id: ID of the goal to decompose.

        Returns:
            List of subtask dicts, or empty list if goal not found.
        """
        goal = self._goals.get(goal_id)
        if not goal:
            log.warning("goal_engine.decompose_not_found", goal_id=goal_id)
            return []

        description = goal["description"].lower()

        # Select best template based on keyword overlap
        best_template = "default"
        best_score = 0
        for keyword, _ in _DECOMPOSITION_TEMPLATES.items():
            if keyword in description:
                score = len(keyword)
                if score > best_score:
                    best_score = score
                    best_template = keyword

        template_steps = _DECOMPOSITION_TEMPLATES[best_template]

        subtasks: list[dict[str, Any]] = [
            {
                "subtask_id": str(uuid.uuid4()),
                "goal_id": goal_id,
                "order": i,
                "description": step.replace("_", " "),
                "status": STATUS_PENDING,
                "created_at": time.time(),
            }
            for i, step in enumerate(template_steps)
        ]

        goal["subtasks"] = subtasks
        goal["updated_at"] = time.time()

        log.info(
            "goal_engine.goal_decomposed",
            goal_id=goal_id,
            template=best_template,
            subtasks=len(subtasks),
        )
        return subtasks

    # ------------------------------------------------------------------
    # Goal retrieval
    # ------------------------------------------------------------------

    def get_next_actionable(self) -> dict[str, Any] | None:
        """
        Return the highest-priority goal whose dependencies are all complete.

        Scans the heap from highest to lowest priority. Goals with unmet
        dependencies are skipped. Returns None if no goal is actionable.

        Returns:
            Goal dict or None.
        """
        # Rebuild heap entries for clean iteration (heap may have stale entries)
        pending_goals = sorted(
            [g for g in self._goals.values() if g["status"] in (STATUS_PENDING, STATUS_ACTIVE)],
            key=lambda g: (-g["priority"], g["created_at"]),
        )

        for goal in pending_goals:
            deps_met = all(
                self._goals.get(dep_id, {}).get("status") == STATUS_COMPLETE
                for dep_id in goal["dependencies"]
            )
            if deps_met:
                if goal["status"] == STATUS_PENDING:
                    goal["status"] = STATUS_ACTIVE
                    goal["updated_at"] = time.time()
                    log.info(
                        "goal_engine.goal_activated",
                        goal_id=goal["goal_id"],
                        priority=goal["priority"],
                    )
                return goal

        log.debug("goal_engine.no_actionable_goal", total_goals=len(self._goals))
        return None

    # ------------------------------------------------------------------
    # Goal completion / failure
    # ------------------------------------------------------------------

    def mark_complete(self, goal_id: str, outcome: dict[str, Any]) -> None:
        """
        Mark a goal as complete and unlock dependent goals.

        Args:
            goal_id: ID of the goal to mark complete.
            outcome: Dict describing the outcome (free-form).
        """
        goal = self._goals.get(goal_id)
        if not goal:
            log.warning("goal_engine.complete_not_found", goal_id=goal_id)
            return

        goal["status"] = STATUS_COMPLETE
        goal["outcome"] = outcome
        goal["updated_at"] = time.time()

        # Unlock any goals that depended on this one
        unlocked = [
            g for g in self._goals.values()
            if goal_id in g.get("dependencies", []) and g["status"] == STATUS_BLOCKED
        ]
        for dependent in unlocked:
            dependent["status"] = STATUS_PENDING
            dependent["updated_at"] = time.time()

        log.info(
            "goal_engine.goal_completed",
            goal_id=goal_id,
            unlocked=len(unlocked),
        )

    def mark_failed(self, goal_id: str, reason: str) -> None:
        """
        Mark a goal as failed and propagate failure to all dependent goals.

        Args:
            goal_id: ID of the failed goal.
            reason:  Human-readable failure reason.
        """
        goal = self._goals.get(goal_id)
        if not goal:
            log.warning("goal_engine.failed_not_found", goal_id=goal_id)
            return

        goal["status"] = STATUS_FAILED
        goal["failure_reason"] = reason
        goal["updated_at"] = time.time()

        # Propagate failure: all goals that depend on this one are blocked
        blocked = [
            g for g in self._goals.values()
            if goal_id in g.get("dependencies", [])
            and g["status"] in (STATUS_PENDING, STATUS_ACTIVE)
        ]
        for dependent in blocked:
            dependent["status"] = STATUS_BLOCKED
            dependent["failure_reason"] = f"Blocked by failed dependency: {goal_id}"
            dependent["updated_at"] = time.time()

        log.warning(
            "goal_engine.goal_failed",
            goal_id=goal_id,
            reason=reason,
            blocked_dependents=len(blocked),
        )

    # ------------------------------------------------------------------
    # Goal tree visualization
    # ------------------------------------------------------------------

    def get_goal_tree(self) -> dict[str, Any]:
        """
        Return the full goal graph as a nested dict suitable for visualization.

        Each top-level entry is a goal with no dependencies (root node).
        Its dependents are nested recursively under 'dependents'.

        Returns:
            {root_goal_id: {goal_data, dependents: {...}}}
        """

        def _build_subtree(goal_id: str, visited: set[str]) -> dict[str, Any]:
            if goal_id in visited:
                return {"circular_reference": goal_id}
            visited = visited | {goal_id}
            goal = self._goals.get(goal_id, {})
            dependents = {
                g["goal_id"]: _build_subtree(g["goal_id"], visited)
                for g in self._goals.values()
                if goal_id in g.get("dependencies", [])
            }
            return {**goal, "dependents": dependents}

        # Find root goals (no dependencies or all deps are external)
        root_ids = [
            gid for gid, g in self._goals.items()
            if not g.get("dependencies") or all(
                dep not in self._goals for dep in g["dependencies"]
            )
        ]

        tree = {gid: _build_subtree(gid, set()) for gid in root_ids}
        log.debug("goal_engine.tree_generated", roots=len(root_ids), total=len(self._goals))
        return tree

    def get_all_goals(self) -> list[dict[str, Any]]:
        """Return all goals as a flat list sorted by priority descending."""
        return sorted(
            list(self._goals.values()),
            key=lambda g: (-g["priority"], g["created_at"]),
        )

    def stats(self) -> dict[str, Any]:
        """Return summary statistics about the goal queue."""
        statuses: dict[str, int] = {}
        for g in self._goals.values():
            statuses[g["status"]] = statuses.get(g["status"], 0) + 1
        return {
            "total_goals": len(self._goals),
            "by_status": statuses,
            "heap_size": len(self._heap),
        }
