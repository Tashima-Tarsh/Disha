"""Executor module for the Disha Agent Core.

Responsible for executing tasks by translating task descriptions
into tool calls, running them, and reporting results. Uses Claude
for intelligent tool selection when available.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from .config import ClaudeConfig, ExecutorConfig
from .memory import MemoryStore
from .tools import get_tool, init_tools, list_tools
from .types import (
    LogLevel,
    MemoryScope,
    Task,
    TaskStatus,
    ToolCall,
    ToolResult,
)

logger = logging.getLogger(__name__)

_EXECUTOR_SYSTEM_PROMPT = """\
You are Disha's Executor module. Given a task, select the appropriate tool(s)
and provide the arguments needed to complete it.

Available tools:
{tools}

Respond with ONLY valid JSON — a list of tool calls:
[
  {{
    "tool_name": "name",
    "arguments": {{"key": "value"}}
  }}
]

Rules:
1. Use the minimum number of tool calls needed.
2. Chain tool calls logically (read before write).
3. Provide complete, correct arguments.
4. If the task cannot be done with available tools, return an empty list [].
"""


class Executor:
    """Executes tasks by orchestrating tool calls."""

    def __init__(
        self,
        claude_config: ClaudeConfig,
        executor_config: ExecutorConfig,
        memory: MemoryStore,
    ) -> None:
        self._claude_config = claude_config
        self._executor_config = executor_config
        self._memory = memory
        self._tools = init_tools(executor_config)
        self._client: Any = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def execute_task(self, task: Task) -> Task:
        """Execute a single task and update its status."""
        task.status = TaskStatus.IN_PROGRESS
        self._memory.log(
            f"Executing: {task.title}",
            LogLevel.INFO,
            context={"task_id": task.id},
        )

        start = time.monotonic()
        try:
            # Get tool calls for this task
            tool_calls = self._resolve_tool_calls(task)

            if not tool_calls:
                # No tools needed — mark as done with note
                task.mark_completed(result="No tool calls required")
                return task

            # Execute each tool call in sequence
            results: list[ToolResult] = []
            for call in tool_calls:
                result = self._execute_tool_call(call)
                results.append(result)

                if not result.success:
                    task.mark_failed(
                        f"Tool '{call.tool_name}' failed: {result.error}"
                    )
                    self._memory.log(
                        f"Tool failed: {call.tool_name} — {result.error}",
                        LogLevel.ERROR,
                        context={"task_id": task.id, "tool": call.tool_name},
                    )
                    break

            if task.status != TaskStatus.FAILED:
                summary = self._summarize_results(results)
                task.mark_completed(result=summary)
                self._memory.log(
                    f"Completed: {task.title}",
                    LogLevel.INFO,
                    context={
                        "task_id": task.id,
                        "tools_used": len(results),
                        "duration_ms": (time.monotonic() - start) * 1000,
                    },
                )

        except Exception as exc:
            task.mark_failed(str(exc))
            self._memory.log(
                f"Execution error: {exc}",
                LogLevel.ERROR,
                context={"task_id": task.id},
            )

        # Store execution result in memory
        self._memory.store(
            f"task_result:{task.id}",
            {
                "title": task.title,
                "status": task.status.value,
                "result": task.result,
                "error": task.error,
            },
            scope=MemoryScope.SESSION,
            tags=["task_result"],
        )

        return task

    def run_tool(self, tool_name: str, **kwargs: Any) -> ToolResult:
        """Directly invoke a tool by name."""
        call = ToolCall(tool_name=tool_name, arguments=kwargs)
        return self._execute_tool_call(call)

    def available_tools(self) -> list[str]:
        """Return names of all registered tools."""
        return list_tools()

    # ------------------------------------------------------------------
    # Tool resolution
    # ------------------------------------------------------------------

    def _resolve_tool_calls(self, task: Task) -> list[ToolCall]:
        """Determine which tools to call for a given task."""
        # Try Claude-powered resolution
        calls = self._resolve_with_claude(task)
        if calls is not None:
            return calls

        # Fallback: heuristic resolution
        return self._resolve_heuristic(task)

    def _resolve_with_claude(self, task: Task) -> list[ToolCall] | None:
        """Use Claude to determine appropriate tool calls."""
        if not self._claude_config.api_key:
            return None

        try:
            client = self._get_client()
            tools_desc = "\n".join(
                f"- {name}: {self._tools[name].description}"
                for name in sorted(self._tools)
            )
            system = _EXECUTOR_SYSTEM_PROMPT.format(tools=tools_desc)

            response = client.messages.create(
                model=self._claude_config.model,
                max_tokens=2048,
                temperature=0.1,
                system=system,
                messages=[{
                    "role": "user",
                    "content": f"Task: {task.title}\nDescription: {task.description}",
                }],
            )

            text = response.content[0].text
            return self._parse_tool_calls(text)

        except Exception as exc:
            logger.warning("Claude tool resolution failed: %s", exc)
            return None

    def _parse_tool_calls(self, text: str) -> list[ToolCall] | None:
        """Parse Claude's response into ToolCall objects."""
        try:
            if "```" in text:
                start = text.index("```") + 3
                if text[start:].startswith("json"):
                    start += 4
                end = text.index("```", start)
                text = text[start:end].strip()

            data = json.loads(text)
            if not isinstance(data, list):
                return None

            calls = []
            for item in data:
                name = item.get("tool_name", "")
                if name in self._tools:
                    calls.append(
                        ToolCall(
                            tool_name=name,
                            arguments=item.get("arguments", {}),
                        )
                    )
            return calls if calls else None

        except (json.JSONDecodeError, KeyError, ValueError):
            return None

    def _resolve_heuristic(self, task: Task) -> list[ToolCall]:
        """Rule-based tool selection based on task description keywords."""
        desc = f"{task.title} {task.description}".lower()

        calls: list[ToolCall] = []

        if any(kw in desc for kw in ["analyze", "scan", "structure", "explore"]):
            calls.append(ToolCall(tool_name="analyze_structure", arguments={"path": "."}))

        if any(kw in desc for kw in ["read", "view", "inspect", "check"]):
            # Try to extract a file path from the description
            calls.append(ToolCall(tool_name="list_directory", arguments={"path": "."}))

        if any(kw in desc for kw in ["search", "find", "locate", "grep"]):
            calls.append(ToolCall(tool_name="search_files", arguments={"pattern": "**/*.py"}))

        if any(kw in desc for kw in ["run", "test", "build", "lint", "execute"]):
            calls.append(
                ToolCall(
                    tool_name="run_command",
                    arguments={"command": "echo 'Task requires manual command specification'"},
                )
            )

        # Default: analyze if nothing matched
        if not calls:
            calls.append(ToolCall(tool_name="list_directory", arguments={"path": "."}))

        return calls

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def _execute_tool_call(self, call: ToolCall) -> ToolResult:
        """Execute a single tool call."""
        tool = get_tool(call.tool_name)
        if tool is None:
            return ToolResult(
                tool_name=call.tool_name,
                success=False,
                error=f"Unknown tool: {call.tool_name}",
            )

        try:
            return tool.execute(**call.arguments)
        except Exception as exc:
            return ToolResult(
                tool_name=call.tool_name,
                success=False,
                error=f"Tool execution error: {exc}",
            )

    @staticmethod
    def _summarize_results(results: list[ToolResult]) -> str:
        """Create a compact summary of tool execution results."""
        parts = []
        for r in results:
            status = "✓" if r.success else "✗"
            line = f"{status} {r.tool_name}"
            if r.duration_ms > 0:
                line += f" ({r.duration_ms:.0f}ms)"
            if r.error:
                line += f" — {r.error}"
            elif r.output:
                preview = r.output[:200].replace("\n", " ")
                line += f" — {preview}"
            parts.append(line)
        return "\n".join(parts)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> Any:
        if self._client is None:
            try:
                import anthropic
                self._client = anthropic.Anthropic(
                    api_key=self._claude_config.api_key,
                    timeout=self._claude_config.timeout_seconds,
                )
            except ImportError:
                raise RuntimeError(
                    "anthropic package required. Install with: pip install anthropic"
                )
        return self._client
