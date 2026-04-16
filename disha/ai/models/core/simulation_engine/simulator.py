"""
Simulation Engine.

Provides a configurable step-based simulation framework with event
scheduling, deterministic/stochastic modes, history recording, and batch
parameter sweeps.
"""

from __future__ import annotations

import copy
import heapq
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------
SystemFn = Callable[["SimulationState", float], None]
EventCallback = Callable[["SimulationState"], None]


# =========================================================================
# Configuration & State
# =========================================================================
@dataclass
class SimulationConfig:
    """Immutable configuration for a simulation run.

    Attributes:
        max_steps: Maximum number of simulation steps.
        dt: Time step size.
        seed: Random seed (``None`` for non-deterministic).
        logging_interval: Log metrics every *n* steps (0 = disabled).
    """

    max_steps: int = 1000
    dt: float = 0.01
    seed: Optional[int] = None
    logging_interval: int = 100


@dataclass
class SimulationState:
    """Mutable state that evolves during a simulation.

    Attributes:
        time: Current simulation time.
        step_count: Number of steps executed so far.
        entities_state: Arbitrary per-entity data keyed by entity name.
        metrics: Scalar metrics collected each step.
    """

    time: float = 0.0
    step_count: int = 0
    entities_state: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, float] = field(default_factory=dict)


# =========================================================================
# Simulator
# =========================================================================
class Simulator:
    """Core simulation engine.

    Drives one or more *system functions* forward in time, fires scheduled
    events, records history, and collects metrics.

    Example::

        def gravity(state, dt):
            vy = state.entities_state.setdefault("vy", 0.0)
            y = state.entities_state.setdefault("y", 100.0)
            vy -= 9.81 * dt
            y += vy * dt
            state.entities_state["vy"] = vy
            state.entities_state["y"] = y
            state.metrics["y"] = y

        sim = Simulator()
        sim.configure(SimulationConfig(max_steps=500, dt=0.02, seed=42))
        sim.add_system(gravity)
        results = sim.run()
    """

    def __init__(self) -> None:
        self._config: SimulationConfig = SimulationConfig()
        self._state: SimulationState = SimulationState()
        self._systems: List[SystemFn] = []
        self._rng: np.random.Generator = np.random.default_rng(None)

        # Event queue – elements are (scheduled_time, sequence_no, callback)
        self._events: List[Tuple[float, int, EventCallback]] = []
        self._event_seq: int = 0

        self._history: List[Dict[str, Any]] = []

    # -- Configuration ------------------------------------------------------

    def configure(self, config: SimulationConfig) -> None:
        """Apply *config* and reset internal state."""
        self._config = config
        self._state = SimulationState()
        self._rng = np.random.default_rng(config.seed)
        self._events.clear()
        self._event_seq = 0
        self._history.clear()
        logger.info("Simulator configured: %s", config)

    @property
    def state(self) -> SimulationState:
        """Current simulation state (read-only reference)."""
        return self._state

    @property
    def rng(self) -> np.random.Generator:
        """The simulator's random number generator."""
        return self._rng

    # -- Systems ------------------------------------------------------------

    def add_system(self, system_fn: SystemFn) -> None:
        """Register a system function to be called each step.

        A system function has the signature
        ``(state: SimulationState, dt: float) -> None`` and mutates *state*
        in place.
        """
        self._systems.append(system_fn)
        logger.debug("System added: %s", getattr(system_fn, "__name__", repr(system_fn)))

    # -- Events -------------------------------------------------------------

    def schedule_event(self, time: float, callback: EventCallback) -> None:
        """Schedule *callback* to fire when simulation time reaches *time*.

        Args:
            time: Simulation time at which the event should fire.
            callback: ``(state) -> None`` callable.
        """
        heapq.heappush(self._events, (time, self._event_seq, callback))
        self._event_seq += 1
        logger.debug("Event scheduled at t=%.4f", time)

    def _fire_events(self) -> None:
        """Fire all events whose scheduled time is ≤ current time."""
        while self._events and self._events[0][0] <= self._state.time:
            _, _, callback = heapq.heappop(self._events)
            callback(self._state)

    # -- Stepping -----------------------------------------------------------

    def step(self) -> None:
        """Advance the simulation by one time step.

        1. Fire pending events.
        2. Execute all system functions.
        3. Record a snapshot if the logging interval is met.
        """
        self._fire_events()

        dt = self._config.dt
        for sys_fn in self._systems:
            sys_fn(self._state, dt)

        self._state.time += dt
        self._state.step_count += 1

        # Record history snapshot
        interval = self._config.logging_interval
        if interval > 0 and self._state.step_count % interval == 0:
            self._record_snapshot()

    def _record_snapshot(self) -> None:
        """Append a deep-copied snapshot to the history list."""
        snapshot: Dict[str, Any] = {
            "time": self._state.time,
            "step": self._state.step_count,
            "entities_state": copy.deepcopy(self._state.entities_state),
            "metrics": dict(self._state.metrics),
        }
        self._history.append(snapshot)

    # -- Run ----------------------------------------------------------------

    def run(self, n_steps: Optional[int] = None) -> List[Dict[str, Any]]:
        """Run the simulation for *n_steps* (or ``config.max_steps``).

        Args:
            n_steps: Override step count.  Defaults to ``config.max_steps``.

        Returns:
            The recorded history list (one entry per logging interval).
        """
        steps = n_steps if n_steps is not None else self._config.max_steps
        logger.info("Simulation starting for %d steps (dt=%.4f)", steps, self._config.dt)

        for _ in range(steps):
            self.step()

        # Always record the final state
        self._record_snapshot()

        logger.info(
            "Simulation complete: %d steps, final time=%.4f",
            self._state.step_count,
            self._state.time,
        )
        return self.get_results()

    # -- Results ------------------------------------------------------------

    def get_results(self) -> List[Dict[str, Any]]:
        """Return the full recorded history."""
        return list(self._history)


# =========================================================================
# Batch Simulator
# =========================================================================
class BatchSimulator:
    """Run parameter sweeps by executing multiple :class:`Simulator` runs.

    Example::

        configs = [
            SimulationConfig(max_steps=100, dt=0.01, seed=i)
            for i in range(10)
        ]
        batch = BatchSimulator()
        all_results = batch.run_batch(configs, systems=[gravity])
    """

    def run_batch(
        self,
        configs: List[SimulationConfig],
        systems: Optional[List[SystemFn]] = None,
        events: Optional[List[Tuple[float, EventCallback]]] = None,
    ) -> List[List[Dict[str, Any]]]:
        """Run one simulation per config and return all result histories.

        Args:
            configs: List of :class:`SimulationConfig` instances.
            systems: System functions to register in every run.
            events: ``(time, callback)`` pairs to schedule in every run.

        Returns:
            List of result histories, one per config.
        """
        systems = systems or []
        events = events or []
        all_results: List[List[Dict[str, Any]]] = []

        for idx, cfg in enumerate(configs):
            sim = Simulator()
            sim.configure(cfg)
            for sys_fn in systems:
                sim.add_system(sys_fn)
            for evt_time, evt_cb in events:
                sim.schedule_event(evt_time, evt_cb)

            logger.info("BatchSimulator: running config %d/%d", idx + 1, len(configs))
            results = sim.run()
            all_results.append(results)

        logger.info("BatchSimulator: completed %d runs", len(configs))
        return all_results
