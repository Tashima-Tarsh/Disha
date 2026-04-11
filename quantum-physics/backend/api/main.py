"""
Quantum Physics API — FastAPI app on port 8002 (Layer 6 of Disha AGI).
"""
from __future__ import annotations

import logging
import sys
import os
from pathlib import Path
from typing import Any, List, Optional

# Make engines importable when running from api/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from engines.quantum_engine import QuantumEngine
from engines.physics_classifier import PhysicsClassifier
from engines.space_engine import SpaceEngine
from engines.suppressed_physics import SuppressedPhysicsEngine
from engines.unified_field import UnifiedFieldEngine

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Disha Quantum Physics API",
    description="Layer 6 — Quantum physics, space science, and unified field theory",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Singletons ────────────────────────────────────────────────────────────────
_quantum = QuantumEngine()
_classifier = PhysicsClassifier()
_space = SpaceEngine()
_suppressed = SuppressedPhysicsEngine()
_unified = UnifiedFieldEngine()


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
        ],
    }


@app.get("/api/physics/domains")
async def get_domains() -> dict:
    try:
        return {"domains": _classifier.get_domains()}
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/physics/timeline")
async def get_timeline() -> dict:
    try:
        return {"timeline": _classifier.get_timeline()}
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/physics/classify")
async def classify_physics(req: ClassifyRequest) -> dict:
    try:
        result = _classifier.classify(req.text)
        if "error" in result:
            raise HTTPException(status_code=400, detail="Invalid input for classification")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/quantum/simulate")
async def simulate_circuit(req: SimulateRequest) -> dict:
    try:
        if req.num_qubits < 1 or req.num_qubits > 10:
            raise HTTPException(status_code=400, detail="num_qubits must be between 1 and 10")
        return _quantum.simulate_circuit(req.gates, req.num_qubits)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/quantum/algorithms")
async def get_algorithms() -> dict:
    try:
        return {"algorithms": _quantum.get_algorithms()}
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/quantum/entangle")
async def entangle(req: EntangleRequest) -> dict:
    try:
        if req.num_qubits < 2 or req.num_qubits > 8:
            raise HTTPException(status_code=400, detail="num_qubits must be between 2 and 8")
        return _quantum.entangle(req.num_qubits)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/quantum/bell")
async def bell_state() -> dict:
    try:
        return _quantum.bell_state_experiment()
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/space/apod")
async def get_apod() -> dict:
    try:
        return _space.get_apod()
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/space/neo")
async def get_neo() -> dict:
    try:
        return _space.get_neo()
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/space/orbit")
async def simulate_orbit(req: OrbitRequest) -> dict:
    try:
        if req.duration_days < 1 or req.duration_days > 36500:
            raise HTTPException(status_code=400, detail="duration_days must be 1–36500")
        result = _space.simulate_orbit(req.planet, req.duration_days)
        if "error" in result:
            raise HTTPException(status_code=400, detail="Invalid planet or orbit parameters")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/space/solar-system")
async def get_solar_system() -> dict:
    try:
        return _space.get_solar_system()
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/suppressed/theories")
async def get_suppressed_theories() -> dict:
    try:
        return {
            "theories": _suppressed.get_theories(),
            "disclaimer": "These theories are speculative, unverified, or contradicted by mainstream physics. For educational and research purposes only.",
        }
    except Exception as exc:
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
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/unified/forces")
async def get_forces() -> dict:
    try:
        return {"forces": _unified.get_fundamental_forces()}
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/unified/history")
async def get_unification_history() -> dict:
    try:
        return {"history": _unified.get_unification_history()}
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/unified/model")
async def model_unification(req: UnificationRequest) -> dict:
    try:
        if req.energy_scale_gev <= 0:
            raise HTTPException(status_code=400, detail="energy_scale_gev must be positive")
        return _unified.model_unification(req.energy_scale_gev)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Internal error")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
