"""
Build a FAISS index from a clause-segmented text file.

Usage:
    python utils/build_faiss_index.py data/index/constitution_clauses.txt \\
        --out data/index/constitution.faiss \\
        --meta data/index/constitution_meta.json
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure the decision-framework root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.retriever_faiss import FAISSRetriever  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FAISS index.")
    parser.add_argument("input", help="Clause-per-line text file")
    parser.add_argument("--out", required=True, help="Output FAISS index path")
    parser.add_argument("--meta", required=True, help="Output metadata JSON path")
    args = parser.parse_args()

    retriever = FAISSRetriever()
    retriever.build_index(args.input, args.out, args.meta)
    print(f"Index built: {args.out}  metadata: {args.meta}")


if __name__ == "__main__":
    main()
