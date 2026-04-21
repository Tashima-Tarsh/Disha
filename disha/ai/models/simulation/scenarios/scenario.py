"""Scenario definition, builder, and runner for discrete simulations.

Provides a :class:`ScenarioBuilder` with a fluent API for constructing
:class:`Scenario` objects, and a :class:`ScenarioRunner` that steps
through a scenario's event schedule.
"""

from __future__ import annotations

import copy
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Entity:
    """An entity participating in a scenario.

    Attributes:
        entity_id: Unique identifier.
        entity_type: Free-form type label (e.g. ``"vehicle"``, ``"sensor"``).
        position: 3-D position ``[x, y, z]``.
        properties: Arbitrary key-value properties.
    """

    entity_id: str
    entity_type: str
    position: np.ndarray = field(default_factory=lambda: np.zeros(3, dtype=np.float64))
    properties: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.position = np.asarray(self.position, dtype=np.float64)


@dataclass
class ScheduledEvent:
    """An event scheduled to occur at a specific simulation time.

    Attributes:
        time: Simulation time at which the event fires.
        event_type: Free-form event type label.
        payload: Arbitrary data associated with the event.
    """

    time: float
    event_type: str
    payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Scenario:
    """Complete specification of a simulation scenario.

    Attributes:
        name: Scenario name.
        description: Human-readable description.
        entities: Entities participating in the scenario.
        environment_config: Key-value environment parameters.
        events_schedule: Time-ordered list of scheduled events.
        duration: Total scenario duration in simulation-time units.
    """

    name: str
    description: str = ""
    entities: List[Entity] = field(default_factory=list)
    environment_config: Dict[str, Any] = field(default_factory=dict)
    events_schedule: List[ScheduledEvent] = field(default_factory=list)
    duration: float = 0.0


class ScenarioBuilder:
    """Fluent builder for constructing :class:`Scenario` instances.

    Example::

        scenario = (
            ScenarioBuilder()
            .set_name("patrol")
            .set_description("UAV patrol route")
            .set_duration(3600.0)
            .set_environment({"wind_speed": 5.0})
            .add_entity(Entity("uav-1", "uav", np.array([0, 0, 100])))
            .add_event(ScheduledEvent(10.0, "waypoint_reached"))
            .build()
        )
    """

    def __init__(self) -> None:
        self._name: str = ""
        self._description: str = ""
        self._entities: List[Entity] = []
        self._environment: Dict[str, Any] = {}
        self._events: List[ScheduledEvent] = []
        self._duration: float = 0.0

    def set_name(self, name: str) -> ScenarioBuilder:
        """Set the scenario name."""
        self._name = name
        return self

    def set_description(self, description: str) -> ScenarioBuilder:
        """Set the scenario description."""
        self._description = description
        return self

    def set_duration(self, duration: float) -> ScenarioBuilder:
        """Set the scenario duration."""
        if duration < 0:
            raise ValueError(f"duration must be non-negative, got {duration}")
        self._duration = duration
        return self

    def set_environment(self, config: Dict[str, Any]) -> ScenarioBuilder:
        """Set the environment configuration."""
        self._environment = dict(config)
        return self

    def add_entity(self, entity: Entity) -> ScenarioBuilder:
        """Add an entity to the scenario."""
        self._entities.append(entity)
        return self

    def add_event(self, event: ScheduledEvent) -> ScenarioBuilder:
        """Add a scheduled event to the scenario."""
        self._events.append(event)
        return self

    def build(self) -> Scenario:
        """Construct and return the :class:`Scenario`.

        Returns:
            A fully configured scenario.

        Raises:
            ValueError: If the scenario name is empty.
        """
        if not self._name:
            raise ValueError("Scenario name must not be empty")

        events_sorted = sorted(self._events, key=lambda e: e.time)
        scenario = Scenario(
            name=self._name,
            description=self._description,
            entities=list(self._entities),
            environment_config=dict(self._environment),
            events_schedule=events_sorted,
            duration=self._duration,
        )
        logger.info(
            "Built scenario '%s' with %d entities and %d events",
            scenario.name,
            len(scenario.entities),
            len(scenario.events_schedule),
        )
        return scenario


class ScenarioRunner:
    """Execute a :class:`Scenario` by stepping through its event schedule.

    The runner maintains a simulation clock and processes events in
    chronological order.  Custom step callbacks can be registered to
    inject behaviour each time an event fires.

    Example::

        runner = ScenarioRunner()
        runner.load(scenario)
        results = runner.run()
    """

    def __init__(self) -> None:
        self._scenario: Optional[Scenario] = None
        self._current_time: float = 0.0
        self._event_index: int = 0
        self._results: List[Dict[str, Any]] = []
        self._step_callback: Optional[
            Callable[[float, ScheduledEvent, Scenario], None]
        ] = None
        self._is_running: bool = False

    def load(self, scenario: Scenario) -> None:
        """Load a scenario for execution.

        Args:
            scenario: The scenario to run.
        """
        self._scenario = copy.deepcopy(scenario)
        self.reset()
        logger.info("Loaded scenario '%s'", scenario.name)

    def on_step(
        self, callback: Callable[[float, ScheduledEvent, Scenario], None]
    ) -> None:
        """Register a callback invoked on each event.

        Args:
            callback: ``(current_time, event, scenario) -> None``.
        """
        self._step_callback = callback

    def run(self) -> List[Dict[str, Any]]:
        """Execute the loaded scenario from start to finish.

        Returns:
            List of result records, one per processed event.

        Raises:
            RuntimeError: If no scenario has been loaded.
        """
        if self._scenario is None:
            raise RuntimeError("No scenario loaded")

        self._is_running = True
        logger.info(
            "Running scenario '%s' (duration=%f)",
            self._scenario.name,
            self._scenario.duration,
        )

        schedule = self._scenario.events_schedule
        while self._event_index < len(schedule):
            event = schedule[self._event_index]
            if event.time > self._scenario.duration:
                break

            self._current_time = event.time

            if self._step_callback is not None:
                self._step_callback(self._current_time, event, self._scenario)

            result = {
                "time": self._current_time,
                "event_type": event.event_type,
                "payload": event.payload,
            }
            self._results.append(result)
            logger.debug(
                "Processed event at t=%f: %s", self._current_time, event.event_type
            )
            self._event_index += 1

        self._is_running = False
        logger.info(
            "Scenario '%s' complete: %d events processed",
            self._scenario.name,
            len(self._results),
        )
        return list(self._results)

    def get_results(self) -> List[Dict[str, Any]]:
        """Return results accumulated so far.

        Returns:
            Copy of the results list.
        """
        return list(self._results)

    def reset(self) -> None:
        """Reset the runner to re-run the loaded scenario."""
        self._current_time = 0.0
        self._event_index = 0
        self._results.clear()
        self._is_running = False
        logger.debug("ScenarioRunner reset")
