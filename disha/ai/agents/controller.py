"""Controller module for the Disha Agent Core.

Implements the autonomous improvement loop that continuously
plans, executes, evaluates, and iterates. This is the heartbeat
of the agent system.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Callable

from .config import ControllerConfig
from .executor import Executor
from .memory import MemoryStore
from .planner import Planner
from .types import (
    AgentState,
    LogLevel,
    Plan,
    Task,
    TaskStatus,
)

logger = logging.getLogger(__name__)


class Controller:
    """Autonomous control loop that drives the agent system.

    The loop follows this cycle:
        1. Plan  → decompose objective into tasks
        2. Execute → run the next available task
        3. Evaluate → check results and decide next action
        4. Iterate → continue or replan as needed
    """

    def __init__(
        self,
        config: ControllerConfig,
        planner: Planner,
        executor: Executor,
        memory: MemoryStore,
    ) -> None:
        self._config = config
        self._planner = planner
        self._executor = executor
        self._memory = memory
        self._state = AgentState()
        self._hooks: dict[str, list[Callable[..., Any]]] = {
            "on_cycle_start": [],
            "on_cycle_end": [],
            "on_task_complete": [],
            "on_task_fail": [],
            "on_plan_complete": [],
            "on_error": [],
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def state(self) -> AgentState:
        return self._state

    def register_hook(self, event: str, callback: Callable[..., Any]) -> None:
        """Register a callback for a lifecycle event."""
        if event in self._hooks:
            self._hooks[event].append(callback)

    def run(self, objective: str, *, context: str = "") -> AgentState:
        """Run the autonomous loop until the objective is completed
        or limits are reached.

        Args:
            objective: High-level goal to accomplish.
            context: Optional additional context.

        Returns:
            Final AgentState with metrics.
        """
        self._state = AgentState(
            is_running=True,
            started_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
        self._memory.log(
            f"Controller started: {objective[:120]}",
            LogLevel.INFO,
        )

        consecutive_failures = 0
        try:
            # Phase 1: Create initial plan
            plan = self._planner.create_plan(objective, context=context)
            self._state.active_plan = plan

            # Phase 2: Execute loop
            while (
                self._state.cycle < self._config.max_cycles
                and not plan.completed
                and consecutive_failures < self._config.max_consecutive_failures
            ):
                self._state.cycle += 1
                self._fire("on_cycle_start", self._state)

                cycle_start = time.monotonic()

                # Get next executable task
                task = self._planner.next_task(plan)
                if task is None:
                    # No tasks ready — might need replan
                    self._memory.log(
                        "No executable tasks — attempting replan",
                        LogLevel.WARNING,
                    )
                    plan = self._planner.replan(
                        plan, reason="No executable tasks available"
                    )
                    self._state.active_plan = plan
                    continue

                # Execute the task
                self._state.current_task = task
                completed_task = self._executor.execute_task(task)

                if completed_task.status == TaskStatus.COMPLETED:
                    consecutive_failures = 0
                    self._fire("on_task_complete", completed_task)
                    self._memory.log(
                        f"Task completed: {completed_task.title}",
                        LogLevel.INFO,
                    )
                elif completed_task.status == TaskStatus.FAILED:
                    consecutive_failures += 1
                    self._fire("on_task_fail", completed_task)
                    self._memory.log(
                        f"Task failed ({consecutive_failures}/{self._config.max_consecutive_failures}): "
                        f"{completed_task.title} — {completed_task.error}",
                        LogLevel.ERROR,
                    )

                    # Replan if auto_plan enabled
                    if (
                        self._config.auto_plan
                        and consecutive_failures < self._config.max_consecutive_failures
                    ):
                        plan = self._planner.replan(
                            plan,
                            failed_task=completed_task,
                            reason=f"Task failed: {completed_task.error}",
                        )
                        self._state.active_plan = plan

                # Record cycle metrics
                cycle_duration = (time.monotonic() - cycle_start) * 1000
                self._state.metrics[f"cycle_{self._state.cycle}"] = {
                    "task": task.title,
                    "status": task.status.value,
                    "duration_ms": cycle_duration,
                }

                self._fire("on_cycle_end", self._state)

                # Pace the loop
                if self._config.cycle_delay_seconds > 0:
                    time.sleep(self._config.cycle_delay_seconds)

            # Phase 3: Wrap up
            if plan.completed:
                self._memory.log("Plan completed successfully", LogLevel.INFO)
                self._fire("on_plan_complete", plan)
            elif consecutive_failures >= self._config.max_consecutive_failures:
                self._state.last_error = (
                    f"Stopped after {consecutive_failures} consecutive failures"
                )
                self._memory.log(self._state.last_error, LogLevel.ERROR)
            else:
                self._state.last_error = (
                    f"Reached max cycles ({self._config.max_cycles})"
                )
                self._memory.log(self._state.last_error, LogLevel.WARNING)

        except Exception as exc:
            self._state.last_error = str(exc)
            self._memory.log(f"Controller error: {exc}", LogLevel.CRITICAL)
            self._fire("on_error", exc)

        finally:
            self._state.is_running = False
            self._state.metrics["total_cycles"] = self._state.cycle
            self._state.metrics["plan_progress"] = (
                plan.progress if self._state.active_plan else 0.0
            )
            # Persist memory state
            try:
                self._memory.save()
            except Exception as exc:
                logger.warning("Failed to save memory: %s", exc)

        return self._state

    def run_single_cycle(self, plan: Plan) -> Task | None:
        """Execute a single cycle of the loop (useful for step-by-step mode)."""
        task = self._planner.next_task(plan)
        if task is None:
            return None

        self._state.cycle += 1
        self._state.current_task = task
        return self._executor.execute_task(task)

    # ------------------------------------------------------------------
    # Hooks
    # ------------------------------------------------------------------

    def _fire(self, event: str, *args: Any) -> None:
        for callback in self._hooks.get(event, []):
            try:
                callback(*args)
            except Exception as exc:
                logger.warning("Hook %s failed: %s", event, exc)
