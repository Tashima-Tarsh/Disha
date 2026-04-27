from __future__ import annotations

import json
import os
from typing import Any


def parse_case_law(text: str) -> list[dict[str, Any]]:
    blocks: list[list[str]] = []
    current: list[str] = []
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

    cases: list[dict[str, Any]] = []
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
    with open(input_path, encoding="utf-8") as fh:
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
