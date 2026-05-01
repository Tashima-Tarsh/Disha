from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .models import FormationDecision, SignalEvent


@dataclass(frozen=True, slots=True)
class SelectorConfig:
    # Upper bound so the analyzer never blocks the system.
    max_rules_evaluated: int = 128


def select_formation(
    *,
    signals: list[SignalEvent],
    rules: list[dict[str, Any]],
    config: SelectorConfig = SelectorConfig(),
) -> FormationDecision | None:
    """
    Select a formation based on declarative rule triggers.

    NOTE: This is an initial scaffold. Matching is intentionally conservative and
    should be implemented with strict schemas + timeouts when integrated into Brain.
    """
    evaluated = 0
    for rule in rules:
        evaluated += 1
        if evaluated > config.max_rules_evaluated:
            break
        # Placeholder: real implementation will evaluate triggers deterministically.
        # For scaffold purposes, never auto-activate; requires explicit integration.
        _ = signals, rule
    return None

