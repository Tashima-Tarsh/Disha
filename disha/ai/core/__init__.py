"""
DISHA-MIND — Cognitive Engine Package.

Entry point for the 7-stage cognitive loop, three-layer memory architecture,
multi-agent deliberation, hybrid reasoning, and quantum-inspired decisions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .cognitive_loop import CognitiveEngine, CognitiveState

__all__ = ["CognitiveEngine", "CognitiveState"]
__version__ = "1.0.0"


def __getattr__(name: str) -> Any:
    """Lazy import — only pull in heavy deps when actually needed."""
    if name in ("CognitiveEngine", "CognitiveState"):
        from .cognitive_loop import CognitiveEngine, CognitiveState  # noqa: F811

        globals()["CognitiveEngine"] = CognitiveEngine
        globals()["CognitiveState"] = CognitiveState
        return globals()[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
