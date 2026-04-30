from typing import Any

from app.agents.physics_agent import PhysicsAgent
from app.api.deps import get_current_user
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()


@router.post("/simulate")
async def run_molecular_simulation(
    material: str,
    options: dict[str, Any] | None = None,
    current_user: dict = Depends(get_current_user),
):
    try:
        agent = PhysicsAgent()
        results = await agent.run(material, options or {})
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/materials")
async def get_supported_materials(current_user: dict = Depends(get_current_user)):
    agent = PhysicsAgent()
    return {"materials": list(agent.material_db.keys())}
