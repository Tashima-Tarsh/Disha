"""Parse a case-law text file into one-decision-per-line format with metadata.

Expected input format
---------------------
Each case is separated by a blank line.  The first line of a case block is
treated as the case title / citation; remaining lines form the summary.

Example input::

    Kesavananda Bharati v. State of Kerala (1973)
    The Supreme Court held that Parliament cannot alter the basic structure
    of the Constitution.

    Maneka Gandhi v. Union of India (1978)
    Article 21 protections require procedure that is fair, just, and reasonable.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List


def parse_case_law(text: str) -> List[Dict]:
    """Return a list of ``{"id": int, "title": str, "text": str}`` dicts."""
    blocks: List[List[str]] = []
    current: List[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            if current:
                blocks.append(current)
                current = []
        else:
            current.append(stripped)
    if current:
        blocks.append(current)

    cases: List[Dict] = []
    for idx, block in enumerate(blocks):
        title = block[0]
        summary = " ".join(block[1:]) if len(block) > 1 else title
        cases.append({"id": idx, "title": title, "text": summary})
    return cases


def ingest(
    input_path: str,
    output_path: str,
    metadata_path: str,
) -> int:
    """Read *input_path*, write one line per decision to *output_path* and
    metadata to *metadata_path*.  Returns the number of cases ingested.
    """
    with open(input_path, "r", encoding="utf-8") as fh:
        text = fh.read()

    cases = parse_case_law(text)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    os.makedirs(os.path.dirname(metadata_path) or ".", exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as fh:
        for case in cases:
            fh.write(case["text"] + "\n")

    with open(metadata_path, "w", encoding="utf-8") as fh:
        json.dump(cases, fh, indent=2)

    return len(cases)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingest case-law file")
    parser.add_argument("input", help="Raw case-law text file")
    parser.add_argument(
        "--out", default="data/index/case_law_lines.txt", help="One-line output"
    )
    parser.add_argument(
        "--meta", default="data/index/case_law_meta.json", help="Metadata JSON"
    )
    args = parser.parse_args()
    n = ingest(args.input, args.out, args.meta)
    print(f"Ingested {n} cases -> {args.out}, {args.meta}")
