from __future__ import annotations

import re

_CLAUSE_PATTERN = re.compile(
    r"^(?:"
    r"Article\s+\d+"
    r"|Section\s+\d+"
    r"|Clause\s+\d+"
    r"|Part\s+[IVXLCDM]+"
    r"|Schedule\s+\d+"
    r"|\d+[.\)]\s"
    r"|\([a-z0-9]+\)\s"
    r")",
    re.IGNORECASE,
)


def segment(text: str) -> list[str]:
    lines = text.splitlines()
    clauses: list[str] = []
    current: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                clauses.append(" ".join(current))
                current = []
            continue
        if _CLAUSE_PATTERN.match(stripped) and current:
            clauses.append(" ".join(current))
            current = [stripped]
        else:
            current.append(stripped)

    if current:
        clauses.append(" ".join(current))

    return clauses


def segment_file(input_path: str, output_path: str) -> int:
    with open(input_path, encoding="utf-8") as fh:
        text = fh.read()

    clauses = segment(text)

    with open(output_path, "w", encoding="utf-8") as fh:
        for clause in clauses:
            fh.write(clause + "\n")

    return len(clauses)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Segment text into clauses")
    parser.add_argument("input", help="Path to raw text file")
    parser.add_argument("--out", required=True, help="Output one-clause-per-line file")
    args = parser.parse_args()
    n = segment_file(args.input, args.out)
    print(f"Segmented {n} clauses -> {args.out}")
