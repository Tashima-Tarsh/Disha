"""Tool layer for the Disha Agent Core.

Provides safe, sandboxed access to the file system, terminal,
and analysis utilities. Every tool returns a ToolResult for
consistent handling by the executor.
"""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path
from typing import Any

from .config import ExecutorConfig
from .types import ToolCall, ToolCategory, ToolResult

# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_TOOL_REGISTRY: dict[str, "BaseTool"] = {}


def register_tool(name: str, tool: "BaseTool") -> None:
    _TOOL_REGISTRY[name] = tool


def get_tool(name: str) -> "BaseTool | None":
    return _TOOL_REGISTRY.get(name)


def list_tools() -> list[str]:
    return sorted(_TOOL_REGISTRY.keys())


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------


class BaseTool:
    """Abstract base for all tools."""

    name: str = ""
    category: ToolCategory = ToolCategory.FILE_SYSTEM
    description: str = ""

    def execute(self, **kwargs: Any) -> ToolResult:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# File-system tools
# ---------------------------------------------------------------------------


class ReadFileTool(BaseTool):
    name = "read_file"
    category = ToolCategory.FILE_SYSTEM
    description = "Read the contents of a file."

    def __init__(self, config: ExecutorConfig) -> None:
        self._config = config

    def execute(self, *, path: str, **_: Any) -> ToolResult:
        start = time.monotonic()
        try:
            resolved = Path(path).resolve()
            if not resolved.is_file():
                return ToolResult(
                    tool_name=self.name,
                    success=False,
                    error=f"Not a file: {path}",
                )
            content = resolved.read_text(encoding="utf-8", errors="replace")
            if len(content) > self._config.max_output_bytes:
                content = content[: self._config.max_output_bytes] + "\n...[truncated]"
            return ToolResult(
                tool_name=self.name,
                success=True,
                output=content,
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )


class WriteFileTool(BaseTool):
    name = "write_file"
    category = ToolCategory.FILE_SYSTEM
    description = "Write content to a file, creating directories as needed."

    def __init__(self, config: ExecutorConfig) -> None:
        self._config = config

    def execute(self, *, path: str, content: str, **_: Any) -> ToolResult:
        start = time.monotonic()
        try:
            resolved = Path(path).resolve()
            if self._config.sandbox_mode:
                suffix = resolved.suffix
                if suffix and suffix not in self._config.allowed_extensions:
                    return ToolResult(
                        tool_name=self.name,
                        success=False,
                        error=f"Extension {suffix} not allowed in sandbox mode",
                    )
            resolved.parent.mkdir(parents=True, exist_ok=True)
            resolved.write_text(content, encoding="utf-8")
            return ToolResult(
                tool_name=self.name,
                success=True,
                output=f"Wrote {len(content)} bytes to {path}",
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )


class ListDirectoryTool(BaseTool):
    name = "list_directory"
    category = ToolCategory.FILE_SYSTEM
    description = "List files and directories at a given path."

    def execute(self, *, path: str = ".", **_: Any) -> ToolResult:
        start = time.monotonic()
        try:
            resolved = Path(path).resolve()
            if not resolved.is_dir():
                return ToolResult(
                    tool_name=self.name,
                    success=False,
                    error=f"Not a directory: {path}",
                )
            entries = sorted(
                entry.name + ("/" if entry.is_dir() else "")
                for entry in resolved.iterdir()
                if not entry.name.startswith(".")
            )
            return ToolResult(
                tool_name=self.name,
                success=True,
                output="\n".join(entries),
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )


class SearchFilesTool(BaseTool):
    name = "search_files"
    category = ToolCategory.SEARCH
    description = "Search for files matching a glob pattern."

    def execute(self, *, pattern: str, path: str = ".", **_: Any) -> ToolResult:
        start = time.monotonic()
        try:
            resolved = Path(path).resolve()
            matches = sorted(str(p.relative_to(resolved)) for p in resolved.glob(pattern))
            return ToolResult(
                tool_name=self.name,
                success=True,
                output="\n".join(matches[:200]),
                duration_ms=(time.monotonic() - start) * 1000,
                metadata={"total_matches": len(matches)},
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )


class GrepTool(BaseTool):
    name = "grep"
    category = ToolCategory.SEARCH
    description = "Search file contents for a pattern using grep."

    def __init__(self, config: ExecutorConfig) -> None:
        self._config = config

    def execute(
        self, *, pattern: str, path: str = ".", max_results: int = 50, **_: Any
    ) -> ToolResult:
        start = time.monotonic()
        try:
            result = subprocess.run(
                ["grep", "-rn", "--include=*.py", "--include=*.ts",
                 "--include=*.tsx", "--include=*.js", "--include=*.json",
                 "--include=*.md", "--include=*.yaml", "--include=*.yml",
                 pattern, path],
                capture_output=True,
                text=True,
                timeout=self._config.command_timeout_seconds,
            )
            lines = result.stdout.strip().split("\n")[:max_results]
            return ToolResult(
                tool_name=self.name,
                success=True,
                output="\n".join(lines),
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except subprocess.TimeoutExpired:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error="Search timed out",
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )


# ---------------------------------------------------------------------------
# Terminal tools
# ---------------------------------------------------------------------------


class RunCommandTool(BaseTool):
    name = "run_command"
    category = ToolCategory.TERMINAL
    description = "Execute a shell command and return its output."

    # Commands that are never allowed regardless of sandbox mode
    _BLOCKED_COMMANDS = frozenset({
        "rm -rf /", "rm -rf /*", "mkfs", "dd if=",
        ":(){:|:&};:", "chmod -R 777 /",
    })

    def __init__(self, config: ExecutorConfig) -> None:
        self._config = config

    def execute(
        self, *, command: str, cwd: str | None = None, **_: Any
    ) -> ToolResult:
        start = time.monotonic()
        for blocked in self._BLOCKED_COMMANDS:
            if blocked in command:
                return ToolResult(
                    tool_name=self.name,
                    success=False,
                    error=f"Blocked dangerous command pattern: {blocked}",
                )
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=cwd,
                timeout=self._config.command_timeout_seconds,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
            output = result.stdout
            if result.stderr:
                output += "\n--- stderr ---\n" + result.stderr
            if len(output) > self._config.max_output_bytes:
                output = output[: self._config.max_output_bytes] + "\n...[truncated]"
            return ToolResult(
                tool_name=self.name,
                success=result.returncode == 0,
                output=output,
                error=f"Exit code: {result.returncode}" if result.returncode != 0 else None,
                duration_ms=(time.monotonic() - start) * 1000,
                metadata={"exit_code": result.returncode},
            )
        except subprocess.TimeoutExpired:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=f"Command timed out after {self._config.command_timeout_seconds}s",
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )


# ---------------------------------------------------------------------------
# Analysis tools
# ---------------------------------------------------------------------------


class AnalyzeStructureTool(BaseTool):
    name = "analyze_structure"
    category = ToolCategory.ANALYSIS
    description = "Analyze a directory tree and return a summary."

    def execute(self, *, path: str = ".", max_depth: int = 3, **_: Any) -> ToolResult:
        start = time.monotonic()
        try:
            root = Path(path).resolve()
            lines: list[str] = []
            stats: dict[str, int] = {}
            self._walk(root, root, lines, stats, 0, max_depth)
            summary = "\n".join(lines[:300])
            ext_summary = ", ".join(
                f"{ext}: {count}" for ext, count in sorted(stats.items(), key=lambda x: -x[1])[:15]
            )
            return ToolResult(
                tool_name=self.name,
                success=True,
                output=f"File types: {ext_summary}\n\n{summary}",
                duration_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000,
            )

    def _walk(
        self,
        current: Path,
        root: Path,
        lines: list[str],
        stats: dict[str, int],
        depth: int,
        max_depth: int,
    ) -> None:
        if depth > max_depth:
            return
        indent = "  " * depth
        try:
            entries = sorted(current.iterdir(), key=lambda p: (not p.is_dir(), p.name))
        except PermissionError:
            return
        for entry in entries:
            if entry.name.startswith(".") or entry.name == "node_modules":
                continue
            if entry.is_dir():
                lines.append(f"{indent}{entry.name}/")
                self._walk(entry, root, lines, stats, depth + 1, max_depth)
            else:
                lines.append(f"{indent}{entry.name}")
                ext = entry.suffix or "(no ext)"
                stats[ext] = stats.get(ext, 0) + 1


# ---------------------------------------------------------------------------
# Tool initialization
# ---------------------------------------------------------------------------


def init_tools(config: ExecutorConfig) -> dict[str, BaseTool]:
    """Create and register all default tools."""
    tools: dict[str, BaseTool] = {
        "read_file": ReadFileTool(config),
        "write_file": WriteFileTool(config),
        "list_directory": ListDirectoryTool(),
        "search_files": SearchFilesTool(),
        "grep": GrepTool(config),
        "run_command": RunCommandTool(config),
        "analyze_structure": AnalyzeStructureTool(),
    }
    for name, tool in tools.items():
        register_tool(name, tool)
    return tools
