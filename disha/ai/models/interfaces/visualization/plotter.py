"""Visualisation helpers for simulation results.

Uses :pypi:`matplotlib` when available; falls back to ASCII-art rendering.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Conditional matplotlib import
# ---------------------------------------------------------------------------
try:
    import matplotlib

    matplotlib.use("Agg")  # Non-interactive backend for server use
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d import Axes3D  # noqa: F401 (side-effect import)

    _HAS_MPL = True
except ImportError:  # pragma: no cover
    _HAS_MPL = False
    plt = None  # type: ignore[assignment]


# ========================================================================= #
# SimulationPlotter (matplotlib)
# ========================================================================= #


class SimulationPlotter:
    """High-level plotting helper backed by :pypi:`matplotlib`.

    All methods silently fall back to :class:`TextVisualizer` when
    matplotlib is not installed.
    """

    def __init__(self) -> None:
        self._fig: Any | None = None
        self._ax: Any | None = None
        self._fallback = TextVisualizer()

    def _ensure_mpl(self) -> bool:
        if not _HAS_MPL:
            logger.warning("matplotlib not available – using text fallback")
            return False
        return True

    # ------------------------------------------------------------------ #
    # Plots
    # ------------------------------------------------------------------ #

    def plot_trajectory(
        self,
        positions_history: Sequence[Sequence[float]],
        *,
        title: str = "Trajectory",
    ) -> None:
        """Plot a 2-D or 3-D trajectory.

        Args:
            positions_history: Sequence of ``(x, y)`` or ``(x, y, z)`` tuples.
            title: Plot title.
        """
        if not self._ensure_mpl():
            print(
                self._fallback.render_grid(
                    [{"position": list(p)} for p in positions_history],
                    bounds=(100.0, 100.0),
                )
            )
            return

        pts = np.asarray(positions_history)
        if pts.ndim != 2 or pts.shape[0] == 0:
            logger.error("positions_history must be a non-empty 2-D array")
            return

        self._fig = plt.figure(figsize=(8, 6))
        if pts.shape[1] >= 3:
            self._ax = self._fig.add_subplot(111, projection="3d")
            self._ax.plot(pts[:, 0], pts[:, 1], pts[:, 2], "-o", markersize=2)
            self._ax.set_zlabel("Z")
        else:
            self._ax = self._fig.add_subplot(111)
            self._ax.plot(pts[:, 0], pts[:, 1], "-o", markersize=2)

        self._ax.set_xlabel("X")
        self._ax.set_ylabel("Y")
        self._ax.set_title(title)

    def plot_energy(
        self,
        time_series: Sequence[float],
        energy_series: Sequence[float],
        *,
        title: str = "Energy over Time",
    ) -> None:
        """Plot energy versus time.

        Args:
            time_series: Time values.
            energy_series: Corresponding energy values.
            title: Plot title.
        """
        if not self._ensure_mpl():
            print(
                self._fallback.render_bar_chart(
                    {f"t={t:.2f}": e for t, e in zip(time_series, energy_series)}
                )
            )
            return

        self._fig, self._ax = plt.subplots(figsize=(8, 5))
        self._ax.plot(time_series, energy_series, linewidth=1.5)
        self._ax.set_xlabel("Time")
        self._ax.set_ylabel("Energy")
        self._ax.set_title(title)
        self._ax.grid(True, alpha=0.3)

    def plot_monte_carlo_histogram(
        self,
        results: Sequence[float],
        *,
        bins: int = 50,
        title: str = "Monte-Carlo Distribution",
    ) -> None:
        """Plot a histogram of Monte-Carlo results.

        Args:
            results: Sampled values.
            bins: Number of histogram bins.
            title: Plot title.
        """
        if not self._ensure_mpl():
            data_dict = {}
            arr = np.asarray(results)
            edges = np.linspace(arr.min(), arr.max(), min(bins, 20) + 1)
            counts, _ = np.histogram(arr, bins=edges)
            for i, count in enumerate(counts):
                label = f"{edges[i]:.2f}"
                data_dict[label] = float(count)
            print(self._fallback.render_bar_chart(data_dict))
            return

        self._fig, self._ax = plt.subplots(figsize=(8, 5))
        self._ax.hist(results, bins=bins, edgecolor="black", alpha=0.7)
        self._ax.set_xlabel("Value")
        self._ax.set_ylabel("Frequency")
        self._ax.set_title(title)

    def plot_world_state(
        self,
        world: dict[str, Any],
        *,
        title: str = "World State",
    ) -> None:
        """Render a top-down view of world entities.

        Args:
            world: Dictionary with at least an ``"entities"`` key holding a
                list of dicts each with a ``"position"`` list.
            title: Plot title.
        """
        entities = world.get("entities", [])
        if not self._ensure_mpl():
            bounds = world.get("bounds", (100.0, 100.0))
            print(self._fallback.render_grid(entities, bounds))
            return

        self._fig, self._ax = plt.subplots(figsize=(8, 8))
        for ent in entities:
            pos = ent.get("position", [0, 0])
            label = ent.get("name", "")
            self._ax.plot(pos[0], pos[1], "o", markersize=6)
            if label:
                self._ax.annotate(label, (pos[0], pos[1]), fontsize=7)

        bounds = world.get("bounds", (100.0, 100.0, 100.0))
        self._ax.set_xlim(0, bounds[0])
        self._ax.set_ylim(0, bounds[1] if len(bounds) > 1 else bounds[0])
        self._ax.set_xlabel("X")
        self._ax.set_ylabel("Y")
        self._ax.set_title(title)
        self._ax.set_aspect("equal")
        self._ax.grid(True, alpha=0.3)

    # ------------------------------------------------------------------ #
    # Output
    # ------------------------------------------------------------------ #

    def save_plot(self, filename: str, *, dpi: int = 150) -> None:
        """Save the current figure to *filename*.

        Args:
            filename: Output file path (e.g. ``"plot.png"``).
            dpi: Resolution in dots per inch.
        """
        if self._fig is None:
            logger.warning("No figure to save")
            return
        self._fig.savefig(filename, dpi=dpi, bbox_inches="tight")
        logger.info("Plot saved to %s", filename)

    def show(self) -> None:
        """Display the current figure (interactive backends only)."""
        if self._fig is None:
            logger.warning("No figure to show")
            return
        if _HAS_MPL:
            plt.show()


# ========================================================================= #
# TextVisualizer (no-dependency fallback)
# ========================================================================= #


class TextVisualizer:
    """Pure-text visualisation fallback that requires no external packages."""

    def render_grid(
        self,
        entities: Sequence[dict[str, Any]],
        bounds: tuple[float, float] = (100.0, 100.0),
        *,
        width: int = 60,
        height: int = 30,
    ) -> str:
        """Render entities on an ASCII grid.

        Args:
            entities: Each dict must contain a ``"position"`` key with at
                least two numeric elements.
            bounds: ``(x_max, y_max)`` of the world.
            width: Character width of the output grid.
            height: Character height of the output grid.

        Returns:
            A multiline string representing the grid.
        """
        grid = [["." for _ in range(width)] for _ in range(height)]

        for idx, ent in enumerate(entities):
            pos = ent.get("position", [0, 0])
            col = int(pos[0] / bounds[0] * (width - 1))
            row = int(pos[1] / bounds[1] * (height - 1))
            col = max(0, min(col, width - 1))
            row = max(0, min(row, height - 1))
            marker = ent.get("name", str(idx))[0].upper()
            grid[row][col] = marker

        border_h = "+" + "-" * width + "+"
        lines = [border_h]
        for row in grid:
            lines.append("|" + "".join(row) + "|")
        lines.append(border_h)
        return "\n".join(lines)

    def render_bar_chart(
        self,
        data: dict[str, float],
        *,
        bar_char: str = "█",
        max_width: int = 50,
    ) -> str:
        """Render a horizontal ASCII bar chart.

        Args:
            data: Mapping of label → numeric value.
            bar_char: Character used for bars.
            max_width: Maximum bar length in characters.

        Returns:
            A multiline string representing the chart.
        """
        if not data:
            return "(no data)"

        max_val = max(abs(v) for v in data.values()) or 1
        max_label_len = max(len(str(k)) for k in data)

        lines: list[str] = []
        for label, value in data.items():
            bar_len = int(abs(value) / max_val * max_width)
            bar = bar_char * bar_len
            lines.append(f"{str(label):>{max_label_len}s} | {bar} {value:.2f}")
        return "\n".join(lines)
