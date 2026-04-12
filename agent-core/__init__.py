"""Disha Agent Core — Autonomous Claude-powered coding agent system.

Modules:
    - agent:      Main Agent orchestrator
    - planner:    Task decomposition using Claude
    - executor:   Tool-based task execution
    - memory:     Context, logs, and decision storage
    - tools:      File system, terminal, and analysis tools
    - controller: Autonomous improvement loop
    - config:     Configuration management
    - types:      Shared type definitions
"""

__version__ = "1.0.0"

from .agent import Agent
from .config import AgentConfig
from .controller import Controller
from .executor import Executor
from .memory import MemoryStore
from .planner import Planner
from .types import (
    AgentState,
    LogLevel,
    MemoryEntry,
    MemoryScope,
    Plan,
    Task,
    TaskPriority,
    TaskStatus,
    ToolCall,
    ToolCategory,
    ToolResult,
)

__all__ = [
    "Agent",
    "AgentConfig",
    "AgentState",
    "Controller",
    "Executor",
    "LogLevel",
    "MemoryEntry",
    "MemoryScope",
    "MemoryStore",
    "Plan",
    "Planner",
    "Task",
    "TaskPriority",
    "TaskStatus",
    "ToolCall",
    "ToolCategory",
    "ToolResult",
]
