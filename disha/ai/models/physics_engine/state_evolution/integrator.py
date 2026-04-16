"""
Numerical Integrators
=====================

Provides explicit ODE integrators that advance a state vector by a single
time step given a derivative function.

Classes:
    IntegratorBase        – Abstract base for all integrators.
    EulerIntegrator       – First-order forward Euler method.
    RungeKutta4Integrator – Classical fourth-order Runge–Kutta method.

The derivative function signature expected by every integrator is::

    derivative_fn(state: numpy.ndarray, t: float) -> numpy.ndarray

where *state* is the current state vector and *t* is the current time.
"""

from __future__ import annotations

import abc
import logging
from typing import Callable

import numpy as np

logger = logging.getLogger(__name__)

DerivativeFn = Callable[[np.ndarray, float], np.ndarray]


class IntegratorBase(abc.ABC):
    """Abstract base class for explicit single-step ODE integrators."""

    @abc.abstractmethod
    def step(
        self,
        state: np.ndarray,
        derivative_fn: DerivativeFn,
        t: float,
        dt: float,
    ) -> np.ndarray:
        """Advance *state* by one time step *dt*.

        Parameters
        ----------
        state : numpy.ndarray
            Current state vector.
        derivative_fn : callable
            ``(state, t) -> d(state)/dt``.
        t : float
            Current simulation time.
        dt : float
            Time step.

        Returns
        -------
        numpy.ndarray
            New state vector at ``t + dt``.
        """


class EulerIntegrator(IntegratorBase):
    """First-order forward (explicit) Euler integrator.

    .. math:: y_{n+1} = y_n + h \\, f(y_n, t_n)

    Simple and fast but only first-order accurate.
    """

    def step(
        self,
        state: np.ndarray,
        derivative_fn: DerivativeFn,
        t: float,
        dt: float,
    ) -> np.ndarray:
        state = np.asarray(state, dtype=np.float64)
        k1 = derivative_fn(state, t)
        new_state = state + dt * np.asarray(k1, dtype=np.float64)
        logger.debug("Euler step: t=%.6f -> %.6f", t, t + dt)
        return new_state


class RungeKutta4Integrator(IntegratorBase):
    """Classical fourth-order Runge–Kutta integrator (RK4).

    .. math::
        k_1 &= f(y_n,\\; t_n) \\\\
        k_2 &= f(y_n + \\tfrac{h}{2} k_1,\\; t_n + \\tfrac{h}{2}) \\\\
        k_3 &= f(y_n + \\tfrac{h}{2} k_2,\\; t_n + \\tfrac{h}{2}) \\\\
        k_4 &= f(y_n + h\\, k_3,\\; t_n + h) \\\\
        y_{n+1} &= y_n + \\tfrac{h}{6}(k_1 + 2 k_2 + 2 k_3 + k_4)

    Fourth-order accuracy with moderate computational cost.
    """

    def step(
        self,
        state: np.ndarray,
        derivative_fn: DerivativeFn,
        t: float,
        dt: float,
    ) -> np.ndarray:
        state = np.asarray(state, dtype=np.float64)
        k1 = np.asarray(derivative_fn(state, t), dtype=np.float64)
        k2 = np.asarray(
            derivative_fn(state + 0.5 * dt * k1, t + 0.5 * dt), dtype=np.float64
        )
        k3 = np.asarray(
            derivative_fn(state + 0.5 * dt * k2, t + 0.5 * dt), dtype=np.float64
        )
        k4 = np.asarray(
            derivative_fn(state + dt * k3, t + dt), dtype=np.float64
        )
        new_state = state + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        logger.debug("RK4 step: t=%.6f -> %.6f", t, t + dt)
        return new_state
