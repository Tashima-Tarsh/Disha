"""Shared type definitions for the Disha Agent Core."""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


class TaskStatus(enum.Enum):
    """Status of a task in the agent pipeline."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class TaskPriority(enum.Enum):
    """Priority levels for task scheduling."""

    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


class ToolCategory(enum.Enum):
    """Categories of tools available to the agent."""

    FILE_SYSTEM = "file_system"
    TERMINAL = "terminal"
    API = "api"
    ANALYSIS = "analysis"
    SEARCH = "search"


class MemoryScope(enum.Enum):
    """Scope of a memory entry."""

    SESSION = "session"
    PROJECT = "project"
    GLOBAL = "global"


class LogLevel(enum.Enum):
    """Logging severity levels."""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Task:
    """Represents a decomposed unit of work."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    parent_id: str | None = None
    subtasks: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    result: Any = None
    error: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    completed_at: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def mark_completed(self, result: Any = None) -> None:
        self.status = TaskStatus.COMPLETED
        self.result = result
        self.completed_at = datetime.now(UTC).isoformat()

    def mark_failed(self, error: str) -> None:
        self.status = TaskStatus.FAILED
        self.error = error
        self.completed_at = datetime.now(UTC).isoformat()


@dataclass
class ToolCall:
    """Represents a tool invocation request."""

    tool_name: str
    arguments: dict[str, Any] = field(default_factory=dict)
    category: ToolCategory = ToolCategory.FILE_SYSTEM


@dataclass
class ToolResult:
    """Result of a tool invocation."""

    tool_name: str
    success: bool
    output: str = ""
    error: str | None = None
    duration_ms: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryEntry:
    """A single entry in the agent's memory store."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    scope: MemoryScope = MemoryScope.SESSION
    key: str = ""
    value: Any = None
    tags: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    expires_at: str | None = None
    access_count: int = 0

    def touch(self) -> None:
        """Record an access to this memory entry."""
        self.access_count += 1


@dataclass
class Plan:
    """A structured plan produced by the Planner module."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    objective: str = ""
    tasks: list[Task] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def completed(self) -> bool:
        return all(t.status == TaskStatus.COMPLETED for t in self.tasks)

    @property
    def progress(self) -> float:
        if not self.tasks:
            return 0.0
        done = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED)
        return done / len(self.tasks)


@dataclass
class AgentState:
    """Snapshot of the agent's current operational state."""

    cycle: int = 0
    active_plan: Plan | None = None
    current_task: Task | None = None
    is_running: bool = False
    last_error: str | None = None
    started_at: str | None = None
    metrics: dict[str, Any] = field(default_factory=dict)
