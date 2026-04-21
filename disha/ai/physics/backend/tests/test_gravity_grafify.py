"""Tests for the Gravity Engine and Grafify modules."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Path setup
_THIS = Path(__file__).resolve()
_REPO_ROOT = _THIS.parents[5]  # disha/ai/physics/backend/tests -> disha/ai/physics/backend -> disha/ai/physics -> disha/ai -> disha -> root
_BACKEND = _REPO_ROOT / "disha" / "ai" / "physics" / "backend"

for p in [str(_REPO_ROOT), str(_BACKEND)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from engines.gravity_engine import GravityEngine, M_EARTH, R_EARTH, M_SUN  # noqa: E402
from engines.grafify import Grafify  # noqa: E402


# ═══════════════════════════════════════════════════════════════════════════════
# GravityEngine tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestGravitationalForce:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_basic_force(self):
        result = self.engine.gravitational_force(M_EARTH, 1.0, R_EARTH)
        assert "force_N" in result
        assert result["force_N"] == pytest.approx(9.80665, rel=0.01)

    def test_inverse_square(self):
        r1 = self.engine.gravitational_force(1e10, 1e10, 1000)
        r2 = self.engine.gravitational_force(1e10, 1e10, 2000)
        assert r1["force_N"] == pytest.approx(r2["force_N"] * 4, rel=1e-6)

    def test_zero_distance_error(self):
        result = self.engine.gravitational_force(1.0, 1.0, 0)
        assert "error" in result

    def test_negative_mass_error(self):
        result = self.engine.gravitational_force(-1.0, 1.0, 1.0)
        assert "error" in result


class TestSurfaceGravity:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_earth(self):
        result = self.engine.surface_gravity(body="earth")
        assert result["surface_gravity_ms2"] == pytest.approx(9.80665, rel=0.01)

    def test_relative_to_earth(self):
        result = self.engine.surface_gravity(body="earth")
        assert result["relative_to_earth"] == pytest.approx(1.0, rel=0.01)

    def test_custom_body(self):
        result = self.engine.surface_gravity(mass=M_EARTH, radius=R_EARTH)
        assert "surface_gravity_ms2" in result

    def test_unknown_body(self):
        result = self.engine.surface_gravity(body="pluto")
        assert "error" in result
        assert "available" in result


class TestEscapeVelocity:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_earth(self):
        result = self.engine.escape_velocity(body="earth")
        # Earth escape velocity ~11.19 km/s
        assert result["escape_velocity_kms"] == pytest.approx(11.19, rel=0.02)

    def test_formula_present(self):
        result = self.engine.escape_velocity(body="earth")
        assert "formula" in result


class TestOrbitalVelocity:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_earth_around_sun(self):
        # Earth orbital velocity ~29.78 km/s
        result = self.engine.orbital_velocity(M_SUN, 1.496e11)
        assert result["orbital_velocity_kms"] == pytest.approx(29.78, rel=0.02)

    def test_negative_input(self):
        result = self.engine.orbital_velocity(-1, 1e6)
        assert "error" in result


class TestTimeDilation:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_earth_surface(self):
        result = self.engine.gravitational_time_dilation(M_EARTH, R_EARTH)
        # Factor should be very close to 1 for Earth
        assert 0.999 < result["time_dilation_factor"] < 1.0

    def test_inside_schwarzschild(self):
        # Sun's Schwarzschild radius ~3000 m; pass radius < 3000
        result = self.engine.gravitational_time_dilation(M_SUN, 100)
        assert "error" in result

    def test_negative_input(self):
        result = self.engine.gravitational_time_dilation(-1, 1e6)
        assert "error" in result


class TestTidalForce:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_basic(self):
        result = self.engine.tidal_force(M_EARTH, R_EARTH, 1.0)
        assert "tidal_acceleration_ms2" in result
        assert result["tidal_acceleration_ms2"] > 0

    def test_negative_input(self):
        result = self.engine.tidal_force(-1, 1e6, 1)
        assert "error" in result


class TestRocheLimit:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_earth_moon(self):
        # Roche limit for a body of Moon density near Earth
        rho_moon = 3346  # kg/m³
        result = self.engine.roche_limit(M_EARTH, R_EARTH, rho_moon)
        # Should be ~9500 km
        assert 8000 < result["roche_limit_km"] < 12000

    def test_negative_input(self):
        result = self.engine.roche_limit(-1, 1e6, 3000)
        assert "error" in result


class TestGravitationalLensing:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_sun_limb(self):
        # Light passing the Sun's limb: ~1.75 arcsec
        result = self.engine.gravitational_lensing(M_SUN, 6.957e8)
        assert result["deflection_angle_arcsec"] == pytest.approx(1.75, rel=0.02)

    def test_negative_input(self):
        result = self.engine.gravitational_lensing(-1, 1e6)
        assert "error" in result


class TestNBodySimulate:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_two_body(self):
        bodies = [
            {"name": "A", "mass": 1e30, "x": 0, "y": 0, "vx": 0, "vy": 0},
            {"name": "B", "mass": 1e20, "x": 1e11, "y": 0, "vx": 0, "vy": 3e4},
        ]
        result = self.engine.nbody_simulate(bodies, dt=3600, steps=10)
        assert "trajectories" in result
        assert "A" in result["trajectories"]
        assert "B" in result["trajectories"]
        assert len(result["trajectories"]["B"]) > 1

    def test_too_few_bodies(self):
        result = self.engine.nbody_simulate([{"name": "solo", "mass": 1e30}])
        assert "error" in result

    def test_too_many_steps(self):
        bodies = [
            {"name": "A", "mass": 1e30, "x": 0, "y": 0},
            {"name": "B", "mass": 1e20, "x": 1e11, "y": 0},
        ]
        result = self.engine.nbody_simulate(bodies, steps=20000)
        assert "error" in result


class TestBodyInfo:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_earth(self):
        result = self.engine.get_body_info("earth")
        assert result["name"] == "Earth"
        assert result["mass_kg"] == M_EARTH

    def test_unknown(self):
        result = self.engine.get_body_info("pluto")
        assert "error" in result

    def test_list_bodies(self):
        result = self.engine.list_bodies()
        assert len(result) >= 10
        names = [b["name"].lower() for b in result]
        assert "earth" in names


class TestPotentialField:
    def setup_method(self):
        self.engine = GravityEngine()

    def test_basic(self):
        result = self.engine.gravitational_potential_field(M_EARTH, grid_size=5)
        assert "field" in result
        assert len(result["field"]) == 25  # 5×5

    def test_negative_mass(self):
        result = self.engine.gravitational_potential_field(-1)
        assert "error" in result


# ═══════════════════════════════════════════════════════════════════════════════
# Grafify tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestGrafifyForceVsDistance:
    def setup_method(self):
        self.grafify = Grafify()

    def test_basic(self):
        result = self.grafify.force_vs_distance(1e24, 1e24, 1e6, 1e9)
        assert result["chart_type"] == "line"
        assert len(result["data"]) == 50

    def test_bad_masses(self):
        result = self.grafify.force_vs_distance(-1, 1, 1, 10)
        assert "error" in result

    def test_custom_points(self):
        result = self.grafify.force_vs_distance(1e24, 1e24, 1e6, 1e9, num_points=10)
        assert len(result["data"]) == 10


class TestGrafifyComparisons:
    def setup_method(self):
        self.grafify = Grafify()

    def test_gravity_comparison(self):
        result = self.grafify.gravity_comparison()
        assert result["chart_type"] == "bar"
        assert len(result["data"]) >= 10

    def test_escape_velocity_comparison(self):
        result = self.grafify.escape_velocity_comparison()
        assert result["chart_type"] == "bar"
        assert len(result["data"]) >= 10


class TestGrafifyTrajectory:
    def setup_method(self):
        self.grafify = Grafify()
        self.engine = GravityEngine()

    def test_trajectory_plot(self):
        bodies = [
            {"name": "Star", "mass": 1e30, "x": 0, "y": 0, "vx": 0, "vy": 0},
            {"name": "Planet", "mass": 1e20, "x": 1e11, "y": 0, "vx": 0, "vy": 3e4},
        ]
        sim = self.engine.nbody_simulate(bodies, dt=3600, steps=20)
        result = self.grafify.trajectory_plot(sim["trajectories"])
        assert result["chart_type"] == "scatter"
        assert len(result["datasets"]) == 2

    def test_velocity_over_time(self):
        bodies = [
            {"name": "A", "mass": 1e30, "x": 0, "y": 0, "vx": 0, "vy": 0},
            {"name": "B", "mass": 1e20, "x": 1e11, "y": 0, "vx": 0, "vy": 3e4},
        ]
        sim = self.engine.nbody_simulate(bodies, dt=3600, steps=20)
        result = self.grafify.velocity_over_time(sim["trajectories"])
        assert result["chart_type"] == "line"
        assert len(result["datasets"]) == 2

    def test_empty_trajectories(self):
        result = self.grafify.trajectory_plot({})
        assert "error" in result


class TestGrafifyHeatmap:
    def setup_method(self):
        self.grafify = Grafify()

    def test_potential_heatmap(self):
        result = self.grafify.potential_heatmap(M_EARTH, grid_size=10)
        assert result["chart_type"] == "heatmap"
        assert len(result["x"]) == 10
        assert len(result["z"]) == 10

    def test_negative_mass(self):
        result = self.grafify.potential_heatmap(-1)
        assert "error" in result


class TestGrafifyTimeDilation:
    def setup_method(self):
        self.grafify = Grafify()

    def test_basic(self):
        result = self.grafify.time_dilation_curve(M_SUN, 1e4, 1e12)
        assert result["chart_type"] == "line"
        assert len(result["data"]) > 0

    def test_negative_mass(self):
        result = self.grafify.time_dilation_curve(-1, 1, 10)
        assert "error" in result


class TestGrafifyTidalProfile:
    def setup_method(self):
        self.grafify = Grafify()

    def test_basic(self):
        result = self.grafify.tidal_force_profile(M_EARTH, 1.0, 1e6, 1e8)
        assert result["chart_type"] == "line"
        assert len(result["data"]) == 50

    def test_negative_mass(self):
        result = self.grafify.tidal_force_profile(-1, 1, 1, 10)
        assert "error" in result


class TestGrafifyLensing:
    def setup_method(self):
        self.grafify = Grafify()

    def test_basic(self):
        result = self.grafify.lensing_ring(M_SUN, 1e9, 1e12)
        assert result["chart_type"] == "line"
        assert len(result["data"]) == 40

    def test_negative_mass(self):
        result = self.grafify.lensing_ring(-1, 1, 10)
        assert "error" in result
