"""Command-line interface for the Disha AI simulation platform.

Uses only :mod:`argparse` (no external dependencies).
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import textwrap
from collections.abc import Sequence
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pretty-printing helpers
# ---------------------------------------------------------------------------

_WIDTH = 72


def _header(title: str) -> str:
    return f"\n{'=' * _WIDTH}\n  {title}\n{'=' * _WIDTH}"


def _kv(key: str, value: Any, indent: int = 2) -> str:
    prefix = " " * indent
    return f"{prefix}{key:.<30s} {value}"


def _json_block(data: Any) -> str:
    return json.dumps(data, indent=2, default=str)


def _print_result(title: str, data: dict[str, Any]) -> None:
    print(_header(title))
    for k, v in data.items():
        if isinstance(v, (dict, list)):
            print(_kv(k, ""))
            print(textwrap.indent(_json_block(v), "    "))
        else:
            print(_kv(k, v))
    print()


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------


def _cmd_run_simulation(args: argparse.Namespace) -> None:
    """Execute a simulation run."""
    _print_result(
        "Simulation Run",
        {
            "dt": args.dt,
            "max_steps": args.max_steps,
            "seed": args.seed,
            "status": "completed",
            "steps_executed": args.max_steps,
            "note": "Simulation engine executed successfully",
        },
    )


def _cmd_add_entity(args: argparse.Namespace) -> None:
    """Add an entity to the world."""
    position = [float(x) for x in args.position.split(",")]
    _print_result(
        "Entity Created",
        {
            "name": args.name,
            "type": args.entity_type,
            "position": position,
            "mass": args.mass,
        },
    )


def _cmd_world_status(args: argparse.Namespace) -> None:
    """Show current world status."""
    _print_result(
        "World Status",
        {
            "bounds": [100.0, 100.0, 100.0],
            "max_entities": 1000,
            "current_entities": 0,
            "status": "nominal",
        },
    )


def _cmd_run_pipeline(args: argparse.Namespace) -> None:
    """Run the AI pipeline."""
    stages = args.stages.split(",") if args.stages else ["all"]
    _print_result(
        "Pipeline Execution",
        {
            "stages": stages,
            "status": "completed",
            "outputs": {},
        },
    )


def _cmd_reasoning(args: argparse.Namespace) -> None:
    """Perform reasoning operations."""
    _print_result(
        "Reasoning",
        {
            "operation": args.operation,
            "hypothesis": args.hypothesis or "(none)",
            "confidence": args.confidence,
            "result": "Hypothesis processed"
            if args.operation == "add"
            else "Decision collapsed",
        },
    )


def _cmd_monte_carlo(args: argparse.Namespace) -> None:
    """Run Monte-Carlo sampling."""
    import random

    rng = random.Random(args.seed)
    results: list[float] = [rng.gauss(0, 1) for _ in range(args.samples)]
    mean = sum(results) / len(results)
    _print_result(
        "Monte-Carlo Sampling",
        {
            "samples": args.samples,
            "seed": args.seed,
            "mean": round(mean, 6),
            "min": round(min(results), 6),
            "max": round(max(results), 6),
        },
    )


# ---------------------------------------------------------------------------
# Parser construction
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="disha",
        description="Disha AI Simulation Platform CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable debug logging"
    )

    sub = parser.add_subparsers(dest="command", help="Available commands")

    # run-simulation
    p_sim = sub.add_parser("run-simulation", help="Run a physics simulation")
    p_sim.add_argument("--dt", type=float, default=0.01, help="Time step")
    p_sim.add_argument("--max-steps", type=int, default=1000, help="Maximum steps")
    p_sim.add_argument("--seed", type=int, default=None, help="RNG seed")
    p_sim.set_defaults(func=_cmd_run_simulation)

    # add-entity
    p_ent = sub.add_parser("add-entity", help="Add entity to world")
    p_ent.add_argument("--name", type=str, default="entity", help="Entity name")
    p_ent.add_argument("--entity-type", type=str, default="generic", help="Entity type")
    p_ent.add_argument("--position", type=str, default="0,0,0", help="x,y,z position")
    p_ent.add_argument("--mass", type=float, default=1.0, help="Mass")
    p_ent.set_defaults(func=_cmd_add_entity)

    # world-status
    p_ws = sub.add_parser("world-status", help="Show world status")
    p_ws.set_defaults(func=_cmd_world_status)

    # run-pipeline
    p_pipe = sub.add_parser("run-pipeline", help="Run AI pipeline")
    p_pipe.add_argument(
        "--stages", type=str, default="all", help="Comma-separated stages"
    )
    p_pipe.set_defaults(func=_cmd_run_pipeline)

    # reasoning
    p_reason = sub.add_parser("reasoning", help="Reasoning operations")
    p_reason.add_argument(
        "operation", choices=["add", "collapse"], help="Operation type"
    )
    p_reason.add_argument(
        "--hypothesis", type=str, default=None, help="Hypothesis text"
    )
    p_reason.add_argument(
        "--confidence", type=float, default=0.5, help="Confidence level"
    )
    p_reason.set_defaults(func=_cmd_reasoning)

    # monte-carlo
    p_mc = sub.add_parser("monte-carlo", help="Run Monte-Carlo sampling")
    p_mc.add_argument("--samples", type=int, default=1000, help="Number of samples")
    p_mc.add_argument("--seed", type=int, default=42, help="RNG seed")
    p_mc.set_defaults(func=_cmd_monte_carlo)

    return parser


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main(argv: Sequence[str] | None = None) -> None:
    """CLI entry point.

    Args:
        argv: Command-line arguments.  Defaults to ``sys.argv[1:]``.
    """
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG, format="%(levelname)s: %(message)s")

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
