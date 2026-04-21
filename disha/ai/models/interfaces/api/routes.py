"""FastAPI route definitions for the Disha AI simulation platform.

If :pypi:`fastapi` is not installed a lightweight stub ``Router`` class is
provided so the module can still be imported without errors.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Conditional FastAPI / Pydantic imports
# ---------------------------------------------------------------------------
try:
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel, Field

    _HAS_FASTAPI = True
except ImportError:  # pragma: no cover
    _HAS_FASTAPI = False

    class APIRouter:  # type: ignore[no-redef]
        """Minimal stub when FastAPI is not installed."""

        def __init__(self, **kwargs: Any) -> None:
            self._routes: List[Dict[str, Any]] = []

        def get(self, path: str, **kwargs: Any):  # type: ignore[override]
            def _decorator(func):  # type: ignore[no-untyped-def]
                self._routes.append({"method": "GET", "path": path, "handler": func})
                return func

            return _decorator

        def post(self, path: str, **kwargs: Any):  # type: ignore[override]
            def _decorator(func):  # type: ignore[no-untyped-def]
                self._routes.append({"method": "POST", "path": path, "handler": func})
                return func

            return _decorator

    class HTTPException(Exception):  # type: ignore[no-redef]
        def __init__(self, status_code: int = 500, detail: str = "") -> None:
            self.status_code = status_code
            self.detail = detail
            super().__init__(detail)

    class BaseModel:  # type: ignore[no-redef]
        """Minimal Pydantic stub."""

        def __init__(self, **kwargs: Any) -> None:
            for k, v in kwargs.items():
                setattr(self, k, v)

    def Field(*args: Any, **kwargs: Any) -> Any:  # type: ignore[no-redef]
        return kwargs.get("default")

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class EntityCreate(BaseModel):  # type: ignore[misc]
    """Payload for creating a new world entity."""

    name: str = Field(default="entity")
    entity_type: str = Field(default="generic")
    position: List[float] = Field(default=[0.0, 0.0, 0.0])
    velocity: List[float] = Field(default=[0.0, 0.0, 0.0])
    mass: float = Field(default=1.0)
    properties: Dict[str, Any] = Field(default={})


class SimulationRunRequest(BaseModel):  # type: ignore[misc]
    """Payload for launching a simulation run."""

    dt: float = Field(default=0.01)
    max_steps: int = Field(default=1000)
    seed: Optional[int] = Field(default=None)


class HypothesisRequest(BaseModel):  # type: ignore[misc]
    """Payload for submitting a reasoning hypothesis."""

    description: str = Field(default="")
    confidence: float = Field(default=0.5)
    evidence: List[str] = Field(default=[])


class CollapseRequest(BaseModel):  # type: ignore[misc]
    """Payload for collapsing hypotheses to a decision."""

    strategy: str = Field(default="max_confidence")


class PipelineRunRequest(BaseModel):  # type: ignore[misc]
    """Payload for executing the AI pipeline."""

    stages: List[str] = Field(default=["all"])
    parameters: Dict[str, Any] = Field(default={})


# ---------------------------------------------------------------------------
# In-memory stores (replaced by real backends in production)
# ---------------------------------------------------------------------------
_simulation_results: Dict[str, Dict[str, Any]] = {}
_entities: List[Dict[str, Any]] = []
_hypotheses: List[Dict[str, Any]] = []
_tracks: List[Dict[str, Any]] = []

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/v1", tags=["disha"])


@router.get("/system/status", summary="System status")
async def system_status() -> Dict[str, Any]:
    """Return high-level system health information."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "entities": len(_entities),
        "simulation_runs": len(_simulation_results),
        "hypotheses": len(_hypotheses),
    }


@router.get("/world/state", summary="Current world state")
async def world_state() -> Dict[str, Any]:
    """Return the full current world state including all entities."""
    return {
        "entity_count": len(_entities),
        "entities": _entities,
    }


@router.post("/world/entity", summary="Add entity")
async def add_entity(entity: EntityCreate) -> Dict[str, Any]:
    """Add a new entity to the world."""
    try:
        entry: Dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "name": entity.name,
            "entity_type": entity.entity_type,
            "position": entity.position,
            "velocity": entity.velocity,
            "mass": entity.mass,
            "properties": entity.properties,
        }
        _entities.append(entry)
        logger.info("Entity created: %s", entry["id"])
        return {"created": entry}
    except Exception as exc:
        logger.exception("Failed to create entity")
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/simulation/run", summary="Run simulation")
async def run_simulation(req: SimulationRunRequest) -> Dict[str, Any]:
    """Launch a simulation run with the provided configuration."""
    try:
        run_id = str(uuid.uuid4())
        _simulation_results[run_id] = {
            "run_id": run_id,
            "status": "completed",
            "dt": req.dt,
            "max_steps": req.max_steps,
            "seed": req.seed,
            "steps_executed": req.max_steps,
            "final_energy": 0.0,
        }
        logger.info("Simulation run %s completed", run_id)
        return {"run_id": run_id, "status": "completed"}
    except Exception as exc:
        logger.exception("Simulation run failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/simulation/results/{run_id}", summary="Get simulation results")
async def get_simulation_results(run_id: str) -> Dict[str, Any]:
    """Retrieve results for a previous simulation run."""
    result = _simulation_results.get(run_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return result


@router.post("/reasoning/hypothesis", summary="Add hypothesis")
async def add_hypothesis(req: HypothesisRequest) -> Dict[str, Any]:
    """Register a new reasoning hypothesis."""
    try:
        entry = {
            "id": str(uuid.uuid4()),
            "description": req.description,
            "confidence": req.confidence,
            "evidence": req.evidence,
        }
        _hypotheses.append(entry)
        logger.info("Hypothesis added: %s", entry["id"])
        return {"hypothesis": entry}
    except Exception as exc:
        logger.exception("Failed to add hypothesis")
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/reasoning/collapse", summary="Collapse to decision")
async def collapse_hypotheses(req: CollapseRequest) -> Dict[str, Any]:
    """Collapse current hypotheses to a single decision."""
    if not _hypotheses:
        raise HTTPException(status_code=400, detail="No hypotheses to collapse")
    try:
        if req.strategy == "max_confidence":
            winner = max(_hypotheses, key=lambda h: h["confidence"])
        else:
            winner = _hypotheses[0]
        decision = {
            "decision_id": str(uuid.uuid4()),
            "strategy": req.strategy,
            "selected_hypothesis": winner,
            "alternatives_count": len(_hypotheses) - 1,
        }
        _hypotheses.clear()
        logger.info("Hypotheses collapsed via '%s'", req.strategy)
        return decision
    except Exception as exc:
        logger.exception("Collapse failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/geospatial/tracks", summary="List active tracks")
async def list_tracks() -> Dict[str, Any]:
    """Return all currently active geospatial tracks."""
    return {"tracks": _tracks, "count": len(_tracks)}


@router.post("/pipeline/run", summary="Run AI pipeline")
async def run_pipeline(req: PipelineRunRequest) -> Dict[str, Any]:
    """Execute the full AI reasoning/simulation pipeline."""
    try:
        pipeline_id = str(uuid.uuid4())
        result = {
            "pipeline_id": pipeline_id,
            "stages_requested": req.stages,
            "parameters": req.parameters,
            "status": "completed",
            "outputs": {},
        }
        logger.info("Pipeline %s completed", pipeline_id)
        return result
    except Exception as exc:
        logger.exception("Pipeline run failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
