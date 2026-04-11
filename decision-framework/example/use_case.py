"""
Example use-case: run the Disha decision pipeline on a sample scenario.

Usage:
    # With mock LLM (default, no dependencies needed):
    python example/use_case.py

    # With llama-cpp-python:
    export DISHA_MODEL_PROVIDER=llamacpp
    export DISHA_MODEL_PATH=/path/to/model.gguf
    python example/use_case.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure decision-framework root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main_decision_engine import run_decision_pipeline  # noqa: E402


def main() -> None:
    scenario = (
        "The government proposes a new digital surveillance bill that would require "
        "all internet service providers to retain user data for 5 years and provide "
        "access to law enforcement without a warrant. Civil liberties groups argue "
        "this violates fundamental rights under Articles 19 and 21 of the Constitution."
    )

    print("=" * 70)
    print("DISHA Decision Framework — Example Use Case")
    print("=" * 70)
    print(f"\nScenario:\n{scenario}\n")
    print("-" * 70)

    result = run_decision_pipeline(scenario)

    print("\n--- Consensus ---")
    print(result["consensus"]["text"])
    print("\n--- Sources ---")
    print(result["consensus"].get("sources", []))
    print("\n--- Ideology Evaluation ---")
    for lens, text in result.get("ideology_evaluation", {}).items():
        print(f"\n[{lens}]: {text[:150]}...")

    print("\n" + "=" * 70)
    print("Full output (JSON):")
    print(json.dumps(result, indent=2, default=str)[:3000])


if __name__ == "__main__":
    main()
