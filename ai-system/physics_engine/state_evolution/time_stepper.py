"""
Time Stepper
=============

Wraps an :class:`IntegratorBase` to manage simulation time, adaptive step
sizing, and state-history recording.

Classes:
    TimeStepper – Drives an integrator over a time interval with optional
                  adaptive step control.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Tuple

import numpy as np

from physics_engine.state_evolution.integrator import (
    DerivativeFn,
    IntegratorBase,
    RungeKutta4Integrator,
)

logger = logging.getLogger(__name__)


@dataclass
class StateRecord:
    """Immutable snapshot of the state at a given time."""

    time: float
    state: np.ndarray


class TimeStepper:
    """High-level simulation driver wrapping a single-step integrator.

    Features:

    * Fixed or adaptive time stepping.
    * State-history recording.
    * Step-count safety limit.

    Adaptive stepping uses Richardson extrapolation (step-doubling) to
    estimate the local truncation error and adjust *dt* accordingly.

    Parameters
    ----------
    integrator : IntegratorBase, optional
        Single-step integrator to use.  Defaults to :class:`RungeKutta4Integrator`.
    initial_dt : float
        Initial (and fixed, when adaptive is off) time step.
    adaptive : bool
        Enable adaptive step-size control.
    tolerance : float
        Relative error tolerance for adaptive stepping.
    dt_min : float
        Minimum allowed time step.
    dt_max : float
        Maximum allowed time step.
    record_history : bool
        Whether to record states at each step.
    max_steps : int
        Safety limit on the number of steps per :meth:`run` call.
    """

    def __init__(
        self,
        integrator: Optional[IntegratorBase] = None,
        initial_dt: float = 0.01,
        adaptive: bool = False,
        tolerance: float = 1e-6,
        dt_min: float = 1e-12,
        dt_max: float = 1.0,
        record_history: bool = True,
        max_steps: int = 1_000_000,
    ) -> None:
        self.integrator: IntegratorBase = integrator or RungeKutta4Integrator()
        self.dt: float = initial_dt
        self.adaptive: bool = adaptive
        self.tolerance: float = tolerance
        self.dt_min: float = dt_min
        self.dt_max: float = dt_max
        self.record_history: bool = record_history
        self.max_steps: int = max_steps

        self.time: float = 0.0
        self.state: Optional[np.ndarray] = None
        self.history: List[StateRecord] = []
        self._step_count: int = 0

        logger.info(
            "TimeStepper initialised (adaptive=%s, dt=%.4e, tol=%.2e)",
            self.adaptive,
            self.dt,
            self.tolerance,
        )

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def set_initial_state(self, state: np.ndarray, t0: float = 0.0) -> None:
        """Set the initial state and time.

        Parameters
        ----------
        state : numpy.ndarray
            Initial state vector.
        t0 : float
            Initial time.
        """
        self.state = np.array(state, dtype=np.float64)
        self.time = t0
        self.history.clear()
        self._step_count = 0
        if self.record_history:
            self.history.append(StateRecord(time=self.time, state=self.state.copy()))
        logger.debug("Initial state set at t=%.6f", t0)

    # ------------------------------------------------------------------
    # Single step
    # ------------------------------------------------------------------

    def step(self, derivative_fn: DerivativeFn) -> np.ndarray:
        """Advance by one time step.

        If adaptive stepping is enabled, the step size is adjusted based
        on a local error estimate.

        Parameters
        ----------
        derivative_fn : callable
            ``(state, t) -> d(state)/dt``.

        Returns
        -------
        numpy.ndarray
            New state after the step.
        """
        if self.state is None:
            raise RuntimeError("Call set_initial_state() before stepping")

        if self.adaptive:
            self.state, self.dt = self._adaptive_step(derivative_fn)
        else:
            self.state = self.integrator.step(
                self.state, derivative_fn, self.time, self.dt
            )
            self.time += self.dt

        self._step_count += 1
        if self.record_history:
            self.history.append(StateRecord(time=self.time, state=self.state.copy()))

        return self.state

    def _adaptive_step(
        self, derivative_fn: DerivativeFn
    ) -> Tuple[np.ndarray, float]:
        """Perform one adaptive step via step-doubling error estimation.

        Two solutions are computed:
        1. One full step of size *dt*.
        2. Two half-steps of size *dt/2*.

        The difference provides an error estimate.  The step is accepted if
        the error is below the tolerance; otherwise *dt* is reduced and the
        step is retried.

        Returns
        -------
        tuple[numpy.ndarray, float]
            ``(new_state, new_dt)``
        """
        assert self.state is not None
        dt = self.dt
        safety = 0.9
        # Standard exponents for step-doubling with an order-p method.
        # For RK4 (p=4): grow ~ 1/(p+1) = 0.2, shrink ~ 1/p = 0.25
        grow_exponent = 0.2
        shrink_exponent = 0.25

        for _ in range(50):  # retry limit
            # Full step
            y_full = self.integrator.step(
                self.state, derivative_fn, self.time, dt
            )
            # Two half steps
            y_half = self.integrator.step(
                self.state, derivative_fn, self.time, dt / 2.0
            )
            y_half = self.integrator.step(
                y_half, derivative_fn, self.time + dt / 2.0, dt / 2.0
            )

            diff = y_half - y_full
            if not np.all(np.isfinite(diff)):
                # NaN/Inf detected – shrink dt aggressively and retry
                dt = max(dt * 0.1, self.dt_min)
                if dt <= self.dt_min:
                    logger.warning("Adaptive stepper: non-finite values at dt_min")
                    self.time += dt
                    return y_half, dt
                continue

            error = float(np.linalg.norm(diff))
            scale = max(float(np.linalg.norm(y_half)), 1e-30)
            rel_error = error / scale

            if rel_error <= self.tolerance or dt <= self.dt_min:
                # Accept the more accurate (half-step) solution
                self.time += dt
                # Grow dt for next step
                if rel_error > 0.0:
                    dt_new = safety * dt * (self.tolerance / rel_error) ** grow_exponent
                else:
                    dt_new = dt * 2.0
                dt_new = min(max(dt_new, self.dt_min), self.dt_max)
                return y_half, dt_new

            # Shrink dt and retry
            dt_new = safety * dt * (self.tolerance / rel_error) ** shrink_exponent
            dt = max(dt_new, self.dt_min)

        logger.warning("Adaptive stepper did not converge; accepting last result")
        self.time += dt
        return y_half, dt  # type: ignore[possibly-undefined]

    # ------------------------------------------------------------------
    # Multi-step runs
    # ------------------------------------------------------------------

    def run(
        self,
        derivative_fn: DerivativeFn,
        t_end: float,
    ) -> np.ndarray:
        """Run the simulation from the current time to *t_end*.

        Parameters
        ----------
        derivative_fn : callable
            State derivative function.
        t_end : float
            Target end time.

        Returns
        -------
        numpy.ndarray
            State at *t_end*.

        Raises
        ------
        RuntimeError
            If the maximum step count is exceeded.
        """
        if self.state is None:
            raise RuntimeError("Call set_initial_state() before running")

        steps = 0
        while self.time < t_end - 1e-14:
            # Clamp dt so we don't overshoot
            remaining = t_end - self.time
            if not self.adaptive:
                effective_dt = min(self.dt, remaining)
                self.state = self.integrator.step(
                    self.state, derivative_fn, self.time, effective_dt
                )
                self.time += effective_dt
            else:
                self.dt = min(self.dt, remaining)
                self.state, self.dt = self._adaptive_step(derivative_fn)

            self._step_count += 1
            steps += 1

            if self.record_history:
                self.history.append(
                    StateRecord(time=self.time, state=self.state.copy())
                )

            if steps >= self.max_steps:
                raise RuntimeError(
                    f"Exceeded max_steps ({self.max_steps}) before reaching t_end"
                )

        logger.info("TimeStepper run complete: t=%.6f, steps=%d", self.time, steps)
        return self.state

    # ------------------------------------------------------------------
    # History utilities
    # ------------------------------------------------------------------

    def get_history_times(self) -> np.ndarray:
        """Return an array of times from the recorded history."""
        return np.array([r.time for r in self.history])

    def get_history_states(self) -> np.ndarray:
        """Return a 2-D array of states from the recorded history.

        Shape: ``(n_records, state_dim)``.
        """
        return np.array([r.state for r in self.history])

    def clear_history(self) -> None:
        """Discard recorded history."""
        self.history.clear()
