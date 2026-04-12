"""Action Layer — Goal-driven execution engine for the cognitive architecture.

Manages goals, plans actions, monitors execution, and adjusts behavior
based on feedback. Implements a goal-stack architecture with priority
scheduling and progress tracking.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from ..types import (
    CognitiveEvent,
    Goal,
    GoalStatus,
)

logger = logging.getLogger(__name__)


class GoalManager:
    """Manages a hierarchical goal stack with priority scheduling."""

    def __init__(self, max_active_goals: int = 10) -> None:
        self._goals: dict[str, Goal] = {}
        self._max_active = max_active_goals

    def propose(
        self,
        description: str,
        *,
        priority: float = 0.5,
        parent_goal: str | None = None,
        success_criteria: list[str] | None = None,
        deadline: str | None = None,
    ) -> Goal:
        """Propose a new goal."""
        goal = Goal(
            description=description,
            priority=priority,
            parent_goal=parent_goal,
            success_criteria=success_criteria or [],
            deadline=deadline,
        )
        self._goals[goal.id] = goal

        # Link to parent
        if parent_goal and parent_goal in self._goals:
            self._goals[parent_goal].subgoals.append(goal.id)

        logger.info("Goal proposed: %s (priority=%.2f)", description[:60], priority)
        return goal

    def activate(self, goal_id: str) -> bool:
        """Activate a proposed goal for pursuit."""
        goal = self._goals.get(goal_id)
        if goal is None or goal.status != GoalStatus.PROPOSED:
            return False
        
        active_count = sum(
            1 for g in self._goals.values() 
            if g.status in (GoalStatus.ACTIVE, GoalStatus.PURSUING)
        )
        if active_count >= self._max_active:
            # Suspend lowest priority active goal
            active_goals = [
                g for g in self._goals.values()
                if g.status in (GoalStatus.ACTIVE, GoalStatus.PURSUING)
            ]
            if active_goals:
                lowest = min(active_goals, key=lambda g: g.priority)
                lowest.status = GoalStatus.SUSPENDED

        goal.status = GoalStatus.ACTIVE
        return True

    def pursue(self, goal_id: str) -> bool:
        """Mark a goal as being actively pursued."""
        goal = self._goals.get(goal_id)
        if goal is None:
            return False
        goal.status = GoalStatus.PURSUING
        return True

    def update_progress(self, goal_id: str, progress: float) -> bool:
        """Update goal progress (0.0 to 1.0)."""
        goal = self._goals.get(goal_id)
        if goal is None:
            return False
        goal.progress = max(0.0, min(1.0, progress))
        
        # Auto-complete if progress reaches 1.0
        if goal.progress >= 1.0:
            goal.status = GoalStatus.ACHIEVED
            logger.info("Goal achieved: %s", goal.description[:60])
        return True

    def fail(self, goal_id: str, reason: str = "") -> bool:
        """Mark a goal as failed."""
        goal = self._goals.get(goal_id)
        if goal is None:
            return False
        goal.status = GoalStatus.FAILED
        goal.metadata["failure_reason"] = reason
        logger.warning("Goal failed: %s — %s", goal.description[:60], reason)
        return True

    def abandon(self, goal_id: str) -> bool:
        """Abandon a goal."""
        goal = self._goals.get(goal_id)
        if goal is None:
            return False
        goal.status = GoalStatus.ABANDONED
        return True

    def get_active(self) -> list[Goal]:
        """Get all active goals sorted by priority."""
        active = [
            g for g in self._goals.values()
            if g.status in (GoalStatus.ACTIVE, GoalStatus.PURSUING)
        ]
        active.sort(key=lambda g: g.priority, reverse=True)
        return active

    def get_next(self) -> Goal | None:
        """Get the highest-priority active goal not yet being pursued."""
        candidates = [
            g for g in self._goals.values()
            if g.status == GoalStatus.ACTIVE
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda g: g.priority)

    def get(self, goal_id: str) -> Goal | None:
        return self._goals.get(goal_id)

    def summary(self) -> dict[str, Any]:
        status_counts: dict[str, int] = defaultdict(int)
        for g in self._goals.values():
            status_counts[g.status.value] += 1
        return {
            "total": len(self._goals),
            "by_status": dict(status_counts),
            "active": len(self.get_active()),
            "avg_progress": (
                sum(g.progress for g in self._goals.values()) / len(self._goals)
                if self._goals else 0.0
            ),
        }


class ActionPlanner:
    """Plans concrete actions to achieve goals."""

    def __init__(self) -> None:
        self._action_history: list[dict[str, Any]] = []

    def plan_actions(
        self,
        goal: Goal,
        *,
        available_tools: list[str] | None = None,
        context: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Generate an action plan for a goal.
        
        Returns a list of action dicts with keys: action, description, tool, priority.
        """
        actions: list[dict[str, Any]] = []

        # Break goal into action steps based on success criteria
        if goal.success_criteria:
            for i, criterion in enumerate(goal.success_criteria):
                actions.append({
                    "action": f"step_{i+1}",
                    "description": f"Achieve: {criterion}",
                    "tool": self._suggest_tool(criterion, available_tools),
                    "priority": goal.priority * (1.0 - i * 0.05),
                    "goal_id": goal.id,
                })
        else:
            # Default action plan
            actions = [
                {
                    "action": "analyze",
                    "description": f"Analyze requirements for: {goal.description}",
                    "tool": "analysis",
                    "priority": goal.priority,
                    "goal_id": goal.id,
                },
                {
                    "action": "execute",
                    "description": f"Execute: {goal.description}",
                    "tool": self._suggest_tool(goal.description, available_tools),
                    "priority": goal.priority * 0.9,
                    "goal_id": goal.id,
                },
                {
                    "action": "verify",
                    "description": f"Verify completion of: {goal.description}",
                    "tool": "verification",
                    "priority": goal.priority * 0.8,
                    "goal_id": goal.id,
                },
            ]

        return actions

    def record_action(
        self,
        action: str,
        *,
        goal_id: str = "",
        success: bool = True,
        result: str = "",
        duration_ms: float = 0.0,
    ) -> None:
        """Record an executed action for learning."""
        self._action_history.append({
            "action": action,
            "goal_id": goal_id,
            "success": success,
            "result": result[:500],
            "duration_ms": duration_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    @property
    def history(self) -> list[dict[str, Any]]:
        return list(self._action_history)

    def success_rate(self, action_type: str = "") -> float:
        """Calculate success rate, optionally filtered by action type."""
        relevant = self._action_history
        if action_type:
            relevant = [a for a in relevant if a["action"] == action_type]
        if not relevant:
            return 0.0
        return sum(1 for a in relevant if a["success"]) / len(relevant)

    @staticmethod
    def _suggest_tool(description: str, available_tools: list[str] | None) -> str:
        """Suggest a tool based on action description."""
        desc_lower = description.lower()
        tool_hints = {
            "file": "file_system",
            "read": "file_system",
            "write": "file_system",
            "search": "search",
            "find": "search",
            "analyze": "analysis",
            "run": "terminal",
            "execute": "terminal",
            "test": "terminal",
            "api": "api",
            "fetch": "api",
            "query": "api",
        }
        for keyword, tool in tool_hints.items():
            if keyword in desc_lower:
                if available_tools is None or tool in available_tools:
                    return tool
        return "general"


class ActionEngine:
    """Main action engine combining goal management and action planning.
    
    Example:
        engine = ActionEngine()
        goal = engine.goals.propose("Fix security vulnerability", priority=0.9)
        engine.goals.activate(goal.id)
        actions = engine.plan(goal)
        for action in actions:
            result = execute(action)  # External execution
            engine.record(action["action"], goal_id=goal.id, success=result.ok)
        engine.goals.update_progress(goal.id, 1.0)
    """

    def __init__(self, max_active_goals: int = 10) -> None:
        self.goals = GoalManager(max_active_goals)
        self._planner = ActionPlanner()
        self._event_log: list[CognitiveEvent] = []

    def plan(
        self,
        goal: Goal,
        *,
        available_tools: list[str] | None = None,
        context: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Plan actions for a goal."""
        actions = self._planner.plan_actions(
            goal, available_tools=available_tools, context=context,
        )
        self._event_log.append(CognitiveEvent(
            event_type="action_planned",
            source_layer="action",
            payload={
                "goal_id": goal.id,
                "action_count": len(actions),
                "goal_description": goal.description[:100],
            },
        ))
        return actions

    def record(
        self,
        action: str,
        *,
        goal_id: str = "",
        success: bool = True,
        result: str = "",
        duration_ms: float = 0.0,
    ) -> None:
        """Record an executed action."""
        self._planner.record_action(
            action, goal_id=goal_id, success=success,
            result=result, duration_ms=duration_ms,
        )
        self._event_log.append(CognitiveEvent(
            event_type="action_executed",
            source_layer="action",
            payload={
                "action": action,
                "goal_id": goal_id,
                "success": success,
            },
        ))

    def overall_success_rate(self) -> float:
        """Overall action success rate."""
        return self._planner.success_rate()

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)
