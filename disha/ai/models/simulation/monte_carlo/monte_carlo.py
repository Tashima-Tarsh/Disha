"""Monte Carlo simulation framework with parallel execution and statistical analysis.

Provides :class:`MonteCarloSimulation` for running a user-supplied
simulation function many times with different random seeds, and
:class:`MonteCarloResults` for computing summary statistics,
confidence intervals, percentiles, and convergence diagnostics.
"""

from __future__ import annotations

import logging
import math
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Any, Callable, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

SimulationFn = Callable[[np.random.Generator], float]


def _run_single(args: Tuple[Any, int]) -> float:
    """Top-level helper for parallel execution (must be picklable).

    Args:
        args: Tuple of ``(simulation_fn, seed)``.

    Returns:
        Scalar simulation result.
    """
    simulation_fn, seed = args
    rng = np.random.default_rng(seed)
    return float(simulation_fn(rng))


class MonteCarloResults:
    """Statistical summary of Monte Carlo simulation outputs.

    Args:
        results: Array of scalar simulation results.
    """

    def __init__(self, results: np.ndarray) -> None:
        if results.ndim != 1 or results.size == 0:
            raise ValueError("results must be a non-empty 1-D array")
        self._results: np.ndarray = np.asarray(results, dtype=np.float64)
        self._sorted: np.ndarray = np.sort(self._results)

    @property
    def raw(self) -> np.ndarray:
        """Raw result array."""
        return self._results.copy()

    @property
    def n_samples(self) -> int:
        """Number of simulation iterations."""
        return self._results.size

    @property
    def mean(self) -> float:
        """Sample mean of results."""
        return float(np.mean(self._results))

    @property
    def std(self) -> float:
        """Sample standard deviation of results (ddof=1)."""
        return float(np.std(self._results, ddof=1))

    @property
    def variance(self) -> float:
        """Sample variance of results (ddof=1)."""
        return float(np.var(self._results, ddof=1))

    @property
    def min(self) -> float:
        return float(np.min(self._results))

    @property
    def max(self) -> float:
        return float(np.max(self._results))

    def confidence_interval(self, level: float = 0.95) -> Tuple[float, float]:
        """Compute a symmetric confidence interval for the mean.

        Uses the normal approximation (valid for large *n*).

        Args:
            level: Confidence level in ``(0, 1)``.  Default is 0.95.

        Returns:
            ``(lower, upper)`` bounds of the confidence interval.
        """
        if not 0.0 < level < 1.0:
            raise ValueError(f"level must be in (0, 1), got {level}")

        alpha = 1.0 - level
        # Two-tailed z-score via inverse normal CDF approximation
        z = self._z_score(1.0 - alpha / 2.0)
        se = self.std / math.sqrt(self.n_samples)
        m = self.mean
        return (m - z * se, m + z * se)

    def percentile(self, p: float) -> float:
        """Compute the *p*-th percentile of results.

        Args:
            p: Percentile in ``[0, 100]``.

        Returns:
            The percentile value.
        """
        if not 0.0 <= p <= 100.0:
            raise ValueError(f"Percentile must be in [0, 100], got {p}")
        return float(np.percentile(self._results, p))

    def histogram_data(self, bins: int = 50) -> Tuple[np.ndarray, np.ndarray]:
        """Compute histogram counts and bin edges.

        Args:
            bins: Number of histogram bins.

        Returns:
            ``(counts, bin_edges)`` as numpy arrays.
        """
        counts, edges = np.histogram(self._results, bins=bins)
        return counts, edges

    def convergence_check(self, tolerance: float = 0.01) -> bool:
        """Check whether the running mean has converged.

        Convergence is declared when the relative change of the
        running mean over the last 10 % of iterations is below
        *tolerance*.

        Args:
            tolerance: Maximum allowed relative change.

        Returns:
            ``True`` if converged.
        """
        if self.n_samples < 20:
            return False

        cumulative_mean = np.cumsum(self._results) / np.arange(1, self.n_samples + 1)
        tail_start = int(self.n_samples * 0.9)
        tail = cumulative_mean[tail_start:]
        if tail.size < 2:
            return False

        relative_change = np.abs(np.diff(tail)) / (np.abs(tail[:-1]) + 1e-12)
        max_change = float(np.max(relative_change))

        converged = max_change < tolerance
        logger.debug(
            "Convergence check: max_relative_change=%f tolerance=%f -> %s",
            max_change,
            tolerance,
            converged,
        )
        return converged

    @staticmethod
    def _z_score(p: float) -> float:
        """Rational approximation of the inverse standard normal CDF.

        Uses the Abramowitz & Stegun approximation (formula 26.2.23).
        Accurate to ~4.5e-4 for 0.5 < p < 1.

        Args:
            p: Cumulative probability in ``(0, 1)``.

        Returns:
            Approximate z-score.
        """
        if p <= 0.5:
            return -MonteCarloResults._z_score(1.0 - p)

        t = math.sqrt(-2.0 * math.log(1.0 - p))
        c0, c1, c2 = 2.515517, 0.802853, 0.010328
        d1, d2, d3 = 1.432788, 0.189269, 0.001308
        return t - (c0 + c1 * t + c2 * t * t) / (
            1.0 + d1 * t + d2 * t * t + d3 * t * t * t
        )


class MonteCarloSimulation:
    """Run a simulation function many times and collect statistics.

    Args:
        simulation_fn: Callable that accepts a ``numpy.random.Generator``
            and returns a scalar result.
        n_iterations: Number of Monte Carlo iterations.
        seed: Base random seed for reproducibility.

    Example::

        def estimate_pi(rng: np.random.Generator) -> float:
            pts = rng.random((10_000, 2))
            inside = np.sum(pts[:, 0]**2 + pts[:, 1]**2 <= 1.0)
            return 4.0 * inside / 10_000

        mc = MonteCarloSimulation(estimate_pi, n_iterations=1000, seed=42)
        results = mc.run()
        print(f"π ≈ {results.mean:.4f} ± {results.std:.4f}")
    """

    def __init__(
        self,
        simulation_fn: SimulationFn,
        n_iterations: int = 1000,
        seed: Optional[int] = None,
    ) -> None:
        if n_iterations < 1:
            raise ValueError(f"n_iterations must be >= 1, got {n_iterations}")
        self._simulation_fn: SimulationFn = simulation_fn
        self._n_iterations: int = n_iterations
        self._seed: Optional[int] = seed
        logger.info(
            "MonteCarloSimulation created: n_iterations=%d seed=%s",
            n_iterations,
            seed,
        )

    def _generate_seeds(self) -> np.ndarray:
        """Generate deterministic per-iteration seeds from the base seed."""
        ss = np.random.SeedSequence(self._seed)
        return np.array(
            [int(child.generate_state(1)[0]) for child in ss.spawn(self._n_iterations)]
        )

    def run(self) -> MonteCarloResults:
        """Execute all iterations sequentially.

        Returns:
            :class:`MonteCarloResults` summarising the outputs.
        """
        seeds = self._generate_seeds()
        results = np.empty(self._n_iterations, dtype=np.float64)

        logger.info(
            "Starting sequential Monte Carlo (%d iterations)", self._n_iterations
        )
        for i, seed in enumerate(seeds):
            rng = np.random.default_rng(int(seed))
            results[i] = self._simulation_fn(rng)

        logger.info("Sequential Monte Carlo complete")
        return MonteCarloResults(results)

    def run_parallel(self, n_workers: int = 4) -> MonteCarloResults:
        """Execute all iterations in parallel using multiple processes.

        Args:
            n_workers: Number of worker processes.

        Returns:
            :class:`MonteCarloResults` summarising the outputs.
        """
        if n_workers < 1:
            raise ValueError(f"n_workers must be >= 1, got {n_workers}")

        seeds = self._generate_seeds()
        args = [(self._simulation_fn, int(s)) for s in seeds]

        logger.info(
            "Starting parallel Monte Carlo (%d iterations, %d workers)",
            self._n_iterations,
            n_workers,
        )
        results = np.empty(self._n_iterations, dtype=np.float64)

        with ProcessPoolExecutor(max_workers=n_workers) as executor:
            futures = {
                executor.submit(_run_single, a): idx for idx, a in enumerate(args)
            }
            for future in as_completed(futures):
                idx = futures[future]
                results[idx] = future.result()

        logger.info("Parallel Monte Carlo complete")
        return MonteCarloResults(results)
