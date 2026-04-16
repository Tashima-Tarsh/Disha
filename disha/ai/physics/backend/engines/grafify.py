"""
Grafify — graph-ready data generation for physics model visualisation.

Converts gravity, orbital, and field computations into structured chart data
(line plots, scatter plots, vector fields, heatmaps) consumable by any
front-end graphing library (Chart.js, D3, Plotly, etc.).
"""
from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# Re-use constants from gravity_engine
G = 6.67430e-11
C = 2.99792458e8
AU_M = 1.495978707e11


class Grafify:
    """Transforms physics computations into chart-ready data structures."""

    # ── Force / acceleration plots ────────────────────────────────────────────

    def force_vs_distance(
        self,
        m1: float,
        m2: float,
        r_min: float,
        r_max: float,
        num_points: int = 50,
    ) -> dict[str, Any]:
        """Generate F = GMm/r² data for a range of distances.

        Returns a line-chart dataset with x=distance, y=force.
        """
        if m1 <= 0 or m2 <= 0:
            return {"error": "Masses must be positive"}
        if r_min <= 0 or r_max <= r_min:
            return {"error": "r_min must be positive and less than r_max"}
        if num_points < 2 or num_points > 500:
            return {"error": "num_points must be between 2 and 500"}

        # Log-spaced for better resolution near the mass
        log_min = math.log10(r_min)
        log_max = math.log10(r_max)
        step = (log_max - log_min) / (num_points - 1)

        data_points: list[dict] = []
        for i in range(num_points):
            r = 10 ** (log_min + i * step)
            force = G * m1 * m2 / r**2
            data_points.append({
                "r_m": round(r, 4),
                "force_N": round(force, 6),
            })

        return {
            "chart_type": "line",
            "title": "Gravitational Force vs Distance",
            "x_label": "Distance (m)",
            "y_label": "Force (N)",
            "x_scale": "log",
            "y_scale": "log",
            "data": data_points,
            "parameters": {"m1_kg": m1, "m2_kg": m2},
        }

    def gravity_comparison(self) -> dict[str, Any]:
        """Bar chart data comparing surface gravity of all planets + Moon."""
        from engines.gravity_engine import _BODIES

        bars: list[dict] = []
        for name, bd in _BODIES.items():
            g = G * bd["mass"] / bd["radius"] ** 2
            bars.append({
                "body": name.capitalize(),
                "surface_gravity_ms2": round(g, 4),
                "relative_to_earth": round(g / 9.80665, 4),
            })

        bars.sort(key=lambda b: b["surface_gravity_ms2"], reverse=True)

        return {
            "chart_type": "bar",
            "title": "Surface Gravity Comparison",
            "x_label": "Celestial Body",
            "y_label": "Surface Gravity (m/s²)",
            "data": bars,
        }

    def escape_velocity_comparison(self) -> dict[str, Any]:
        """Bar chart data comparing escape velocities of all bodies."""
        from engines.gravity_engine import _BODIES

        bars: list[dict] = []
        for name, bd in _BODIES.items():
            v_esc = math.sqrt(2 * G * bd["mass"] / bd["radius"])
            bars.append({
                "body": name.capitalize(),
                "escape_velocity_kms": round(v_esc / 1000, 4),
            })

        bars.sort(key=lambda b: b["escape_velocity_kms"], reverse=True)

        return {
            "chart_type": "bar",
            "title": "Escape Velocity Comparison",
            "x_label": "Celestial Body",
            "y_label": "Escape Velocity (km/s)",
            "data": bars,
        }

    # ── N-body trajectory visualisation ───────────────────────────────────────

    def trajectory_plot(
        self, trajectories: dict[str, list[dict]]
    ) -> dict[str, Any]:
        """Transform N-body trajectories into scatter/line chart data.

        Parameters
        ----------
        trajectories : output from ``GravityEngine.nbody_simulate``
        """
        if not trajectories:
            return {"error": "No trajectory data provided"}

        datasets: list[dict] = []
        for body_name, points in trajectories.items():
            datasets.append({
                "label": body_name,
                "points": [
                    {"x": p["x_m"], "y": p["y_m"], "t_s": p["t_s"]}
                    for p in points
                ],
            })

        return {
            "chart_type": "scatter",
            "title": "N-Body Trajectories",
            "x_label": "x (m)",
            "y_label": "y (m)",
            "datasets": datasets,
        }

    def velocity_over_time(
        self, trajectories: dict[str, list[dict]]
    ) -> dict[str, Any]:
        """Line chart of speed vs time for each body in an N-body sim."""
        if not trajectories:
            return {"error": "No trajectory data provided"}

        datasets: list[dict] = []
        for body_name, points in trajectories.items():
            series: list[dict] = []
            for p in points:
                speed = math.sqrt(p["vx_ms"] ** 2 + p["vy_ms"] ** 2)
                series.append({
                    "t_s": p["t_s"],
                    "speed_ms": round(speed, 4),
                })
            datasets.append({"label": body_name, "data": series})

        return {
            "chart_type": "line",
            "title": "Orbital Speed vs Time",
            "x_label": "Time (s)",
            "y_label": "Speed (m/s)",
            "datasets": datasets,
        }

    # ── Potential field heatmap ────────────────────────────────────────────────

    def potential_heatmap(
        self,
        mass: float,
        grid_size: int = 30,
        extent_m: float = 1e7,
    ) -> dict[str, Any]:
        """Generate a heatmap dataset of gravitational potential around a mass.

        Returns x, y, z (potential) arrays suitable for heatmap rendering.
        """
        if mass <= 0:
            return {"error": "Mass must be positive"}
        if grid_size < 5 or grid_size > 100:
            return {"error": "grid_size must be between 5 and 100"}

        half = extent_m
        step = 2 * half / (grid_size - 1)

        x_vals: list[float] = []
        y_vals: list[float] = []
        z_matrix: list[list[float]] = []

        for i in range(grid_size):
            xi = -half + i * step
            x_vals.append(round(xi, 2))

        for j in range(grid_size):
            yj = -half + j * step
            y_vals.append(round(yj, 2))
            row: list[float] = []
            for i in range(grid_size):
                xi = x_vals[i]
                r = math.sqrt(xi**2 + yj**2)
                if r < extent_m * 0.02:
                    r = extent_m * 0.02
                phi = -G * mass / r
                row.append(round(phi, 4))
            z_matrix.append(row)

        return {
            "chart_type": "heatmap",
            "title": "Gravitational Potential Field",
            "x_label": "x (m)",
            "y_label": "y (m)",
            "z_label": "Potential (J/kg)",
            "x": x_vals,
            "y": y_vals,
            "z": z_matrix,
            "parameters": {"mass_kg": mass, "extent_m": extent_m},
        }

    # ── Time dilation visualisation ───────────────────────────────────────────

    def time_dilation_curve(
        self,
        mass: float,
        r_min: float,
        r_max: float,
        num_points: int = 50,
    ) -> dict[str, Any]:
        """Line chart of gravitational time dilation factor vs distance."""
        if mass <= 0:
            return {"error": "Mass must be positive"}
        if r_min <= 0 or r_max <= r_min:
            return {"error": "r_min must be positive and less than r_max"}

        r_s = 2 * G * mass / C**2
        if r_min <= r_s:
            r_min = r_s * 1.01  # clamp to just outside event horizon

        log_min = math.log10(r_min)
        log_max = math.log10(r_max)
        step = (log_max - log_min) / max(num_points - 1, 1)

        data_points: list[dict] = []
        for i in range(num_points):
            r = 10 ** (log_min + i * step)
            if r <= r_s:
                continue
            factor = math.sqrt(1 - r_s / r)
            data_points.append({
                "r_m": round(r, 4),
                "dilation_factor": round(factor, 10),
            })

        return {
            "chart_type": "line",
            "title": "Gravitational Time Dilation",
            "x_label": "Distance from centre (m)",
            "y_label": "Clock rate factor (τ/t∞)",
            "x_scale": "log",
            "schwarzschild_radius_m": round(r_s, 6),
            "data": data_points,
            "parameters": {"mass_kg": mass},
        }

    # ── Tidal force profile ───────────────────────────────────────────────────

    def tidal_force_profile(
        self,
        mass: float,
        delta_r: float,
        r_min: float,
        r_max: float,
        num_points: int = 50,
    ) -> dict[str, Any]:
        """Line chart of tidal acceleration vs distance from a mass."""
        if mass <= 0 or delta_r <= 0:
            return {"error": "Mass and separation must be positive"}
        if r_min <= 0 or r_max <= r_min:
            return {"error": "r_min must be positive and less than r_max"}

        log_min = math.log10(r_min)
        log_max = math.log10(r_max)
        step = (log_max - log_min) / max(num_points - 1, 1)

        data_points: list[dict] = []
        for i in range(num_points):
            r = 10 ** (log_min + i * step)
            a_tidal = 2 * G * mass * delta_r / r**3
            data_points.append({
                "r_m": round(r, 4),
                "tidal_accel_ms2": round(a_tidal, 8),
            })

        return {
            "chart_type": "line",
            "title": "Tidal Force vs Distance",
            "x_label": "Distance (m)",
            "y_label": "Tidal Acceleration (m/s²)",
            "x_scale": "log",
            "y_scale": "log",
            "data": data_points,
            "parameters": {
                "mass_kg": mass,
                "separation_m": delta_r,
            },
        }

    # ── Gravitational lensing ring ────────────────────────────────────────────

    def lensing_ring(
        self,
        mass: float,
        r_min: float,
        r_max: float,
        num_points: int = 40,
    ) -> dict[str, Any]:
        """Deflection angle vs closest-approach distance for light rays."""
        if mass <= 0:
            return {"error": "Mass must be positive"}
        if r_min <= 0 or r_max <= r_min:
            return {"error": "r_min must be positive and less than r_max"}

        log_min = math.log10(r_min)
        log_max = math.log10(r_max)
        step = (log_max - log_min) / max(num_points - 1, 1)

        data_points: list[dict] = []
        for i in range(num_points):
            r = 10 ** (log_min + i * step)
            theta = 4 * G * mass / (C**2 * r)
            arcsec = math.degrees(theta) * 3600
            data_points.append({
                "r_m": round(r, 4),
                "deflection_arcsec": round(arcsec, 6),
            })

        return {
            "chart_type": "line",
            "title": "Gravitational Lensing — Deflection Angle",
            "x_label": "Closest Approach (m)",
            "y_label": "Deflection (arcsec)",
            "x_scale": "log",
            "y_scale": "log",
            "data": data_points,
            "parameters": {"mass_kg": mass},
        }
