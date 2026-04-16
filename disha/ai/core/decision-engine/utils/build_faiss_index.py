#!/usr/bin/env python3
"""CLI helper to build a FAISS index from a one-clause-per-line file.

Usage
-----
::

    python utils/build_faiss_index.py data/index/constitution_clauses.txt \\
        --out data/index/constitution.faiss \\
        --meta data/index/constitution_meta.json
"""

from __future__ import annotations

import argparse
import os
import sys


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Build a FAISS index from a clause file."
    )
    parser.add_argument("input", help="One-clause-per-line text file")
    parser.add_argument(
        "--out",
        default="data/index/constitution.faiss",
        help="Path for the FAISS index file",
    )
    parser.add_argument(
        "--meta",
        default="data/index/constitution_meta.json",
        help="Path for the metadata JSON file",
    )
    args = parser.parse_args(argv)

    if not os.path.exists(args.input):
        print(f"Error: input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    os.makedirs(os.path.dirname(args.meta) or ".", exist_ok=True)

    # Try FAISS retriever first, fall back to simple retriever
    try:
        from utils.retriever_faiss import FAISSRetriever

        retriever = FAISSRetriever()
        print("Using FAISS retriever (sentence-transformers embeddings)")
    except (ImportError, RuntimeError):
        from utils.simple_retriever import SimpleRetriever

        retriever = SimpleRetriever()
        print("FAISS not available — using SimpleRetriever (keyword index)")

    retriever.build_index(args.input, args.out, args.meta)
    print(f"Index written to {args.out}")
    print(f"Metadata written to {args.meta}")


if __name__ == "__main__":
    main()
