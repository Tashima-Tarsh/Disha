from __future__ import annotations

from pathlib import Path
from typing import Any

from config import settings
from database.store import SQLiteStore
from models.schemas import ExecutionResult, Plan
from security.policy import SecurityPolicy


class Executor:
    def __init__(self, store: SQLiteStore, policy: SecurityPolicy) -> None:
        self.store = store
        self.policy = policy
        self.workspace_root = Path(settings.allowed_workspace).resolve()

    def execute(self, plan: Plan) -> list[ExecutionResult]:
        results: list[ExecutionResult] = []
        for step in plan.steps:
            if step.tool is None:
                results.append(
                    ExecutionResult(
                        success=True,
                        step=step.title,
                        output={"message": "No tool execution required"},
                    )
                )
                continue

            try:
                output = self._run_tool(step.tool, step.input)
                results.append(ExecutionResult(success=True, step=step.title, output=output))
            except Exception as exc:
                results.append(
                    ExecutionResult(success=False, step=step.title, error=str(exc), output={})
                )
        return results

    def _run_tool(self, tool: str, tool_input: dict[str, Any]) -> dict[str, Any]:
        if tool == "list_files":
            path = self.policy.ensure_workspace_path(str(tool_input.get("path", ".")))
            entries = [item.name for item in path.iterdir()]
            return {"path": str(path), "entries": entries[:100]}

        if tool == "read_file":
            path = self.policy.ensure_workspace_path(str(tool_input.get("path", "README.md")))
            if not path.is_file():
                raise FileNotFoundError(f"File not found: {path.name}")
            content = path.read_text(encoding="utf-8", errors="replace")
            return {"path": str(path), "content": content[:4000]}

        if tool == "latest_events":
            recent = self.store.recent_telemetry(device_id=tool_input.get("device_id", "desktop"), limit=5)
            return {"telemetry": recent}

        raise ValueError(f"Unknown tool: {tool}")
