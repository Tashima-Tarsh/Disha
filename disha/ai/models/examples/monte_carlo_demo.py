#!/usr/bin/env python3
"""Monte Carlo Demo
=====================

Demonstrates Monte Carlo simulation techniques:

1. Estimating π using random point sampling.
2. Risk analysis: project completion time with uncertainties.

Shows convergence behaviour and confidence intervals.
"""

from simulation.monte_carlo.monte_carlo import (
    MonteCarloSimulation,
)
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


def estimate_pi(rng: np.random.Generator) -> float:
    """Estimate π by sampling random points in a unit square."""
    n_points = 10_000
    pts = rng.random((n_points, 2))
    inside = np.sum(pts[:, 0] ** 2 + pts[:, 1] ** 2 <= 1.0)
    return 4.0 * inside / n_points


def project_completion_time(rng: np.random.Generator) -> float:
    """Simulate project completion with uncertain task durations.

    Five tasks in sequence, each with a triangular distribution:
      - Task 1: Planning       (min=5, mode=10, max=20 days)
      - Task 2: Design         (min=10, mode=15, max=30 days)
      - Task 3: Implementation (min=20, mode=40, max=80 days)
      - Task 4: Testing        (min=5, mode=10, max=25 days)
      - Task 5: Deployment     (min=2, mode=5, max=15 days)
    """
    tasks = [
        (5, 10, 20),
        (10, 15, 30),
        (20, 40, 80),
        (5, 10, 25),
        (2, 5, 15),
    ]
    total = 0.0
    for low, mode, high in tasks:
        duration = rng.triangular(low, mode, high)
        total += duration
    return total


def main() -> None:
    print("=" * 60)
    print("  Monte Carlo Simulation Demo")
    print("=" * 60)

    # ===================================
    # Part 1: Estimate π
    # ===================================
    print("\n" + "-" * 60)
    print("  Part 1: Estimating π")
    print("-" * 60)

    mc_pi = MonteCarloSimulation(
        simulation_fn=estimate_pi,
        n_iterations=500,
        seed=42,
    )
    results_pi = mc_pi.run()

    print(f"\n  Iterations: {results_pi.n_samples}")
    print(f"  π estimate (mean): {results_pi.mean:.6f}")
    print(f"  True π:            {np.pi:.6f}")
    print(f"  Error:             {abs(results_pi.mean - np.pi):.6f}")
    print(f"  Std deviation:     {results_pi.std:.6f}")
    print(f"  Min: {results_pi.min:.4f}, Max: {results_pi.max:.4f}")

    ci_low, ci_high = results_pi.confidence_interval(0.95)
    print(f"  95% CI: [{ci_low:.6f}, {ci_high:.6f}]")
    print(f"  π in CI: {ci_low <= np.pi <= ci_high}")

    converged = results_pi.convergence_check(tolerance=0.01)
    print(f"  Converged: {converged}")

    # Show convergence: running mean over subsets
    print("\n  Convergence (running mean):")
    raw = results_pi.raw
    for n in [10, 50, 100, 200, 300, 400, 500]:
        if n <= len(raw):
            running_mean = np.mean(raw[:n])
            print(
                f"    n={n:4d}: mean={running_mean:.6f} (err={abs(running_mean - np.pi):.6f})"
            )

    # ===================================
    # Part 2: Project Risk Analysis
    # ===================================
    print("\n" + "-" * 60)
    print("  Part 2: Project Completion Risk Analysis")
    print("-" * 60)

    mc_project = MonteCarloSimulation(
        simulation_fn=project_completion_time,
        n_iterations=1000,
        seed=123,
    )
    results_project = mc_project.run()

    print(f"\n  Iterations: {results_project.n_samples}")
    print(f"  Expected completion: {results_project.mean:.1f} days")
    print(f"  Std deviation:       {results_project.std:.1f} days")
    print(f"  Min time: {results_project.min:.1f} days")
    print(f"  Max time: {results_project.max:.1f} days")

    ci90_low, ci90_high = results_project.confidence_interval(0.90)
    ci95_low, ci95_high = results_project.confidence_interval(0.95)
    ci99_low, ci99_high = results_project.confidence_interval(0.99)
    print("\n  Confidence intervals for mean completion time:")
    print(f"    90% CI: [{ci90_low:.1f}, {ci90_high:.1f}] days")
    print(f"    95% CI: [{ci95_low:.1f}, {ci95_high:.1f}] days")
    print(f"    99% CI: [{ci99_low:.1f}, {ci99_high:.1f}] days")

    # Percentiles (useful for risk management)
    print("\n  Percentile analysis:")
    for p in [10, 25, 50, 75, 90, 95, 99]:
        val = results_project.percentile(p)
        print(f"    P{p:2d}: {val:.1f} days")

    converged = results_project.convergence_check(tolerance=0.005)
    print(f"\n  Converged: {converged}")

    # Histogram summary
    counts, edges = results_project.histogram_data(bins=10)
    print("\n  Histogram (10 bins):")
    for i in range(len(counts)):
        bar_len = int(counts[i] / max(counts) * 30)
        bar = "█" * bar_len
        print(f"    [{edges[i]:5.0f}-{edges[i + 1]:5.0f}] {counts[i]:3d} {bar}")

    print("\n[OK] Monte Carlo demo completed successfully!")


if __name__ == "__main__":
    main()
