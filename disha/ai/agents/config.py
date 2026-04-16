"""Configuration management for the Disha Agent Core.

Loads settings from environment variables with sensible defaults.
No external dependencies required.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ClaudeConfig:
    """Configuration for the Claude API connection."""

    api_key: str = ""
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096
    temperature: float = 0.3
    timeout_seconds: int = 120

    @classmethod
    def from_env(cls) -> ClaudeConfig:
        return cls(
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            model=os.getenv("DISHA_CLAUDE_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=int(os.getenv("DISHA_MAX_TOKENS", "4096")),
            temperature=float(os.getenv("DISHA_TEMPERATURE", "0.3")),
            timeout_seconds=int(os.getenv("DISHA_TIMEOUT", "120")),
        )


@dataclass(frozen=True)
class MemoryConfig:
    """Configuration for the memory subsystem."""

    max_session_entries: int = 500
    max_project_entries: int = 2000
    default_ttl_hours: int = 72
    persist_path: str = ".disha/memory"

    @classmethod
    def from_env(cls) -> MemoryConfig:
        return cls(
            max_session_entries=int(os.getenv("DISHA_MEM_SESSION_MAX", "500")),
            max_project_entries=int(os.getenv("DISHA_MEM_PROJECT_MAX", "2000")),
            default_ttl_hours=int(os.getenv("DISHA_MEM_TTL_HOURS", "72")),
            persist_path=os.getenv("DISHA_MEM_PATH", ".disha/memory"),
        )


@dataclass(frozen=True)
class ExecutorConfig:
    """Configuration for the executor module."""

    command_timeout_seconds: int = 60
    max_output_bytes: int = 1_000_000
    allowed_extensions: tuple[str, ...] = (
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".yaml",
        ".yml",
        ".md",
        ".txt",
        ".toml",
        ".cfg",
        ".ini",
        ".sh",
        ".bash",
        ".html",
        ".css",
    )
    sandbox_mode: bool = True

    @classmethod
    def from_env(cls) -> ExecutorConfig:
        return cls(
            command_timeout_seconds=int(os.getenv("DISHA_CMD_TIMEOUT", "60")),
            max_output_bytes=int(os.getenv("DISHA_MAX_OUTPUT", "1000000")),
            sandbox_mode=os.getenv("DISHA_SANDBOX", "true").lower() == "true",
        )


@dataclass(frozen=True)
class ControllerConfig:
    """Configuration for the controller loop."""

    max_cycles: int = 50
    cycle_delay_seconds: float = 1.0
    max_consecutive_failures: int = 3
    auto_plan: bool = True

    @classmethod
    def from_env(cls) -> ControllerConfig:
        return cls(
            max_cycles=int(os.getenv("DISHA_MAX_CYCLES", "50")),
            cycle_delay_seconds=float(os.getenv("DISHA_CYCLE_DELAY", "1.0")),
            max_consecutive_failures=int(os.getenv("DISHA_MAX_FAILURES", "3")),
            auto_plan=os.getenv("DISHA_AUTO_PLAN", "true").lower() == "true",
        )


@dataclass
class AgentConfig:
    """Root configuration aggregating all sub-configs."""

    claude: ClaudeConfig = field(default_factory=ClaudeConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    executor: ExecutorConfig = field(default_factory=ExecutorConfig)
    controller: ControllerConfig = field(default_factory=ControllerConfig)
    project_root: str = "."
    log_level: str = "info"
    dry_run: bool = False

    @classmethod
    def from_env(cls) -> AgentConfig:
        return cls(
            claude=ClaudeConfig.from_env(),
            memory=MemoryConfig.from_env(),
            executor=ExecutorConfig.from_env(),
            controller=ControllerConfig.from_env(),
            project_root=os.getenv("DISHA_PROJECT_ROOT", "."),
            log_level=os.getenv("DISHA_LOG_LEVEL", "info"),
            dry_run=os.getenv("DISHA_DRY_RUN", "false").lower() == "true",
        )
