"""Priority-queue-based discrete event engine.

Provides :class:`Event`, :class:`EventQueue`, and :class:`EventEngine`
for scheduling, cancelling, and dispatching events with registered
handler callbacks.
"""

from __future__ import annotations

import heapq
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

EventHandler = Callable[["Event"], None]


@dataclass(order=False)
class Event:
    """A discrete simulation event.

    Attributes:
        event_id: Unique event identifier.
        event_type: Free-form type label used for handler dispatch.
        scheduled_time: Simulation time at which the event is due.
        priority: Lower values are processed first among equal times.
        payload: Arbitrary data associated with the event.
        callback: Optional per-event callback invoked when processed.
    """

    event_id: str
    event_type: str
    scheduled_time: float
    priority: int = 0
    payload: Dict[str, Any] = field(default_factory=dict)
    callback: Optional[Callable[["Event"], None]] = field(default=None, repr=False)

    def __lt__(self, other: Event) -> bool:
        """Order by (scheduled_time, priority) for the heap."""
        if self.scheduled_time != other.scheduled_time:
            return self.scheduled_time < other.scheduled_time
        return self.priority < other.priority

    def __le__(self, other: Event) -> bool:
        return self == other or self < other


class EventQueue:
    """Min-heap priority queue ordered by ``(scheduled_time, priority)``.

    Cancelled events are lazily removed at pop time.
    """

    def __init__(self) -> None:
        self._heap: List[Event] = []
        self._cancelled: Set[str] = set()
        self._size: int = 0

    @property
    def size(self) -> int:
        """Number of non-cancelled events in the queue."""
        return self._size

    @property
    def empty(self) -> bool:
        return self._size == 0

    def push(self, event: Event) -> None:
        """Add an event to the queue.

        Args:
            event: Event to schedule.
        """
        heapq.heappush(self._heap, event)
        self._cancelled.discard(event.event_id)
        self._size += 1
        logger.debug(
            "Queued event '%s' type='%s' at t=%f",
            event.event_id,
            event.event_type,
            event.scheduled_time,
        )

    def pop(self) -> Optional[Event]:
        """Remove and return the next non-cancelled event.

        Returns:
            The next event, or ``None`` if the queue is empty.
        """
        while self._heap:
            event = heapq.heappop(self._heap)
            if event.event_id in self._cancelled:
                self._cancelled.discard(event.event_id)
                continue
            self._size -= 1
            return event
        return None

    def peek(self) -> Optional[Event]:
        """Return the next non-cancelled event without removing it.

        Returns:
            The next event, or ``None`` if the queue is empty.
        """
        while self._heap and self._heap[0].event_id in self._cancelled:
            heapq.heappop(self._heap)
            # Don't decrement _size; these were already subtracted in cancel
        return self._heap[0] if self._heap else None

    def cancel(self, event_id: str) -> bool:
        """Mark an event as cancelled (lazy removal).

        Args:
            event_id: ID of the event to cancel.

        Returns:
            ``True`` if the event was found and cancelled.
        """
        if event_id in self._cancelled:
            return False
        self._cancelled.add(event_id)
        self._size = max(0, self._size - 1)
        logger.debug("Cancelled event '%s'", event_id)
        return True

    def clear(self) -> None:
        """Remove all events from the queue."""
        self._heap.clear()
        self._cancelled.clear()
        self._size = 0


class EventEngine:
    """Discrete event engine with handler registration and dispatch.

    Example::

        engine = EventEngine()
        engine.on("explosion", lambda e: print(f"Boom at t={e.scheduled_time}"))
        engine.schedule(Event(
            event_id="e1", event_type="explosion",
            scheduled_time=5.0, payload={"radius": 100},
        ))
        triggered = engine.process_events(current_time=10.0)
    """

    def __init__(self) -> None:
        self._queue: EventQueue = EventQueue()
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._processed_count: int = 0
        logger.info("EventEngine initialised")

    def schedule(self, event: Event) -> None:
        """Schedule an event for future processing.

        Args:
            event: The event to schedule.
        """
        self._queue.push(event)

    def cancel(self, event_id: str) -> bool:
        """Cancel a previously scheduled event.

        Args:
            event_id: ID of the event to cancel.

        Returns:
            ``True`` if the event was successfully cancelled.
        """
        return self._queue.cancel(event_id)

    def on(self, event_type: str, handler: EventHandler) -> None:
        """Register a handler for a given event type.

        Args:
            event_type: Type of event to listen for.
            handler: Callable invoked when a matching event fires.
        """
        self._handlers.setdefault(event_type, []).append(handler)
        logger.debug("Registered handler for event type '%s'", event_type)

    def emit(self, event_type: str, payload: Optional[Dict[str, Any]] = None) -> None:
        """Immediately trigger all handlers for an event type.

        Creates a transient event (not queued) and invokes handlers
        synchronously.

        Args:
            event_type: Type of event to emit.
            payload: Optional data to attach to the event.
        """
        transient = Event(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            scheduled_time=0.0,
            payload=payload or {},
        )
        self._dispatch(transient)

    def process_events(self, current_time: float) -> List[Event]:
        """Process all events scheduled at or before *current_time*.

        For each event, the per-event callback (if set) and all
        registered type handlers are invoked.

        Args:
            current_time: Current simulation time.

        Returns:
            List of events that were processed.
        """
        triggered: List[Event] = []

        while True:
            next_event = self._queue.peek()
            if next_event is None or next_event.scheduled_time > current_time:
                break
            event = self._queue.pop()
            if event is None:
                break

            self._dispatch(event)
            triggered.append(event)
            self._processed_count += 1

        if triggered:
            logger.debug("Processed %d events up to t=%f", len(triggered), current_time)
        return triggered

    def _dispatch(self, event: Event) -> None:
        """Invoke the event's callback and all registered type handlers."""
        if event.callback is not None:
            try:
                event.callback(event)
            except Exception:
                logger.exception("Error in callback for event '%s'", event.event_id)

        for handler in self._handlers.get(event.event_type, []):
            try:
                handler(event)
            except Exception:
                logger.exception(
                    "Error in handler for event type '%s' (event '%s')",
                    event.event_type,
                    event.event_id,
                )

    @property
    def pending_count(self) -> int:
        """Number of events still in the queue."""
        return self._queue.size

    @property
    def processed_count(self) -> int:
        """Total number of events processed so far."""
        return self._processed_count

    def reset(self) -> None:
        """Clear the event queue and processed count."""
        self._queue.clear()
        self._processed_count = 0
        logger.info("EventEngine reset")
