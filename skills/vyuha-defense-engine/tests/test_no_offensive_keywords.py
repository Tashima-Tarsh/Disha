from __future__ import annotations

from pathlib import Path


FORBIDDEN_HINTS = [
    "exploit",
    "ddos",
    "hacking_back",
    "hack back",
    "credential theft",
    "malware",
    "ransomware",
    "attack",
    "retaliation",
]


def test_rules_do_not_suggest_offensive_actions() -> None:
    rules_dir = Path(__file__).resolve().parents[1] / "formation-rules"
    for path in rules_dir.glob("*.yaml"):
        if path.name.startswith("_"):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore").lower()
        for hint in FORBIDDEN_HINTS:
            assert hint not in text, f"{path.name} contains forbidden hint: {hint}"

