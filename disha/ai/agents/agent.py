"""Main Agent orchestrator for the Disha Agent Core.

This is the primary entry point that ties together the Planner,
Executor, Memory, Tools, and Controller into a cohesive system.
"""

from __future__ import annotations

import logging
from typing import Any

from .config import AgentConfig
from .controller import Controller
from .executor import Executor
from .memory import MemoryStore
from .planner import Planner
from .types import AgentState, LogLevel, MemoryScope, Plan, Task, ToolResult

logger = logging.getLogger(__name__)


class Agent:
    """Disha autonomous coding agent powered by Claude.

    Usage::

        from agent_core import Agent, AgentConfig

        config = AgentConfig.from_env()
        agent = Agent(config)

        # Run autonomously
        state = agent.run("Refactor the authentication module for clarity")

        # Or step-by-step
        plan = agent.plan("Add input validation to API endpoints")
        for task in agent.iterate(plan):
            print(task.title, task.status)

        # Direct tool access
        result = agent.tool("read_file", path="src/main.py")
    """

    def __init__(self, config: AgentConfig | None = None) -> None:
        self._config = config or AgentConfig.from_env()
        self._setup_logging()

        # Initialize subsystems
        self._memory = MemoryStore(self._config.memory)
        self._planner = Planner(self._config.claude, self._memory)
        self._executor = Executor(
            self._config.claude, self._config.executor, self._memory
        )
        self._controller = Controller(
            self._config.controller,
            self._planner,
            self._executor,
            self._memory,
        )

        # Load persisted memory if available
        if self._memory.load():
            logger.info("Loaded persisted memory state")

        self._memory.log("Agent initialized", LogLevel.INFO)

    # ------------------------------------------------------------------
    # High-level API
    # ------------------------------------------------------------------

    def run(self, objective: str, *, context: str = "") -> AgentState:
        """Run the full autonomous loop for the given objective.

        This is the primary entry point for autonomous operation.
        The agent will plan, execute, and iterate until the objective
        is complete or limits are reached.
        """
        if self._config.dry_run:
            self._memory.log("Dry run — skipping execution", LogLevel.INFO)
            plan = self._planner.create_plan(objective, context=context)
            return AgentState(active_plan=plan)

        return self._controller.run(objective, context=context)

    def plan(self, objective: str, *, context: str = "") -> Plan:
        """Create a plan without executing it."""
        return self._planner.create_plan(objective, context=context)

    def execute(self, task: Task) -> Task:
        """Execute a single task."""
        return self._executor.execute_task(task)

    def iterate(self, plan: Plan) -> list[Task]:
        """Execute all tasks in a plan sequentially, yielding results."""
        results: list[Task] = []
        while not plan.completed:
            task = self._planner.next_task(plan)
            if task is None:
                break
            completed = self._executor.execute_task(task)
            results.append(completed)
        return results

    # ------------------------------------------------------------------
    # Direct tool access
    # ------------------------------------------------------------------

    def tool(self, name: str, **kwargs: Any) -> ToolResult:
        """Invoke a tool directly by name."""
        return self._executor.run_tool(name, **kwargs)

    def available_tools(self) -> list[str]:
        """List all registered tool names."""
        return self._executor.available_tools()

    # ------------------------------------------------------------------
    # Memory access
    # ------------------------------------------------------------------

    def remember(
        self,
        key: str,
        value: Any,
        *,
        scope: MemoryScope = MemoryScope.SESSION,
        tags: list[str] | None = None,
    ) -> None:
        """Store a value in agent memory."""
        self._memory.store(key, value, scope=scope, tags=tags)

    def recall(self, key: str, scope: MemoryScope = MemoryScope.SESSION) -> Any:
        """Retrieve a value from agent memory."""
        return self._memory.recall(key, scope)

    def memory_snapshot(self) -> dict[str, Any]:
        """Get a summary of the current memory state."""
        return self._memory.snapshot()

    # ------------------------------------------------------------------
    # State & hooks
    # ------------------------------------------------------------------

    @property
    def state(self) -> AgentState:
        return self._controller.state

    def on(self, event: str, callback: Any) -> None:
        """Register a lifecycle hook (on_cycle_start, on_task_complete, etc.)."""
        self._controller.register_hook(event, callback)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _setup_logging(self) -> None:
        level = getattr(logging, self._config.log_level.upper(), logging.INFO)
        logging.basicConfig(
            level=level,
            format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            datefmt="%H:%M:%S",
        )
