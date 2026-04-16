"""
Gravity Engine — gravitational physics computations and simulations.

Covers Newtonian gravity, tidal forces, gravitational lensing,
time dilation (GR), escape velocity, Roche limits, and N-body simulation.
"""
from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# ── Physical constants (SI) ───────────────────────────────────────────────────
G = 6.67430e-11           # gravitational constant (m³ kg⁻¹ s⁻²)
C = 2.99792458e8          # speed of light (m/s)
AU_M = 1.495978707e11     # astronomical unit (m)
LY_M = 9.4607e15          # light-year (m)
M_SUN = 1.989e30          # solar mass (kg)
M_EARTH = 5.972e24        # Earth mass (kg)
R_EARTH = 6.371e6         # Earth radius (m)
M_MOON = 7.342e22         # Moon mass (kg)
R_MOON = 1.737e6          # Moon radius (m)

# Preset celestial bodies for quick lookups
_BODIES: dict[str, dict[str, float]] = {
    "sun": {"mass": M_SUN, "radius": 6.957e8},
    "mercury": {"mass": 3.301e23, "radius": 2.4397e6},
    "venus": {"mass": 4.867e24, "radius": 6.0518e6},
    "earth": {"mass": M_EARTH, "radius": R_EARTH},
    "moon": {"mass": M_MOON, "radius": R_MOON},
    "mars": {"mass": 6.417e23, "radius": 3.3895e6},
    "jupiter": {"mass": 1.898e27, "radius": 6.9911e7},
    "saturn": {"mass": 5.683e26, "radius": 5.8232e7},
    "uranus": {"mass": 8.681e25, "radius": 2.5362e7},
    "neptune": {"mass": 1.024e26, "radius": 2.4622e7},
}


class GravityEngine:
    """Gravitational physics computations and simulations."""

    # ── Public API ────────────────────────────────────────────────────────────

    def gravitational_force(
        self, m1: float, m2: float, r: float
    ) -> dict[str, Any]:
        """Compute Newtonian gravitational force between two masses.

        Parameters
        ----------
        m1, m2 : mass in kg
        r      : distance between centres in metres
        """
        if r <= 0:
            return {"error": "Distance must be positive"}
        if m1 <= 0 or m2 <= 0:
            return {"error": "Masses must be positive"}

        force = G * m1 * m2 / r**2
        accel_1 = force / m1  # acceleration of m1 towards m2
        accel_2 = force / m2
        potential = -G * m1 * m2 / r

        return {
            "force_N": force,
            "acceleration_m1_ms2": accel_1,
            "acceleration_m2_ms2": accel_2,
            "potential_energy_J": potential,
            "distance_m": r,
            "formula": "F = G·m1·m2 / r²",
        }

    def surface_gravity(self, body: str | None = None,
                        mass: float | None = None,
                        radius: float | None = None) -> dict[str, Any]:
        """Compute surface gravitational acceleration (g) for a body."""
        if body:
            bd = _BODIES.get(body.lower())
            if not bd:
                return {
                    "error": f"Unknown body '{body}'",
                    "available": list(_BODIES.keys()),
                }
            mass = bd["mass"]
            radius = bd["radius"]
        if not mass or not radius or mass <= 0 or radius <= 0:
            return {"error": "Provide a valid body name or mass+radius"}

        g = G * mass / radius**2
        return {
            "body": body or "custom",
            "mass_kg": mass,
            "radius_m": radius,
            "surface_gravity_ms2": round(g, 6),
            "relative_to_earth": round(g / 9.80665, 6),
            "formula": "g = G·M / R²",
        }

    def escape_velocity(self, body: str | None = None,
                        mass: float | None = None,
                        radius: float | None = None) -> dict[str, Any]:
        """Compute escape velocity from the surface of a body."""
        if body:
            bd = _BODIES.get(body.lower())
            if not bd:
                return {
                    "error": f"Unknown body '{body}'",
                    "available": list(_BODIES.keys()),
                }
            mass = bd["mass"]
            radius = bd["radius"]
        if not mass or not radius or mass <= 0 or radius <= 0:
            return {"error": "Provide a valid body name or mass+radius"}

        v_esc = math.sqrt(2 * G * mass / radius)
        return {
            "body": body or "custom",
            "escape_velocity_ms": round(v_esc, 4),
            "escape_velocity_kms": round(v_esc / 1000, 4),
            "formula": "v_esc = √(2GM/R)",
        }

    def orbital_velocity(self, central_mass: float,
                         orbital_radius: float) -> dict[str, Any]:
        """Compute circular orbital velocity at a given radius."""
        if central_mass <= 0 or orbital_radius <= 0:
            return {"error": "Central mass and radius must be positive"}

        v = math.sqrt(G * central_mass / orbital_radius)
        period = 2 * math.pi * orbital_radius / v
        return {
            "orbital_velocity_ms": round(v, 4),
            "orbital_velocity_kms": round(v / 1000, 4),
            "orbital_period_s": round(period, 4),
            "orbital_period_days": round(period / 86400, 4),
            "formula": "v_orb = √(GM/r)",
        }

    def gravitational_time_dilation(
        self, mass: float, radius: float
    ) -> dict[str, Any]:
        """Compute gravitational time dilation factor (GR Schwarzschild).

        Returns the ratio t_surface / t_infinity — a clock on the surface
        runs slower by this factor relative to a distant observer.
        """
        if mass <= 0 or radius <= 0:
            return {"error": "Mass and radius must be positive"}

        r_s = 2 * G * mass / C**2  # Schwarzschild radius
        if radius <= r_s:
            return {
                "error": "Radius is at or inside the Schwarzschild radius "
                         "(black hole event horizon)",
                "schwarzschild_radius_m": r_s,
            }

        factor = math.sqrt(1 - r_s / radius)
        return {
            "time_dilation_factor": round(factor, 12),
            "schwarzschild_radius_m": round(r_s, 6),
            "description": (
                f"A clock at r={radius:.2e} m runs at "
                f"{factor:.12f}× the rate of a distant clock."
            ),
            "formula": "√(1 − 2GM/(rc²))",
        }

    def tidal_force(
        self, M: float, r: float, delta_r: float
    ) -> dict[str, Any]:
        """Compute tidal acceleration between two points separated by delta_r.

        Parameters
        ----------
        M       : mass of the central body (kg)
        r       : distance from the centre to the midpoint (m)
        delta_r : separation between the two points (m)
        """
        if M <= 0 or r <= 0 or delta_r <= 0:
            return {"error": "All parameters must be positive"}

        a_tidal = 2 * G * M * delta_r / r**3
        return {
            "tidal_acceleration_ms2": a_tidal,
            "central_mass_kg": M,
            "distance_m": r,
            "separation_m": delta_r,
            "formula": "a_tidal ≈ 2GM·Δr / r³",
        }

    def roche_limit(
        self, M_primary: float, R_primary: float, rho_secondary: float
    ) -> dict[str, Any]:
        """Compute the rigid-body Roche limit.

        Parameters
        ----------
        M_primary     : mass of the primary body (kg)
        R_primary     : radius of the primary body (m)
        rho_secondary : density of the secondary body (kg/m³)
        """
        if M_primary <= 0 or R_primary <= 0 or rho_secondary <= 0:
            return {"error": "All parameters must be positive"}

        rho_primary = M_primary / (4 / 3 * math.pi * R_primary**3)
        d = R_primary * (2 * rho_primary / rho_secondary) ** (1 / 3)
        return {
            "roche_limit_m": round(d, 2),
            "roche_limit_km": round(d / 1000, 2),
            "roche_limit_primary_radii": round(d / R_primary, 6),
            "primary_density_kgm3": round(rho_primary, 2),
            "formula": "d = R_p · (2ρ_p / ρ_s)^(1/3)",
        }

    def gravitational_lensing(
        self, M: float, r: float
    ) -> dict[str, Any]:
        """Compute the Einstein deflection angle for light passing a mass.

        Parameters
        ----------
        M : mass of the lensing body (kg)
        r : closest approach distance (m)
        """
        if M <= 0 or r <= 0:
            return {"error": "Mass and distance must be positive"}

        r_s = 2 * G * M / C**2
        theta_rad = 4 * G * M / (C**2 * r)
        theta_arcsec = math.degrees(theta_rad) * 3600

        return {
            "deflection_angle_rad": theta_rad,
            "deflection_angle_arcsec": round(theta_arcsec, 6),
            "schwarzschild_radius_m": round(r_s, 6),
            "closest_approach_m": r,
            "formula": "θ = 4GM / (c²r)",
        }

    def nbody_simulate(
        self,
        bodies: list[dict[str, Any]],
        dt: float = 3600.0,
        steps: int = 100,
    ) -> dict[str, Any]:
        """Run a simple N-body gravitational simulation (leapfrog integrator).

        Parameters
        ----------
        bodies : list of dicts with keys ``name``, ``mass`` (kg),
                 ``x``, ``y`` (m), ``vx``, ``vy`` (m/s).
        dt     : time step in seconds (default 1 hour).
        steps  : number of integration steps.
        """
        if not bodies or len(bodies) < 2:
            return {"error": "At least 2 bodies are required"}
        if steps < 1 or steps > 10000:
            return {"error": "Steps must be between 1 and 10 000"}

        n = len(bodies)
        names = [b.get("name", f"body_{i}") for i, b in enumerate(bodies)]
        mass = [float(b["mass"]) for b in bodies]
        x = [float(b.get("x", 0)) for b in bodies]
        y = [float(b.get("y", 0)) for b in bodies]
        vx = [float(b.get("vx", 0)) for b in bodies]
        vy = [float(b.get("vy", 0)) for b in bodies]

        trajectories: dict[str, list[dict]] = {nm: [] for nm in names}

        def _accel(x_arr: list[float], y_arr: list[float]):
            ax = [0.0] * n
            ay = [0.0] * n
            for i in range(n):
                for j in range(n):
                    if i == j:
                        continue
                    dx = x_arr[j] - x_arr[i]
                    dy = y_arr[j] - y_arr[i]
                    dist2 = dx * dx + dy * dy
                    # Softening to prevent singularities
                    softening = 1e6
                    dist = math.sqrt(dist2 + softening**2)
                    f = G * mass[j] / dist**3
                    ax[i] += f * dx
                    ay[i] += f * dy
            return ax, ay

        # Record initial state
        for i in range(n):
            trajectories[names[i]].append({
                "step": 0, "t_s": 0.0,
                "x_m": round(x[i], 2), "y_m": round(y[i], 2),
                "vx_ms": round(vx[i], 4), "vy_ms": round(vy[i], 4),
            })

        # Leapfrog integration
        ax, ay = _accel(x, y)
        for s in range(1, steps + 1):
            # Half-step velocity
            for i in range(n):
                vx[i] += 0.5 * dt * ax[i]
                vy[i] += 0.5 * dt * ay[i]
            # Full-step position
            for i in range(n):
                x[i] += dt * vx[i]
                y[i] += dt * vy[i]
            # Recompute acceleration
            ax, ay = _accel(x, y)
            # Second half-step velocity
            for i in range(n):
                vx[i] += 0.5 * dt * ax[i]
                vy[i] += 0.5 * dt * ay[i]

            # Sample every N steps to keep output manageable
            sample_rate = max(1, steps // 200)
            if s % sample_rate == 0 or s == steps:
                for i in range(n):
                    trajectories[names[i]].append({
                        "step": s, "t_s": round(s * dt, 2),
                        "x_m": round(x[i], 2), "y_m": round(y[i], 2),
                        "vx_ms": round(vx[i], 4), "vy_ms": round(vy[i], 4),
                    })

        return {
            "bodies": names,
            "dt_s": dt,
            "total_steps": steps,
            "total_time_s": round(steps * dt, 2),
            "trajectories": trajectories,
            "integrator": "leapfrog (symplectic)",
        }

    def get_body_info(self, body: str) -> dict[str, Any]:
        """Return info about a known celestial body."""
        bd = _BODIES.get(body.lower())
        if not bd:
            return {"error": f"Unknown body '{body}'",
                    "available": list(_BODIES.keys())}

        mass = bd["mass"]
        radius = bd["radius"]
        g = G * mass / radius**2
        v_esc = math.sqrt(2 * G * mass / radius)
        r_s = 2 * G * mass / C**2

        return {
            "name": body.capitalize(),
            "mass_kg": mass,
            "radius_m": radius,
            "surface_gravity_ms2": round(g, 6),
            "escape_velocity_kms": round(v_esc / 1000, 4),
            "schwarzschild_radius_m": round(r_s, 6),
        }

    def list_bodies(self) -> list[dict[str, Any]]:
        """List all preset celestial bodies with basic gravity info."""
        results = []
        for name, bd in _BODIES.items():
            mass = bd["mass"]
            radius = bd["radius"]
            g = G * mass / radius**2
            results.append({
                "name": name.capitalize(),
                "mass_kg": mass,
                "radius_m": radius,
                "surface_gravity_ms2": round(g, 6),
            })
        return results

    def gravitational_potential_field(
        self,
        mass: float,
        grid_size: int = 20,
        extent_m: float = 1e7,
    ) -> dict[str, Any]:
        """Generate a 2D gravitational potential field centred on a mass.

        Returns a grid of (x, y, phi) values useful for visualisation.
        """
        if mass <= 0:
            return {"error": "Mass must be positive"}
        if grid_size < 5 or grid_size > 100:
            return {"error": "grid_size must be between 5 and 100"}

        half = extent_m
        step = 2 * half / (grid_size - 1)
        field: list[dict] = []

        for i in range(grid_size):
            for j in range(grid_size):
                xi = -half + i * step
                yj = -half + j * step
                r = math.sqrt(xi**2 + yj**2)
                if r < extent_m * 0.02:
                    r = extent_m * 0.02  # avoid singularity
                phi = -G * mass / r
                field.append({
                    "x_m": round(xi, 2),
                    "y_m": round(yj, 2),
                    "potential_Jkg": round(phi, 4),
                })

        return {
            "mass_kg": mass,
            "grid_size": grid_size,
            "extent_m": extent_m,
            "field": field,
            "units": {"position": "metres", "potential": "J/kg"},
        }
