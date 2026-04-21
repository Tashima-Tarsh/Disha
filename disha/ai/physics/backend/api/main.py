"""
Quantum Physics API — FastAPI app on port 8002 (Layer 6 of Disha AGI).
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import List

# Make engines importable when running from api/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, ConfigDict  # noqa: E402

from engines.quantum_engine import QuantumEngine  # noqa: E402
from engines.physics_classifier import PhysicsClassifier  # noqa: E402
from engines.space_engine import SpaceEngine  # noqa: E402
from engines.suppressed_physics import SuppressedPhysicsEngine  # noqa: E402
from engines.unified_field import UnifiedFieldEngine  # noqa: E402
from engines.gravity_engine import GravityEngine  # noqa: E402
from engines.grafify import Grafify  # noqa: E402

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Disha Quantum Physics API",
    description="Layer 6 — Quantum physics, space science, and unified field theory",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3003",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Singletons ────────────────────────────────────────────────────────────────
_quantum = QuantumEngine()
_classifier = PhysicsClassifier()
_space = SpaceEngine()
_suppressed = SuppressedPhysicsEngine()
_unified = UnifiedFieldEngine()
_gravity = GravityEngine()
_grafify = Grafify()


# ── Request/Response Models ───────────────────────────────────────────────────


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str


class SimulateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    gates: List[dict] = []
    num_qubits: int = 2


class EntangleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    num_qubits: int = 2


class OrbitRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    planet: str = "Earth"
    duration_days: int = 365


class AnalyzeSupressedRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str


class UnificationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    energy_scale_gev: float = 100.0


class GravityForceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    m1: float
    m2: float
    r: float


class SurfaceGravityRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    body: str | None = None
    mass: float | None = None
    radius: float | None = None


class EscapeVelocityRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    body: str | None = None
    mass: float | None = None
    radius: float | None = None


class OrbitalVelocityRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    central_mass: float
    orbital_radius: float


class TimeDilationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    radius: float


class TidalForceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    distance: float
    separation: float


class RocheLimitRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    primary_mass: float
    primary_radius: float
    secondary_density: float


class LensingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    closest_approach: float


class NBodyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    bodies: List[dict]
    dt: float = 3600.0
    steps: int = 100


class ForceVsDistanceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    m1: float
    m2: float
    r_min: float
    r_max: float
    num_points: int = 50


class PotentialHeatmapRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    grid_size: int = 30
    extent_m: float = 1e7


class TimeDilationCurveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    r_min: float
    r_max: float
    num_points: int = 50


class TidalProfileRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    separation: float
    r_min: float
    r_max: float
    num_points: int = 50


class LensingRingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mass: float
    r_min: float
    r_max: float
    num_points: int = 40


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/")
async def health_check() -> dict:
    return {
        "status": "online",
        "service": "Disha Quantum Physics API",
        "layer": 6,
        "version": "1.0.0",
        "endpoints": [
            "/api/physics/domains",
            "/api/physics/timeline",
            "/api/physics/classify",
            "/api/quantum/simulate",
            "/api/quantum/algorithms",
            "/api/quantum/entangle",
            "/api/quantum/bell",
            "/api/space/apod",
            "/api/space/neo",
            "/api/space/orbit",
            "/api/space/solar-system",
            "/api/suppressed/theories",
            "/api/suppressed/analyze",
            "/api/unified/forces",
            "/api/unified/history",
            "/api/unified/model",
            "/api/gravity/force",
            "/api/gravity/surface",
            "/api/gravity/escape-velocity",
            "/api/gravity/orbital-velocity",
            "/api/gravity/time-dilation",
            "/api/gravity/tidal",
            "/api/gravity/roche-limit",
            "/api/gravity/lensing",
            "/api/gravity/nbody",
            "/api/gravity/bodies",
            "/api/gravity/body/{body}",
            "/api/gravity/potential-field",
            "/api/grafify/force-vs-distance",
            "/api/grafify/gravity-comparison",
            "/api/grafify/escape-velocity-comparison",
            "/api/grafify/trajectory",
            "/api/grafify/velocity",
            "/api/grafify/potential-heatmap",
            "/api/grafify/time-dilation",
            "/api/grafify/tidal-profile",
            "/api/grafify/lensing-ring",
        ],
    }


@app.get("/api/physics/domains")
async def get_domains() -> dict:
    try:
        return {"domains": _classifier.get_domains()}
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/physics/timeline")
async def get_timeline() -> dict:
    try:
        return {"timeline": _classifier.get_timeline()}
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/physics/classify")
async def classify_physics(req: ClassifyRequest) -> dict:
    try:
        result = _classifier.classify(req.text)
        if "error" in result:
            raise HTTPException(
                status_code=400, detail="Invalid input for classification"
            )
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/quantum/simulate")
async def simulate_circuit(req: SimulateRequest) -> dict:
    try:
        if req.num_qubits < 1 or req.num_qubits > 10:
            raise HTTPException(
                status_code=400, detail="num_qubits must be between 1 and 10"
            )
        return _quantum.simulate_circuit(req.gates, req.num_qubits)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/quantum/algorithms")
async def get_algorithms() -> dict:
    try:
        return {"algorithms": _quantum.get_algorithms()}
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/quantum/entangle")
async def entangle(req: EntangleRequest) -> dict:
    try:
        if req.num_qubits < 2 or req.num_qubits > 8:
            raise HTTPException(
                status_code=400, detail="num_qubits must be between 2 and 8"
            )
        return _quantum.entangle(req.num_qubits)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/quantum/bell")
async def bell_state() -> dict:
    try:
        return _quantum.bell_state_experiment()
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/space/apod")
async def get_apod() -> dict:
    try:
        return _space.get_apod()
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/space/neo")
async def get_neo() -> dict:
    try:
        return _space.get_neo()
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/space/orbit")
async def simulate_orbit(req: OrbitRequest) -> dict:
    try:
        if req.duration_days < 1 or req.duration_days > 36500:
            raise HTTPException(status_code=400, detail="duration_days must be 1–36500")
        result = _space.simulate_orbit(req.planet, req.duration_days)
        if "error" in result:
            raise HTTPException(
                status_code=400, detail="Invalid planet or orbit parameters"
            )
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/space/solar-system")
async def get_solar_system() -> dict:
    try:
        return _space.get_solar_system()
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/suppressed/theories")
async def get_suppressed_theories() -> dict:
    try:
        return {
            "theories": _suppressed.get_theories(),
            "disclaimer": "These theories are speculative, unverified, or contradicted by mainstream physics. For educational and research purposes only.",
        }
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/suppressed/analyze")
async def analyze_suppressed(req: AnalyzeSupressedRequest) -> dict:
    try:
        result = _suppressed.analyze_theory(req.text)
        if "error" in result and result["error"] != "Empty text":
            raise HTTPException(status_code=500, detail="Internal server error")
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/unified/forces")
async def get_forces() -> dict:
    try:
        return {"forces": _unified.get_fundamental_forces()}
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/unified/history")
async def get_unification_history() -> dict:
    try:
        return {"history": _unified.get_unification_history()}
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/unified/model")
async def model_unification(req: UnificationRequest) -> dict:
    try:
        if req.energy_scale_gev <= 0:
            raise HTTPException(
                status_code=400, detail="energy_scale_gev must be positive"
            )
        return _unified.model_unification(req.energy_scale_gev)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Gravity Endpoints ─────────────────────────────────────────────────────────


@app.post("/api/gravity/force")
async def gravity_force(req: GravityForceRequest) -> dict:
    try:
        result = _gravity.gravitational_force(req.m1, req.m2, req.r)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/surface")
async def gravity_surface(req: SurfaceGravityRequest) -> dict:
    try:
        result = _gravity.surface_gravity(
            body=req.body,
            mass=req.mass,
            radius=req.radius,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/escape-velocity")
async def gravity_escape_velocity(req: EscapeVelocityRequest) -> dict:
    try:
        result = _gravity.escape_velocity(
            body=req.body,
            mass=req.mass,
            radius=req.radius,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/orbital-velocity")
async def gravity_orbital_velocity(req: OrbitalVelocityRequest) -> dict:
    try:
        result = _gravity.orbital_velocity(req.central_mass, req.orbital_radius)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/time-dilation")
async def gravity_time_dilation(req: TimeDilationRequest) -> dict:
    try:
        result = _gravity.gravitational_time_dilation(req.mass, req.radius)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/tidal")
async def gravity_tidal(req: TidalForceRequest) -> dict:
    try:
        result = _gravity.tidal_force(req.mass, req.distance, req.separation)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/roche-limit")
async def gravity_roche_limit(req: RocheLimitRequest) -> dict:
    try:
        result = _gravity.roche_limit(
            req.primary_mass,
            req.primary_radius,
            req.secondary_density,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/lensing")
async def gravity_lensing(req: LensingRequest) -> dict:
    try:
        result = _gravity.gravitational_lensing(req.mass, req.closest_approach)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/nbody")
async def gravity_nbody(req: NBodyRequest) -> dict:
    try:
        result = _gravity.nbody_simulate(req.bodies, req.dt, req.steps)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/gravity/bodies")
async def gravity_list_bodies() -> dict:
    try:
        return {"bodies": _gravity.list_bodies()}
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/gravity/body/{body}")
async def gravity_body_info(body: str) -> dict:
    try:
        result = _gravity.get_body_info(body)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/gravity/potential-field")
async def gravity_potential_field(req: PotentialHeatmapRequest) -> dict:
    try:
        result = _gravity.gravitational_potential_field(
            req.mass,
            req.grid_size,
            req.extent_m,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ── Grafify Endpoints ─────────────────────────────────────────────────────────


@app.post("/api/grafify/force-vs-distance")
async def grafify_force_vs_distance(req: ForceVsDistanceRequest) -> dict:
    try:
        result = _grafify.force_vs_distance(
            req.m1,
            req.m2,
            req.r_min,
            req.r_max,
            req.num_points,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/grafify/gravity-comparison")
async def grafify_gravity_comparison() -> dict:
    try:
        return _grafify.gravity_comparison()
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/grafify/escape-velocity-comparison")
async def grafify_escape_velocity_comparison() -> dict:
    try:
        return _grafify.escape_velocity_comparison()
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/grafify/trajectory")
async def grafify_trajectory(req: NBodyRequest) -> dict:
    try:
        sim = _gravity.nbody_simulate(req.bodies, req.dt, req.steps)
        if "error" in sim:
            raise HTTPException(status_code=400, detail=sim["error"])
        return _grafify.trajectory_plot(sim["trajectories"])
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/grafify/velocity")
async def grafify_velocity(req: NBodyRequest) -> dict:
    try:
        sim = _gravity.nbody_simulate(req.bodies, req.dt, req.steps)
        if "error" in sim:
            raise HTTPException(status_code=400, detail=sim["error"])
        return _grafify.velocity_over_time(sim["trajectories"])
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/grafify/potential-heatmap")
async def grafify_potential_heatmap(req: PotentialHeatmapRequest) -> dict:
    try:
        result = _grafify.potential_heatmap(
            req.mass,
            req.grid_size,
            req.extent_m,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/grafify/time-dilation")
async def grafify_time_dilation(req: TimeDilationCurveRequest) -> dict:
    try:
        result = _grafify.time_dilation_curve(
            req.mass,
            req.r_min,
            req.r_max,
            req.num_points,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/grafify/tidal-profile")
async def grafify_tidal_profile(req: TidalProfileRequest) -> dict:
    try:
        result = _grafify.tidal_force_profile(
            req.mass,
            req.separation,
            req.r_min,
            req.r_max,
            req.num_points,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/grafify/lensing-ring")
async def grafify_lensing_ring(req: LensingRingRequest) -> dict:
    try:
        result = _grafify.lensing_ring(
            req.mass,
            req.r_min,
            req.r_max,
            req.num_points,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
