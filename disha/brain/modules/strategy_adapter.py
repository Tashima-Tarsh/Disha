from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

from ..config import settings
from .models import StrategyConflictPreview, StrategyOverviewResponse


def _strategy_data_path() -> Path:
    workspace = Path(settings.allowed_workspace).resolve()
    return workspace / "disha" / "ai" / "strategy" / "data" / "historical_data.json"


def strategy_overview(max_preview: int = 8) -> StrategyOverviewResponse:
    data_file = _strategy_data_path()
    if not data_file.is_file():
        return StrategyOverviewResponse(
            total_conflicts=0,
            eras={},
            regions={},
            preview=[],
        )

    raw: list[dict[str, Any]] = json.loads(data_file.read_text(encoding="utf-8"))
    eras = Counter(str(item.get("era", "")).strip() or "Unknown" for item in raw)
    regions = Counter(str(item.get("region", "")).strip() or "Unknown" for item in raw)

    preview: list[StrategyConflictPreview] = []
    for item in raw[:max_preview]:
        preview.append(
            StrategyConflictPreview(
                id=str(item.get("id", "")),
                name=str(item.get("name", "")),
                year=item.get("year") if isinstance(item.get("year"), int) else None,
                era=str(item.get("era", "")),
                region=str(item.get("region", "")),
                terrain=str(item.get("terrain", "")),
                outcome=str(item.get("outcome", "")),
            )
        )

    return StrategyOverviewResponse(
        total_conflicts=len(raw),
        eras=dict(eras),
        regions=dict(regions),
        preview=preview,
    )
