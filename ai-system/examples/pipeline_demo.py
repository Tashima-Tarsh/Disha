#!/usr/bin/env python3
"""Pipeline Demo
==================

Demonstrates the complete processing pipeline:
input → parse → symbolic → numerical → simulation → output

* Feeds a physics problem (projectile motion parameters).
* Pipeline processes it through all stages.
* Shows intermediate results at each stage.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import json

import numpy as np

from core.pipeline_engine.pipeline import (
    InputStage,
    NumericalStage,
    OutputStage,
    ParsingStage,
    Pipeline,
    SimulationStage,
    SymbolicStage,
)


def main() -> None:
    print("=" * 60)
    print("  Processing Pipeline Demo")
    print("=" * 60)

    # --- Build the pipeline ---
    pipeline = Pipeline(name="projectile_analysis")
    pipeline.add_stage(InputStage())
    pipeline.add_stage(ParsingStage())
    pipeline.add_stage(SymbolicStage())
    pipeline.add_stage(NumericalStage())
    pipeline.add_stage(SimulationStage(n_steps=200, dt=0.02))
    pipeline.add_stage(OutputStage(fmt="dict"))

    print(f"\nPipeline: {pipeline}")
    print(f"Stages: {[s.name for s in pipeline.stages]}")

    # --- Hook: monitor each stage ---
    stage_log = []

    def before_hook(stage, data):
        stage_log.append({"stage": stage.name, "event": "before", "keys": list(data.keys())})

    def after_hook(stage, data):
        stage_log.append({"stage": stage.name, "event": "after", "keys": list(data.keys())})

    pipeline.before_stage(before_hook)
    pipeline.after_stage(after_hook)

    # --- Input: projectile motion problem ---
    # v0 = 50 m/s, angle = 45 degrees, g = 9.81 m/s^2
    # Range = v0^2 * sin(2*angle) / g
    angle_rad = np.radians(45)
    v0 = 50.0
    g = 9.81

    input_data = {
        "raw_input": {
            "problem": "projectile_motion",
            "v0": v0,
            "angle_deg": 45,
            "gravity": g,
            "computed_range": v0**2 * np.sin(2 * angle_rad) / g,
            "computed_max_height": (v0 * np.sin(angle_rad))**2 / (2 * g),
            "computed_flight_time": 2 * v0 * np.sin(angle_rad) / g,
            "text": f"{v0} * {v0} * 1.0 / {g}",
        },
        "variables": {},
    }

    print(f"\n--- Input ---")
    print(f"  Problem: Projectile motion")
    print(f"  v0 = {v0} m/s, angle = 45°, g = {g} m/s²")
    print(f"  Expected range: {input_data['raw_input']['computed_range']:.2f} m")
    print(f"  Expected max height: {input_data['raw_input']['computed_max_height']:.2f} m")
    print(f"  Expected flight time: {input_data['raw_input']['computed_flight_time']:.2f} s")

    # --- Run the pipeline ---
    print(f"\n--- Running Pipeline ---")
    result = pipeline.run(input_data)

    # --- Show results at each stage ---
    print(f"\n--- Stage Results ---")

    # Input/Parsing
    parsed = result.get("parsed_input", {})
    print(f"\n  [InputStage] Parsed keys: {list(parsed.keys())}")

    tokens = result.get("tokens", [])
    print(f"\n  [ParsingStage] Tokens ({len(tokens)}):")
    for tok in tokens[:10]:
        print(f"    {tok}")
    structure = result.get("structure", {})
    print(f"  Structure: {structure}")

    # Symbolic
    tree = result.get("expression_tree")
    simplified = result.get("simplified_tree")
    print(f"\n  [SymbolicStage] Expression tree: {tree}")
    print(f"  Simplified: {simplified}")

    # Numerical
    num_result = result.get("numerical_result")
    print(f"\n  [NumericalStage] Numerical result: {num_result}")
    if "array_stats" in result:
        print(f"  Array stats:")
        for key, stats in result["array_stats"].items():
            print(f"    {key}: mean={stats['mean']:.2f}, std={stats['std']:.2f}")

    # Simulation
    sim_hist = result.get("simulation_history")
    if sim_hist is not None:
        arr = np.asarray(sim_hist).ravel()
        print(f"\n  [SimulationStage] Steps: {result.get('simulation_steps')}")
        print(f"  History length: {len(arr)}")
        print(f"  First 5 values: {arr[:5]}")
        print(f"  Last 5 values: {arr[-5:]}")
        print(f"  Min: {arr.min():.4f}, Max: {arr.max():.4f}")

    # Output
    output = result.get("output", {})
    print(f"\n  [OutputStage] Summary:")
    if isinstance(output, dict):
        for key, val in output.items():
            if key == "simulation_summary" and isinstance(val, dict):
                print(f"    {key}:")
                for k, v in val.items():
                    print(f"      {k}: {v}")
            else:
                print(f"    {key}: {val}")

    # --- Stage execution log ---
    print(f"\n--- Pipeline Execution Log ---")
    for entry in stage_log:
        print(f"  [{entry['event']:6s}] {entry['stage']:12s} | data keys: {entry['keys']}")

    print(f"\n[OK] Pipeline demo completed successfully!")


if __name__ == "__main__":
    main()
