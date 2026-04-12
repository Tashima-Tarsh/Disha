"""Planner module for the Disha Agent Core.

Decomposes high-level objectives into structured plans of
actionable tasks using Claude for intelligent reasoning.
Falls back to rule-based decomposition when Claude is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from .config import ClaudeConfig
from .memory import MemoryStore
from .types import (
    LogLevel,
    MemoryScope,
    Plan,
    Task,
    TaskPriority,
    TaskStatus,
)

logger = logging.getLogger(__name__)

# Claude-specific prompt for task decomposition
_PLANNER_SYSTEM_PROMPT = """\
You are Disha's Planner module — a senior system architect that decomposes
objectives into clear, actionable tasks.

Rules:
1. Break the objective into 2-10 concrete tasks.
2. Each task must be independently executable.
3. Specify dependencies between tasks when order matters.
4. Assign priority: critical, high, medium, or low.
5. Keep descriptions precise and implementation-ready.

Respond with ONLY valid JSON matching this schema:
{
  "tasks": [
    {
      "title": "short title",
      "description": "what to do and how",
      "priority": "medium",
      "dependencies": []
    }
  ]
}
"""


class Planner:
    """Decomposes objectives into structured execution plans."""

    def __init__(
        self,
        claude_config: ClaudeConfig,
        memory: MemoryStore,
    ) -> None:
        self._claude_config = claude_config
        self._memory = memory
        self._client: Any = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_plan(
        self,
        objective: str,
        *,
        context: str = "",
    ) -> Plan:
        """Create an execution plan for the given objective.

        Uses Claude when available, falls back to rule-based decomposition.
        """
        self._memory.log(
            f"Planning: {objective[:120]}",
            LogLevel.INFO,
            context={"objective": objective},
        )

        # Attempt Claude-powered planning
        tasks = self._plan_with_claude(objective, context)
        if tasks is None:
            # Fallback to rule-based
            tasks = self._plan_rule_based(objective)

        plan = Plan(objective=objective, tasks=tasks)

        # Store plan in memory for reference
        self._memory.store(
            f"plan:{plan.id}",
            {
                "objective": objective,
                "task_count": len(tasks),
                "task_ids": [t.id for t in tasks],
            },
            scope=MemoryScope.SESSION,
            tags=["plan"],
        )

        self._memory.record_decision(
            decision=f"Created plan with {len(tasks)} tasks",
            rationale=f"Objective: {objective[:200]}",
        )

        return plan

    def replan(
        self,
        plan: Plan,
        *,
        failed_task: Task | None = None,
        reason: str = "",
    ) -> Plan:
        """Adjust an existing plan, optionally in response to a failure."""
        context_parts = [f"Original objective: {plan.objective}"]

        completed = [t for t in plan.tasks if t.status == TaskStatus.COMPLETED]
        if completed:
            context_parts.append(
                "Completed tasks: "
                + ", ".join(t.title for t in completed)
            )

        if failed_task:
            context_parts.append(
                f"Failed task: {failed_task.title} — {failed_task.error}"
            )

        if reason:
            context_parts.append(f"Reason for replan: {reason}")

        # Build remaining tasks
        remaining = [
            t for t in plan.tasks
            if t.status in (TaskStatus.PENDING, TaskStatus.BLOCKED)
        ]

        new_objective = (
            f"Continue: {plan.objective}\n"
            f"Already done: {len(completed)} tasks. "
            f"Remaining: {len(remaining)}."
        )

        return self.create_plan(
            new_objective,
            context="\n".join(context_parts),
        )

    def next_task(self, plan: Plan) -> Task | None:
        """Return the next executable task from the plan.

        A task is executable if it is PENDING and all its
        dependencies are COMPLETED.
        """
        completed_ids = {
            t.id for t in plan.tasks if t.status == TaskStatus.COMPLETED
        }
        for task in plan.tasks:
            if task.status != TaskStatus.PENDING:
                continue
            if all(dep in completed_ids for dep in task.dependencies):
                return task
        return None

    # ------------------------------------------------------------------
    # Claude-powered planning
    # ------------------------------------------------------------------

    def _plan_with_claude(
        self, objective: str, context: str
    ) -> list[Task] | None:
        """Use Claude API to decompose the objective into tasks."""
        if not self._claude_config.api_key:
            logger.debug("No API key — skipping Claude planning")
            return None

        try:
            client = self._get_client()
            user_prompt = f"Objective: {objective}"
            if context:
                user_prompt += f"\n\nContext:\n{context}"

            response = client.messages.create(
                model=self._claude_config.model,
                max_tokens=self._claude_config.max_tokens,
                temperature=self._claude_config.temperature,
                system=_PLANNER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )

            text = response.content[0].text
            return self._parse_claude_response(text)

        except Exception as exc:
            logger.warning("Claude planning failed: %s", exc)
            self._memory.log(
                f"Claude planning failed: {exc}",
                LogLevel.WARNING,
            )
            return None

    def _parse_claude_response(self, text: str) -> list[Task] | None:
        """Parse Claude's JSON response into Task objects."""
        try:
            # Handle markdown code blocks
            if "```" in text:
                start = text.index("```") + 3
                if text[start:].startswith("json"):
                    start += 4
                end = text.index("```", start)
                text = text[start:end].strip()

            data = json.loads(text)
            tasks_data = data.get("tasks", [])
            if not tasks_data:
                return None

            priority_map = {
                "critical": TaskPriority.CRITICAL,
                "high": TaskPriority.HIGH,
                "medium": TaskPriority.MEDIUM,
                "low": TaskPriority.LOW,
            }

            tasks: list[Task] = []
            for item in tasks_data:
                task = Task(
                    title=item.get("title", "Untitled"),
                    description=item.get("description", ""),
                    priority=priority_map.get(
                        item.get("priority", "medium"), TaskPriority.MEDIUM
                    ),
                    dependencies=item.get("dependencies", []),
                )
                tasks.append(task)

            return tasks if tasks else None

        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.warning("Failed to parse Claude response: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Rule-based fallback
    # ------------------------------------------------------------------

    def _plan_rule_based(self, objective: str) -> list[Task]:
        """Simple rule-based task decomposition as fallback."""
        tasks = [
            Task(
                title="Analyze current state",
                description=f"Analyze the repository to understand context for: {objective}",
                priority=TaskPriority.HIGH,
            ),
            Task(
                title="Identify changes needed",
                description="Based on analysis, identify specific files and changes required.",
                priority=TaskPriority.HIGH,
            ),
            Task(
                title="Implement changes",
                description="Apply the identified changes to the codebase.",
                priority=TaskPriority.MEDIUM,
            ),
            Task(
                title="Validate changes",
                description="Verify the changes work correctly and don't break existing functionality.",
                priority=TaskPriority.MEDIUM,
            ),
        ]
        # Set linear dependencies
        for i in range(1, len(tasks)):
            tasks[i].dependencies = [tasks[i - 1].id]
        return tasks

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> Any:
        """Lazy-initialize the Anthropic client."""
        if self._client is None:
            try:
                import anthropic
                self._client = anthropic.Anthropic(
                    api_key=self._claude_config.api_key,
                    timeout=self._claude_config.timeout_seconds,
                )
            except ImportError:
                raise RuntimeError(
                    "anthropic package required for Claude planning. "
                    "Install with: pip install anthropic"
                )
        return self._client
