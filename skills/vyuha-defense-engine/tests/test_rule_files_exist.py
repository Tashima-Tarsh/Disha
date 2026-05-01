from __future__ import annotations

from pathlib import Path


def test_rule_files_exist() -> None:
    rules_dir = Path(__file__).resolve().parents[1] / "formation-rules"
    assert rules_dir.is_dir()
    yaml_files = sorted(p for p in rules_dir.glob("*.yaml") if not p.name.startswith("_"))
    # Expect at least the formations list to be populated.
    assert len(yaml_files) >= 30

