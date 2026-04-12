"""Logging utilities for the AI simulation platform.

Provides structured logging setup, a performance timer context manager,
and a lightweight metrics collector.
"""

from __future__ import annotations

import logging
import statistics
import time
from dataclasses import dataclass, field
from types import TracebackType
from typing import Any, Dict, List, Optional, Type

from .config import LoggingSettings

logger = logging.getLogger(__name__)


def setup_logging(config: Optional[LoggingSettings] = None) -> None:
    """Configure root and module loggers based on *config*.

    Args:
        config: Logging settings to apply.  Uses sensible defaults when
            ``None``.
    """
    if config is None:
        config = LoggingSettings()

    level = getattr(logging, config.level.upper(), logging.INFO)
    fmt = "%(asctime)s | %(name)-30s | %(levelname)-8s | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    handlers: list[logging.Handler] = []

    if config.console_output:
        console = logging.StreamHandler()
        console.setLevel(level)
        console.setFormatter(logging.Formatter(fmt, datefmt=datefmt))
        handlers.append(console)

    if config.file_path:
        file_handler = logging.FileHandler(config.file_path, encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(fmt, datefmt=datefmt))
        handlers.append(file_handler)

    root = logging.getLogger()
    root.setLevel(level)
    # Remove previous handlers to avoid duplicates on repeated calls
    root.handlers.clear()
    for handler in handlers:
        root.addHandler(handler)

    logger.debug("Logging configured: level=%s, file=%s, console=%s",
                 config.level, config.file_path, config.console_output)


def get_logger(name: str) -> logging.Logger:
    """Return a configured :class:`logging.Logger` for *name*.

    Args:
        name: Dot-separated logger name (typically ``__name__``).

    Returns:
        A :class:`logging.Logger` instance.
    """
    return logging.getLogger(name)


class PerformanceTimer:
    """Context manager that measures and logs wall-clock execution time.

    Example::

        with PerformanceTimer("heavy_computation"):
            result = heavy_computation()

    Attributes:
        label: Human-readable label for the timed block.
        elapsed: Elapsed time in seconds (set after exiting the block).
    """

    def __init__(self, label: str = "block", log_level: int = logging.DEBUG) -> None:
        self.label = label
        self.log_level = log_level
        self.elapsed: float = 0.0
        self._start: float = 0.0

    def __enter__(self) -> "PerformanceTimer":
        self._start = time.perf_counter()
        return self

    def __exit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[TracebackType],
    ) -> None:
        self.elapsed = time.perf_counter() - self._start
        logger.log(
            self.log_level,
            "[%s] completed in %.4f s",
            self.label,
            self.elapsed,
        )


@dataclass
class MetricsCollector:
    """Collects named numeric metrics and provides summary statistics.

    Example::

        mc = MetricsCollector()
        mc.collect_metric("loss", 0.5)
        mc.collect_metric("loss", 0.3)
        summary = mc.get_summary()
        # {'loss': {'mean': 0.4, 'min': 0.3, 'max': 0.5, 'count': 2}}
    """

    _store: Dict[str, List[float]] = field(default_factory=dict)

    def collect_metric(self, name: str, value: float) -> None:
        """Record a single metric observation.

        Args:
            name: Metric identifier (e.g. ``"loss"``).
            value: Numeric observation.
        """
        self._store.setdefault(name, []).append(float(value))

    def get_summary(self) -> Dict[str, Dict[str, Any]]:
        """Compute summary statistics for all collected metrics.

        Returns:
            A dictionary mapping each metric name to a dict with keys
            ``mean``, ``min``, ``max``, and ``count``.
        """
        summary: Dict[str, Dict[str, Any]] = {}
        for name, values in self._store.items():
            summary[name] = {
                "mean": statistics.mean(values),
                "min": min(values),
                "max": max(values),
                "count": len(values),
            }
        return summary

    def reset(self) -> None:
        """Clear all collected metrics."""
        self._store.clear()
