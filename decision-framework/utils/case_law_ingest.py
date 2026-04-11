"""
Case law ingest — simple parser, one decision per line.

Each line in the input file is treated as a single case-law entry.
Entries are normalised and can be written to a clean output file
suitable for FAISS indexing.

Usage:
    python utils/case_law_ingest.py data/raw/case_law.txt \\
        --out data/index/case_law_clauses.txt
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import List


def ingest(input_path: str) -> List[str]:
    """Read and normalise case-law entries (one per line)."""
    raw = Path(input_path).read_text(encoding="utf-8")
    entries = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest case-law corpus.")
    parser.add_argument("input", help="Raw case-law file (one entry per line)")
    parser.add_argument("--out", required=True, help="Output normalised file")
    args = parser.parse_args()

    entries = ingest(args.input)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(entries) + "\n", encoding="utf-8")
    print(f"Ingested {len(entries)} case-law entries to {out}")


if __name__ == "__main__":
    main()
