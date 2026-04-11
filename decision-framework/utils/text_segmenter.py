"""
Text segmenter — splits a constitution/legal text into clause-indexed segments.

Heuristics: line breaks, numbering patterns, regex for 'Article' and 'Clause'.

Usage (CLI):
    python utils/text_segmenter.py data/raw/constitution_of_india.txt \\
        --out data/index/constitution_clauses.txt
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path


_CLAUSE_RE = re.compile(
    r"^\s*(?:Article|Clause|Section|Part|Schedule)\s+\d+",
    re.IGNORECASE,
)
_NUMBERED_RE = re.compile(r"^\s*\d+[\.\)]\s+")


def segment_text(raw_text: str) -> list[str]:
    """Split *raw_text* into one segment per clause / numbered paragraph."""
    segments: list[str] = []
    current: list[str] = []

    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped:
            if current:
                segments.append(" ".join(current))
                current = []
            continue

        if _CLAUSE_RE.match(stripped) or _NUMBERED_RE.match(stripped):
            if current:
                segments.append(" ".join(current))
                current = []

        current.append(stripped)

    if current:
        segments.append(" ".join(current))

    return [s for s in segments if s]


def main() -> None:
    parser = argparse.ArgumentParser(description="Segment legal text into clauses.")
    parser.add_argument("input", help="Path to raw text file")
    parser.add_argument("--out", required=True, help="Output path (one clause per line)")
    args = parser.parse_args()

    raw = Path(args.input).read_text(encoding="utf-8")
    clauses = segment_text(raw)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(clauses) + "\n", encoding="utf-8")
    print(f"Wrote {len(clauses)} clause segments to {out}")


if __name__ == "__main__":
    main()
