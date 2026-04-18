
from __future__ import annotations

import heapq
import time
import uuid
from typing import Any

import structlog

log = structlog.get_logger(__name__)

STATUS_PENDING = "pending"
STATUS_ACTIVE = "active"
STATUS_COMPLETE = "complete"
STATUS_FAILED = "failed"
STATUS_BLOCKED = "blocked"

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

    __slots__ = ("priority", "timestamp", "goal")

    def __init__(self, goal: dict[str, Any]) -> None:
        self.priority = -goal["priority"]
        self.timestamp = goal["created_at"]
        self.goal = goal

    def __lt__(self, other: "_GoalEntry") -> bool:
        if self.priority != other.priority:
            return self.priority < other.priority
        return self.timestamp < other.timestamp

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, _GoalEntry):
            return False
        return self.goal["goal_id"] == other.goal["goal_id"]

class GoalEngine:

    def __init__(self) -> None:
        self._heap: list[_GoalEntry] = []
        self._goals: dict[str, dict[str, Any]] = {}
        log.info("goal_engine.initialized")

    def add_goal(
        self,
        description: str,
        priority: int = 5,
        dependencies: list[str] | None = None,
    ) -> str:
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

    def decompose(self, goal_id: str) -> list[dict[str, Any]]:
        goal = self._goals.get(goal_id)
        if not goal:
            log.warning("goal_engine.decompose_not_found", goal_id=goal_id)
            return []

        description = goal["description"].lower()

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

    def get_next_actionable(self) -> dict[str, Any] | None:

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

    def mark_complete(self, goal_id: str, outcome: dict[str, Any]) -> None:
        goal = self._goals.get(goal_id)
        if not goal:
            log.warning("goal_engine.complete_not_found", goal_id=goal_id)
            return

        goal["status"] = STATUS_COMPLETE
        goal["outcome"] = outcome
        goal["updated_at"] = time.time()

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
        goal = self._goals.get(goal_id)
        if not goal:
            log.warning("goal_engine.failed_not_found", goal_id=goal_id)
            return

        goal["status"] = STATUS_FAILED
        goal["failure_reason"] = reason
        goal["updated_at"] = time.time()

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

    def get_goal_tree(self) -> dict[str, Any]:

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
        return sorted(
            list(self._goals.values()),
            key=lambda g: (-g["priority"], g["created_at"]),
        )

    def stats(self) -> dict[str, Any]:
        statuses: dict[str, int] = {}
        for g in self._goals.values():
            statuses[g["status"]] = statuses.get(g["status"], 0) + 1
        return {
            "total_goals": len(self._goals),
            "by_status": statuses,
            "heap_size": len(self._heap),
        }
