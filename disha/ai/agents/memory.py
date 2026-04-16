"""Memory module for the Disha Agent Core.

Provides a scoped, persistent memory store for context, logs,
decisions, and learned patterns. Supports session, project,
and global scopes with automatic eviction.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .config import MemoryConfig
from .types import LogLevel, MemoryEntry, MemoryScope

logger = logging.getLogger(__name__)


class MemoryStore:
    """In-memory store with optional disk persistence."""

    def __init__(self, config: MemoryConfig) -> None:
        self._config = config
        self._entries: dict[str, MemoryEntry] = {}
        self._logs: list[dict[str, Any]] = []
        self._decisions: list[dict[str, Any]] = []
        self._persist_path = Path(config.persist_path)

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def store(
        self,
        key: str,
        value: Any,
        *,
        scope: MemoryScope = MemoryScope.SESSION,
        tags: list[str] | None = None,
        ttl_hours: int | None = None,
    ) -> MemoryEntry:
        """Store a value in memory under the given key and scope."""
        ttl = ttl_hours or self._config.default_ttl_hours
        expires = datetime.now(timezone.utc) + timedelta(hours=ttl)
        entry = MemoryEntry(
            key=key,
            value=value,
            scope=scope,
            tags=tags or [],
            expires_at=expires.isoformat(),
        )
        self._entries[self._make_key(scope, key)] = entry
        self._evict_if_needed(scope)
        return entry

    def recall(self, key: str, scope: MemoryScope = MemoryScope.SESSION) -> Any | None:
        """Retrieve a value from memory, returning None if missing or expired."""
        composite = self._make_key(scope, key)
        entry = self._entries.get(composite)
        if entry is None:
            return None
        if self._is_expired(entry):
            del self._entries[composite]
            return None
        entry.touch()
        return entry.value

    def search(
        self,
        *,
        tags: list[str] | None = None,
        scope: MemoryScope | None = None,
        prefix: str | None = None,
        limit: int = 20,
    ) -> list[MemoryEntry]:
        """Search memory entries by tags, scope, or key prefix."""
        results: list[MemoryEntry] = []
        for entry in self._entries.values():
            if self._is_expired(entry):
                continue
            if scope is not None and entry.scope != scope:
                continue
            if prefix is not None and not entry.key.startswith(prefix):
                continue
            if tags:
                if not set(tags).intersection(entry.tags):
                    continue
            results.append(entry)
            if len(results) >= limit:
                break
        return results

    def forget(self, key: str, scope: MemoryScope = MemoryScope.SESSION) -> bool:
        """Remove a specific memory entry."""
        composite = self._make_key(scope, key)
        if composite in self._entries:
            del self._entries[composite]
            return True
        return False

    def clear_scope(self, scope: MemoryScope) -> int:
        """Remove all entries in a scope. Returns count removed."""
        to_remove = [
            k for k, v in self._entries.items() if v.scope == scope
        ]
        for k in to_remove:
            del self._entries[k]
        return len(to_remove)

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------

    def log(
        self,
        message: str,
        level: LogLevel = LogLevel.INFO,
        *,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Append a structured log entry."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.value,
            "message": message,
            "context": context or {},
        }
        self._logs.append(entry)
        logger.log(
            getattr(logging, level.value.upper(), logging.INFO),
            "[agent] %s",
            message,
        )

    def get_logs(
        self,
        *,
        level: LogLevel | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Retrieve recent logs, optionally filtered by level."""
        filtered = self._logs
        if level is not None:
            filtered = [e for e in filtered if e["level"] == level.value]
        return filtered[-limit:]

    # ------------------------------------------------------------------
    # Decision tracking
    # ------------------------------------------------------------------

    def record_decision(
        self,
        decision: str,
        rationale: str,
        *,
        alternatives: list[str] | None = None,
        outcome: str | None = None,
    ) -> dict[str, Any]:
        """Record a decision with its rationale for auditability."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "rationale": rationale,
            "alternatives": alternatives or [],
            "outcome": outcome,
        }
        self._decisions.append(entry)
        return entry

    def get_decisions(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._decisions[-limit:]

    # ------------------------------------------------------------------
    # Context snapshot
    # ------------------------------------------------------------------

    def snapshot(self) -> dict[str, Any]:
        """Return a compact summary of current memory state."""
        scopes: dict[str, int] = {}
        for entry in self._entries.values():
            scopes[entry.scope.value] = scopes.get(entry.scope.value, 0) + 1
        return {
            "total_entries": len(self._entries),
            "by_scope": scopes,
            "total_logs": len(self._logs),
            "total_decisions": len(self._decisions),
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self) -> None:
        """Persist memory state to disk."""
        self._persist_path.mkdir(parents=True, exist_ok=True)
        data = {
            "entries": {
                k: {
                    "id": v.id,
                    "scope": v.scope.value,
                    "key": v.key,
                    "value": v.value,
                    "tags": v.tags,
                    "created_at": v.created_at,
                    "expires_at": v.expires_at,
                    "access_count": v.access_count,
                }
                for k, v in self._entries.items()
            },
            "logs": self._logs[-500:],
            "decisions": self._decisions[-100:],
        }
        (self._persist_path / "state.json").write_text(
            json.dumps(data, indent=2, default=str), encoding="utf-8"
        )

    def load(self) -> bool:
        """Load memory state from disk. Returns True if loaded successfully."""
        state_path = self._persist_path / "state.json"
        if not state_path.exists():
            return False
        try:
            data = json.loads(state_path.read_text(encoding="utf-8"))
            for _composite, raw in data.get("entries", {}).items():
                entry = MemoryEntry(
                    id=raw["id"],
                    scope=MemoryScope(raw["scope"]),
                    key=raw["key"],
                    value=raw["value"],
                    tags=raw.get("tags", []),
                    created_at=raw.get("created_at", ""),
                    expires_at=raw.get("expires_at"),
                    access_count=raw.get("access_count", 0),
                )
                if not self._is_expired(entry):
                    self._entries[self._make_key(entry.scope, entry.key)] = entry
            self._logs = data.get("logs", [])
            self._decisions = data.get("decisions", [])
            return True
        except Exception as exc:
            logger.warning("Failed to load memory state: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _make_key(scope: MemoryScope, key: str) -> str:
        return f"{scope.value}:{key}"

    @staticmethod
    def _is_expired(entry: MemoryEntry) -> bool:
        if entry.expires_at is None:
            return False
        try:
            expires = datetime.fromisoformat(entry.expires_at)
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            return datetime.now(timezone.utc) > expires
        except (ValueError, TypeError):
            return False

    def _evict_if_needed(self, scope: MemoryScope) -> None:
        """Evict least-accessed entries when scope limit is exceeded."""
        limit = (
            self._config.max_session_entries
            if scope == MemoryScope.SESSION
            else self._config.max_project_entries
        )
        scoped = [
            (k, v) for k, v in self._entries.items() if v.scope == scope
        ]
        if len(scoped) <= limit:
            return
        scoped.sort(key=lambda kv: kv[1].access_count)
        to_remove = len(scoped) - limit
        for k, _ in scoped[:to_remove]:
            del self._entries[k]
